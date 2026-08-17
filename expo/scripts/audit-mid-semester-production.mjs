#!/usr/bin/env node
/**
 * Faculty mid-semester production audit — auth/IDOR + shared quiz-attempt leak + create → publish → student list.
 * Uses disposable QA titles only. Does not mutate live Mid-Semester Exam 2.
 *
 * Run: npm run audit:mid-semester-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const IDOR_COURSE_ID = process.env.AUDIT_IDOR_COURSE_ID || "1"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"

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

  const missing = await fetchJson("/api/instructor/quizzes?assessment_type=mid_semester")
  if (missing.status === 401) {
    pass("F-001-unauth-list", "401 without auth")
  } else {
    fail("F-001-unauth-list", `expected 401, got ${missing.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/quizzes?assessment_type=mid_semester", {
    headers: instructorHeaders("999999"),
  })
  if ([401, 403, 404].includes(invalidCourse.status)) {
    pass("F-001-invalid-course", `${invalidCourse.status} invalid course`)
  } else {
    fail("F-001-invalid-course", `expected 401/403/404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/quizzes?assessment_type=mid_semester", {
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
      assessment_type: "mid_semester",
      time_limit: 30,
    }),
  })
  if ([403, 404].includes(idorCreate.status)) {
    pass("F-001-idor-create", `${idorCreate.status} foreign course create`)
  } else {
    fail("F-001-idor-create", `expected 403/404, got ${idorCreate.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/quizzes?assessment_type=mid_semester", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const studentList = await fetchJson("/api/student/mid-semesters")
  if ([400, 401, 404].includes(studentList.status)) {
    pass("F-001-student-list", `${studentList.status} without student`)
  } else {
    fail("F-001-student-list", `expected 400/401/404, got ${studentList.status}`)
  }

  const unauthTake = await fetchJson("/api/midsem/take/1")
  if ([401, 403, 404].includes(unauthTake.status)) {
    pass("F-001-unauth-take", `${unauthTake.status} midsem take without auth`)
  } else {
    fail("F-001-unauth-take", `expected 401/403/404, got ${unauthTake.status}`)
  }

  const unauthSubmit = await fetchJson("/api/midsem/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if ([400, 401, 403, 404].includes(unauthSubmit.status)) {
    pass("F-001-unauth-submit", `${unauthSubmit.status} midsem submit without auth`)
  } else {
    fail("F-001-unauth-submit", `expected 400/401/403/404, got ${unauthSubmit.status}`)
  }
}

async function runStudentAttemptAuth() {
  console.log("\n=== F-002 Shared quiz-attempt auth (mid-semester resume) ===\n")

  const unauth = await fetchJson("/api/student/quiz-attempt/1?studentId=999999")
  if ([401, 403, 404].includes(unauth.status)) {
    pass("F-002-unauth-attempt", `${unauth.status} invalid student without auth`)
  } else {
    fail("F-002-unauth-attempt", `expected 401/403/404, got ${unauth.status}`)
  }

  const mismatch = await fetchJson("/api/student/quiz-attempt/1?studentId=999999", {
    headers: studentHeaders(),
  })
  if ([401, 403, 404].includes(mismatch.status)) {
    pass("F-002-mismatch-attempt", `${mismatch.status} caller vs invalid studentId`)
  } else {
    fail("F-002-mismatch-attempt", `expected 401/403/404, got ${mismatch.status}`)
  }
}

async function runE2E() {
  console.log("\n=== F-003 Create mid-semester → publish → student list → cleanup ===\n")

  const topics = await fetchJson("/api/instructor/question-bank/topics", {
    headers: instructorHeaders(),
  })
  const topicNames = (topics.body?.topics ?? []).map((t) => t.topic ?? t.name).filter(Boolean)
  if (!topics.ok || topicNames.length === 0) {
    fail("F-003-topics", "no question bank topics available")
    return
  }
  pass("F-003-topics", `${topicNames.length} topics`)

  const questions = await fetchJson(
    `/api/instructor/question-bank?topic=${encodeURIComponent(topicNames[0])}&limit=1`,
    { headers: instructorHeaders() },
  )
  const questionIds = (questions.body?.questions ?? []).slice(0, 1).map((q) => q.id)
  if (questionIds.length === 0) {
    fail("F-003-questions", "no question bank questions in first topic")
    return
  }
  pass("F-003-questions", `question ${questionIds[0]}`)

  const title = `Audit Mid-Semester ${Date.now()}`
  let quizId = null

  try {
    const created = await fetchJson("/api/instructor/quizzes/create-from-bank", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: "Production audit probe — safe to delete",
        question_ids: questionIds,
        assessment_type: "mid_semester",
        time_limit: 30,
      }),
    })
    quizId = created.body?.quiz_id ?? created.body?.quiz?.id ?? null
    if (!created.ok || quizId == null) {
      const bodyText = typeof created.body === "string" ? created.body : JSON.stringify(created.body)
      fail("F-003-create", `create failed (${created.status}) ${bodyText?.slice(0, 180)}`)
      return
    }
    pass("F-003-create", `mid-semester ${quizId}`)

    const studentBefore = await fetchJson(
      `/api/student/mid-semesters?studentId=${STUDENT_ID}`,
      { headers: studentHeaders() },
    )
    const beforeRows = studentBefore.body?.midSemesters ?? studentBefore.body?.exams ?? []
    if (studentBefore.ok && beforeRows.some((q) => q.id === quizId)) {
      fail("F-003-student-draft", "unpublished mid-semester visible to students")
    } else {
      pass("F-003-student-draft", "draft hidden")
    }

    const detail = await fetchJson(`/api/instructor/quizzes/${quizId}`, { headers: instructorHeaders() })
    if (!detail.ok) {
      fail("F-003-detail", `detail failed (${detail.status})`)
    } else {
      pass("F-003-detail", `loaded mid-semester ${quizId}`)
    }

    const toggle = await fetchJson(`/api/instructor/quizzes/${quizId}/toggle-session`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: SESSION, is_active: true }),
    })
    if (!toggle.ok) {
      fail("F-003-publish", `toggle ${SESSION} failed (${toggle.status}) ${JSON.stringify(toggle.body)?.slice(0, 160)}`)
      return
    }
    pass("F-003-publish", `published to ${SESSION}`)

    const studentAfter = await fetchJson(
      `/api/student/mid-semesters?studentId=${STUDENT_ID}`,
      { headers: studentHeaders() },
    )
    const afterRows = studentAfter.body?.midSemesters ?? studentAfter.body?.exams ?? []
    if (studentAfter.ok && afterRows.some((q) => q.id === quizId)) {
      pass("F-003-student-visible", "student sees mid-semester")
    } else {
      fail("F-003-student-visible", `student list missing mid-semester (${studentAfter.status})`)
    }
  } finally {
    if (quizId != null) {
      const deleted = await fetchJson(`/api/instructor/quizzes/${quizId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
      if (deleted.ok) pass("F-003-cleanup", `deleted ${quizId}`)
      else fail("F-003-cleanup", `${deleted.status} ${deleted.body?.error ?? ""}`)
    }
  }
}

await runAuthProbes()
await runStudentAttemptAuth()
await runE2E()

const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => r.ok === false).length
console.log(`\n${passed}/${results.length} PASS${failed ? ` — ${failed} failed` : ""}`)
process.exit(failed ? 1 : 0)
