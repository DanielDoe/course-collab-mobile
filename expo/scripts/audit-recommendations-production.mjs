#!/usr/bin/env node
/**
 * Recommendation Letters production audit — honest auth + cookie E2E.
 *
 * Header-only x-instructor-id / x-student-id is NOT authentication.
 * Instructor-only x-instructor-id (no course, no cookie) GET 200 is FAIL.
 * HTTP 200/201/500/404 on unauth/header-only probes are never a pass.
 *
 * Cookie create reason/description must contain AUDIT-DELETE, include a deadline,
 * then DELETE in finally. Never finalize. Never PATCH approve on live non-audit rows.
 *
 * Run: npm run audit:recommendations-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const ALEX_ROSTER = process.env.AUDIT_STUDENT_ID || "910000001"
const ALEX_DB = process.env.AUDIT_STUDENT_DB_ID || "722"
const UNIVERSITY_ID = Number(process.env.AUDIT_UNIVERSITY_ID || 2)
const FACULTY_USER = process.env.AUDIT_FACULTY_USER || "mchen"
const FACULTY_PASSWORD = process.env.AUDIT_FACULTY_PASSWORD || "Review26!"
const STUDENT_PASSWORD = process.env.AUDIT_STUDENT_PASSWORD || "Review26!"

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

function headerOnlyInstructor(courseId) {
  const headers = { "x-instructor-id": INSTRUCTOR_ID }
  if (courseId != null) headers["x-course-id"] = String(courseId)
  return headers
}

function headerOnlyStudent(studentId = ALEX_DB) {
  return { "x-student-id": String(studentId) }
}

/** Header-only / unauth identity must be rejected. 200/201/500/404 are never a pass. */
function expectAuthRejected(id, status, extra = "") {
  const suffix = extra ? ` ${extra}` : ""
  if (status === 200 || status === 201) {
    fail(id, `accepted without session (${status})${suffix}`)
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
    pass(id, `401${suffix}`)
    return
  }
  fail(id, `expected 401, got ${status}${suffix}`)
}

async function run() {
  console.log(`\nRecommendation Letters production audit → ${BASE}`)
  console.log("Header-only x-instructor-id / x-student-id is not auth. 200 = FAIL.")
  console.log("Instructor-only GET 200 must fail. Cookie E2E uses AUDIT-DELETE + DELETE in finally.\n")

  console.log("=== Unauthenticated / header-only faculty ===\n")

  const facultyGets = [
    ["RL6-unauth-faculty-list", "/api/instructor/recommendations"],
    ["RL6-unauth-faculty-detail", "/api/instructor/recommendations/17"],
    ["RL6-unauth-faculty-settings", "/api/instructor/recommendations/settings"],
    ["RL6-unauth-faculty-pdf", "/api/instructor/recommendations/17/pdf"],
  ]
  for (const [id, path] of facultyGets) {
    const unauth = await fetchJson(path)
    expectAuthRejected(id, unauth.status)
    const both = await fetchJson(path, { headers: headerOnlyInstructor(COURSE_ID) })
    expectAuthRejected(`${id.replace("unauth", "header-both")}`, both.status)
    const instructorOnly = await fetchJson(path, { headers: headerOnlyInstructor() })
    expectAuthRejected(`${id.replace("unauth", "instructor-only")}`, instructorOnly.status, "no x-course-id")
  }

  const instructorOnlyPatch = await fetchJson("/api/instructor/recommendations/17", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headerOnlyInstructor() },
    body: JSON.stringify({ action: "request_info", note: "AUDIT-SHOULD-FAIL" }),
  })
  expectAuthRejected("RL6-instructor-only-faculty-patch", instructorOnlyPatch.status, "no x-course-id")

  const headerCreate = await fetchJson("/api/instructor/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerOnlyInstructor(COURSE_ID) },
    body: JSON.stringify({
      studentId: Number(ALEX_DB),
      courseId: Number(COURSE_ID),
      instructorId: Number(INSTRUCTOR_ID),
      purpose: "scholarship",
      deadline: "2099-12-31",
      studentRequestDescription: "AUDIT-SHOULD-FAIL",
    }),
  })
  expectAuthRejected("RL6-header-only-faculty-create", headerCreate.status)

  console.log("\n=== Unauthenticated / header-only student ===\n")

  const studentGets = [
    ["RL6-unauth-student-list", `/api/student/recommendations?studentId=${ALEX_DB}`],
    ["RL6-unauth-student-detail", `/api/student/recommendations/17?studentId=${ALEX_DB}`],
    ["RL6-unauth-student-pdf", `/api/student/recommendations/17/pdf?studentId=${ALEX_DB}`],
    ["RL6-unauth-student-brief", `/api/student/recommendations/17/brief?studentDatabaseId=${ALEX_DB}`],
  ]
  for (const [id, path] of studentGets) {
    const unauth = await fetchJson(path)
    expectAuthRejected(id, unauth.status)
    const header = await fetchJson(path, { headers: headerOnlyStudent() })
    expectAuthRejected(`${id.replace("unauth", "header-only")}`, header.status)
  }

  const studentPost = await fetchJson("/api/student/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerOnlyStudent() },
    body: JSON.stringify({
      studentId: ALEX_DB,
      courseId: Number(COURSE_ID),
      instructorId: Number(INSTRUCTOR_ID),
      purpose: "scholarship",
    }),
  })
  expectAuthRejected("RL6-header-only-student-create", studentPost.status)

  console.log("\n=== Cookie faculty + student E2E ===\n")

  const facLogin = await fetchJson("/api/instructor/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: FACULTY_USER, password: FACULTY_PASSWORD }),
  })
  const facCookie = cookieHeaderFromResponse(facLogin)
  const facRefresh = refreshFromCookie(facCookie)
  if (!facCookie && !facRefresh) {
    fail("RL6-faculty-login", `no session (HTTP ${facLogin.status})`)
  } else {
    pass("RL6-faculty-login", `HTTP ${facLogin.status}`)
  }

  const stuLogin = await fetchJson("/api/auth/student/login", {
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
  const stuCookie = cookieHeaderFromResponse(stuLogin)
  const stuRefresh = refreshFromCookie(stuCookie)
  if (!stuCookie && !stuRefresh) {
    fail("RL6-alex-login", `no session (HTTP ${stuLogin.status})`)
  } else {
    pass("RL6-alex-login", `HTTP ${stuLogin.status}`)
  }

  const facProof = {
    Cookie: facCookie,
    ...(facRefresh ? { "x-cc-refresh": facRefresh } : {}),
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": COURSE_ID,
  }
  const alexProof = {
    Cookie: stuCookie,
    ...(stuRefresh ? { "x-cc-refresh": stuRefresh } : {}),
    "x-student-id": ALEX_DB,
  }

  let createdId = null
  try {
    if (facCookie || facRefresh) {
      const deadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
      const description = "AUDIT-DELETE Recommendation Letters production script — do not keep"
      const created = await fetchJson("/api/instructor/recommendations", {
        method: "POST",
        headers: { ...facProof, "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(ALEX_DB),
          courseId: Number(COURSE_ID),
          instructorId: Number(INSTRUCTOR_ID),
          purpose: "scholarship",
          deadline,
          studentRequestDescription: description,
        }),
      })
      createdId = created.body?.id ?? created.body?.request?.id ?? null
      if (!description.includes("AUDIT-DELETE")) {
        fail("RL6-cookie-create", "payload description missing AUDIT-DELETE")
      } else if (!created.ok || createdId == null) {
        fail("RL6-cookie-create", `${created.status} ${created.body?.error ?? ""}`)
      } else {
        pass("RL6-cookie-create", `id ${createdId}`)
      }
    }

    if (createdId && (stuCookie || stuRefresh)) {
      const list = await fetchJson(`/api/student/recommendations?studentId=${ALEX_DB}`, {
        headers: alexProof,
      })
      const ids = (list.body?.requests ?? []).map((row) => row.id)
      if (list.ok && ids.includes(createdId)) {
        pass("RL6-alex-list-contains", `id ${createdId}`)
      } else {
        fail("RL6-alex-list-contains", `${list.status} ids=${ids.join(",")}`)
      }
    }
  } finally {
    if (createdId && (facCookie || facRefresh)) {
      const removed = await fetchJson(`/api/instructor/recommendations/${createdId}`, {
        method: "DELETE",
        headers: facProof,
      })
      if (removed.ok) pass("RL6-cookie-delete", `id ${createdId}`)
      else fail("RL6-cookie-delete", `${removed.status} ${removed.body?.error ?? ""}`)
    }
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
