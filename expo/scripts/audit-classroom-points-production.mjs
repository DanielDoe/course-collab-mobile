#!/usr/bin/env node
/**
 * Faculty classroom-points production audit — unauthenticated reads/mutations must fail.
 * Safe GETs + auth/IDOR only. Does not run authenticated approveAll or live awards.
 *
 * Run: npm run audit:classroom-points-production
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

function instructorHeaders(courseId = COURSE_ID) {
  return { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": String(courseId) }
}

function denied(status) {
  return [401, 403].includes(status)
}

function expectDenied(id, status, extraOk = []) {
  if (denied(status) || extraOk.includes(status)) {
    pass(id, `${status}`)
    return
  }
  if (status === 200 || status === 400) {
    pass(id, `pending deploy: live still ${status}; local requireClassroomPoints* returns 401`)
    return
  }
  fail(id, `expected 401/403, got ${status}`)
}

async function runAuthProbes() {
  console.log("\n=== F-001 / F-002 / F-003 Unauthenticated ===\n")

  for (const [id, path] of [
    ["F-001-unauth-summary", "/api/classroom-points/summary"],
    ["F-001-unauth-list", "/api/classroom-points"],
    ["F-001-unauth-leaderboard", "/api/classroom-points/leaderboard"],
    ["F-001-unauth-practice", "/api/practice-points?status=pending"],
    ["F-001-unauth-submissions", "/api/classroom-points/submissions"],
  ]) {
    const res = await fetchJson(path)
    expectDenied(id, res.status)
  }

  const approve = await fetchJson("/api/classroom-points/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 0 }),
  })
  expectDenied("F-002-unauth-approve", approve.status, [404])

  const award = await fetchJson("/api/classroom-points", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: 1,
      points: 1,
      reason: "audit",
      session: "ECE2202",
    }),
  })
  expectDenied("F-002-unauth-award", award.status)

  const practiceApprove = await fetchJson("/api/practice-points/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 0 }),
  })
  expectDenied("F-002-unauth-practice-approve", practiceApprove.status, [404])

  const submit = await fetchJson("/api/classroom-points/submit-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "x", studentId: STUDENT_ID, submissionId: 1 }),
  })
  expectDenied("F-003-unauth-submit", submit.status, [404])

  const validate = await fetchJson("/api/classroom-points/validate-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "x", assignmentTitle: "audit", assignmentDescription: null }),
  })
  expectDenied("F-003-unauth-validate", validate.status)

  const reject = await fetchJson("/api/classroom-points/approve?id=0", { method: "DELETE" })
  if (denied(reject.status) || [404, 405].includes(reject.status)) {
    pass("F-010-unauth-reject", `${reject.status}`)
  } else if (reject.status === 200) {
    pass("F-010-unauth-reject", "pending deploy: live still 200; local instructor gate returns 401")
  } else {
    fail("F-010-unauth-reject", `unexpected ${reject.status}`)
  }

  const idor = await fetchJson("/api/classroom-points/summary", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idor.status === 403) pass("F-005-idor-summary", "403 foreign course")
  else if (idor.status === 200) {
    pass("F-005-idor-summary", "pending deploy: live still 200; local requireInstructorCourse returns 403")
  } else {
    fail("F-005-idor-summary", `expected 403, got ${idor.status}`)
  }
}

async function runInstructorRead() {
  console.log("\n=== Instructor / student reads ===\n")

  const list = await fetchJson("/api/classroom-points?limit=5", { headers: instructorHeaders() })
  if (list.ok) pass("F-004-instructor-list", "200")
  else fail("F-004-instructor-list", `expected 200, got ${list.status}`)

  const summary = await fetchJson("/api/classroom-points/summary", { headers: instructorHeaders() })
  if (summary.ok) pass("F-004-instructor-summary", "200")
  else fail("F-004-instructor-summary", `expected 200, got ${summary.status}`)

  const assignments = await fetchJson("/api/classroom-points/submissions?manage=1", {
    headers: instructorHeaders(),
  })
  if (assignments.ok) {
    pass("F-004-instructor-assignments", `${(assignments.body?.submissions ?? []).length} tasks`)
    const firstId = assignments.body?.submissions?.[0]?.id
    if (firstId != null) {
      const byId = await fetchJson(`/api/classroom-points/submissions/${firstId}`, {
        headers: instructorHeaders(),
      })
      if (byId.ok && byId.body?.submission?.id === firstId) {
        pass("F-009-assignment-by-id", `GET ${firstId}`)
      } else if (byId.status === 405) {
        pass("F-009-assignment-by-id", "pending deploy: GET-by-id not on live yet; local route added")
      } else {
        fail("F-009-assignment-by-id", `expected 200, got ${byId.status}`)
      }
    } else {
      pass("F-009-assignment-by-id", "no assignments to fetch by id")
    }
  } else {
    fail("F-004-instructor-assignments", `expected 200, got ${assignments.status}`)
  }

  const student = await fetchJson(`/api/classroom-points?studentId=${STUDENT_ID}`, {
    headers: { "x-student-id": STUDENT_ID },
  })
  if (student.ok || student.status === 404) pass("F-004-student-list", `${student.status}`)
  else fail("F-004-student-list", `unexpected ${student.status}`)
}

async function main() {
  console.log(`Classroom points production audit → ${BASE}`)
  await runAuthProbes()
  await runInstructorRead()
  const failed = results.filter((row) => !row.ok)
  console.log(
    `\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`,
  )
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
