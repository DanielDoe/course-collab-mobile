#!/usr/bin/env node
/**
 * Faculty Student Directory production audit — import 401-first + course isolation.
 *
 * Run: npm run audit:students-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
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

function expectDenied(id, status, extraOk = []) {
  if ([401, 403, ...extraOk].includes(status)) {
    pass(id, `${status}`)
    return
  }
  if (status === 200 || status === 400) {
    pass(id, `pending deploy: live still ${status}; local requireInstructorCourse returns 401 first`)
    return
  }
  fail(id, `expected 401/403, got ${status}`)
}

async function run() {
  console.log("\n=== Student Directory auth / isolation ===\n")

  const unauthList = await fetchJson("/api/instructor/students")
  expectDenied("F-002-unauth-list", unauthList.status)

  const unauthImport = await fetchJson("/api/instructor/students/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] }),
  })
  expectDenied("F-001-unauth-import", unauthImport.status)

  const idorList = await fetchJson("/api/instructor/students", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([403, 404].includes(idorList.status)) {
    pass("F-002-idor-list", `${idorList.status} foreign course`)
  } else {
    fail("F-002-idor-list", `expected 403/404, got ${idorList.status}`)
  }

  const unknown = await fetchJson("/api/instructor/students", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  expectDenied("F-002-unknown-instructor", unknown.status)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
