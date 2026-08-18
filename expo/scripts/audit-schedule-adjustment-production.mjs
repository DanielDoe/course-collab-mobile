#!/usr/bin/env node
/**
 * Schedule Adjustment production audit — honest auth + cookie E2E.
 *
 * Header-only x-instructor-id / x-student-id is NOT authentication.
 * HTTP 200/201 on those probes is the vulnerability (FAIL). HTTP 500 is never a pass.
 * 404 is not a pass for "auth works".
 *
 * Cookie create reason must contain AUDIT-DELETE. Cancels in finally.
 * Never finalize. Never touch other live requests.
 *
 * Run: npm run audit:schedule-adjustment-production
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

function headerOnlyInstructor(courseId = COURSE_ID) {
  return {
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": String(courseId),
  }
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
  console.log(`\nSchedule Adjustment production audit → ${BASE}`)
  console.log("Header-only x-instructor-id / x-student-id is not auth. 200 = FAIL.")
  console.log("Cookie E2E uses AUDIT-DELETE and cancels in finally. Never finalize.\n")

  console.log("=== Unauthenticated / header-only faculty ===\n")

  const facultyGets = [
    ["SA7-unauth-faculty-list", "/api/instructor/schedule-adjustments"],
    ["SA7-unauth-faculty-detail", "/api/instructor/schedule-adjustments/1"],
    ["SA7-unauth-faculty-candidates", "/api/instructor/schedule-adjustments/1/actions?view=candidates"],
  ]
  for (const [id, path] of facultyGets) {
    const unauth = await fetchJson(path)
    expectAuthRejected(id, unauth.status)
    const header = await fetchJson(path, { headers: headerOnlyInstructor() })
    expectAuthRejected(`${id.replace("unauth", "header-only")}`, header.status)
  }

  const headerCreate = await fetchJson("/api/instructor/schedule-adjustments", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerOnlyInstructor() },
    body: JSON.stringify({
      reason: "AUDIT-SHOULD-FAIL",
      availabilityEndsAt: "2099-01-01T17:00:00",
    }),
  })
  expectAuthRejected("SA7-header-only-faculty-create", headerCreate.status)

  const headerAction = await fetchJson("/api/instructor/schedule-adjustments/1/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerOnlyInstructor() },
    body: JSON.stringify({ action: "cancel", reason: "AUDIT-SHOULD-FAIL" }),
  })
  expectAuthRejected("SA7-header-only-faculty-action", headerAction.status)

  console.log("\n=== Unauthenticated / header-only student ===\n")

  const studentGets = [
    ["SA7-unauth-student-list", `/api/student/schedule-adjustments?studentId=${ALEX_DB}`],
    ["SA7-unauth-student-detail", `/api/student/schedule-adjustments/1?studentId=${ALEX_DB}`],
    ["SA7-unauth-student-grid", `/api/student/schedule-adjustments/1/availability?studentId=${ALEX_DB}`],
  ]
  for (const [id, path] of studentGets) {
    const unauth = await fetchJson(path)
    expectAuthRejected(id, unauth.status)
    const header = await fetchJson(path, { headers: headerOnlyStudent() })
    expectAuthRejected(`${id.replace("unauth", "header-only")}`, header.status)
  }

  const headerAvail = await fetchJson(`/api/student/schedule-adjustments/1/availability?studentId=${ALEX_DB}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerOnlyStudent() },
    body: JSON.stringify({ availability: { slots: {} } }),
  })
  expectAuthRejected("SA7-header-only-student-availability", headerAvail.status)

  const headerConsent = await fetchJson(`/api/student/schedule-adjustments/1/consent?studentId=${ALEX_DB}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headerOnlyStudent() },
    body: JSON.stringify({ agreed: true, acknowledged: true, signatureName: "Alex" }),
  })
  expectAuthRejected("SA7-header-only-student-consent", headerConsent.status)

  console.log("\n=== Cookie faculty + student E2E ===\n")

  const facLogin = await fetchJson("/api/instructor/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: FACULTY_USER, password: FACULTY_PASSWORD }),
  })
  const facCookie = cookieHeaderFromResponse(facLogin)
  const facRefresh = refreshFromCookie(facCookie)
  if (!facCookie && !facRefresh) {
    fail("SA7-faculty-login", `no session (HTTP ${facLogin.status})`)
  } else {
    pass("SA7-faculty-login", `HTTP ${facLogin.status}`)
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
    fail("SA7-alex-login", `no session (HTTP ${stuLogin.status})`)
  } else {
    pass("SA7-alex-login", `HTTP ${stuLogin.status}`)
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
      const deadline = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) + "T17:00:00"
      const created = await fetchJson("/api/instructor/schedule-adjustments", {
        method: "POST",
        headers: { ...facProof, "Content-Type": "application/json" },
        body: JSON.stringify({
          pollKind: "recurring",
          meetingType: "lecture",
          reason: "AUDIT-DELETE Schedule Adjustment production script — do not keep",
          availabilityEndsAt: deadline,
          candidateStartTime: "08:00:00",
          candidateEndTime: "17:00:00",
          candidateDays: ["MO", "WE"],
          meetingDurationMinutes: 50,
          slotIncrementMinutes: 30,
        }),
      })
      createdId = created.body?.request?.id ?? null
      if (!created.ok || createdId == null) {
        fail("SA7-cookie-create", `${created.status} ${created.body?.error ?? ""}`)
      } else if (!String(created.body?.request?.reason ?? "").includes("AUDIT-DELETE")) {
        fail("SA7-cookie-create", "created reason missing AUDIT-DELETE")
      } else {
        pass("SA7-cookie-create", `id ${createdId} ${created.body?.request?.status ?? ""}`)
      }

      if (createdId) {
        const start = await fetchJson(`/api/instructor/schedule-adjustments/${createdId}/actions`, {
          method: "POST",
          headers: { ...facProof, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start_availability" }),
        })
        if (start.ok && start.body?.request?.status === "COLLECTING_AVAILABILITY") {
          pass("SA7-cookie-start", "COLLECTING_AVAILABILITY")
        } else {
          fail("SA7-cookie-start", `${start.status} ${start.body?.request?.status ?? start.body?.error ?? ""}`)
        }
      }
    }

    if (createdId && (stuCookie || stuRefresh)) {
      const list = await fetchJson(`/api/student/schedule-adjustments?studentId=${ALEX_DB}`, {
        headers: alexProof,
      })
      const ids = (list.body?.requests ?? []).map((row) => row.id)
      if (list.ok && ids.includes(createdId)) {
        pass("SA7-alex-list-contains", `id ${createdId}`)
      } else {
        fail("SA7-alex-list-contains", `${list.status} ids=${ids.join(",")}`)
      }
    }
  } finally {
    if (createdId && (facCookie || facRefresh)) {
      const cancel = await fetchJson(`/api/instructor/schedule-adjustments/${createdId}/actions`, {
        method: "POST",
        headers: { ...facProof, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: "AUDIT-DELETE cleanup" }),
      })
      if (cancel.ok) pass("SA7-cookie-cancel", `id ${createdId}`)
      else fail("SA7-cookie-cancel", `${cancel.status} ${cancel.body?.error ?? ""}`)
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
