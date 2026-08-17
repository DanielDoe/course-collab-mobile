#!/usr/bin/env node
/**
 * Faculty course notes production audit — closes F-001 (auth/IDOR) and F-002 (publish→student).
 *
 * Run: npm run audit:course-notes-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const STUDENT_SESSION = process.env.AUDIT_STUDENT_SESSION || "ECE2202"
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

function studentHeaders() {
  return { "x-student-id": STUDENT_ID }
}

function studentCourseNotesPath() {
  const params = new URLSearchParams({
    studentDatabaseId: STUDENT_ID,
    courseId: COURSE_ID,
    session: STUDENT_SESSION,
  })
  return `/api/student/course-notes?${params.toString()}`
}

function findNote(notes, marker) {
  return (notes ?? []).find((n) => n.title === marker || n.title?.includes(marker))
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missingInstructor = await fetchJson("/api/instructor/course-notes", {
    headers: { "x-course-id": COURSE_ID },
  })
  if (missingInstructor.status === 401) {
    pass("F-001-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor", `expected 401, got ${missingInstructor.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/course-notes", {
    headers: instructorHeaders("999999"),
  })
  if (invalidCourse.status === 404 && invalidCourse.body?.error === "Course not found") {
    pass("F-001-invalid-course", "404 Course not found")
  } else {
    fail("F-001-invalid-course", `expected 404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/course-notes", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorList.status === 403) {
    pass("F-001-idor-list", `403 Forbidden on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-001-idor-list", `expected 403, got ${idorList.status}`)
  }

  const idorCreate = await fetchJson("/api/instructor/course-notes", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "IDOR probe", bodyText: "test", isPublished: false }),
  })
  if (idorCreate.status === 403) {
    pass("F-001-idor-create", "403 Forbidden on foreign course POST")
  } else {
    fail("F-001-idor-create", `expected 403, got ${idorCreate.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/course-notes", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const missingStudent = await fetchJson(studentCourseNotesPath())
  if (missingStudent.status === 401) {
    pass("F-001-student-auth", "401 without x-student-id")
  } else {
    fail("F-001-student-auth", `expected 401, got ${missingStudent.status}`)
  }
}

async function runPublishStudentE2E() {
  console.log("\n=== F-002 Publish / topic / student visibility ===\n")

  const marker = `Audit Course Notes ${Date.now()}`
  const topicName = `AuditTopic-${Date.now()}`
  let noteId = null

  try {
    const created = await fetchJson("/api/instructor/course-notes", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: marker,
        bodyText: "Production audit probe — safe to ignore.",
        topic: topicName,
        session: null,
        isPublished: false,
      }),
    })
    if (!created.ok || !created.body?.note?.id) {
      fail("F-002-create-draft", `create failed (${created.status})`)
      return
    }
    noteId = created.body.note.id
    pass("F-002-create-draft", `note id ${noteId} (draft)`)

    const studentDraft = await fetchJson(studentCourseNotesPath(), { headers: studentHeaders() })
    if (!studentDraft.ok) {
      fail("F-002-student-draft", `student GET failed (${studentDraft.status})`)
    } else if (!findNote(studentDraft.body?.notes, marker)) {
      pass("F-002-student-draft", "draft note hidden from students")
    } else {
      fail("F-002-student-draft", "draft note visible to students")
    }

    const publish = await fetchJson(`/api/instructor/course-notes/${noteId}`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: true }),
    })
    if (!publish.ok) {
      fail("F-002-publish", `publish failed (${publish.status})`)
      return
    }
    pass("F-002-publish", "note published")

    const studentPublished = await fetchJson(studentCourseNotesPath(), { headers: studentHeaders() })
    if (!studentPublished.ok) {
      fail("F-002-student-published", `student GET failed (${studentPublished.status})`)
    } else if (findNote(studentPublished.body?.notes, marker)) {
      pass("F-002-student-published", "published note visible to students")
    } else {
      fail("F-002-student-published", "published note missing from student list")
    }

    const topicOff = await fetchJson("/api/instructor/course-notes/topics/toggle", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ topicName, session: STUDENT_SESSION, isAvailable: false }),
    })
    if (!topicOff.ok) {
      fail("F-002-topic-off", `topic toggle failed (${topicOff.status})`)
    } else {
      pass("F-002-topic-off", `topic disabled for ${STUDENT_SESSION}`)
    }

    const studentTopicOff = await fetchJson(studentCourseNotesPath(), { headers: studentHeaders() })
    if (!studentTopicOff.ok) {
      fail("F-002-student-topic-off", `student GET failed (${studentTopicOff.status})`)
    } else if (!findNote(studentTopicOff.body?.notes, marker)) {
      pass("F-002-student-topic-off", "note hidden when topic disabled")
    } else {
      fail("F-002-student-topic-off", "note still visible with topic disabled")
    }

    const topicOn = await fetchJson("/api/instructor/course-notes/topics/toggle", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ topicName, session: STUDENT_SESSION, isAvailable: true }),
    })
    if (!topicOn.ok) {
      fail("F-002-topic-on", `topic re-enable failed (${topicOn.status})`)
    } else {
      pass("F-002-topic-on", "topic re-enabled")
    }

    const idorGet = await fetchJson(`/api/instructor/course-notes/${noteId}`, {
      headers: instructorHeaders(IDOR_COURSE_ID),
    })
    if (idorGet.status === 404 || idorGet.status === 403) {
      pass("F-002-idor-note", `${idorGet.status} blocks cross-course note GET`)
    } else {
      fail("F-002-idor-note", `expected 404/403 on cross-course GET, got ${idorGet.status}`)
    }

    const unpublish = await fetchJson(`/api/instructor/course-notes/${noteId}`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: false }),
    })
    if (!unpublish.ok) {
      fail("F-002-unpublish", `unpublish failed (${unpublish.status})`)
    } else {
      pass("F-002-unpublish", "note unpublished")
    }

    const studentUnpublished = await fetchJson(studentCourseNotesPath(), { headers: studentHeaders() })
    if (!studentUnpublished.ok) {
      fail("F-002-student-unpublished", `student GET failed (${studentUnpublished.status})`)
    } else if (!findNote(studentUnpublished.body?.notes, marker)) {
      pass("F-002-student-unpublished", "unpublished note hidden from students")
    } else {
      fail("F-002-student-unpublished", "unpublished note still visible")
    }
  } finally {
    if (noteId != null) {
      const deleted = await fetchJson(`/api/instructor/course-notes/${noteId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
      if (deleted.ok) {
        pass("F-002-cleanup", `soft-deleted audit note ${noteId}`)
      } else {
        fail("F-002-cleanup", `cleanup failed (${deleted.status}) — note ${noteId} may remain`)
      }
    }
  }
}

async function main() {
  console.log(`Course Notes production audit → ${BASE}`)
  console.log(
    `Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID} session=${STUDENT_SESSION}`,
  )

  await runAuthProbes()
  await runPublishStudentE2E()

  const failed = results.filter((r) => !r.ok)
  console.log(
    `\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`,
  )
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
