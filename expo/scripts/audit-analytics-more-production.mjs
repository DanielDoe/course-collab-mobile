#!/usr/bin/env node
/**
 * Analytics & More production probes (A-001–A-005, A-003 membership).
 *
 * Expected after deploy:
 *   unauth GET/POST /api/codebench/badges → 401
 *   unauth POST /api/codebench/streak → 401
 *   unauth GET streak/submissions/leaderboard without studentId → 401
 *   Alex cookie + Jordan studentId=723 on badges → 403
 *   faculty analytics unauth + x-instructor-id:15 + x-course-id:16 → 401
 *   Scholar 722 still 403 Trailblazer on gated reads AFTER auth
 *
 * Live today (unpatched): badges/streak POST 200; missing studentId 400;
 * faculty header-only 200. Those are FAIL until v0 is deployed.
 *
 * Run: npm run audit:analytics-more-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const ALEX_ROSTER = process.env.AUDIT_STUDENT_ID || "910000001"
const ALEX_DB = process.env.AUDIT_STUDENT_DB_ID || "722"
const JORDAN_DB = process.env.AUDIT_PEER_STUDENT_DB_ID || "723"
const UNIVERSITY_ID = Number(process.env.AUDIT_UNIVERSITY_ID || 2)
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const STUDENT_PASSWORD = process.env.AUDIT_STUDENT_PASSWORD || "Review26!"

const FACULTY_ANALYTICS = [
  "/api/instructor/practice/student-progress",
  "/api/instructor/practice/analytics",
  "/api/instructor/reports",
  "/api/instructor/progress-reviews",
  "/api/instructor/dashboard/stats",
]

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
  if (allowed.includes(actual)) {
    pass(id, `${actual}${extra}`)
    return true
  }
  fail(id, `expected ${allowed.join("/")}, got ${actual}${extra}`)
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

async function run() {
  console.log(`Analytics & More production audit → ${BASE}\n`)

  console.log("=== A-001 Unauth CodeBench analytics ===\n")

  const unauthGetBadges = await fetchJson(`/api/codebench/badges?studentId=${ALEX_DB}`)
  expectStatus("A-001-unauth-get-badges", unauthGetBadges.status, 401)

  const unauthPostBadges = await fetchJson("/api/codebench/badges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: Number(ALEX_DB) }),
  })
  expectStatus("A-001-unauth-post-badges", unauthPostBadges.status, 401)

  const unauthPostStreak = await fetchJson("/api/codebench/streak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: Number(ALEX_DB) }),
  })
  expectStatus("A-001-unauth-post-streak", unauthPostStreak.status, 401)

  for (const [id, path] of [
    ["A-001-unauth-get-streak-no-id", "/api/codebench/streak"],
    ["A-001-unauth-get-submissions-no-id", "/api/codebench/submissions"],
    ["A-001-unauth-get-leaderboard-no-id", "/api/codebench/leaderboard"],
  ]) {
    const result = await fetchJson(path)
    if (result.status === 400 && result.body?.error === "Student ID required") {
      fail(id, `400 Student ID required — auth is not the gate`)
    } else {
      expectStatus(id, result.status, 401)
    }
  }

  console.log("\n=== A-005 Faculty analytics header-only ===\n")

  for (const path of FACULTY_ANALYTICS) {
    const result = await fetchJson(path, {
      headers: {
        "x-instructor-id": INSTRUCTOR_ID,
        "x-course-id": COURSE_ID,
      },
    })
    expectStatus(`A-005-unauth-headers ${path}`, result.status, 401)
  }

  console.log("\n=== A-002 / A-003 Session + Scholar membership ===\n")

  const login = await loginAlex()
  if (!login.cookie && !login.refresh) {
    fail("A-002-alex-login", `no session cookie (HTTP ${login.status})`)
    fail("A-002-alex-cookie-jordan-badges", "skipped — no Alex session")
    fail("A-003-scholar-gated-after-auth", "skipped — no Alex session")
  } else {
    pass("A-002-alex-login", "session proof collected")
    const proof = {
      Cookie: login.cookie,
      ...(login.refresh ? { "x-cc-refresh": login.refresh } : {}),
      "x-student-id": ALEX_DB,
    }

    const idor = await fetchJson(`/api/codebench/badges?studentId=${JORDAN_DB}`, { headers: proof })
    expectStatus("A-002-alex-cookie-jordan-badges", idor.status, 403)

    for (const [id, path] of [
      ["A-003-scholar-streak", `/api/codebench/streak?studentId=${ALEX_DB}`],
      ["A-003-scholar-submissions", `/api/codebench/submissions?studentId=${ALEX_DB}`],
      ["A-003-scholar-leaderboard", `/api/codebench/leaderboard?studentId=${ALEX_DB}`],
      ["A-003-scholar-badges", `/api/codebench/badges?studentId=${ALEX_DB}`],
    ]) {
      const result = await fetchJson(path, { headers: proof })
      if (result.status === 403) {
        const message = typeof result.body?.error === "string" ? result.body.error : ""
        if (/trailblazer/i.test(message) || /membership/i.test(message)) {
          pass(id, `403 ${message}`)
        } else {
          pass(id, `403 ${message || "forbidden"}`)
        }
      } else {
        fail(id, `expected 403 Trailblazer after auth, got ${result.status}`)
      }
    }
  }

  const failed = results.filter((row) => !row.ok)
  console.log(`\n${results.length - failed.length}/${results.length} probes passed`)
  if (failed.length) {
    console.error("Production still unpatched or login failed. Do not mark READY.")
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
