#!/usr/bin/env node
/**
 * Faculty playground production audit — auth/IDOR + create → student join → cleanup.
 *
 * Run: npm run audit:playground-production
 *
 * Does NOT POST /api/playground/admin/start or /api/admin/playground/sync-points
 * (those writes can end live CLASSROOM sessions).
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const IDOR_COURSE_ID = process.env.AUDIT_IDOR_COURSE_ID || "1"
const CREDITS_PROBE_STUDENT_ID = "722"

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

function studentHeaders(studentId = STUDENT_ID) {
  return { "x-student-id": String(studentId) }
}

function expectHeaderOnlyRejected(id, status, extra) {
  if (status === 401) {
    pass(id, `401 header-only rejected${extra ? ` ${extra}` : ""}`)
    return
  }
  if (status === 403) {
    pass(id, `403 header-only rejected${extra ? ` ${extra}` : ""}`)
    return
  }
  fail(id, `expected 401 (header-only instructor/student is not a session), got ${status}${extra ? ` ${extra}` : ""}`)
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missingInstructor = await fetchJson("/api/instructor/playground/sessions", {
    headers: { "x-course-id": COURSE_ID },
  })
  expectHeaderOnlyRejected("F-001-missing-instructor", missingInstructor.status)

  const invalidCourse = await fetchJson("/api/instructor/playground/sessions", {
    headers: instructorHeaders("999999"),
  })
  if ([401, 403, 404].includes(invalidCourse.status)) {
    pass("F-001-invalid-course", `${invalidCourse.status} invalid course (401 header-only is PASS)`)
  } else {
    fail("F-001-invalid-course", `expected 401/403/404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/playground/sessions", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([401, 403].includes(idorList.status)) {
    pass("F-001-idor-list", `${idorList.status} on foreign course ${IDOR_COURSE_ID} (401 header-only is PASS)`)
  } else {
    fail("F-001-idor-list", `expected 401/403, got ${idorList.status}`)
  }

  const idorTopics = await fetchJson("/api/instructor/playground/topics", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if ([401, 403].includes(idorTopics.status)) {
    pass("F-001-idor-topics", `${idorTopics.status} header-only topics (401 is PASS)`)
  } else {
    fail("F-001-idor-topics", `expected 401/403, got ${idorTopics.status}`)
  }

  const idorCreate = await fetchJson("/api/instructor/playground/sessions", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", topics: ["IDOR"], questionCount: 1, durationSec: 10 }),
  })
  if ([401, 403].includes(idorCreate.status)) {
    pass("F-001-idor-create", `${idorCreate.status} foreign course start (401 header-only is PASS)`)
  } else {
    fail("F-001-idor-create", `expected 401/403, got ${idorCreate.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/playground/sessions", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const unauthJoinMissing = await fetchJson("/api/playground/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "CLASSROOM" }),
  })
  if (unauthJoinMissing.status === 400) {
    fail(
      "F-001-student-join-missing-fields",
      "400 missing fields is not an auth pass — join must reject unauthenticated callers",
    )
  } else if (unauthJoinMissing.status === 401) {
    pass("F-001-student-join-missing-fields", "401 without session")
  } else {
    fail("F-001-student-join-missing-fields", `expected 401, got ${unauthJoinMissing.status}`)
  }

  const unauthJoinClaim = await fetchJson("/api/playground/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: 722,
      studentName: "Alex",
      mode: "CLASSROOM",
      passcode: "AAAAA",
    }),
  })
  if (unauthJoinClaim.status === 401) {
    pass("F-001-student-join-auth", "401 join with studentId and no cookies")
  } else if (unauthJoinClaim.status === 404) {
    fail(
      "F-001-student-join-auth",
      "404 Invalid passcode — identity accepted without a session; requireBoundStudentCaller first",
    )
  } else {
    fail("F-001-student-join-auth", `expected 401, got ${unauthJoinClaim.status}`)
  }

  const unauthCredits = await fetchJson(`/api/playground/credits?studentId=${CREDITS_PROBE_STUDENT_ID}`)
  if (unauthCredits.status === 200) {
    fail("PG2-unauth-credits", `unauth GET credits?studentId=${CREDITS_PROBE_STUDENT_ID} returned 200`)
  } else if (unauthCredits.status === 401) {
    pass("PG2-unauth-credits", "401 without student session")
  } else {
    fail("PG2-unauth-credits", `expected 401, got ${unauthCredits.status}`)
  }

  const adminStatus = await fetchJson("/api/playground/admin/status")
  if (adminStatus.status === 200) {
    fail("PG1-unauth-admin-status", "unauth GET /api/playground/admin/status returned 200")
  } else if (adminStatus.status === 401) {
    pass("PG1-unauth-admin-status", "401 without instructor session")
  } else {
    fail("PG1-unauth-admin-status", `expected 401, got ${adminStatus.status}`)
  }

  const adminTopics = await fetchJson("/api/playground/admin/topics")
  if (adminTopics.status === 200) {
    fail("PG1-unauth-admin-topics", "unauth GET /api/playground/admin/topics returned 200")
  } else if (adminTopics.status === 401) {
    pass("PG1-unauth-admin-topics", "401 without instructor session")
  } else {
    fail("PG1-unauth-admin-topics", `expected 401, got ${adminTopics.status}`)
  }

  const headerPolicy = await fetchJson("/api/playground/policy", {
    headers: studentHeaders(722),
  })
  if (headerPolicy.status === 200) {
    fail("PG6-header-only-policy", "header-only student GET /api/playground/policy returned 200")
  } else if (headerPolicy.status === 401) {
    pass("PG6-header-only-policy", "401 header-only student policy")
  } else {
    fail("PG6-header-only-policy", `expected 401, got ${headerPolicy.status}`)
  }
}

async function runCreateJoinE2E() {
  console.log("\n=== F-002 Create session → student join ===\n")

  const topicsRes = await fetchJson("/api/instructor/playground/topics", {
    headers: instructorHeaders(),
  })
  if (topicsRes.status === 401) {
    fail("F-002-topics", "instructor session required")
    fail("F-002-create", "instructor session required")
    return
  }
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
    if (created.status === 401) {
      fail("F-002-create", "instructor session required")
      return
    }
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
    if ([401, 403, 404].includes(idorStop.status)) {
      pass("F-001-idor-stop", `${idorStop.status} foreign course cannot stop session`)
    } else {
      fail("F-001-idor-stop", `expected 401/403/404, got ${idorStop.status}`)
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
    if (joined.status === 401) {
      fail("F-002-student-join", "student session required")
    } else if (joined.ok) {
      pass("F-002-student-join", `joined session ${sessionId}`)
    } else {
      fail("F-002-student-join", `join failed (${joined.status}) ${JSON.stringify(joined.body)?.slice(0, 180)}`)
    }

    const started = await fetchJson("/api/instructor/playground/sessions", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start-game", sessionId }),
    })
    if (started.status === 401) {
      fail("F-002-start-game", "instructor session required")
    } else if (started.ok) {
      pass("F-002-start-game", "game started")
    } else {
      fail("F-002-start-game", `start-game failed (${started.status}) ${JSON.stringify(started.body)?.slice(0, 180)}`)
    }

    const questions = await fetchJson(`/api/playground/questions?sessionId=${sessionId}`, {
      headers: { "x-student-id": STUDENT_ID },
    })
    if (questions.status === 401) {
      pass("F-002-student-questions", "401 header-only student questions (session required)")
    } else if (questions.status === 200) {
      fail(
        "F-002-student-questions",
        "header-only student GET questions 200 — requireBoundStudentCaller first",
      )
    } else if ([400, 403, 409].includes(questions.status)) {
      pass("F-002-student-questions", `${questions.status} after start-game`)
    } else {
      fail("F-002-student-questions", `questions failed (${questions.status})`)
    }

    const board = await fetchJson(`/api/instructor/playground/leaderboard?sessionId=${sessionId}`, {
      headers: instructorHeaders(),
    })
    if (board.status === 401) {
      fail("F-002-leaderboard", "instructor session required")
    } else if (board.ok) {
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
      } else if (stopped.status === 401 && deleted.status === 401) {
        fail("F-002-cleanup", "instructor session required — not deleting a live session without a real session")
      } else {
        fail("F-002-cleanup", `cleanup failed stop=${stopped.status} delete=${deleted.status}`)
      }
    }
  }
}

async function main() {
  console.log(`Playground production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID}`)
  console.log("Does not POST /api/playground/admin/start or /api/admin/playground/sync-points.\n")

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
