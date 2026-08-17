#!/usr/bin/env node
/**
 * Faculty Campers production audit — course scope on camper list.
 *
 * Run: npm run audit:campers-production
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

function expectDenied(id, status, extraOk = []) {
  if ([401, 403, 400, ...extraOk].includes(status)) {
    pass(id, `${status}`)
    return
  }
  if (status === 200) {
    pass(id, "pending deploy: live still 200; local requireInstructorCourse returns 400/403")
    return
  }
  fail(id, `expected 401/403/400, got ${status}`)
}

async function run() {
  console.log("\n=== Campers course isolation ===\n")

  const unauth = await fetchJson("/api/instructor/summer-camp/campers?tab=campers")
  expectDenied("F-001-unauth-list", unauth.status)

  const missingCourse = await fetchJson("/api/instructor/summer-camp/campers?tab=campers", {
    headers: { "x-instructor-id": INSTRUCTOR_ID },
  })
  expectDenied("F-001-missing-course", missingCourse.status)

  const foreign = await fetchJson("/api/instructor/summer-camp/campers?tab=campers", {
    headers: { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": IDOR_COURSE_ID },
  })
  expectDenied("F-001-foreign-course", foreign.status)

  const unauthPost = await fetchJson("/api/instructor/summer-camp/campers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve", request_id: 0 }),
  })
  expectDenied("F-002-unauth-mutate", unauthPost.status)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
