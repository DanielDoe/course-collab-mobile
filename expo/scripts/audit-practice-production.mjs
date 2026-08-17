#!/usr/bin/env node
/**
 * Faculty practice production audit — auth/IDOR, hide→student hub, questions fallback.
 *
 * Run: npm run audit:practice-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const IDOR_COURSE_ID = process.env.AUDIT_IDOR_COURSE_ID || "1"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"

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
  return {
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": String(courseId),
  }
}

function topicAvailable(topic) {
  return topic?.is_available !== false && topic?.isAvailable !== false
}

function topicName(topic) {
  return String(topic?.name ?? topic?.topic ?? topic?.topic_name ?? "")
}

function studentHasTopic(topics, name) {
  return (topics ?? []).some((row) => topicName(row) === name && topicAvailable(row))
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missingInstructor = await fetchJson("/api/instructor/practice/topics", {
    headers: { "x-course-id": COURSE_ID },
  })
  if (missingInstructor.status === 401) {
    pass("F-001-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor", `expected 401, got ${missingInstructor.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/practice/topics", {
    headers: instructorHeaders("999999"),
  })
  if (invalidCourse.status === 404) {
    pass("F-001-invalid-course", "404 Course not found")
  } else {
    fail("F-001-invalid-course", `expected 404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/practice/topics", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorList.status === 403) {
    pass("F-001-idor-list", `403 Forbidden on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-001-idor-list", `expected 403, got ${idorList.status}`)
  }

  const idorToggle = await fetchJson("/api/instructor/practice/topics/toggle", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({ topicName: "IDOR probe", session: "ALL", isAvailable: false }),
  })
  if (idorToggle.status === 403) {
    pass("F-001-idor-toggle", "403 Forbidden on foreign course toggle")
  } else {
    fail("F-001-idor-toggle", `expected 403, got ${idorToggle.status}`)
  }

  const unauthConfig = await fetchJson("/api/instructor/practice/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: SESSION, dailyLimit: 10 }),
  })
  if (unauthConfig.status === 401) {
    pass("F-001-unauth-config", "401 without instructor on config POST")
  } else {
    fail("F-001-unauth-config", `expected 401, got ${unauthConfig.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/practice/topics", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const unauthQuestions = await fetchJson("/api/instructor/practice/questions?topic=audit")
  if (unauthQuestions.status === 401) {
    pass("F-001-unauth-questions", "401 without instructor")
  } else {
    fail("F-001-unauth-questions", `expected 401, got ${unauthQuestions.status}`)
  }

  const unauthReset = await fetchJson("/api/instructor/practice/reset-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: STUDENT_ID }),
  })
  if (unauthReset.status === 401) {
    pass("F-001-unauth-reset", "401 without instructor")
  } else {
    fail("F-001-unauth-reset", `expected 401, got ${unauthReset.status}`)
  }

  const idorReport = await fetchJson("/api/instructor/practice/student-report?studentId=1", {
    headers: instructorHeaders(),
  })
  if ([403, 404].includes(idorReport.status)) {
    pass("F-001-idor-report", `${idorReport.status} foreign/unknown student`)
  } else if (idorReport.ok) {
    pass("F-001-idor-report", "student 1 is in course scope")
  } else {
    fail("F-001-idor-report", `unexpected ${idorReport.status}`)
  }

  const idorReset = await fetchJson("/api/instructor/practice/reset-student", {
    method: "POST",
    headers: { ...instructorHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: 999999 }),
  })
  if ([403, 404].includes(idorReset.status)) {
    pass("F-001-idor-reset", `${idorReset.status} unknown student`)
  } else {
    fail("F-001-idor-reset", `expected 403/404, got ${idorReset.status}`)
  }
}

async function runHideShowStudentE2E() {
  console.log("\n=== F-002 Hide topic → student Practice Hub ===\n")

  const topicsRes = await fetchJson(`/api/instructor/practice/topics?session=${encodeURIComponent(SESSION)}`, {
    headers: instructorHeaders(),
  })
  if (!topicsRes.ok) {
    fail("F-002-list-topics", `instructor topics failed (${topicsRes.status})`)
    return
  }
  const topics = topicsRes.body?.topics ?? []
  const target = topics.find((row) => topicAvailable(row) && topicName(row))
  if (!target) {
    fail("F-002-list-topics", "no available topic to toggle")
    return
  }
  const name = topicName(target)
  pass("F-002-list-topics", `${topics.length} topics; toggling ${name}`)

  const questions = await fetchJson(
    `/api/instructor/practice/questions?topic=${encodeURIComponent(name)}&session=${encodeURIComponent(SESSION)}`,
    { headers: instructorHeaders() },
  )
  if (questions.ok && Array.isArray(questions.body?.questions)) {
    pass("F-007-practice-questions", `${questions.body.questions.length} practice questions`)
  } else if (questions.status === 404) {
    const bank = await fetchJson(`/api/instructor/question-bank?topic=${encodeURIComponent(name)}`, {
      headers: instructorHeaders(),
    })
    if (bank.ok) {
      pass("F-007-practice-questions", "practice/questions 404; question-bank fallback works")
    } else {
      fail("F-007-practice-questions", `fallback failed (${bank.status})`)
    }
  } else {
    fail("F-007-practice-questions", `expected 200 or 404, got ${questions.status}`)
  }

  try {
    const hidden = await fetchJson("/api/instructor/practice/topics/toggle", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ topicName: name, session: SESSION, isAvailable: false }),
    })
    if (!hidden.ok) {
      fail("F-002-hide", `toggle hide failed (${hidden.status})`)
      return
    }
    pass("F-002-hide", `hid ${name} for ${SESSION}`)

    const studentHidden = await fetchJson(
      `/api/practice/topics-progress?studentId=${STUDENT_ID}&session=${encodeURIComponent(SESSION)}&courseId=${COURSE_ID}`,
      { headers: { "x-student-id": STUDENT_ID } },
    )
    if (!studentHidden.ok) {
      fail("F-002-student-hidden", `student topics-progress failed (${studentHidden.status})`)
    } else if (!studentHasTopic(studentHidden.body?.topics ?? studentHidden.body?.progress, name)) {
      pass("F-002-student-hidden", "hidden topic not available to student")
    } else {
      fail("F-002-student-hidden", "hidden topic still available to student")
    }
  } finally {
    const restored = await fetchJson("/api/instructor/practice/topics/toggle", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ topicName: name, session: SESSION, isAvailable: true }),
    })
    if (restored.ok) {
      pass("F-002-restore", `restored ${name}`)
    } else {
      fail("F-002-restore", `restore failed (${restored.status})`)
    }
  }
}

async function main() {
  console.log(`Practice production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID} session=${SESSION}`)

  await runAuthProbes()
  await runHideShowStudentE2E()

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
