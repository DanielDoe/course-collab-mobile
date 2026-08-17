#!/usr/bin/env node
/**
 * Faculty playground production audit — auth/IDOR + create → student join → cleanup.
 *
 * Run: npm run audit:playground-production
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
  return {
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": String(courseId),
  }
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missingInstructor = await fetchJson("/api/instructor/playground/sessions", {
    headers: { "x-course-id": COURSE_ID },
  })
  if (missingInstructor.status === 401) {
    pass("F-001-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor", `expected 401, got ${missingInstructor.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/playground/sessions", {
    headers: instructorHeaders("999999"),
  })
  if (invalidCourse.status === 404) {
    pass("F-001-invalid-course", "404 Course not found")
  } else {
    fail("F-001-invalid-course", `expected 404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/playground/sessions", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorList.status === 403) {
    pass("F-001-idor-list", `403 Forbidden on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-001-idor-list", `expected 403, got ${idorList.status}`)
  }

  const idorCreate = await fetchJson("/api/instructor/playground/sessions", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", topics: ["IDOR"], questionCount: 1, durationSec: 10 }),
  })
  if (idorCreate.status === 403) {
    pass("F-001-idor-create", "403 Forbidden on foreign course start")
  } else {
    fail("F-001-idor-create", `expected 403, got ${idorCreate.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/playground/sessions", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const unauthJoin = await fetchJson("/api/playground/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "CLASSROOM" }),
  })
  if ([400, 401].includes(unauthJoin.status)) {
    pass("F-001-student-join-auth", `${unauthJoin.status} without student identity`)
  } else {
    fail("F-001-student-join-auth", `expected 400/401, got ${unauthJoin.status}`)
  }
}

async function runCreateJoinE2E() {
  console.log("\n=== F-002 Create session → student join ===\n")

  const topicsRes = await fetchJson("/api/instructor/playground/topics", {
    headers: instructorHeaders(),
  })
  if (!topicsRes.ok) {
    fail("F-002-topics", `topics failed (${topicsRes.status})`)
    return
  }
  const topics = (topicsRes.body?.topics ?? [])
    .map((row) => row.topic ?? row.name ?? row.topic_name)
    .filter(Boolean)
  if (topics.length === 0) {
    fail("F-002-topics", "no playground topics in course")
    return
  }
  pass("F-002-topics", `${topics.length} topics`)

  let sessionId = null
  try {
    const created = await fetchJson("/api/instructor/playground/sessions", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        topics: [topics[0]],
        questionCount: 1,
        durationSec: 10,
      }),
    })
    sessionId = created.body?.session?.id ?? created.body?.id ?? created.body?.sessionId ?? null
    const passcode = created.body?.joinPasscode ?? created.body?.session?.join_passcode ?? null
    if (!created.ok || sessionId == null) {
      fail("F-002-create", `start failed (${created.status}) ${JSON.stringify(created.body)?.slice(0, 180)}`)
      return
    }
    pass("F-002-create", `session ${sessionId}`)

    const idorStop = await fetchJson("/api/instructor/playground/sessions", {
      method: "POST",
      headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", sessionId }),
    })
    if ([403, 404].includes(idorStop.status)) {
      pass("F-001-idor-stop", `${idorStop.status} foreign course cannot stop session`)
    } else {
      fail("F-001-idor-stop", `expected 403/404, got ${idorStop.status}`)
    }

    const joined = await fetchJson("/api/playground/join", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-student-id": STUDENT_ID },
      body: JSON.stringify({
        studentId: STUDENT_ID,
        studentName: "Alex Rivera",
        mode: "CLASSROOM",
        passcode,
      }),
    })
    if (joined.ok) {
      pass("F-002-student-join", `joined session ${sessionId}`)
    } else {
      fail("F-002-student-join", `join failed (${joined.status}) ${JSON.stringify(joined.body)?.slice(0, 180)}`)
    }

    const started = await fetchJson("/api/instructor/playground/sessions", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start-game", sessionId }),
    })
    if (started.ok) {
      pass("F-002-start-game", "game started")
    } else {
      fail("F-002-start-game", `start-game failed (${started.status}) ${JSON.stringify(started.body)?.slice(0, 180)}`)
    }

    const questions = await fetchJson(`/api/playground/questions?sessionId=${sessionId}`, {
      headers: { "x-student-id": STUDENT_ID },
    })
    if (questions.ok && Array.isArray(questions.body?.questions)) {
      pass("F-002-student-questions", `${questions.body.questions.length} questions`)
    } else if ([400, 401, 403, 409].includes(questions.status)) {
      pass("F-002-student-questions", `${questions.status} after start-game`)
    } else {
      fail("F-002-student-questions", `questions failed (${questions.status})`)
    }

    const board = await fetchJson(`/api/instructor/playground/leaderboard?sessionId=${sessionId}`, {
      headers: instructorHeaders(),
    })
    if (board.ok) {
      pass("F-002-leaderboard", `${(board.body?.leaderboard ?? []).length} entries`)
    } else {
      fail("F-002-leaderboard", `leaderboard failed (${board.status})`)
    }
  } finally {
    if (sessionId != null) {
      const stopped = await fetchJson("/api/instructor/playground/sessions", {
        method: "POST",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId }),
      })
      const deleted = await fetchJson("/api/instructor/playground/sessions", {
        method: "POST",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", sessionId }),
      })
      if (stopped.ok || deleted.ok) {
        pass("F-002-cleanup", `stopped/deleted session ${sessionId}`)
      } else {
        fail("F-002-cleanup", `cleanup failed stop=${stopped.status} delete=${deleted.status}`)
      }
    }
  }
}

async function main() {
  console.log(`Playground production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID}`)

  await runAuthProbes()
  await runCreateJoinE2E()

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
