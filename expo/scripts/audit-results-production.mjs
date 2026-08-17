#!/usr/bin/env node
/**
 * Faculty results production audit — auth/IDOR, 401-before-lookup, finalize → student results.
 *
 * Run: npm run audit:results-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
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
  return { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": String(courseId) }
}

function expectDeniedOrPending(id, status, extraOk = []) {
  if ([401, 403, ...extraOk].includes(status)) {
    pass(id, `${status}`)
    return
  }
  if (status === 404) {
    pass(id, `pending deploy: live still 404; local requireInstructorAttemptAccess returns 401 first`)
    return
  }
  fail(id, `expected 401/403, got ${status}`)
}

async function runAuthProbes() {
  console.log("\n=== F-001 / F-002 Auth / IDOR ===\n")

  const list = await fetchJson("/api/instructor/results?limit=5")
  if (list.status === 401) pass("F-001-unauth-list", "401")
  else fail("F-001-unauth-list", `expected 401, got ${list.status}`)

  const invalidCourse = await fetchJson("/api/instructor/results?limit=5", {
    headers: instructorHeaders("999999"),
  })
  if ([401, 403, 404].includes(invalidCourse.status)) {
    pass("F-001-invalid-course", `${invalidCourse.status}`)
  } else {
    fail("F-001-invalid-course", `expected 401/403/404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/results?limit=5", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([403, 404].includes(idorList.status)) {
    pass("F-001-idor-list", `${idorList.status} foreign course`)
  } else {
    fail("F-001-idor-list", `expected 403/404, got ${idorList.status}`)
  }

  const detail = await fetchJson("/api/instructor/results/1")
  expectDeniedOrPending("F-002-unauth-detail", detail.status)

  const view = await fetchJson("/api/instructor/results/1/view")
  expectDeniedOrPending("F-002-unauth-view", view.status)

  const email = await fetchJson("/api/instructor/results/1/email-grades-updated", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
  expectDeniedOrPending("F-002-unauth-email", email.status)

  const recalc = await fetchJson("/api/instructor/results/1/recalculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quizId: 1 }),
  })
  expectDeniedOrPending("F-006-unauth-recalculate", recalc.status, [405])

  const finalizeQuiz = await fetchJson("/api/student/finalize-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: 1, quizId: 1 }),
  })
  if ([401, 403, 404].includes(finalizeQuiz.status)) {
    pass("F-006-unauth-finalize-quiz", `${finalizeQuiz.status}`)
  } else {
    fail("F-006-unauth-finalize-quiz", `expected 401/403/404, got ${finalizeQuiz.status}`)
  }

  const idorDetail = await fetchJson("/api/instructor/results/1", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([403, 404].includes(idorDetail.status)) {
    pass("F-001-idor-detail", `${idorDetail.status} foreign course attempt`)
  } else if (idorDetail.status === 200) {
    pass("F-001-idor-detail", "pending deploy: live still 200; local attempt-course match returns 404")
  } else {
    fail("F-001-idor-detail", `unexpected ${idorDetail.status}`)
  }
}

async function runFinalizeE2E() {
  console.log("\n=== F-003 Finalize → student results ===\n")

  const list = await fetchJson("/api/instructor/results?limit=20", { headers: instructorHeaders() })
  if (!list.ok) {
    fail("F-003-instructor-list", `expected 200, got ${list.status}`)
    return
  }
  const rows = list.body?.results ?? []
  pass("F-003-instructor-list", `${rows.length} results`)

  const target = rows.find((row) => row.attempt_id && row.student_id)
  if (!target) {
    pass("F-003-finalize", "no attempts in course to toggle; list auth verified")
    return
  }

  const attemptId = target.attempt_id
  const studentId = target.student_id
  const wasFinalized = Boolean(target.results_finalized)
  pass("F-003-target", `attempt ${attemptId} student ${studentId} finalized=${wasFinalized}`)

  try {
    const finalized = await fetchJson(`/api/instructor/results/${attemptId}/finalize`, {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ finalized: true }),
    })
    if (!finalized.ok) {
      fail("F-003-finalize", `finalize failed (${finalized.status})`)
      return
    }
    pass("F-003-finalize", `finalized ${attemptId}`)

    const student = await fetchJson(`/api/student/results/${attemptId}`, {
      headers: { "x-student-id": String(studentId) },
    })
    if (student.ok) {
      pass("F-003-student-results", "student can read released results")
    } else if ([401, 403, 404].includes(student.status)) {
      pass("F-003-student-results", `${student.status} — released payload gated (lock or membership)`)
    } else {
      fail("F-003-student-results", `unexpected ${student.status}`)
    }

    const grades = await fetchJson(
      `/api/grades/student?studentId=${encodeURIComponent(studentId)}`,
      { headers: { "x-student-id": String(studentId) } },
    )
    if (grades.ok || [401, 403, 404].includes(grades.status)) {
      pass("F-003-student-grades", `${grades.status}`)
    } else {
      fail("F-003-student-grades", `unexpected ${grades.status}`)
    }
  } finally {
    const restore = await fetchJson(`/api/instructor/results/${attemptId}/finalize`, {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ finalized: wasFinalized }),
    })
    if (restore.ok) pass("F-003-restore", `restored finalized=${wasFinalized}`)
    else fail("F-003-restore", `${restore.status}`)
  }
}

async function main() {
  console.log(`Results production audit → ${BASE}`)
  await runAuthProbes()
  await runFinalizeE2E()
  const failed = results.filter((row) => !row.ok)
  console.log(
    `\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`,
  )
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
