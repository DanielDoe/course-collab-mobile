#!/usr/bin/env node
/**
 * Quizzes production audit — honest auth probes.
 *
 * Header-only x-instructor-id / x-student-id is NOT authentication.
 * HTTP 200/201 on those probes is the vulnerability (FAIL). HTTP 500 is never a pass.
 *
 * Does not start, take, save, finalize, or submit live Quiz 1/2/3 (163/164/169)
 * or Final Exam 1 (162). Create probes use AUDIT-DELETE titles and delete any
 * created quiz in `finally`.
 *
 * Run: npm run audit:quizzes-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_DB_ID = process.env.AUDIT_STUDENT_DB_ID || "722"
const LIVE_QUIZ_IDS = new Set([162, 163, 164, 169])
const FACULTY_DETAIL_ID = 169
const FAKE_QUIZ_ID = 999999001
const FAKE_ATTEMPT_ID = 999999001

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
  if (quizId == null || LIVE_QUIZ_IDS.has(quizId)) return
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
  console.log(`\nQuizzes production audit → ${BASE}`)
  console.log("Header-only x-instructor-id / x-student-id is not auth. 200 = FAIL.")
  console.log("Does not start or submit live quizzes 163/164/169 or exam 162.\n")

  console.log("=== Unauthenticated faculty list ===\n")

  const missing = await fetchJson("/api/instructor/quizzes?assessment_type=quiz")
  if (missing.status === 401) {
    pass("Q-unauth-faculty-list", "401 without auth")
  } else if (missing.status === 500) {
    fail("Q-unauth-faculty-list", "HTTP 500 is not a pass")
  } else {
    fail("Q-unauth-faculty-list", `expected 401, got ${missing.status}`)
  }

  console.log("\n=== Header-only faculty (must not be 200) ===\n")

  const headerList = await fetchJson("/api/instructor/quizzes?assessment_type=quiz", {
    headers: headerOnlyInstructor(),
  })
  expectHeaderOnlyRejected("Q-header-only-faculty-list", headerList.status)

  let detailId = FACULTY_DETAIL_ID
  const listed = headerList.body?.quizzes ?? []
  if (Array.isArray(listed)) {
    const other = listed.find((q) => {
      const id = Number(q?.id)
      return Number.isFinite(id) && id > 0 && id !== 162
    })
    if (other) detailId = Number(other.id)
  }
  if (detailId === 162) detailId = FACULTY_DETAIL_ID
  if (detailId !== FACULTY_DETAIL_ID && detailId !== 1 && LIVE_QUIZ_IDS.has(detailId)) {
    detailId = FACULTY_DETAIL_ID
  }

  const headerDetail = await fetchJson(`/api/instructor/quizzes/${detailId}`, {
    headers: headerOnlyInstructor(),
  })
  expectHeaderOnlyRejected("Q-header-only-faculty-detail", headerDetail.status, `quiz ${detailId}`)

  const title = `AUDIT-DELETE Quiz ${Date.now()}`
  let createdId = null
  try {
    const created = await fetchJson("/api/instructor/quizzes/create-from-bank", {
      method: "POST",
      headers: { ...headerOnlyInstructor(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: "Audit probe — delete immediately",
        question_ids: [FAKE_QUIZ_ID],
        assessment_type: "quiz",
        time_limit: 30,
      }),
    })
    createdId = quizIdFromBody(created.body)
    if (createdId != null && LIVE_QUIZ_IDS.has(createdId)) {
      fail("Q-header-only-faculty-create", `refusing to treat live quiz ${createdId} as an audit create`)
      createdId = null
    } else {
      expectHeaderOnlyRejected(
        "Q-header-only-faculty-create",
        created.status,
        createdId != null ? `quiz ${createdId}` : "",
      )
    }

    const toggle = await fetchJson(`/api/instructor/quizzes/${FAKE_QUIZ_ID}/toggle-session`, {
      method: "PATCH",
      headers: { ...headerOnlyInstructor(), "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: "ECE2202", is_active: true }),
    })
    expectHeaderOnlyRejected("Q-header-only-faculty-toggle", toggle.status, `quiz ${FAKE_QUIZ_ID}`)

    const deleted = await fetchJson(`/api/instructor/quizzes/${FAKE_QUIZ_ID}`, {
      method: "DELETE",
      headers: headerOnlyInstructor(),
    })
    expectHeaderOnlyRejected("Q-header-only-faculty-delete", deleted.status, `quiz ${FAKE_QUIZ_ID}`)
  } finally {
    await deleteAuditQuiz(createdId)
  }

  console.log("\n=== Header-only / unauth student quizzes (must not be 200) ===\n")

  const unauthList = await fetchJson(
    `/api/student/quizzes?studentDatabaseId=${encodeURIComponent(STUDENT_DB_ID)}&type=quiz`,
  )
  expectHeaderOnlyRejected("Q-unauth-student-list", unauthList.status)

  const headerListStudent = await fetchJson(
    `/api/student/quizzes?studentDatabaseId=${encodeURIComponent(STUDENT_DB_ID)}&type=quiz`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("Q-header-only-student-list", headerListStudent.status)

  const headerStart = await fetchJson("/api/student/start-quiz", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: Number(STUDENT_DB_ID), quizId: 1 }),
  })
  expectHeaderOnlyRejected("Q-header-only-start-quiz", headerStart.status)

  const headerProgress = await fetchJson("/api/student/quiz-progress", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: FAKE_ATTEMPT_ID }),
  })
  expectHeaderOnlyRejected("Q-header-only-quiz-progress", headerProgress.status)

  const headerViolation = await fetchJson("/api/quiz/log-violation", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: FAKE_ATTEMPT_ID,
      violation: { type: "audit_probe", reason: "header-only", source: "audit" },
    }),
  })
  expectHeaderOnlyRejected("Q-header-only-log-violation", headerViolation.status)

  const headerIssues = await fetchJson(
    `/api/student/issues?studentId=${encodeURIComponent(STUDENT_DB_ID)}`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("Q-header-only-issues", headerIssues.status)

  const headerSave = await fetchJson("/api/student/save-answer", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: FAKE_ATTEMPT_ID,
      questionId: 1,
      answer: "",
      questionType: "mcq",
    }),
  })
  expectHeaderOnlyRejected("Q-header-only-save-answer", headerSave.status)

  const headerSubmit = await fetchJson("/api/quiz/submit", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: FAKE_ATTEMPT_ID }),
  })
  expectHeaderOnlyRejected("Q-header-only-quiz-submit", headerSubmit.status)

  const passed = results.filter((row) => row.ok).length
  const failed = results.filter((row) => row.ok === false).length
  console.log(`\n${passed} PASS / ${failed} FAIL of ${results.length}`)
  if (failed > 0) {
    console.error("Q1–Q5 remain OPEN on production until the server is patched. Local clients are not a deploy.")
    process.exit(1)
  }
  console.log("Header-only and unauthenticated quiz probes were rejected.")
}

run().catch((error) => {
  console.error("audit-quizzes-production failed:", error)
  process.exit(1)
})
