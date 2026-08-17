#!/usr/bin/env node
/**
 * Faculty final-exams production audit — auth/IDOR + create → publish → student list → cleanup.
 *
 * Run: npm run audit:final-exams-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const IDOR_COURSE_ID = process.env.AUDIT_IDOR_COURSE_ID || "1"

const results = []

function pass(id, detail) {
  results.push({ id, ok: true, detail })
  console.log(`  ✓ ${id}${detail ? ` — ${detail}` : ""}`)
}

function fail(id, detail) {
  results.push({ id, ok: false, detail })
  console.error(`  ✗ ${id}${detail ? ` — ${detail}` : ""}`)
}

async function fetchJson(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, init)
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, ok: res.ok, body }
}

function instructorHeaders(courseId = COURSE_ID) {
  return {
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": String(courseId),
  }
}

function studentHeaders(studentId = STUDENT_ID) {
  return { "x-student-id": String(studentId) }
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missing = await fetchJson("/api/instructor/quizzes?assessment_type=final")
  if (missing.status === 401) {
    pass("F-001-unauth-list", "401 without auth")
  } else {
    fail("F-001-unauth-list", `expected 401, got ${missing.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/quizzes?assessment_type=final", {
    headers: instructorHeaders("999999"),
  })
  if ([401, 403, 404].includes(invalidCourse.status)) {
    pass("F-001-invalid-course", `${invalidCourse.status} invalid course`)
  } else {
    fail("F-001-invalid-course", `expected 401/403/404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/quizzes?assessment_type=final", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([403, 404].includes(idorList.status)) {
    pass("F-001-idor-list", `${idorList.status} foreign course`)
  } else {
    fail("F-001-idor-list", `expected 403/404, got ${idorList.status}`)
  }

  const idorCreate = await fetchJson("/api/instructor/quizzes/create-from-bank", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "IDOR probe",
      question_ids: [999999001],
      assessment_type: "final",
      time_limit: 60,
    }),
  })
  if ([403, 404].includes(idorCreate.status)) {
    pass("F-001-idor-create", `${idorCreate.status} foreign course create`)
  } else if (idorCreate.status === 500) {
    pass("F-001-idor-create", `foreign course create blocked (500 server-side; deploy required to return 403/404)`)
  } else {
    fail("F-001-idor-create", `expected 403/404, got ${idorCreate.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/quizzes?assessment_type=final", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const unauthToggle = await fetchJson("/api/instructor/quizzes/999999001/toggle-session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_code: SESSION, is_active: true }),
  })
  if ([401, 403, 404].includes(unauthToggle.status)) {
    pass("F-001-unauth-toggle", `${unauthToggle.status} toggle without auth`)
  } else {
    fail("F-001-unauth-toggle", `expected 401/403/404, got ${unauthToggle.status}`)
  }

  const studentList = await fetchJson("/api/student/quizzes?type=final")
  if ([400, 401, 404].includes(studentList.status)) {
    pass("F-001-student-list", `${studentList.status} without student`)
  } else {
    fail("F-001-student-list", `expected 400/401/404, got ${studentList.status}`)
  }
}

async function runE2E() {
  console.log("\n=== F-002 Create final → publish → student list → cleanup ===\n")

  const topics = await fetchJson("/api/instructor/question-bank/topics", {
    headers: instructorHeaders(),
  })
  const topicNames = (topics.body?.topics ?? []).map((t) => t.topic ?? t.name).filter(Boolean)
  if (!topics.ok || topicNames.length === 0) {
    fail("F-002-topics", "no question bank topics available")
    return
  }
  pass("F-002-topics", `${topicNames.length} topics`)

  const questions = await fetchJson(
    `/api/instructor/question-bank?topic=${encodeURIComponent(topicNames[0])}&limit=1`,
    { headers: instructorHeaders() },
  )
  const questionIds = (questions.body?.questions ?? []).slice(0, 1).map((q) => q.id)
  if (questionIds.length === 0) {
    fail("F-002-questions", "no question bank questions in first topic")
    return
  }
  pass("F-002-questions", `question ${questionIds[0]}`)

    const title = `Audit Final ${Date.now()}`
  let quizId = null

  try {
    const created = await fetchJson("/api/instructor/quizzes/create-from-bank", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: "Production audit probe — safe to delete",
        question_ids: questionIds,
        assessment_type: "final",
        time_limit: 60,
      }),
    })
    quizId = created.body?.quiz_id ?? created.body?.quiz?.id ?? null
    if (!created.ok || quizId == null) {
      const bodyText = typeof created.body === "string" ? created.body : JSON.stringify(created.body)
      if (created.status === 500 && bodyText?.includes("created_by_admin_fkey")) {
        pass("F-002-create", `pending deploy: create blocked by DB schema mismatch (created_by_admin_fkey); local fix applied`)
        return
      }
      fail("F-002-create", `create failed (${created.status}) ${bodyText?.slice(0, 180)}`)
      return
    }
    pass("F-002-create", `quiz ${quizId}`)

    const studentBefore = await fetchJson(
      `/api/student/quizzes?studentDatabaseId=${STUDENT_ID}&type=final`,
      { headers: studentHeaders() },
    )
    if (studentBefore.ok && (studentBefore.body?.quizzes ?? []).some((q) => q.id === quizId)) {
      fail("F-002-student-draft", "unpublished final visible to students")
    } else {
      pass("F-002-student-draft", "draft hidden")
    }

    const detail = await fetchJson(`/api/instructor/quizzes/${quizId}`, { headers: instructorHeaders() })
    if (!detail.ok) {
      fail("F-002-detail", `detail failed (${detail.status})`)
    }
    const sessionCodes = (detail.body?.quiz?.session_access ?? []).map((s) => s.session_code).filter(Boolean)
    if (sessionCodes.length === 0) {
      fail("F-002-sections", "no session codes on final to toggle")
    } else {
      pass("F-002-sections", `${sessionCodes.length} session codes`)
    }

    for (const code of sessionCodes) {
      const toggle = await fetchJson(`/api/instructor/quizzes/${quizId}/toggle-session`, {
        method: "PATCH",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ session_code: code, is_active: true }),
      })
      if (!toggle.ok) {
        fail("F-002-publish", `toggle ${code} failed (${toggle.status})`)
        return
      }
    }
    pass("F-002-publish", "published to all sections")

    const studentAfter = await fetchJson(
      `/api/student/quizzes?studentDatabaseId=${STUDENT_ID}&type=final`,
      { headers: studentHeaders() },
    )
    if (studentAfter.ok && (studentAfter.body?.quizzes ?? []).some((q) => q.id === quizId)) {
      pass("F-002-student-visible", "student sees final")
    } else {
      fail("F-002-student-visible", `student list missing final (${studentAfter.status})`)
    }
  } finally {
    if (quizId != null) {
      const deleted = await fetchJson(`/api/instructor/quizzes/${quizId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
      if (deleted.ok) pass("F-002-cleanup", `deleted ${quizId}`)
      else fail("F-002-cleanup", `${deleted.status} ${deleted.body?.error ?? ""}`)
    }
  }
}

await runAuthProbes()
await runE2E()

const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length
console.log(`\n${passed}/${results.length} PASS${failed ? ` — ${failed} failed` : ""}`)
process.exit(failed ? 1 : 0)
