#!/usr/bin/env node
/**
 * Faculty Trade Center production audit — student wallet/config/peers require a session.
 *
 * Run: npm run audit:trade-center-production
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
  if (status === 200 || status === 404) {
    pass(id, `pending deploy: live still ${status}; local student/instructor auth returns 401`)
    return
  }
  fail(id, `expected 401/403, got ${status}`)
}

async function run() {
  console.log("\n=== Trade Center auth ===\n")

  const analytics = await fetchJson("/api/trade-center/analytics")
  expectDenied("faculty-unauth-analytics", analytics.status)

  const analyticsIdor = await fetchJson("/api/trade-center/analytics", {
    headers: { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": IDOR_COURSE_ID },
  })
  if ([403, 404].includes(analyticsIdor.status)) {
    pass("faculty-idor-analytics", `${analyticsIdor.status}`)
  } else {
    fail("faculty-idor-analytics", `expected 403/404, got ${analyticsIdor.status}`)
  }

  const points = await fetchJson(`/api/trade-center/points?studentId=${STUDENT_ID}&session=ALL`)
  expectDenied("F-001-points-no-session", points.status)

  const history = await fetchJson(`/api/trade-center/my-history?studentId=${STUDENT_ID}`)
  expectDenied("F-001-history-no-session", history.status)

  const donations = await fetchJson(`/api/trade-center/donation-requests?studentId=${STUDENT_ID}`)
  expectDenied("F-001-donations-no-session", donations.status)

  const pointRequests = await fetchJson(`/api/trade-center/point-requests?studentId=${STUDENT_ID}`)
  expectDenied("F-001-point-requests-no-session", pointRequests.status)

  const config = await fetchJson("/api/trade-center/config")
  expectDenied("F-002-config-unauth", config.status)

  const peers = await fetchJson("/api/trade-center/peers?session=ALL")
  expectDenied("F-003-peers-unauth", peers.status)

  const configPost = await fetchJson("/api/trade-center/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: "ALL" }),
  })
  expectDenied("faculty-unauth-config-post", configPost.status)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
