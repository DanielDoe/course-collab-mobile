#!/usr/bin/env node
/**
 * Final-exams production audit — honest auth probes.
 *
 * Header-only x-instructor-id / x-student-id is NOT authentication.
 * HTTP 200 on those probes is the vulnerability (FAIL). HTTP 500 is never a pass.
 *
 * Does not start or submit live exam 162. Create probes use AUDIT-DELETE titles
 * and delete any created quiz in `finally`.
 *
 * Run: npm run audit:final-exams-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"
const STUDENT_DB_ID = process.env.AUDIT_STUDENT_DB_ID || "722"
const LIVE_EXAM_ID = 162

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

function headerOnlyStudent(studentId = STUDENT_DB_ID) {
  return { "x-student-id": String(studentId) }
}

/** Header-only identity must be rejected. 200 is the vuln. 500 is never a pass. */
function expectHeaderOnlyRejected(id, status, extra = "") {
  if (status === 200 || status === 201) {
    fail(id, `header-only accepted (${status})${extra ? ` ${extra}` : ""}`)
    return
  }
  if (status === 500) {
    fail(id, `HTTP 500 is not a pass${extra ? ` ${extra}` : ""}`)
    return
  }
  if (status === 401) {
    pass(id, `401 rejected header-only${extra ? ` ${extra}` : ""}`)
    return
  }
  fail(id, `expected 401, got ${status}${extra ? ` ${extra}` : ""}`)
}

function quizIdFromBody(body) {
  const id = body?.quiz_id ?? body?.quiz?.id ?? null
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function deleteAuditQuiz(quizId) {
  if (quizId == null || quizId === LIVE_EXAM_ID) return
  const deleted = await fetchJson(`/api/instructor/quizzes/${quizId}`, {
    method: "DELETE",
    headers: headerOnlyInstructor(),
  })
  if (deleted.ok) {
    console.log(`  cleaned up header-only create quiz ${quizId} (${deleted.status})`)
  } else {
    console.error(`  cleanup failed for quiz ${quizId}: ${deleted.status}`)
  }
}

async function run() {
  console.log(`\nFinal-exams production audit → ${BASE}`)
  console.log("Header-only x-instructor-id / x-student-id is not auth. 200 = FAIL.\n")

  console.log("=== Unauthenticated faculty list ===\n")

  const missing = await fetchJson("/api/instructor/quizzes?assessment_type=final")
  if (missing.status === 401) {
    pass("FE2-unauth-list", "401 without auth")
  } else if (missing.status === 500) {
    fail("FE2-unauth-list", "HTTP 500 is not a pass")
  } else {
    fail("FE2-unauth-list", `expected 401, got ${missing.status}`)
  }

  console.log("\n=== Header-only faculty (must not be 200) ===\n")

  const headerList = await fetchJson("/api/instructor/quizzes?assessment_type=final", {
    headers: headerOnlyInstructor(),
  })
  expectHeaderOnlyRejected("FE2-header-only-list", headerList.status)

  let detailId = 1
  const listed = headerList.body?.quizzes ?? headerList.body?.finals ?? []
  if (Array.isArray(listed)) {
    const other = listed.find((q) => Number(q?.id) !== LIVE_EXAM_ID && Number(q?.id) > 0)
    if (other) detailId = Number(other.id)
  }
  if (detailId === LIVE_EXAM_ID) detailId = 1

  const headerDetail = await fetchJson(`/api/instructor/quizzes/${detailId}`, {
    headers: headerOnlyInstructor(),
  })
  expectHeaderOnlyRejected("FE2-header-only-detail", headerDetail.status, `quiz ${detailId}`)

  const title = `AUDIT-DELETE Final ${Date.now()}`
  let createdId = null
  try {
    const created = await fetchJson("/api/instructor/quizzes/create-from-bank", {
      method: "POST",
      headers: { ...headerOnlyInstructor(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: "Audit probe — delete immediately",
        question_ids: [999999001],
        assessment_type: "final",
        time_limit: 60,
      }),
    })
    createdId = quizIdFromBody(created.body)
    if (createdId === LIVE_EXAM_ID) {
      fail("FE2-header-only-create", "refusing to treat live exam 162 as an audit create")
      createdId = null
    } else {
      expectHeaderOnlyRejected(
        "FE2-header-only-create",
        created.status,
        createdId != null ? `quiz ${createdId}` : "",
      )
    }
  } finally {
    await deleteAuditQuiz(createdId)
  }

  console.log("\n=== Header-only / unauth student finals (must not be 200) ===\n")

  const unauthFinals = await fetchJson(
    `/api/student/finals?session=${encodeURIComponent(SESSION)}&studentId=${encodeURIComponent(STUDENT_DB_ID)}`,
  )
  expectHeaderOnlyRejected("FE1-unauth-finals", unauthFinals.status)

  const unauthQuizzes = await fetchJson(
    `/api/student/quizzes?studentDatabaseId=${encodeURIComponent(STUDENT_DB_ID)}&type=final`,
  )
  expectHeaderOnlyRejected("FE1-unauth-quizzes-type-final", unauthQuizzes.status)

  const headerFinals = await fetchJson(
    `/api/student/finals?session=${encodeURIComponent(SESSION)}&studentId=${encodeURIComponent(STUDENT_DB_ID)}`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("FE1-header-only-finals", headerFinals.status)

  const headerQuizzes = await fetchJson(
    `/api/student/quizzes?studentDatabaseId=${encodeURIComponent(STUDENT_DB_ID)}&type=final`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("FE1-header-only-quizzes-type-final", headerQuizzes.status)

  const passed = results.filter((row) => row.ok).length
  const failed = results.filter((row) => !row.ok).length
  console.log(`\n${passed} PASS / ${failed} FAIL of ${results.length}`)
  if (failed > 0) {
    console.error("FE1-FE4 remain OPEN on production until the server is patched. Local clients are not a deploy.")
    process.exit(1)
  }
  console.log("Header-only and unauthenticated finals probes were rejected.")
}

run().catch((error) => {
  console.error("audit-final-exams-production failed:", error)
  process.exit(1)
})
