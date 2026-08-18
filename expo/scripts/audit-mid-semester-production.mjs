#!/usr/bin/env node
/**
 * Mid-semester production audit — honest auth probes.
 *
 * Header-only x-instructor-id / x-student-id is NOT authentication.
 * HTTP 200/201 on those probes is the vulnerability (FAIL). HTTP 500 is never a pass.
 * Expected reject is 401.
 *
 * Unauth GET /api/student/mid-semesters?studentId=722 returning 200 is FAIL (MS1).
 *
 * Does not start, take, save, finalize, or submit live Mid-Semester Exam 1/2
 * (166, 167) or Final Exam 1 (162). Does not finalize leftover attempt 4493.
 * Does not cookie-login E2E that starts 166/167. Create probes use
 * AUDIT-DELETE titles and delete any created mid in `finally` only when the
 * id is not in that live set.
 *
 * Run: npm run audit:mid-semester-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_DB_ID = process.env.AUDIT_STUDENT_DB_ID || "722"
const LIVE_MID_IDS = new Set([166, 167, 162])
const FACULTY_DETAIL_ID = 167
const FAKE_MID_ID = 999999001
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

function midIdFromBody(body) {
  const id = body?.quiz_id ?? body?.quiz?.id ?? null
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function deleteAuditMid(midId) {
  if (midId == null || LIVE_MID_IDS.has(midId)) return
  const deleted = await fetchJson(`/api/instructor/quizzes/${midId}`, {
    method: "DELETE",
    headers: headerOnlyInstructor(),
  })
  if (deleted.ok) {
    console.log(`  cleaned up header-only create mid ${midId} (${deleted.status})`)
  } else {
    console.error(`  cleanup failed for mid ${midId}: ${deleted.status}`)
  }
}

async function run() {
  console.log(`\nMid-semester production audit → ${BASE}`)
  console.log("Header-only x-instructor-id / x-student-id is not auth. 200 = FAIL.")
  console.log("Does not start or submit live Mid 1/2 (166/167) or exam 162. Does not finalize 4493.\n")

  console.log("=== Unauthenticated faculty list ===\n")

  const missing = await fetchJson("/api/instructor/quizzes?assessment_type=mid_semester")
  if (missing.status === 401) {
    pass("MS-unauth-faculty-list", "401 without auth")
  } else if (missing.status === 500) {
    fail("MS-unauth-faculty-list", "HTTP 500 is not a pass")
  } else {
    fail("MS-unauth-faculty-list", `expected 401, got ${missing.status}`)
  }

  console.log("\n=== Header-only faculty (must not be 200) ===\n")

  const headerList = await fetchJson("/api/instructor/quizzes?assessment_type=mid_semester", {
    headers: headerOnlyInstructor(),
  })
  expectHeaderOnlyRejected("MS-header-only-faculty-list", headerList.status)

  const detailId = FACULTY_DETAIL_ID === 162 ? 1 : FACULTY_DETAIL_ID
  const headerDetail = await fetchJson(`/api/instructor/quizzes/${detailId}`, {
    headers: headerOnlyInstructor(),
  })
  expectHeaderOnlyRejected("MS-header-only-faculty-detail", headerDetail.status, `mid ${detailId}`)

  const title = `AUDIT-DELETE Mid ${Date.now()}`
  let createdId = null
  try {
    const created = await fetchJson("/api/instructor/quizzes/create-from-bank", {
      method: "POST",
      headers: { ...headerOnlyInstructor(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: "Audit probe — delete immediately",
        question_ids: [FAKE_MID_ID],
        assessment_type: "mid_semester",
        time_limit: 30,
      }),
    })
    createdId = midIdFromBody(created.body)
    if (createdId != null && LIVE_MID_IDS.has(createdId)) {
      fail("MS-header-only-faculty-create", `refusing to treat live mid ${createdId} as an audit create`)
      createdId = null
    } else {
      expectHeaderOnlyRejected(
        "MS-header-only-faculty-create",
        created.status,
        createdId != null ? `mid ${createdId}` : "",
      )
    }

    const toggle = await fetchJson(`/api/instructor/quizzes/${FAKE_MID_ID}/toggle-session`, {
      method: "PATCH",
      headers: { ...headerOnlyInstructor(), "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: "ECE2202", is_active: true }),
    })
    expectHeaderOnlyRejected("MS-header-only-faculty-toggle", toggle.status, `mid ${FAKE_MID_ID}`)

    const deleted = await fetchJson(`/api/instructor/quizzes/${FAKE_MID_ID}`, {
      method: "DELETE",
      headers: headerOnlyInstructor(),
    })
    expectHeaderOnlyRejected("MS-header-only-faculty-delete", deleted.status, `mid ${FAKE_MID_ID}`)
  } finally {
    await deleteAuditMid(createdId)
  }

  console.log("\n=== Unauth / header-only student mid-semester (must not be 200) ===\n")

  const unauthMidList = await fetchJson(
    `/api/student/mid-semesters?studentId=${encodeURIComponent(STUDENT_DB_ID)}`,
  )
  expectHeaderOnlyRejected("MS-unauth-mid-semesters", unauthMidList.status)

  const headerMidList = await fetchJson(
    `/api/student/mid-semesters?studentId=${encodeURIComponent(STUDENT_DB_ID)}`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("MS-header-only-mid-semesters", headerMidList.status)

  const headerQuizzesMid = await fetchJson(
    `/api/student/quizzes?studentDatabaseId=${encodeURIComponent(STUDENT_DB_ID)}&type=mid_semester`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("MS-header-only-quizzes-mid", headerQuizzesMid.status)

  const headerStart = await fetchJson("/api/student/start-quiz", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: Number(STUDENT_DB_ID), quizId: 1 }),
  })
  expectHeaderOnlyRejected("MS-header-only-start-quiz", headerStart.status)

  const headerTake = await fetchJson("/api/midsem/take/1", {
    headers: headerOnlyStudent(),
  })
  expectHeaderOnlyRejected("MS-header-only-midsem-take", headerTake.status)

  const headerSubmit = await fetchJson("/api/midsem/submit", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: FAKE_ATTEMPT_ID,
      questionId: 1,
      answer: "",
    }),
  })
  expectHeaderOnlyRejected("MS-header-only-midsem-submit", headerSubmit.status)

  const headerProgress = await fetchJson("/api/student/quiz-progress", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: FAKE_ATTEMPT_ID }),
  })
  expectHeaderOnlyRejected("MS-header-only-quiz-progress", headerProgress.status)

  const headerViolation = await fetchJson("/api/quiz/log-violation", {
    method: "POST",
    headers: { ...headerOnlyStudent(), "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: FAKE_ATTEMPT_ID,
      violation: { type: "audit_probe", reason: "header-only", source: "audit" },
    }),
  })
  expectHeaderOnlyRejected("MS-header-only-log-violation", headerViolation.status)

  const headerIssues = await fetchJson(
    `/api/student/issues?studentId=${encodeURIComponent(STUDENT_DB_ID)}`,
    { headers: headerOnlyStudent() },
  )
  expectHeaderOnlyRejected("MS-header-only-issues", headerIssues.status)

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
  expectHeaderOnlyRejected("MS-header-only-save-answer", headerSave.status)

  const passed = results.filter((row) => row.ok).length
  const failed = results.filter((row) => row.ok === false).length
  console.log(`\n${passed} PASS / ${failed} FAIL of ${results.length}`)
  if (failed > 0) {
    console.error("MS1–MS6 remain OPEN on production until the server is patched. Local clients are not a deploy.")
    process.exit(1)
  }
  console.log("Header-only and unauthenticated mid-semester probes were rejected.")
}

run().catch((error) => {
  console.error("audit-mid-semester-production failed:", error)
  process.exit(1)
})
