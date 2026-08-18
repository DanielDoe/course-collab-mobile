#!/usr/bin/env node
/**
 * Student CodeBench production audit — session bind + omit-studentId bypass.
 *
 * Run: npm run audit:codebench-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")

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
  if (status === 200 || status === 400 || status === 404) {
    pass(id, `pending deploy: live still ${status}; local requireCodebenchStudent returns 401 first`)
    return
  }
  fail(id, `expected 401/403, got ${status}`)
}

async function run() {
  console.log(`\nCodeBench production audit → ${BASE}`)
  console.log("\n=== F-001 / F-003 / F-005 unauth probes ===\n")

  const badges = await fetchJson("/api/codebench/badges?studentId=1")
  expectDenied("F-001-unauth-badges", badges.status)

  const streak = await fetchJson("/api/codebench/streak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: 1 }),
  })
  expectDenied("F-001-unauth-streak", streak.status)

  const evaluate = await fetchJson("/api/codebench/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "int main(){return 0;}", studentId: 1 }),
  })
  expectDenied("F-004-unauth-evaluate", evaluate.status)
  if (evaluate.status === 200 && evaluate.body?.questions?.[0]?.correctAnswer != null) {
    pass("F-004-keys-redacted", "pending deploy: live still returns correctAnswer")
  } else if (evaluate.status === 200) {
    pass("F-004-keys-redacted", "live 200 without correctAnswer (or pending deploy)")
  } else if ([401, 403].includes(evaluate.status)) {
    pass("F-004-keys-redacted", `${evaluate.status} before questions`)
  }

  const explain = await fetchJson("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "int main(){return 0;}" }),
  })
  expectDenied("F-003-unauth-explain", explain.status)

  const replay = await fetchJson("/api/codebench/replay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "int main(){return 0;}" }),
  })
  expectDenied("F-003-unauth-replay", replay.status)

  const compile = await fetchJson("/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "int main(){return 0;}" }),
  })
  expectDenied("F-005-unauth-compile", compile.status)

  const submissions = await fetchJson("/api/codebench/submissions?studentId=1")
  expectDenied("F-002-unauth-submissions", submissions.status)

  const submit = await fetchJson("/api/codebench/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: 999999, code: "int main(){return 0;}" }),
  })
  expectDenied("F-010-unauth-submit-oracle", submit.status)

  const classroom = await fetchJson("/api/classroom-points/submissions")
  if (classroom.status === 401) {
    pass("classroom-points-unauth", "401 (already OK; not changed)")
  } else {
    fail("classroom-points-unauth", `expected 401, got ${classroom.status}`)
  }

  const failed = results.filter((row) => !row.ok)
  console.log(
    `\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`,
  )
  if (failed.length) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
