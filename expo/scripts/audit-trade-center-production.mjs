#!/usr/bin/env node
/**
 * Trade Center production audit — student wallet/mutations require a session.
 *
 * Expected after v0 deploy:
 *   unauth + header-only student reads/writes → 401
 *   unauth trade/donate → 401 (not 400)
 *   unauth sync → 401 (not 200)
 *   unauth peer approve/reject → 401 (not 404)
 *   unauth rollover GET → 401 (not 200 grades)
 *
 * Live today (unpatched) will FAIL. Do not treat 200/404 as pending-deploy PASS.
 *
 * Run: npm run audit:trade-center-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const ALEX_ROSTER = process.env.AUDIT_STUDENT_ID || "910000001"
const ALEX_DB = process.env.AUDIT_STUDENT_DB_ID || "722"
const JORDAN_DB = process.env.AUDIT_PEER_STUDENT_DB_ID || "723"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"
const UNIVERSITY_ID = Number(process.env.AUDIT_UNIVERSITY_ID || 2)
const STUDENT_PASSWORD = process.env.AUDIT_STUDENT_PASSWORD || "Review26!"
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

/** Unauth / header-only student and faculty probes must be 401 or 403. Never 200/201/404. */
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
  console.log(`Trade Center production audit → ${BASE}\n`)
  console.log("Live 200/404 on student probes is FAIL until v0 is deployed.\n")

  console.log("=== Faculty unauth / header-only ===\n")

  const analytics = await fetchJson("/api/trade-center/analytics")
  expectAuthRejected("faculty-unauth-analytics", analytics.status)

  const analyticsHeader = await fetchJson("/api/trade-center/analytics", {
    headers: { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": COURSE_ID },
  })
  expectAuthRejected("faculty-header-only-analytics", analyticsHeader.status)

  const analyticsIdor = await fetchJson("/api/trade-center/analytics", {
    headers: { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": IDOR_COURSE_ID },
  })
  expectAuthRejected("faculty-header-only-idor-analytics", analyticsIdor.status)

  const configPost = await fetchJson("/api/trade-center/config", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ session: "ALL" }),
  })
  expectAuthRejected("faculty-unauth-config-post", configPost.status)

  console.log("\n=== TC1 student reads — unauth ===\n")

  const points = await fetchJson(`/api/trade-center/points?studentId=${ALEX_DB}&session=${SESSION}`)
  expectAuthRejected("TC1-unauth-points", points.status)

  const history = await fetchJson(`/api/trade-center/my-history?studentId=${ALEX_DB}`)
  expectAuthRejected("TC1-unauth-history", history.status)

  const donations = await fetchJson(`/api/trade-center/donation-requests?studentId=${ALEX_DB}`)
  expectAuthRejected("TC1-unauth-donations", donations.status)

  const pointRequests = await fetchJson(`/api/trade-center/point-requests?studentId=${ALEX_DB}`)
  expectAuthRejected("TC1-unauth-point-requests", pointRequests.status)

  const config = await fetchJson("/api/trade-center/config")
  expectAuthRejected("TC1-unauth-config", config.status)

  const peers = await fetchJson(`/api/trade-center/peers?session=${SESSION}`)
  expectAuthRejected("TC1-unauth-peers", peers.status)

  console.log("\n=== TC1 header-only (not auth) ===\n")

  const headerOnly = { "x-student-id": ALEX_DB }

  const headerPoints = await fetchJson(`/api/trade-center/points?studentId=${ALEX_DB}&session=${SESSION}`, {
    headers: headerOnly,
  })
  expectAuthRejected("TC1-header-only-points", headerPoints.status)

  const headerHistory = await fetchJson(`/api/trade-center/my-history?studentId=${ALEX_DB}`, {
    headers: headerOnly,
  })
  expectAuthRejected("TC1-header-only-history", headerHistory.status)

  const headerPeers = await fetchJson(`/api/trade-center/peers?session=${SESSION}&excludeId=${ALEX_DB}`, {
    headers: headerOnly,
  })
  expectAuthRejected("TC1-header-only-peers", headerPeers.status)

  const headerConfig = await fetchJson("/api/trade-center/config", { headers: headerOnly })
  expectAuthRejected("TC1-header-only-config", headerConfig.status)

  console.log("\n=== TC2 trade / donate / sync ===\n")

  const unauthTrade = await fetchJson("/api/trade-center/trade", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ studentId: Number(ALEX_DB), session: SESSION, pointsToTrade: 999999 }),
  })
  expectStatus("TC2-unauth-trade", unauthTrade.status, 401)

  const unauthDonate = await fetchJson("/api/trade-center/donate", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      studentId: Number(ALEX_DB),
      session: SESSION,
      pointsToDonate: 1,
      poolType: "COMMUNITY",
    }),
  })
  expectStatus("TC2-unauth-donate", unauthDonate.status, 401)

  const unauthSync = await fetchJson("/api/trade-center/sync", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ studentId: Number(ALEX_DB), session: SESSION }),
  })
  expectStatus("TC2-unauth-sync", unauthSync.status, 401)

  console.log("\n=== TC3 peer approve / reject ===\n")

  const unauthApprove = await fetchJson("/api/trade-center/point-requests/999999/approve-peer", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ requesteeId: Number(ALEX_DB) }),
  })
  expectStatus("TC3-unauth-approve-peer", unauthApprove.status, 401)

  const unauthReject = await fetchJson("/api/trade-center/point-requests/999999/reject-peer", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ requesteeId: Number(ALEX_DB) }),
  })
  expectStatus("TC3-unauth-reject-peer", unauthReject.status, 401)

  console.log("\n=== TC4 / TC8 grade-perk + TC5 / TC6 ===\n")

  const unauthRolloverGet = await fetchJson(
    `/api/trade-center/points-for-rollover?studentId=${ALEX_DB}&session=${SESSION}`,
  )
  expectStatus("TC4-unauth-rollover-get", unauthRolloverGet.status, 401)

  const unauthExtraGet = await fetchJson(
    `/api/trade-center/points-for-extra-attempts?studentId=${ALEX_DB}&session=${SESSION}`,
  )
  expectStatus("TC4-unauth-extra-attempts-get", unauthExtraGet.status, 401)

  const unauthRolloverPost = await fetchJson("/api/trade-center/points-for-rollover", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      studentId: Number(ALEX_DB),
      session: SESSION,
      quizId: 1,
      hours: 12,
      sourceCategory: "homework",
    }),
  })
  expectStatus("TC8-unauth-rollover-post", unauthRolloverPost.status, 401)

  const headerDonateReq = await fetchJson("/api/trade-center/donation-requests", {
    method: "POST",
    headers: jsonHeaders(headerOnly),
    body: JSON.stringify({
      studentId: Number(ALEX_DB),
      session: SESSION,
      recipientId: Number(JORDAN_DB),
      points: 1,
      source: "total",
    }),
  })
  expectAuthRejected("TC5-header-only-donation-requests", headerDonateReq.status)

  const headerPointReq = await fetchJson("/api/trade-center/point-requests", {
    method: "POST",
    headers: jsonHeaders(headerOnly),
    body: JSON.stringify({
      requesterId: Number(ALEX_DB),
      session: SESSION,
      requesteeId: Number(JORDAN_DB),
      points: 1,
      source: "total",
    }),
  })
  expectAuthRejected("TC5-header-only-point-requests", headerPointReq.status)

  const unauthElig = await fetchJson(
    `/api/trade-center/classroom-transfer-eligibility?studentId=${ALEX_DB}&session=${SESSION}`,
  )
  expectStatus("TC6-unauth-eligibility", unauthElig.status, 401)

  console.log("\n=== Optional cookie bind (read-only; no trade/donate) ===\n")

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
    const ownPoints = await fetchJson(`/api/trade-center/points?studentId=${ALEX_DB}&session=${SESSION}`, {
      headers: proof,
    })
    if (ownPoints.status === 500) {
      fail("cookie-own-points", "HTTP 500")
    } else if (ownPoints.status === 200) {
      pass("cookie-own-points", "200 own wallet")
    } else {
      fail("cookie-own-points", `expected 200 after session bind, got ${ownPoints.status}`)
    }

    const spoof = await fetchJson(`/api/trade-center/points?studentId=${JORDAN_DB}&session=${SESSION}`, {
      headers: { ...proof, "x-student-id": JORDAN_DB },
    })
    expectStatus("cookie-alex-jordan-header", spoof.status, 403)
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
