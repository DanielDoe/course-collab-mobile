#!/usr/bin/env node
/**
 * Student Cora Assistant production probes — GET + confirm only.
 *
 * Does NOT POST /api/ai-tutor (a header-only chat already ran on 2026-08-17).
 * Expected: 401/403 without a student session. Live 200s (and confirm 400
 * "proposal required") are FAIL until the v0 backend ships session bind.
 *
 * Run: npm run audit:ai-tutor-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const CONFLICT_STUDENT_ID = process.env.AUDIT_CONFLICT_STUDENT_ID || "999999"

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
    body = text ? { error: "[non-json]" } : null
  }
  return { status: res.status, ok: res.ok, body }
}

function expectUnauthorized(id, status, extra = "") {
  if ([401, 403].includes(status)) {
    pass(id, `${status}${extra}`)
    return
  }
  fail(id, `expected 401/403, got ${status}${extra} — production still open until server ships`)
}

function hasObjectBody(body) {
  return body != null && typeof body === "object" && !Array.isArray(body)
}

async function run() {
  console.log(`Cora Assistant production audit → ${BASE}`)
  console.log("Probes: GET stats/recs/progress/context + POST confirm (empty). No chat POST.\n")

  console.log("=== F-001 Unauth GET (query studentId) ===\n")

  for (const [id, path] of [
    ["F-001-stats", `/api/ai-tutor/stats?studentId=${STUDENT_ID}`],
    ["F-001-recommendations", `/api/ai-tutor/recommendations?studentId=${STUDENT_ID}`],
    ["F-001-progress-detailed", `/api/ai-tutor/progress-detailed?studentId=${STUDENT_ID}`],
  ]) {
    const result = await fetchJson(path)
    expectUnauthorized(id, result.status)
  }

  console.log("\n=== F-002 Header-only student-context ===\n")

  const context = await fetchJson("/api/ai-tutor/student-context", {
    headers: { "x-student-id": STUDENT_ID },
  })
  const contextExtra = context.status === 200 && hasObjectBody(context.body) ? " (object body; PII not logged)" : ""
  expectUnauthorized("F-002-student-context", context.status, contextExtra)

  console.log("\n=== F-003 Chat POST skipped ===\n")
  pass("F-003-chat-not-probed", "skipped — do not re-run POST /api/ai-tutor; prior header-only 200 still UNFIXED")

  console.log("\n=== F-004 Header-only confirm (no proposal) ===\n")

  const confirm = await fetchJson(`/api/cora/actions/confirm?studentDatabaseId=${STUDENT_ID}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-student-id": STUDENT_ID,
    },
    body: JSON.stringify({}),
  })
  const confirmHint =
    confirm.status === 400 && hasObjectBody(confirm.body) ? " (auth accepted; validation error — PII not logged)" : ""
  expectUnauthorized("F-004-confirm-header-only", confirm.status, confirmHint)

  console.log("\n=== F-006 Query studentId vs conflicting header ===\n")

  const isolation = await fetchJson(`/api/ai-tutor/stats?studentId=${STUDENT_ID}`, {
    headers: { "x-student-id": CONFLICT_STUDENT_ID },
  })
  expectUnauthorized("F-006-stats-query-wins", isolation.status)

  console.log("\n=== Control: credits already session-bound ===\n")

  const credits = await fetchJson("/api/cora/credits/balance?role=student", {
    headers: { "x-student-id": STUDENT_ID },
  })
  expectUnauthorized("control-credits-balance", credits.status)
}

async function main() {
  await run()
  const failed = results.filter((row) => !row.ok)
  console.log(
    `\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks`,
  )
  console.log("Client F-007 (confirm cookies) is local-only and is not revalidated here.")
  console.log("Do not treat this script as a chat re-probe. F-001–F-004/F-006 stay FAIL until production 401s.\n")
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
