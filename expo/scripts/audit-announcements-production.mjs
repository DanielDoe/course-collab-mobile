#!/usr/bin/env node
/**
 * Announcements production audit — faculty + student session bind.
 *
 * Expected after v0 deploy:
 *   unauth + header-only faculty GET/POST/PUT/DELETE + upload → 401
 *   unauth + header-only student GET :id, view, react, comments GET/POST → 401
 *   cookie Alex list 200; Alex + Jordan header 403
 *   cookie faculty course 16 200; course 1 403
 *   cookie create title contains AUDIT-DELETE; student cookie sees it; DELETE in finally
 *
 * Live today (unpatched) will FAIL. Do not treat header-only 200 as PASS.
 * Do not view/react/comment live 133/134/135/1.
 *
 * Run: npm run audit:announcements-production
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
/** Disposable probe id — never live 133/134/135/1. */
const PROBE_ID = process.env.AUDIT_ANNOUNCEMENT_PROBE_ID || "99999133"

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

function findAnnouncement(items, marker) {
  return (items ?? []).find((row) => row.title === marker || row.title?.includes(marker))
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
  console.log(`Announcements production audit → ${BASE}\n`)
  console.log("Live 200 on header-only faculty/student probes is FAIL until v0 is deployed.\n")

  console.log("=== Unauth + header-only faculty CRUD ===\n")

  const facultyListPath = `/api/announcements?instructorId=${INSTRUCTOR_ID}&courseId=${COURSE_ID}`
  expectAuthRejected("AN1-unauth-faculty-list", (await fetchJson(facultyListPath)).status)
  expectAuthRejected(
    "AN1-header-only-faculty-list",
    (await fetchJson(facultyListPath, { headers: headerOnlyFaculty() })).status,
  )
  expectAuthRejected(
    "AN1-header-only-faculty-list-foreign",
    (await fetchJson(`/api/announcements?instructorId=${INSTRUCTOR_ID}&courseId=${IDOR_COURSE_ID}`, {
      headers: headerOnlyFaculty(IDOR_COURSE_ID),
    })).status,
  )

  const unauthPost = await fetchJson("/api/announcements", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ title: "should-not-create", content: "no session", course_id: Number(COURSE_ID) }),
  })
  expectAuthRejected("AN1-unauth-faculty-post", unauthPost.status)

  const headerPost = await fetchJson("/api/announcements", {
    method: "POST",
    headers: jsonHeaders(headerOnlyFaculty()),
    body: JSON.stringify({ title: "should-not-create", content: "header only", course_id: Number(COURSE_ID) }),
  })
  expectAuthRejected("AN1-header-only-faculty-post", headerPost.status)

  const unauthPut = await fetchJson(`/api/announcements/${PROBE_ID}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ pinned: true }),
  })
  expectAuthRejected("AN1-unauth-faculty-put", unauthPut.status)

  const headerPut = await fetchJson(`/api/announcements/${PROBE_ID}`, {
    method: "PUT",
    headers: jsonHeaders(headerOnlyFaculty()),
    body: JSON.stringify({ pinned: true }),
  })
  expectAuthRejected("AN1-header-only-faculty-put", headerPut.status)

  expectAuthRejected(
    "AN1-unauth-faculty-delete",
    (await fetchJson(`/api/announcements/${PROBE_ID}`, { method: "DELETE" })).status,
  )
  expectAuthRejected(
    "AN1-header-only-faculty-delete",
    (await fetchJson(`/api/announcements/${PROBE_ID}`, {
      method: "DELETE",
      headers: headerOnlyFaculty(),
    })).status,
  )

  expectAuthRejected("AN5-unauth-upload", (await fetchJson("/api/announcements/upload", { method: "POST" })).status)
  expectAuthRejected(
    "AN5-header-only-upload",
    (await fetchJson("/api/announcements/upload", { method: "POST", headers: headerOnlyFaculty() })).status,
  )

  console.log("\n=== Unauth + header-only student GET :id / writes / comments ===\n")

  expectAuthRejected("AN2-unauth-get-id", (await fetchJson(`/api/announcements/${PROBE_ID}`)).status)
  expectAuthRejected(
    "AN2-header-only-student-get-id",
    (await fetchJson(`/api/announcements/${PROBE_ID}?studentId=${ALEX_DB}`, {
      headers: headerOnlyStudent(),
    })).status,
  )
  expectAuthRejected(
    "AN2-header-only-faculty-get-id",
    (await fetchJson(`/api/announcements/${PROBE_ID}?instructorId=${INSTRUCTOR_ID}`, {
      headers: headerOnlyFaculty(),
    })).status,
  )

  const viewBody = JSON.stringify({ studentId: Number(ALEX_DB) })
  expectAuthRejected(
    "AN3-unauth-view",
    (await fetchJson(`/api/announcements/${PROBE_ID}/view`, {
      method: "POST",
      headers: jsonHeaders(),
      body: viewBody,
    })).status,
  )
  expectAuthRejected(
    "AN3-header-only-view",
    (await fetchJson(`/api/announcements/${PROBE_ID}/view`, {
      method: "POST",
      headers: jsonHeaders(headerOnlyStudent()),
      body: viewBody,
    })).status,
  )

  const reactBody = JSON.stringify({ studentId: Number(ALEX_DB), reactionType: "like" })
  expectAuthRejected(
    "AN3-unauth-react",
    (await fetchJson(`/api/announcements/${PROBE_ID}/react`, {
      method: "POST",
      headers: jsonHeaders(),
      body: reactBody,
    })).status,
  )
  expectAuthRejected(
    "AN3-header-only-react",
    (await fetchJson(`/api/announcements/${PROBE_ID}/react`, {
      method: "POST",
      headers: jsonHeaders(headerOnlyStudent()),
      body: reactBody,
    })).status,
  )

  expectAuthRejected(
    "AN4-unauth-comments-get",
    (await fetchJson(`/api/announcements/${PROBE_ID}/comments`)).status,
  )
  expectAuthRejected(
    "AN4-header-only-comments-get",
    (await fetchJson(`/api/announcements/${PROBE_ID}/comments`, { headers: headerOnlyStudent() })).status,
  )

  const commentBody = JSON.stringify({ studentId: Number(ALEX_DB), content: "should-not-post" })
  expectAuthRejected(
    "AN3-unauth-comments-post",
    (await fetchJson(`/api/announcements/${PROBE_ID}/comments`, {
      method: "POST",
      headers: jsonHeaders(),
      body: commentBody,
    })).status,
  )
  expectAuthRejected(
    "AN3-header-only-comments-post",
    (await fetchJson(`/api/announcements/${PROBE_ID}/comments`, {
      method: "POST",
      headers: jsonHeaders(headerOnlyStudent()),
      body: commentBody,
    })).status,
  )

  console.log("\n=== Student list (already session-bound in production) ===\n")

  expectAuthRejected("AN-unauth-student-list", (await fetchJson(`/api/announcements?studentId=${ALEX_DB}`)).status)
  expectAuthRejected(
    "AN-header-only-student-list",
    (await fetchJson(`/api/announcements?studentId=${ALEX_DB}`, { headers: headerOnlyStudent() })).status,
  )

  console.log("\n=== Cookie Alex ===\n")

  const alexLogin = await loginAlex()
  const alexProof = {
    Cookie: alexLogin.cookie,
    ...(alexLogin.refresh ? { "x-cc-refresh": alexLogin.refresh } : {}),
    "x-student-id": ALEX_DB,
  }

  if (!alexLogin.cookie && !alexLogin.refresh) {
    pass("cookie-alex-login", `skipped — no session (HTTP ${alexLogin.status})`)
  } else {
    pass("cookie-alex-login", "session proof collected")
    const ownList = await fetchJson(`/api/announcements?studentId=${ALEX_DB}`, { headers: alexProof })
    if (ownList.status === 200) {
      pass("cookie-alex-list", `200 n=${(ownList.body?.announcements ?? []).length}`)
    } else {
      fail("cookie-alex-list", `expected 200, got ${ownList.status}`)
    }

    const spoof = await fetchJson(`/api/announcements?studentId=${JORDAN_DB}`, {
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

  let createdId = null
  const marker = `AUDIT-DELETE announcements production script — do not keep ${Date.now()}`

  try {
    if (!facLogin.cookie && !facLogin.refresh) {
      pass("cookie-faculty-login", `skipped — no session (HTTP ${facLogin.status})`)
    } else {
      pass("cookie-faculty-login", "session proof collected")

      const ownCourse = await fetchJson(
        `/api/announcements?instructorId=${INSTRUCTOR_ID}&courseId=${COURSE_ID}`,
        { headers: facProof },
      )
      if (ownCourse.status === 200) {
        pass("cookie-faculty-course-16", `200 n=${(ownCourse.body?.announcements ?? []).length}`)
      } else {
        fail("cookie-faculty-course-16", `expected 200, got ${ownCourse.status}`)
      }

      const foreign = await fetchJson(
        `/api/announcements?instructorId=${INSTRUCTOR_ID}&courseId=${IDOR_COURSE_ID}`,
        { headers: { ...facProof, "x-course-id": IDOR_COURSE_ID } },
      )
      expectStatus("cookie-faculty-course-1", foreign.status, 403)

      if (!marker.includes("AUDIT-DELETE")) {
        fail("cookie-faculty-create", "payload title missing AUDIT-DELETE")
      } else {
        const created = await fetchJson("/api/announcements", {
          method: "POST",
          headers: jsonHeaders(facProof),
          body: JSON.stringify({
            title: marker,
            content: "AUDIT-DELETE disposable probe — delete in finally.",
            pinned: false,
            course_id: Number(COURSE_ID),
          }),
        })
        createdId = created.body?.announcement?.id ?? null
        if (!created.ok || createdId == null) {
          fail("cookie-faculty-create", `expected 201 after session bind, got ${created.status}`)
        } else {
          pass("cookie-faculty-create", `id ${createdId}`)
        }
      }

      if (createdId != null && (alexLogin.cookie || alexLogin.refresh)) {
        const studentSees = await fetchJson(`/api/announcements?studentId=${ALEX_DB}`, { headers: alexProof })
        const visible = findAnnouncement(studentSees.body?.announcements, marker)
        if (studentSees.status === 200 && visible) {
          pass("cookie-student-sees-create", `id ${createdId}`)
        } else {
          fail(
            "cookie-student-sees-create",
            `student list ${studentSees.status} missing AUDIT-DELETE id ${createdId}`,
          )
        }
      }
    }
  } finally {
    if (createdId != null && (facLogin.cookie || facLogin.refresh)) {
      const removed = await fetchJson(`/api/announcements/${createdId}`, {
        method: "DELETE",
        headers: facProof,
      })
      if (removed.ok || removed.status === 404) {
        pass("cookie-faculty-delete", `removed AUDIT-DELETE ${createdId}`)
      } else {
        fail("cookie-faculty-delete", `${removed.status} — announcement ${createdId} may remain`)
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
