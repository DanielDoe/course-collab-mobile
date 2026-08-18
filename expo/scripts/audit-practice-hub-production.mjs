#!/usr/bin/env node
/**
 * Student Practice Hub production probes (read-only).
 *
 * Expects session-bound APIs after deploy:
 *   unauth topics-progress / leaderboard / topics / history → 401
 *   unauth evaluate (no attempt) → 401
 *
 * Until deploy, live production will FAIL. That is expected.
 *
 * Run: npm run audit:practice-hub-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const JORDAN_ID = process.env.AUDIT_JORDAN_ID || "910000002"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"

const results = []

function pass(id, detail) {
  results.push({ id, ok: true, detail })
  console.log(`  PASS  ${id}${detail ? ` — ${detail}` : ""}`)
}

function fail(id, detail) {
  results.push({ id, ok: false, detail })
  console.error(`  FAIL  ${id}${detail ? ` — ${detail}` : ""}`)
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

function expectUnauthorized(id, status, extra = "") {
  if (status === 401) {
    pass(id, `401${extra ? ` ${extra}` : ""}`)
    return
  }
  fail(id, `expected 401, got ${status}${extra ? ` ${extra}` : ""}`)
}

async function run() {
  console.log(`\nPractice Hub student probes → ${BASE}`)
  console.log("Read-only GETs plus one unauth evaluate (no attempt / no write).\n")

  console.log("=== Unauthenticated identity / catalog ===\n")

  const topicsProgress = await fetchJson(
    `/api/practice/topics-progress?studentId=${encodeURIComponent(STUDENT_ID)}`,
  )
  expectUnauthorized("P-001-topics-progress-alex", topicsProgress.status)

  const jordanProgress = await fetchJson(
    `/api/practice/topics-progress?studentId=${encodeURIComponent(JORDAN_ID)}`,
  )
  expectUnauthorized("P-001-topics-progress-jordan", jordanProgress.status)

  const recent = await fetchJson(
    `/api/practice/recent-sessions?studentId=${encodeURIComponent(STUDENT_ID)}`,
  )
  expectUnauthorized("P-001-recent-sessions", recent.status)

  const history = await fetchJson(`/api/practice/history?studentId=${encodeURIComponent(STUDENT_ID)}`)
  expectUnauthorized("P-001-history", history.status)

  const analytics = await fetchJson(
    `/api/practice/analytics?studentId=${encodeURIComponent(STUDENT_ID)}`,
  )
  expectUnauthorized("P-001-analytics", analytics.status)

  const stats = await fetchJson(`/api/practice/stats?studentId=${encodeURIComponent(STUDENT_ID)}`)
  expectUnauthorized("P-001-stats", stats.status)

  const daily = await fetchJson(
    `/api/practice/daily-limit?studentId=${encodeURIComponent(STUDENT_ID)}`,
  )
  expectUnauthorized("P-001-daily-limit", daily.status)

  const comparison = await fetchJson(
    `/api/practice/comparison?studentId=${encodeURIComponent(STUDENT_ID)}`,
  )
  expectUnauthorized("P-001-comparison", comparison.status)

  const publicLeaderboard = await fetchJson(
    `/api/practice/leaderboard?session=${encodeURIComponent(SESSION)}`,
  )
  expectUnauthorized("P-003-leaderboard-no-studentId", publicLeaderboard.status)

  const scholarLeaderboard = await fetchJson(
    `/api/practice/leaderboard?studentId=${encodeURIComponent(STUDENT_ID)}`,
  )
  if (scholarLeaderboard.status === 401 || scholarLeaderboard.status === 403) {
    pass("P-003-leaderboard-with-studentId", `${scholarLeaderboard.status} (no public PII)`)
  } else {
    fail("P-003-leaderboard-with-studentId", `expected 401/403, got ${scholarLeaderboard.status}`)
  }

  const topics = await fetchJson("/api/practice/topics")
  expectUnauthorized("P-004-topics-catalog", topics.status)

  const headerStats = await fetchJson("/api/student/practice/stats", {
    headers: { "x-student-id": STUDENT_ID },
  })
  expectUnauthorized("P-007-header-only-stats", headerStats.status)

  console.log("\n=== Unauthenticated evaluate (no attemptId, no write) ===\n")

  const evaluate = await fetchJson("/api/practice/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: 1, answer: "A" }),
  })
  if (evaluate.status === 401) {
    pass("P-002-evaluate-unauth", "401")
  } else if (evaluate.status === 400 && !evaluate.body?.answerReview) {
    pass("P-002-evaluate-unauth", `400 without answerReview`)
  } else {
    fail(
      "P-002-evaluate-unauth",
      `expected 401 (or 400 without keys), got ${evaluate.status}${
        evaluate.body?.answerReview ? " with answerReview" : ""
      }`,
    )
  }

  const passed = results.filter((row) => row.ok).length
  const failed = results.filter((row) => !row.ok).length
  console.log(`\n${passed} PASS / ${failed} FAIL of ${results.length}`)
  if (failed > 0) {
    console.error("Production is still unpatched until deploy. Local code is not live.")
    process.exit(1)
  }
  console.log("All Practice Hub unauth probes returned 401/403.")
}

run().catch((error) => {
  console.error("audit-practice-hub-production failed:", error)
  process.exit(1)
})
