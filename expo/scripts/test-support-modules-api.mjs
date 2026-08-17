#!/usr/bin/env node
/**
 * Smoke-test Support drawer modules against production.
 * Usage: node scripts/test-support-modules-api.mjs
 */

const API_BASE = "https://coursecollab.vercel.app"
const FACULTY_USERNAME = "dmdoe"
const FACULTY_PASSWORD = "dmdoe123"
const PREFERRED_COURSE_CODE = "ECE2202"

const results = []

function pass(module, test, detail = "") {
  results.push({ module, test, ok: true, detail })
  console.log(`✓ ${module} — ${test}${detail ? `: ${detail}` : ""}`)
}

function fail(module, test, detail = "") {
  results.push({ module, test, ok: false, detail })
  console.error(`✗ ${module} — ${test}${detail ? `: ${detail}` : ""}`)
}

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text.slice(0, 200) }
    }
  }
  return { ok: response.ok, status: response.status, json }
}

function summarize() {
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${passed} passed, ${failed} failed\n`)
}

async function submitFacultyTicket(instructorId, courseId, category, subject) {
  const payload = {
    category,
    subject,
    description: `QA support test (${category}) — safe to ignore / auto-close.`,
    courseId,
    priority: "low",
    moduleId: "attendance",
    moduleName: "Attendance",
  }

  const instructor = await request("/api/instructor/support-tickets", {
    method: "POST",
    headers: { "x-instructor-id": String(instructorId) },
    body: payload,
  })

  if (instructor.ok && instructor.json?.success) {
    return { route: "instructor", response: instructor }
  }

  if (instructor.status !== 404) {
    return { route: "instructor", response: instructor, failed: true }
  }

  const fallback = await request("/api/student/support-tickets", {
    method: "POST",
    headers: { "x-instructor-id": String(instructorId) },
    body: {
      ...payload,
      description: `${payload.description}\n\n— Submitted from faculty mobile (instructor ${instructorId})`,
    },
  })

  return { route: "student-fallback", response: fallback, failed: !fallback.ok }
}

async function main() {
  console.log(`\nSupport API test → ${API_BASE}\n`)

  if (API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1")) {
    fail("Config", "production URL", `Refusing non-production base: ${API_BASE}`)
    summarize()
    process.exit(1)
  }
  pass("Config", "production URL", API_BASE)

  const login = await request("/api/instructor/login", {
    method: "POST",
    body: { username: FACULTY_USERNAME, password: FACULTY_PASSWORD },
  })
  if (!login.ok) {
    fail("Auth", "faculty login", `${login.status}`)
    summarize()
    process.exit(1)
  }

  const instructor = login.json?.faculty ?? login.json?.instructor
  if (!instructor?.id) {
    fail("Auth", "faculty login payload", "missing instructor id")
    summarize()
    process.exit(1)
  }
  pass("Auth", "faculty login", `instructor ${instructor.id}`)

  const courses = await request("/api/instructor/courses", {
    headers: { "x-instructor-id": String(instructor.id) },
  })
  if (!courses.ok) {
    fail("Scope", "list courses", `${courses.status}`)
    summarize()
    process.exit(1)
  }

  const courseList = courses.json?.courses ?? []
  const course =
    courseList.find((c) => c.course_code === PREFERRED_COURSE_CODE) ??
    courseList[0]
  if (!course?.id) {
    fail("Scope", "resolve course", "no courses")
    summarize()
    process.exit(1)
  }
  pass("Scope", "course", `${course.course_code} (id ${course.id})`)

  for (const [label, category] of [
    ["Report Bug", "bug"],
    ["Submit Ticket", "support"],
    ["Feature Requests", "feature"],
  ]) {
    const result = await submitFacultyTicket(instructor.id, course.id, category, `[QA] ${label}`)
    if (result.failed || !result.response.ok) {
      fail(label, "POST support-tickets", `${result.route} ${result.response.status} ${JSON.stringify(result.response.json)}`)
    } else {
      const ticketId = result.response.json?.ticket?.id ?? result.response.json?.ticket?.logId ?? "ok"
      pass(label, "POST support-tickets", `${result.route} ticket ${ticketId}`)
    }
  }

  for (const [label, category] of [
    ["Report Bug history", "bug"],
    ["Submit Ticket history", "support"],
    ["Feature Requests history", "feature"],
  ]) {
    const list = await request(`/api/instructor/support-tickets?category=${category}`, {
      headers: { "x-instructor-id": String(instructor.id) },
    })
    if (!list.ok) {
      fail(label, "GET support-tickets", `${list.status} ${JSON.stringify(list.json)}`)
    } else {
      const count = Array.isArray(list.json?.tickets) ? list.json.tickets.length : 0
      pass(label, "GET support-tickets", `${count} ticket(s)`)
    }
  }

  const instructorProbe = await request("/api/instructor/support-tickets", {
    method: "POST",
    headers: { "x-instructor-id": String(instructor.id) },
    body: {
      subject: "probe",
      description: "probe",
      category: "support",
    },
  })
  if (instructorProbe.status === 404) {
    pass("Routes", "instructor/support-tickets", "not deployed yet — mobile uses student fallback")
  } else if (instructorProbe.ok || instructorProbe.status === 400) {
    pass("Routes", "instructor/support-tickets", `live (${instructorProbe.status})`)
  } else {
    fail("Routes", "instructor/support-tickets", `${instructorProbe.status}`)
  }

  summarize()
  const failed = results.some((r) => !r.ok)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
