#!/usr/bin/env node
/**
 * Office Hours production audit — student session bind + instructor course scope.
 *
 * Expected after v0 deploy:
 *   unauth + header-only student GET/POST/PATCH/DELETE → 401
 *   unauth + header-only faculty GET/POST/PATCH + regular GET/POST → 401
 *   cookie Alex GET 200; Alex + Jordan header 403
 *   cookie faculty course 16 200; course 1 403
 *   cookie student POST topic contains AUDIT-DELETE; faculty GET contains it;
 *   unauth DELETE of that id → 401; cookie owner DELETE in finally
 *
 * Live 200/400/404 on unauth DELETE is FAIL until v0 is deployed.
 * Do not treat header-only as login. Never PATCH approve/decline live ids.
 * Never POST regular hours with a non-empty slots array.
 *
 * Run: npm run audit:office-hours-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const ALEX_ROSTER = process.env.AUDIT_STUDENT_ID || "910000001"
const ALEX_DB = process.env.AUDIT_STUDENT_DB_ID || "722"
const JORDAN_DB = process.env.AUDIT_PEER_STUDENT_DB_ID || "723"
const UNIVERSITY_ID = Number(process.env.AUDIT_UNIVERSITY_ID || 2)
const STUDENT_PASSWORD = process.env.AUDIT_STUDENT_PASSWORD || "Review26!"
const FACULTY_USER = process.env.AUDIT_FACULTY_USER || "mchen"
const FACULTY_PASSWORD = process.env.AUDIT_FACULTY_PASSWORD || "Review26!"
const IDOR_COURSE_ID = process.env.AUDIT_IDOR_COURSE_ID || "1"
const PROBE_ID = process.env.AUDIT_OFFICE_HOURS_PROBE_ID || "999991"

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

/** Unauth / header-only probes must be 401 or 403. Never 200/201/400/404/500. */
function expectAuthRejected(id, status, extra = "") {
  if (status === 500) {
    fail(id, `HTTP 500${extra}`)
    return false
  }
  if (status === 200 || status === 201) {
    fail(id, `handler ran (${status}) — not auth-closed${extra}`)
    return false
  }
  if (status === 400) {
    fail(id, `400 is not auth-closed — expected 401/403${extra}`)
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

function headerOnlyFaculty(courseId = COURSE_ID) {
  return { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": String(courseId) }
}

function headerOnlyStudent(studentId = ALEX_DB) {
  return { "x-student-id": String(studentId) }
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

function requestIdFromBody(body) {
  const id = body?.request?.id ?? body?.id ?? null
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

function findRequest(items, marker, id) {
  return (items ?? []).find((row) => row.id === id || row.topic === marker || row.topic?.includes(marker))
}

async function run() {
  console.log(`Office Hours production audit → ${BASE}\n`)
  console.log("Header-only x-instructor-id / x-student-id is not auth. 200/400/404 = FAIL.\n")

  const studentListPath = `/api/student/office-hours?studentId=${ALEX_DB}`
  const studentPatchPath = `/api/student/office-hours/${PROBE_ID}`
  const studentDeletePath = `/api/student/office-hours/${PROBE_ID}`
  const studentDeleteWithId = `${studentDeletePath}?studentId=${ALEX_DB}`

  console.log("=== Unauth + header-only student ===\n")

  expectAuthRejected("OH-unauth-student-get", (await fetchJson(studentListPath)).status)
  expectAuthRejected(
    "OH-header-only-student-get",
    (await fetchJson(studentListPath, { headers: headerOnlyStudent() })).status,
  )

  const studentPostBody = JSON.stringify({ studentId: Number(ALEX_DB), topic: "should-not-create" })
  expectAuthRejected(
    "OH-unauth-student-post",
    (
      await fetchJson("/api/student/office-hours", {
        method: "POST",
        headers: jsonHeaders(),
        body: studentPostBody,
      })
    ).status,
  )
  expectAuthRejected(
    "OH-header-only-student-post",
    (
      await fetchJson("/api/student/office-hours", {
        method: "POST",
        headers: jsonHeaders(headerOnlyStudent()),
        body: studentPostBody,
      })
    ).status,
  )

  const studentPatchBody = JSON.stringify({ studentId: Number(ALEX_DB), topic: "should-not-update" })
  expectAuthRejected(
    "OH-unauth-student-patch",
    (
      await fetchJson(studentPatchPath, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: studentPatchBody,
      })
    ).status,
  )
  expectAuthRejected(
    "OH-header-only-student-patch",
    (
      await fetchJson(studentPatchPath, {
        method: "PATCH",
        headers: jsonHeaders(headerOnlyStudent()),
        body: studentPatchBody,
      })
    ).status,
  )

  expectAuthRejected("OH-unauth-student-delete", (await fetchJson(studentDeletePath, { method: "DELETE" })).status)
  expectAuthRejected(
    "OH-unauth-student-delete-studentId",
    (await fetchJson(studentDeleteWithId, { method: "DELETE" })).status,
  )
  expectAuthRejected(
    "OH-header-only-student-delete",
    (await fetchJson(studentDeletePath, { method: "DELETE", headers: headerOnlyStudent() })).status,
  )
  expectAuthRejected(
    "OH-header-only-student-delete-studentId",
    (await fetchJson(studentDeleteWithId, { method: "DELETE", headers: headerOnlyStudent() })).status,
  )

  console.log("\n=== Unauth + header-only faculty ===\n")

  expectAuthRejected("OH-unauth-faculty-get", (await fetchJson("/api/instructor/office-hours")).status)
  expectAuthRejected(
    "OH-header-only-faculty-get",
    (await fetchJson("/api/instructor/office-hours", { headers: headerOnlyFaculty() })).status,
  )
  expectAuthRejected(
    "OH-header-only-faculty-get-foreign",
    (
      await fetchJson("/api/instructor/office-hours", {
        headers: headerOnlyFaculty(IDOR_COURSE_ID),
      })
    ).status,
  )

  const facultyPostBody = JSON.stringify({ studentId: Number(ALEX_DB), topic: "should-not-create" })
  expectAuthRejected(
    "OH-unauth-faculty-post",
    (
      await fetchJson("/api/instructor/office-hours", {
        method: "POST",
        headers: jsonHeaders(),
        body: facultyPostBody,
      })
    ).status,
  )
  expectAuthRejected(
    "OH-header-only-faculty-post",
    (
      await fetchJson("/api/instructor/office-hours", {
        method: "POST",
        headers: jsonHeaders(headerOnlyFaculty()),
        body: facultyPostBody,
      })
    ).status,
  )

  const facultyPatchBody = JSON.stringify({})
  expectAuthRejected(
    "OH-unauth-faculty-patch",
    (
      await fetchJson("/api/instructor/office-hours/1", {
        method: "PATCH",
        headers: jsonHeaders(),
        body: facultyPatchBody,
      })
    ).status,
  )
  expectAuthRejected(
    "OH-header-only-faculty-patch",
    (
      await fetchJson("/api/instructor/office-hours/1", {
        method: "PATCH",
        headers: jsonHeaders(headerOnlyFaculty()),
        body: facultyPatchBody,
      })
    ).status,
  )

  expectAuthRejected("OH-unauth-faculty-regular-get", (await fetchJson("/api/instructor/office-hours/regular")).status)
  expectAuthRejected(
    "OH-header-only-faculty-regular-get",
    (await fetchJson("/api/instructor/office-hours/regular", { headers: headerOnlyFaculty() })).status,
  )

  const regularEmptySlots = JSON.stringify({ slots: [] })
  expectAuthRejected(
    "OH-unauth-faculty-regular-post",
    (
      await fetchJson("/api/instructor/office-hours/regular", {
        method: "POST",
        headers: jsonHeaders(),
        body: regularEmptySlots,
      })
    ).status,
  )
  expectAuthRejected(
    "OH-header-only-faculty-regular-post",
    (
      await fetchJson("/api/instructor/office-hours/regular", {
        method: "POST",
        headers: jsonHeaders(headerOnlyFaculty()),
        body: regularEmptySlots,
      })
    ).status,
  )

  console.log("\n=== Cookie Alex ===\n")

  const alexLogin = await loginAlex()
  const alexProof = {
    Cookie: alexLogin.cookie,
    ...(alexLogin.refresh ? { "x-cc-refresh": alexLogin.refresh } : {}),
    "x-student-id": ALEX_DB,
  }
  const hasAlex = Boolean(alexLogin.cookie || alexLogin.refresh)

  if (!hasAlex) {
    pass("cookie-alex-login", `skipped — no session (HTTP ${alexLogin.status})`)
  } else {
    pass("cookie-alex-login", "session proof collected")
    const ownList = await fetchJson(studentListPath, { headers: alexProof })
    if (ownList.status === 200) {
      pass("cookie-alex-get", `200 n=${(ownList.body?.requests ?? []).length}`)
    } else {
      fail("cookie-alex-get", `expected 200, got ${ownList.status}`)
    }

    const spoof = await fetchJson(`/api/student/office-hours?studentId=${JORDAN_DB}`, {
      headers: { ...alexProof, "x-student-id": JORDAN_DB },
    })
    expectStatus("cookie-alex-jordan-header", spoof.status, 403)
  }

  console.log("\n=== Cookie faculty + AUDIT-DELETE create ===\n")

  const facLogin = await loginFaculty()
  const facProof = {
    Cookie: facLogin.cookie,
    ...(facLogin.refresh ? { "x-cc-refresh": facLogin.refresh } : {}),
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": COURSE_ID,
  }
  const hasFaculty = Boolean(facLogin.cookie || facLogin.refresh)

  let createdId = null
  const marker = `AUDIT-DELETE office hours production script — do not keep ${Date.now()}`

  try {
    if (!hasFaculty) {
      pass("cookie-faculty-login", `skipped — no session (HTTP ${facLogin.status})`)
    } else {
      pass("cookie-faculty-login", "session proof collected")

      const ownCourse = await fetchJson("/api/instructor/office-hours", { headers: facProof })
      if (ownCourse.status === 200) {
        pass("cookie-faculty-course-16", `200 n=${(ownCourse.body?.requests ?? []).length}`)
      } else {
        fail("cookie-faculty-course-16", `expected 200, got ${ownCourse.status}`)
      }

      const foreign = await fetchJson("/api/instructor/office-hours", {
        headers: { ...facProof, "x-course-id": IDOR_COURSE_ID },
      })
      expectStatus("cookie-faculty-course-1", foreign.status, 403)
    }

    if (hasAlex) {
      if (!marker.includes("AUDIT-DELETE")) {
        fail("cookie-alex-create", "payload topic missing AUDIT-DELETE")
      } else {
        const created = await fetchJson("/api/student/office-hours", {
          method: "POST",
          headers: jsonHeaders(alexProof),
          body: JSON.stringify({
            studentId: Number(ALEX_DB),
            topic: marker,
            description: "AUDIT-DELETE disposable probe — delete in finally.",
          }),
        })
        createdId = requestIdFromBody(created.body)
        if (!created.ok || createdId == null) {
          fail("cookie-alex-create", `expected 200/201 after session bind, got ${created.status}`)
        } else {
          pass("cookie-alex-create", `id ${createdId}`)
        }
      }
    }

    if (createdId != null && hasFaculty) {
      const facultySees = await fetchJson("/api/instructor/office-hours", { headers: facProof })
      const visible = findRequest(facultySees.body?.requests, marker, createdId)
      if (facultySees.status === 200 && visible) {
        pass("cookie-faculty-sees-create", `id ${createdId}`)
      } else {
        fail(
          "cookie-faculty-sees-create",
          `faculty list ${facultySees.status} missing AUDIT-DELETE id ${createdId}`,
        )
      }
    }

    if (createdId != null) {
      const unauthDelete = await fetchJson(`/api/student/office-hours/${createdId}?studentId=${ALEX_DB}`, {
        method: "DELETE",
      })
      expectAuthRejected("cookie-e2e-unauth-delete", unauthDelete.status, ` id ${createdId}`)
    }
  } finally {
    if (createdId != null && hasAlex) {
      const removed = await fetchJson(`/api/student/office-hours/${createdId}?studentId=${ALEX_DB}`, {
        method: "DELETE",
        headers: alexProof,
      })
      if (removed.ok || removed.status === 404) {
        pass("cookie-alex-delete", `removed AUDIT-DELETE ${createdId}`)
      } else {
        fail("cookie-alex-delete", `${removed.status} — office-hours ${createdId} may remain`)
      }
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
