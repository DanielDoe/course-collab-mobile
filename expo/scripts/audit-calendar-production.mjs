#!/usr/bin/env node
/**
 * Calendar production audit — student events/goals/study-plan require a session.
 *
 * Expected after v0 deploy:
 *   unauth + header-only events/goals/study-plan → 401 (not 400)
 *   Alex cookie own events GET → 200
 *   Alex cookie + Jordan header → 403
 *   class-schedule cookie own → 200; foreign header → 403
 *
 * Live today (unpatched) will FAIL. Do not treat 200 as PASS.
 *
 * Never POST study-plan with both studentId and examDate (that generates a live plan).
 * If a cookie create is added later, title must contain AUDIT-DELETE and DELETE in finally.
 *
 * Run: npm run audit:calendar-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const ALEX_ROSTER = process.env.AUDIT_STUDENT_ID || "910000001"
const ALEX_DB = process.env.AUDIT_STUDENT_DB_ID || "722"
const JORDAN_DB = process.env.AUDIT_PEER_STUDENT_DB_ID || "723"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const UNIVERSITY_ID = Number(process.env.AUDIT_UNIVERSITY_ID || 2)
const STUDENT_PASSWORD = process.env.AUDIT_STUDENT_PASSWORD || "Review26!"
const FAKE_ID = 999999999

const results = []

function pass(id, detail) {
  results.push({ id, ok: true, detail })
  console.log(`  ✓ ${id}${detail ? ` — ${detail}` : ""}`)
}

function fail(id, detail) {
  results.push({ id, ok: false, detail })
  console.error(`  ✗ ${id}${detail ? ` — ${detail}` : ""}`)
}

function expectStatus(id, actual, expected, extra = "") {
  const allowed = Array.isArray(expected) ? expected : [expected]
  if (actual === 500) {
    fail(id, `HTTP 500${extra}`)
    return false
  }
  if (allowed.includes(actual)) {
    pass(id, `${actual}${extra}`)
    return true
  }
  fail(id, `expected ${allowed.join("/")}, got ${actual}${extra}`)
  return false
}

/** Unauth / header-only student probes must be 401 or 403. Never 200/201/404. */
function expectAuthRejected(id, status, extra = "") {
  if (status === 500) {
    fail(id, `HTTP 500${extra}`)
    return false
  }
  if (status === 200 || status === 201) {
    fail(id, `handler ran (${status}) — not auth-closed${extra}`)
    return false
  }
  if (status === 404) {
    fail(id, `404 means handler ran — expected 401 until session bind${extra}`)
    return false
  }
  if (status === 401 || status === 403) {
    pass(id, `${status}${extra}`)
    return true
  }
  fail(id, `expected 401/403, got ${status}${extra}`)
  return false
}

async function fetchJson(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, init)
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text ? { error: "[non-json]" } : null
  }
  return { status: res.status, ok: res.ok, body, headers: res.headers }
}

function cookieHeaderFromResponse(res) {
  const setter = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []
  if (setter.length) {
    return setter.map((part) => part.split(";")[0]).filter(Boolean).join("; ")
  }
  const single = res.headers.get("set-cookie")
  return single ? single.split(";")[0] : ""
}

function refreshFromCookie(cookie) {
  const match = cookie.match(/(?:^|;\s*)cc_refresh=([^;]+)/i)
  return match?.[1]?.trim() || ""
}

async function loginAlex() {
  const res = await fetchJson("/api/auth/student/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      universityId: UNIVERSITY_ID,
      identifier: ALEX_ROSTER,
      password: STUDENT_PASSWORD,
      courseId: Number(COURSE_ID),
      rememberMe: true,
    }),
  })
  const cookie = cookieHeaderFromResponse(res)
  const refresh = refreshFromCookie(cookie)
  return { status: res.status, body: res.body, cookie, refresh }
}

function jsonHeaders(extra = {}) {
  return { "Content-Type": "application/json", ...extra }
}

async function run() {
  console.log(`Calendar production audit → ${BASE}\n`)
  console.log("Live 200 on student probes is FAIL until v0 is deployed.\n")

  const headerOnly = { "x-student-id": ALEX_DB }

  console.log("=== CAL1–CAL3 events — unauth ===\n")

  const unauthEventsGet = await fetchJson(`/api/calendar/events?studentId=${ALEX_DB}`)
  expectAuthRejected("CAL1-unauth-events-get", unauthEventsGet.status)

  const unauthEventsPost = await fetchJson("/api/calendar/events", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  })
  expectAuthRejected("CAL2-unauth-events-post", unauthEventsPost.status)

  const unauthEventsPut = await fetchJson("/api/calendar/events", {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ eventId: FAKE_ID }),
  })
  expectAuthRejected("CAL3-unauth-events-put", unauthEventsPut.status)

  const unauthEventsDelete = await fetchJson(`/api/calendar/events?eventId=${FAKE_ID}`, {
    method: "DELETE",
  })
  expectAuthRejected("CAL3-unauth-events-delete", unauthEventsDelete.status)

  console.log("\n=== CAL1–CAL3 events — header-only ===\n")

  const headerEventsGet = await fetchJson(`/api/calendar/events?studentId=${ALEX_DB}`, {
    headers: headerOnly,
  })
  expectAuthRejected("CAL1-header-only-events-get", headerEventsGet.status)

  const headerEventsPost = await fetchJson("/api/calendar/events", {
    method: "POST",
    headers: jsonHeaders(headerOnly),
    body: JSON.stringify({}),
  })
  expectAuthRejected("CAL2-header-only-events-post", headerEventsPost.status)

  const headerEventsPut = await fetchJson("/api/calendar/events", {
    method: "PUT",
    headers: jsonHeaders(headerOnly),
    body: JSON.stringify({ eventId: FAKE_ID }),
  })
  expectAuthRejected("CAL3-header-only-events-put", headerEventsPut.status)

  const headerEventsDelete = await fetchJson(`/api/calendar/events?eventId=${FAKE_ID}`, {
    method: "DELETE",
    headers: headerOnly,
  })
  expectAuthRejected("CAL3-header-only-events-delete", headerEventsDelete.status)

  console.log("\n=== CAL5 goals — unauth + header-only ===\n")

  const unauthGoalsGet = await fetchJson(`/api/calendar/goals?studentId=${ALEX_DB}`)
  expectAuthRejected("CAL5-unauth-goals-get", unauthGoalsGet.status)

  const unauthGoalsPost = await fetchJson("/api/calendar/goals", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  })
  expectAuthRejected("CAL5-unauth-goals-post", unauthGoalsPost.status)

  const unauthGoalsPut = await fetchJson("/api/calendar/goals", {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ goalId: FAKE_ID }),
  })
  expectAuthRejected("CAL5-unauth-goals-put", unauthGoalsPut.status)

  const headerGoalsGet = await fetchJson(`/api/calendar/goals?studentId=${ALEX_DB}`, {
    headers: headerOnly,
  })
  expectAuthRejected("CAL5-header-only-goals-get", headerGoalsGet.status)

  const headerGoalsPost = await fetchJson("/api/calendar/goals", {
    method: "POST",
    headers: jsonHeaders(headerOnly),
    body: JSON.stringify({}),
  })
  expectAuthRejected("CAL5-header-only-goals-post", headerGoalsPost.status)

  const headerGoalsPut = await fetchJson("/api/calendar/goals", {
    method: "PUT",
    headers: jsonHeaders(headerOnly),
    body: JSON.stringify({ goalId: FAKE_ID }),
  })
  expectAuthRejected("CAL5-header-only-goals-put", headerGoalsPut.status)

  console.log("\n=== CAL4 study-plan — unauth + header-only (no examDate) ===\n")

  const unauthPlan = await fetchJson("/api/calendar/study-plan", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  })
  expectAuthRejected("CAL4-unauth-study-plan", unauthPlan.status)

  const headerPlan = await fetchJson("/api/calendar/study-plan", {
    method: "POST",
    headers: jsonHeaders(headerOnly),
    body: JSON.stringify({}),
  })
  expectAuthRejected("CAL4-header-only-study-plan", headerPlan.status)

  console.log("\n=== Optional cookie bind (read-only; no create / no study-plan generate) ===\n")

  const login = await loginAlex()
  if (!login.cookie && !login.refresh) {
    pass("cookie-login", `skipped — no session (HTTP ${login.status})`)
  } else {
    pass("cookie-login", "session proof collected")
    const proof = {
      Cookie: login.cookie,
      ...(login.refresh ? { "x-cc-refresh": login.refresh } : {}),
      "x-student-id": ALEX_DB,
    }

    const ownEvents = await fetchJson(`/api/calendar/events?studentId=${ALEX_DB}`, {
      headers: proof,
    })
    if (ownEvents.status === 500) {
      fail("cookie-own-events", "HTTP 500")
    } else if (ownEvents.status === 200) {
      pass("cookie-own-events", "200 own events")
    } else {
      fail("cookie-own-events", `expected 200 after session bind, got ${ownEvents.status}`)
    }

    const spoofEvents = await fetchJson(`/api/calendar/events?studentId=${JORDAN_DB}`, {
      headers: { ...proof, "x-student-id": JORDAN_DB },
    })
    expectStatus("cookie-alex-jordan-header-events", spoofEvents.status, 403)

    const rangeStart = new Date()
    const rangeEnd = new Date()
    rangeEnd.setMonth(rangeEnd.getMonth() + 3)
    const scheduleQs = `studentId=${ALEX_DB}&startDate=${encodeURIComponent(rangeStart.toISOString())}&endDate=${encodeURIComponent(rangeEnd.toISOString())}`
    const ownSchedule = await fetchJson(`/api/calendar/class-schedule?${scheduleQs}`, {
      headers: proof,
    })
    if (ownSchedule.status === 500) {
      fail("cookie-own-class-schedule", "HTTP 500")
    } else if (ownSchedule.status === 200) {
      pass("cookie-own-class-schedule", "200 class-schedule")
    } else {
      fail("cookie-own-class-schedule", `expected 200 after session bind, got ${ownSchedule.status}`)
    }

    const spoofSchedule = await fetchJson(
      `/api/calendar/class-schedule?studentId=${JORDAN_DB}&startDate=${encodeURIComponent(rangeStart.toISOString())}&endDate=${encodeURIComponent(rangeEnd.toISOString())}`,
      { headers: { ...proof, "x-student-id": JORDAN_DB } },
    )
    expectStatus("cookie-alex-jordan-header-class-schedule", spoofSchedule.status, 403)
  }

  const failed = results.filter((row) => !row.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    console.error("Production still unpatched or probes failed. Do not mark READY.")
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
