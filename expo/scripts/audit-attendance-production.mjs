#!/usr/bin/env node
/**
 * Faculty attendance production audit — auth/IDOR + faculty list → student records/score.
 *
 * Header-only x-instructor-id / x-student-id is NOT authentication.
 * Instructor header+course 401 is PASS. Header-only analytics 200 is FAIL.
 * Does NOT POST /api/attendance/records/clear-all with a section.
 * Does NOT POST /api/attendance/mark with a live session code.
 *
 * Run: npm run audit:attendance-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const IDOR_COURSE_ID = process.env.AUDIT_IDOR_COURSE_ID || "1"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"
const CALLER_STUDENT_DB = "722"
const IDOR_STUDENT_DB = "351"
const FOREIGN_SECTION = "ELEG1304P01"

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

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missing = await fetchJson(`/api/attendance/sessions?instructorId=${INSTRUCTOR_ID}`, {
    headers: { "x-course-id": COURSE_ID },
  })
  if (missing.status === 401) {
    pass("F-001-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor", `expected 401, got ${missing.status}`)
  }

  const invalidCourse = await fetchJson(`/api/attendance/sessions?instructorId=${INSTRUCTOR_ID}`, {
    headers: instructorHeaders("999999"),
  })
  if ([401, 403, 404].includes(invalidCourse.status)) {
    pass("F-001-invalid-course", `${invalidCourse.status} invalid course (401 header-only is PASS)`)
  } else {
    fail("F-001-invalid-course", `expected 401/403/404, got ${invalidCourse.status}`)
  }

  const idor = await fetchJson(`/api/attendance/sessions?instructorId=${INSTRUCTOR_ID}`, {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([401, 403, 404].includes(idor.status)) {
    pass("F-001-idor-sessions", `${idor.status} foreign course (401 header-only is PASS)`)
  } else {
    fail("F-001-idor-sessions", `expected 401/403/404, got ${idor.status}`)
  }

  const unauthMark = await fetchJson("/api/attendance/manual-override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: 1, studentId: 1, status: "present" }),
  })
  if ([401, 403].includes(unauthMark.status)) {
    pass("F-001-unauth-mark", `${unauthMark.status} without instructor`)
  } else {
    fail("F-001-unauth-mark", `expected 401/403, got ${unauthMark.status}`)
  }

  const unauthStudentMark = await fetchJson("/api/attendance/mark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if (unauthStudentMark.status === 401) {
    pass("F-001-student-mark-auth", "401 unauth mark")
  } else if (unauthStudentMark.status === 400) {
    fail("F-001-student-mark-auth", "400 after identity accepted")
  } else {
    fail("F-001-student-mark-auth", `expected 401, got ${unauthStudentMark.status}`)
  }

  const headerStudentMark = await fetchJson("/api/attendance/mark", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-student-id": CALLER_STUDENT_DB },
    body: JSON.stringify({ studentId: Number(CALLER_STUDENT_DB), sessionId: 1, code: "XXXXX" }),
  })
  if (headerStudentMark.status === 401) {
    pass("AT4-header-student-mark", "401 header-only mark")
  } else if (headerStudentMark.status === 400) {
    fail("AT4-header-student-mark", "400 after identity accepted")
  } else {
    fail("AT4-header-student-mark", `expected 401, got ${headerStudentMark.status}`)
  }

  const headerOnlyAnalytics = await fetchJson(
    `/api/attendance/analytics?instructorId=${INSTRUCTOR_ID}&section=${encodeURIComponent(SESSION)}`,
    { headers: { "x-instructor-id": INSTRUCTOR_ID } },
  )
  if (headerOnlyAnalytics.status === 200) {
    fail("AT1-header-only-analytics", "header-only instructor analytics 200")
  } else if ([401, 403].includes(headerOnlyAnalytics.status)) {
    pass("AT1-header-only-analytics", `${headerOnlyAnalytics.status} header-only instructor (no course)`)
  } else {
    fail("AT1-header-only-analytics", `expected 401/403, got ${headerOnlyAnalytics.status}`)
  }

  const recordsIdor = await fetchJson(`/api/attendance/records?studentId=${IDOR_STUDENT_DB}`, {
    headers: { "x-student-id": CALLER_STUDENT_DB },
  })
  if (recordsIdor.status === 200) {
    fail("AT2-records-idor", `header ${CALLER_STUDENT_DB} read studentId=${IDOR_STUDENT_DB}`)
  } else if ([401, 403].includes(recordsIdor.status)) {
    pass("AT2-records-idor", `${recordsIdor.status} cross-student records rejected`)
  } else {
    fail("AT2-records-idor", `expected 401/403, got ${recordsIdor.status}`)
  }

  const headerLeaderboard = await fetchJson(
    `/api/attendance/leaderboard?section=${encodeURIComponent(FOREIGN_SECTION)}`,
    { headers: { "x-student-id": CALLER_STUDENT_DB } },
  )
  if (headerLeaderboard.status === 200) {
    fail("AT3-header-leaderboard", `header-only student leaderboard ${FOREIGN_SECTION} 200`)
  } else if ([401, 403].includes(headerLeaderboard.status)) {
    pass("AT3-header-leaderboard", `${headerLeaderboard.status} header-only student leaderboard`)
  } else {
    fail("AT3-header-leaderboard", `expected 401/403, got ${headerLeaderboard.status}`)
  }
}

async function runFacultyStudentRead() {
  console.log("\n=== F-002 Faculty sessions → student records/score ===\n")

  const sessions = await fetchJson(
    `/api/attendance/sessions?instructorId=${INSTRUCTOR_ID}&section=${encodeURIComponent(SESSION)}`,
    { headers: instructorHeaders() },
  )
  if (sessions.status === 401) {
    fail("F-002-faculty-sessions", "instructor session required")
    fail("F-002-faculty-records", "instructor session required")
    // header-only student records still run below
  } else if (!sessions.ok) {
    fail("F-002-faculty-sessions", `sessions failed (${sessions.status})`)
  } else {
    const rows = sessions.body?.sessions ?? []
    pass("F-002-faculty-sessions", `${rows.length} sessions`)

    const records = await fetchJson(
      `/api/attendance/records?section=${encodeURIComponent(SESSION)}`,
      { headers: instructorHeaders() },
    )
    if (records.status === 401) {
      fail("F-002-faculty-records", "instructor session required")
    } else if (records.ok) {
      pass("F-002-faculty-records", `${(records.body?.records ?? []).length} records`)
    } else {
      fail("F-002-faculty-records", `records failed (${records.status})`)
    }
  }

  const studentRecords = await fetchJson(`/api/attendance/records?studentId=${STUDENT_ID}`, {
    headers: { "x-student-id": STUDENT_ID },
  })
  if (studentRecords.status === 200) {
    fail("F-002-student-records", "header-only student records 200 — session required")
  } else if ([401, 403].includes(studentRecords.status)) {
    pass("F-002-student-records", `${studentRecords.status} header-only (session required)`)
  } else {
    fail("F-002-student-records", `unexpected ${studentRecords.status}`)
  }

  const score = await fetchJson(`/api/attendance/score?studentId=${STUDENT_ID}`, {
    headers: { "x-student-id": STUDENT_ID },
  })
  if (score.status === 200) {
    fail("F-002-student-score", "header-only student score 200 — session required")
  } else if (score.status === 401) {
    pass("F-002-student-score", "401 header-only (session required)")
  } else {
    fail("F-002-student-score", `score failed (${score.status})`)
  }
}

async function main() {
  console.log(`Attendance production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID}`)

  await runAuthProbes()
  await runFacultyStudentRead()

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
