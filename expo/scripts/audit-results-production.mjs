#!/usr/bin/env node
/**
 * Faculty / student results production audit — honest auth probes.
 *
 * Header-only x-instructor-id / x-student-id is NOT authentication.
 * HTTP 200 on those probes is the vulnerability (FAIL). HTTP 500 is never a pass.
 * 404 is not a pass for "auth works".
 *
 * Does not finalize live attempts. Does not POST a valid adjust-weight payload.
 *
 * Run: npm run audit:results-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "722"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"
const RESULTS_ATTEMPT_ID = process.env.AUDIT_RESULTS_ATTEMPT_ID || "4463"

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

function headerOnlyInstructor(courseId = COURSE_ID) {
  return {
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": String(courseId),
  }
}

function headerOnlyStudent(studentId = STUDENT_ID) {
  return { "x-student-id": String(studentId) }
}

/** Header-only identity must be rejected. 200 is the vuln. 500/404 are never a pass. */
function expectHeaderOnlyRejected(id, status, extra = "") {
  const suffix = extra ? ` ${extra}` : ""
  if (status === 200 || status === 201) {
    fail(id, `header-only accepted (${status})${suffix}`)
    return
  }
  if (status === 500) {
    fail(id, `HTTP 500 is not a pass${suffix}`)
    return
  }
  if (status === 404) {
    fail(id, `404 is not a pass for auth${suffix}`)
    return
  }
  if (status === 401) {
    pass(id, `401 rejected header-only${suffix}`)
    return
  }
  fail(id, `expected 401, got ${status}${suffix}`)
}

async function run() {
  console.log(`\nResults production audit → ${BASE}`)
  console.log("Header-only x-instructor-id / x-student-id is not auth. 200 = FAIL.")
  console.log("Does not finalize attempts. Does not POST valid adjust-weight.\n")

  console.log("=== Unauthenticated faculty list ===\n")

  const unauthList = await fetchJson("/api/instructor/results?limit=5")
  if (unauthList.status === 401) {
    pass("G2-unauth-faculty-list", "401")
  } else if (unauthList.status === 500) {
    fail("G2-unauth-faculty-list", "HTTP 500 is not a pass")
  } else {
    fail("G2-unauth-faculty-list", `expected 401, got ${unauthList.status}`)
  }

  console.log("\n=== Header-only (must not be 200) ===\n")

  const headerList = await fetchJson("/api/instructor/results?limit=5", {
    headers: headerOnlyInstructor(),
  })
  expectHeaderOnlyRejected("G2-header-only-faculty-list", headerList.status)

  const headerGrades = await fetchJson(
    `/api/grades/student?studentId=${encodeURIComponent(STUDENT_ID)}&session=${encodeURIComponent(SESSION)}`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("G1-header-only-grades", headerGrades.status, `student ${STUDENT_ID}`)

  const headerResults = await fetchJson(`/api/student/results/${RESULTS_ATTEMPT_ID}`, {
    headers: headerOnlyStudent(),
  })
  expectHeaderOnlyRejected(
    "G3-header-only-student-results",
    headerResults.status,
    `attempt ${RESULTS_ATTEMPT_ID}`,
  )

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
