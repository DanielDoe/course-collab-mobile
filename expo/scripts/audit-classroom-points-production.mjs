#!/usr/bin/env node
/**
 * Classroom Points production audit — session bind, course isolation, no answer-key leak.
 *
 * Expected after v0 deploy:
 *   unauth + header-only student/faculty GET/POST → 401 (or 403)
 *   header-only instructor reads → 401 (not 200)
 *   cookie Alex submissions have no question_config.expected_answer
 *   cookie faculty course 16 → 200; course 1 → 403
 *
 * Live today (unpatched) will FAIL. Do not treat 200/400 as pending-deploy PASS.
 *
 * NEVER approveAll. NEVER mutate assignment 169. NEVER award live students.
 * Optional cookie create title/description must contain AUDIT-DELETE, then DELETE in finally.
 *
 * Run: npm run audit:classroom-points-production
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
const FACULTY_USER = process.env.AUDIT_FACULTY_USER || "mchen"
const FACULTY_PASSWORD = process.env.AUDIT_FACULTY_PASSWORD || "Review26!"
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

/** Unauth / header-only probes must be 401 or 403. Never 200/201/404/500. */
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

function jsonHeaders(extra = {}) {
  return { "Content-Type": "application/json", ...extra }
}

function headerOnlyInstructor(courseId = COURSE_ID) {
  return { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": String(courseId) }
}

function headerOnlyStudent(studentId = ALEX_DB) {
  return { "x-student-id": String(studentId) }
}

function rowsHaveExpectedAnswer(payload) {
  const buckets = [
    payload?.submissions,
    payload?.missingSubmissions,
    payload?.pendingSubmissions,
    payload?.submission ? [payload.submission] : null,
  ]
  const leaked = []
  for (const rows of buckets) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      const config = row?.question_config
      if (config && typeof config === "object" && config.expected_answer != null && config.expected_answer !== "") {
        leaked.push(row.id)
      }
    }
  }
  return leaked
}

function solutionUploadForm(studentId, assignmentId = "167") {
  const form = new FormData()
  form.append("studentId", String(studentId))
  form.append("assignmentId", String(assignmentId))
  form.append("file", new Blob(["audit"], { type: "image/png" }), "audit.png")
  return form
}

async function loginAlex() {
  const res = await fetchJson("/api/auth/student/login", {
    method: "POST",
    headers: jsonHeaders(),
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

async function loginFaculty() {
  const res = await fetchJson("/api/instructor/login", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ username: FACULTY_USER, password: FACULTY_PASSWORD }),
  })
  const cookie = cookieHeaderFromResponse(res)
  const refresh = refreshFromCookie(cookie)
  return { status: res.status, body: res.body, cookie, refresh }
}

async function run() {
  console.log(`Classroom points production audit → ${BASE}\n`)
  console.log("Live 200/400 on unauth or header-only probes is FAIL until v0 is deployed.\n")

  console.log("=== Unauthenticated reads ===\n")

  for (const [id, path] of [
    ["CP-unauth-summary", "/api/classroom-points/summary"],
    ["CP-unauth-list", "/api/classroom-points"],
    ["CP-unauth-leaderboard", "/api/classroom-points/leaderboard"],
    ["CP-unauth-submissions", "/api/classroom-points/submissions"],
    ["CP-unauth-submissions-session", `/api/classroom-points/submissions?studentId=${ALEX_DB}&session=${SESSION}`],
    ["CP-unauth-submissions-by-id", "/api/classroom-points/submissions/167"],
    ["CP-unauth-submissions-manage", "/api/classroom-points/submissions?manage=1"],
    ["CP-unauth-practice", "/api/practice-points?status=pending"],
  ]) {
    const res = await fetchJson(path)
    expectAuthRejected(id, res.status)
  }

  console.log("\n=== Unauthenticated mutations ===\n")

  const approve = await fetchJson("/api/classroom-points/approve", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ id: 0 }),
  })
  expectAuthRejected("CP-unauth-approve", approve.status)

  const award = await fetchJson("/api/classroom-points", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      studentId: 1,
      points: 1,
      reason: "audit",
      session: SESSION,
    }),
  })
  expectAuthRejected("CP-unauth-award", award.status)

  const practiceApprove = await fetchJson("/api/practice-points/approve", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ id: 0 }),
  })
  expectAuthRejected("CP-unauth-practice-approve", practiceApprove.status)

  const submit = await fetchJson("/api/classroom-points/submit-code", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ code: "x", studentId: ALEX_ROSTER, submissionId: 1 }),
  })
  expectAuthRejected("CP-unauth-submit", submit.status)

  const validate = await fetchJson("/api/classroom-points/validate-code", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ code: "x", assignmentTitle: "audit", assignmentDescription: null }),
  })
  expectAuthRejected("CP-unauth-validate", validate.status)

  const reject = await fetchJson("/api/classroom-points/approve?id=0", { method: "DELETE" })
  expectAuthRejected("CP-unauth-reject", reject.status)

  const unauthUpload = await fetchJson("/api/student/classroom-points/solution-upload", {
    method: "POST",
    body: solutionUploadForm(ALEX_DB),
  })
  expectAuthRejected("CP2-unauth-solution-upload", unauthUpload.status)

  console.log("\n=== Header-only student (not auth) ===\n")

  const studentHeader = headerOnlyStudent()

  for (const [id, path] of [
    ["CP-header-only-list", `/api/classroom-points?studentId=${ALEX_DB}`],
    ["CP-header-only-submissions", `/api/classroom-points/submissions?studentId=${ALEX_DB}&session=${SESSION}`],
    ["CP-header-only-submissions-by-id", "/api/classroom-points/submissions/167"],
    ["CP-header-only-summary", "/api/classroom-points/summary"],
  ]) {
    const res = await fetchJson(path, { headers: studentHeader })
    expectAuthRejected(id, res.status)
  }

  const headerUpload = await fetchJson("/api/student/classroom-points/solution-upload", {
    method: "POST",
    headers: studentHeader,
    body: solutionUploadForm(ALEX_DB),
  })
  expectAuthRejected("CP2-header-only-solution-upload", headerUpload.status)

  console.log("\n=== Header-only instructor (not auth) ===\n")

  const instructorHeader = headerOnlyInstructor()

  for (const [id, path] of [
    ["CP-header-only-instructor-list", "/api/classroom-points?limit=5"],
    ["CP-header-only-instructor-summary", "/api/classroom-points/summary"],
    ["CP-header-only-instructor-manage", "/api/classroom-points/submissions?manage=1"],
    ["CP-header-only-instructor-by-id", "/api/classroom-points/submissions/167"],
  ]) {
    const res = await fetchJson(path, { headers: instructorHeader })
    expectAuthRejected(id, res.status)
  }

  const headerAward = await fetchJson("/api/classroom-points", {
    method: "POST",
    headers: jsonHeaders(instructorHeader),
    body: JSON.stringify({
      studentId: Number(ALEX_DB),
      points: 1,
      reason: "audit",
      session: SESSION,
    }),
  })
  expectAuthRejected("CP-header-only-instructor-award", headerAward.status)

  console.log("\n=== Cookie Alex + optional faculty ===\n")

  const login = await loginAlex()
  const alexProof = {
    Cookie: login.cookie,
    ...(login.refresh ? { "x-cc-refresh": login.refresh } : {}),
    "x-student-id": ALEX_DB,
  }

  if (!login.cookie && !login.refresh) {
    fail("cookie-alex-login", `no session (HTTP ${login.status})`)
  } else {
    pass("cookie-alex-login", "session proof collected")

    const own = await fetchJson(
      `/api/classroom-points/submissions?studentId=${ALEX_DB}&session=${SESSION}`,
      { headers: alexProof },
    )
    if (own.status === 500) {
      fail("cookie-alex-submissions", "HTTP 500")
    } else if (own.status === 200) {
      const leaked = rowsHaveExpectedAnswer(own.body)
      if (leaked.length) {
        fail("CP1-cookie-alex-no-expected-answer", `expected_answer on ids ${leaked.join(",")}`)
      } else {
        pass("cookie-alex-submissions", `200 ${(own.body?.submissions ?? []).length} rows`)
        pass("CP1-cookie-alex-no-expected-answer", "no expected_answer in list payloads")
      }
    } else {
      fail("cookie-alex-submissions", `expected 200 after session bind, got ${own.status}`)
    }

    const byId = await fetchJson("/api/classroom-points/submissions/167", { headers: alexProof })
    if (byId.status === 500) {
      fail("cookie-alex-submissions-167", "HTTP 500")
    } else if (byId.status === 200) {
      const leaked = rowsHaveExpectedAnswer(byId.body)
      if (leaked.length) {
        fail("CP1-cookie-alex-167-no-expected-answer", "expected_answer present on GET 167")
      } else {
        pass("cookie-alex-submissions-167", "200")
        pass("CP1-cookie-alex-167-no-expected-answer", "no expected_answer")
      }
    } else if (byId.status === 404) {
      pass("cookie-alex-submissions-167", "404 out of course or missing")
    } else {
      fail("cookie-alex-submissions-167", `expected 200/404, got ${byId.status}`)
    }

    const spoofHeader = await fetchJson(
      `/api/classroom-points/submissions?studentId=${JORDAN_DB}&session=${SESSION}`,
      { headers: { ...alexProof, "x-student-id": JORDAN_DB } },
    )
    expectStatus("cookie-alex-jordan-header", spoofHeader.status, 403)

    const spoofUpload = await fetchJson("/api/student/classroom-points/solution-upload", {
      method: "POST",
      headers: alexProof,
      body: solutionUploadForm(JORDAN_DB),
    })
    expectStatus("CP2-cookie-alex-jordan-upload", spoofUpload.status, 403)
  }

  const facLogin = await loginFaculty()
  const facProof = {
    Cookie: facLogin.cookie,
    ...(facLogin.refresh ? { "x-cc-refresh": facLogin.refresh } : {}),
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": COURSE_ID,
  }

  let createdId = null
  try {
    if (!facLogin.cookie && !facLogin.refresh) {
      pass("cookie-faculty-login", `skipped — no session (HTTP ${facLogin.status})`)
    } else {
      pass("cookie-faculty-login", "session proof collected")

      const ownCourse = await fetchJson("/api/classroom-points/submissions?manage=1", {
        headers: facProof,
      })
      if (ownCourse.status === 200) {
        pass("cookie-faculty-course-16", `200 ${(ownCourse.body?.submissions ?? []).length} rows`)
      } else {
        fail("cookie-faculty-course-16", `expected 200, got ${ownCourse.status}`)
      }

      const foreign = await fetchJson("/api/classroom-points/submissions?manage=1", {
        headers: { ...facProof, "x-course-id": IDOR_COURSE_ID },
      })
      expectStatus("cookie-faculty-course-1", foreign.status, 403)

      const title = "AUDIT-DELETE classroom points production script — do not keep"
      const created = await fetchJson("/api/classroom-points/submissions", {
        method: "POST",
        headers: jsonHeaders(facProof),
        body: JSON.stringify({
          title,
          description: "AUDIT-DELETE do not keep",
          session: SESSION,
          durationHours: 1,
          submissionKind: "code",
        }),
      })
      createdId = created.body?.submission?.id ?? created.body?.id ?? null
      if (!title.includes("AUDIT-DELETE")) {
        fail("cookie-faculty-create", "payload title missing AUDIT-DELETE")
      } else if (!created.ok || createdId == null) {
        pass("cookie-faculty-create", `skipped — ${created.status} ${created.body?.error ?? ""}`.trim())
      } else {
        pass("cookie-faculty-create", `id ${createdId}`)
      }
    }
  } finally {
    if (createdId && (facLogin.cookie || facLogin.refresh)) {
      const removed = await fetchJson(`/api/classroom-points/submissions/${createdId}`, {
        method: "DELETE",
        headers: facProof,
      })
      if (removed.ok) pass("cookie-faculty-delete", `id ${createdId}`)
      else fail("cookie-faculty-delete", `${removed.status} ${removed.body?.error ?? ""}`)
    }
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
