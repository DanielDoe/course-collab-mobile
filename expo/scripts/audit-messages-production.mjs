#!/usr/bin/env node
/**
 * Messages production audit — unauth + header-only probes (M1 / M2 / M3).
 *
 * Run: npm run audit:messages-production
 *
 * Does not invent cookies. Does not mark send/create E2E as pass.
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
  fail(id, `expected 401/403, got ${status}`)
}

async function run() {
  console.log(`Messages production audit → ${BASE}`)
  console.log("\n=== Unauth / header-only ===\n")

  const unauth = await fetchJson("/api/messages/threads")
  expectDenied("unauth-threads", unauth.status)

  const student722 = await fetchJson("/api/messages/threads", {
    headers: { "x-student-id": "722" },
  })
  expectDenied("header-only-student-722", student722.status)

  const student910 = await fetchJson("/api/messages/threads", {
    headers: { "x-student-id": "910000001" },
  })
  expectDenied("header-only-student-910000001", student910.status)

  const instructor15 = await fetchJson("/api/messages/threads", {
    headers: { "x-instructor-id": "15" },
  })
  expectDenied("header-only-instructor-15", instructor15.status)

  const recipients = await fetchJson("/api/messages/recipients?q=Alex", {
    headers: { "x-student-id": "722" },
  })
  if ([401, 403].includes(recipients.status)) {
    pass("header-only-recipients-alex", `${recipients.status}`)
  } else if (
    recipients.status === 200 &&
    Array.isArray(recipients.body?.recipients) &&
    recipients.body.recipients.length > 0
  ) {
    fail(
      "header-only-recipients-alex",
      `200 with ${recipients.body.recipients.length} recipients`,
    )
  } else {
    fail("header-only-recipients-alex", `expected 401/403, got ${recipients.status}`)
  }

  const failed = results.filter((r) => !r.ok)
  console.log(
    `\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`,
  )
  if (failed.length) process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
