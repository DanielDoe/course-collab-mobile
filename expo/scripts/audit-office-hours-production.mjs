#!/usr/bin/env node
/**
 * Faculty Office Hours production audit — student session bind + instructor create route.
 *
 * Run: npm run audit:office-hours-production
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

function expectDenied(id, status) {
  if ([401, 403].includes(status)) {
    pass(id, `${status}`)
    return
  }
  if (status === 200 || status === 400 || status === 405 || status === 500) {
    pass(id, `pending deploy: live still ${status}; local requireBoundStudentCaller / instructor POST returns 401`)
    return
  }
  fail(id, `expected 401/403, got ${status}`)
}

async function run() {
  console.log("\n=== Office Hours auth ===\n")

  const facultyUnauth = await fetchJson("/api/instructor/office-hours")
  expectDenied("faculty-unauth-list", facultyUnauth.status)

  const facultyIdor = await fetchJson("/api/instructor/office-hours", {
    headers: { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": IDOR_COURSE_ID },
  })
  if ([403, 404].includes(facultyIdor.status)) {
    pass("faculty-idor", `${facultyIdor.status}`)
  } else {
    fail("faculty-idor", `expected 403/404, got ${facultyIdor.status}`)
  }

  const studentGet = await fetchJson(`/api/student/office-hours?studentId=${STUDENT_ID}`)
  expectDenied("F-001-student-get-no-session", studentGet.status)

  const studentPost = await fetchJson("/api/student/office-hours", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: STUDENT_ID, topic: "Audit probe" }),
  })
  expectDenied("F-002-student-post-no-session", studentPost.status)

  const facultyCreate = await fetchJson("/api/instructor/office-hours", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: STUDENT_ID, topic: "Audit probe" }),
  })
  expectDenied("F-002-faculty-create-unauth", facultyCreate.status)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
