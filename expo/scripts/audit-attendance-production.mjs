#!/usr/bin/env node
/**
 * Faculty attendance production audit — auth/IDOR + faculty list → student records/score.
 *
 * Run: npm run audit:attendance-production
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
    pass("F-001-invalid-course", `${invalidCourse.status} invalid course`)
  } else {
    fail("F-001-invalid-course", `expected 401/403/404, got ${invalidCourse.status}`)
  }

  const idor = await fetchJson(`/api/attendance/sessions?instructorId=${INSTRUCTOR_ID}`, {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([401, 403, 404].includes(idor.status)) {
    pass("F-001-idor-sessions", `${idor.status} foreign course`)
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
  if ([400, 401].includes(unauthStudentMark.status)) {
    pass("F-001-student-mark-auth", `${unauthStudentMark.status} without student`)
  } else {
    fail("F-001-student-mark-auth", `expected 400/401, got ${unauthStudentMark.status}`)
  }
}

async function runFacultyStudentRead() {
  console.log("\n=== F-002 Faculty sessions → student records/score ===\n")

  const sessions = await fetchJson(
    `/api/attendance/sessions?instructorId=${INSTRUCTOR_ID}&section=${encodeURIComponent(SESSION)}`,
    { headers: instructorHeaders() },
  )
  if (!sessions.ok) {
    fail("F-002-faculty-sessions", `sessions failed (${sessions.status})`)
    return
  }
  const rows = sessions.body?.sessions ?? []
  pass("F-002-faculty-sessions", `${rows.length} sessions`)

  const records = await fetchJson(
    `/api/attendance/records?section=${encodeURIComponent(SESSION)}`,
    { headers: instructorHeaders() },
  )
  if (records.ok) {
    pass("F-002-faculty-records", `${(records.body?.records ?? []).length} records`)
  } else {
    fail("F-002-faculty-records", `records failed (${records.status})`)
  }

  const studentRecords = await fetchJson(`/api/attendance/records?studentId=${STUDENT_ID}`, {
    headers: { "x-student-id": STUDENT_ID },
  })
  if (studentRecords.ok || studentRecords.status === 404) {
    pass("F-002-student-records", `${studentRecords.status} student records`)
  } else if ([401, 403].includes(studentRecords.status)) {
    fail("F-002-student-records", `enrolled student denied (${studentRecords.status})`)
  } else {
    fail("F-002-student-records", `unexpected ${studentRecords.status}`)
  }

  const score = await fetchJson(`/api/attendance/score?studentId=${STUDENT_ID}`, {
    headers: { "x-student-id": STUDENT_ID },
  })
  if (score.ok || score.status === 404) {
    pass("F-002-student-score", `${score.status} student score`)
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
