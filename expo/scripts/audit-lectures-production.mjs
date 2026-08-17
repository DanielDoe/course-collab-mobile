#!/usr/bin/env node
/**
 * Faculty lectures production audit — closes F-001 (auth/IDOR) and F-002 (publish→student).
 *
 * Run: npm run audit:lectures-production
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

function studentLecturesPath(extra = "") {
  const params = new URLSearchParams({ studentId: STUDENT_ID })
  return `/api/student/lectures${extra}?${params.toString()}`
}

function findLecture(lectures, marker) {
  return (lectures ?? []).find((row) => row.title === marker || row.title?.includes(marker))
}

async function deleteLecture(lectureId) {
  const byPath = await fetchJson(`/api/instructor/lectures/${lectureId}`, {
    method: "DELETE",
    headers: instructorHeaders(),
  })
  if (byPath.ok) return byPath
  return fetchJson(`/api/instructor/lectures?id=${lectureId}`, {
    method: "DELETE",
    headers: instructorHeaders(),
  })
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missingInstructor = await fetchJson("/api/instructor/lectures")
  if (missingInstructor.status === 401) {
    pass("F-001-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor", `expected 401, got ${missingInstructor.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/lectures", {
    headers: instructorHeaders("999999"),
  })
  if (invalidCourse.status === 404 && invalidCourse.body?.error === "Course not found") {
    pass("F-001-invalid-course", "404 Course not found")
  } else {
    fail("F-001-invalid-course", `expected 404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/lectures", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorList.status === 403) {
    pass("F-001-idor-list", `403 Forbidden on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-001-idor-list", `expected 403, got ${idorList.status}`)
  }

  const idorCreate = await fetchJson("/api/instructor/lectures", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "IDOR probe", week: 1, is_published: false }),
  })
  if (idorCreate.status === 403) {
    pass("F-001-idor-create", "403 Forbidden on foreign course POST")
  } else {
    fail("F-001-idor-create", `expected 403, got ${idorCreate.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/lectures", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const missingStudent = await fetchJson("/api/student/lectures")
  if ([400, 401].includes(missingStudent.status)) {
    pass("F-001-student-auth", `${missingStudent.status} without studentId`)
  } else {
    fail("F-001-student-auth", `expected 400/401, got ${missingStudent.status}`)
  }
}

async function runPublishStudentE2E() {
  console.log("\n=== F-002 Publish / sample practice / workspace → student ===\n")

  const marker = `Audit Lectures ${Date.now()}`
  let lectureId = null

  try {
    const created = await fetchJson("/api/instructor/lectures", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: marker,
        week: 99,
        description: "Production audit probe — safe to ignore.",
        is_published: false,
      }),
    })
    if (!created.ok || !created.body?.lecture?.id) {
      fail("F-002-create-draft", `create failed (${created.status})`)
      return
    }
    lectureId = created.body.lecture.id
    pass("F-002-create-draft", `lecture id ${lectureId} (draft)`)

    const studentDraft = await fetchJson(studentLecturesPath())
    if (!studentDraft.ok) {
      fail("F-002-student-draft", `student GET failed (${studentDraft.status})`)
    } else if (!findLecture(studentDraft.body?.lectures, marker)) {
      pass("F-002-student-draft", "draft lecture hidden from students")
    } else {
      fail("F-002-student-draft", "draft lecture visible to students")
    }

    const idorPatch = await fetchJson(`/api/instructor/lectures/${lectureId}`, {
      method: "PATCH",
      headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: true }),
    })
    if (idorPatch.status === 403 || idorPatch.status === 404) {
      pass("F-002-idor-patch", `${idorPatch.status} blocks cross-course PATCH`)
    } else {
      fail("F-002-idor-patch", `expected 403/404, got ${idorPatch.status}`)
    }

    const publish = await fetchJson(`/api/instructor/lectures/${lectureId}`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: true }),
    })
    if (!publish.ok) {
      fail("F-002-publish", `publish failed (${publish.status})`)
      return
    }
    pass("F-002-publish", "lecture published")

    const studentPublished = await fetchJson(studentLecturesPath())
    if (!studentPublished.ok) {
      fail("F-002-student-published", `student GET failed (${studentPublished.status})`)
    } else if (findLecture(studentPublished.body?.lectures, marker)) {
      pass("F-002-student-published", "published lecture visible to students")
    } else {
      fail("F-002-student-published", "published lecture missing from student list")
    }

    const studentDetail = await fetchJson(`/api/student/lectures/${lectureId}?studentId=${STUDENT_ID}`)
    if (studentDetail.ok && studentDetail.body?.lecture) {
      pass("F-002-student-detail", "student lecture-by-id reachable")
    } else {
      fail("F-002-student-detail", `student detail failed (${studentDetail.status})`)
    }

    const samplePractice = await fetchJson(`/api/instructor/lectures/${lectureId}/sample-practice`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        config: { enabled: true, button_label: "Sample Practice", questions: [] },
      }),
    })
    if (samplePractice.ok) {
      pass("F-002-save-sample-practice", "sample practice enabled")
    } else {
      fail("F-002-save-sample-practice", `save failed (${samplePractice.status})`)
    }

    const studentSp = await fetchJson(
      `/api/student/lectures/${lectureId}/sample-practice?studentId=${STUDENT_ID}`,
    )
    if (studentSp.ok && (studentSp.body?.config?.enabled || studentSp.body?.enabled)) {
      pass("F-002-student-sample-practice", "student sample practice reachable and enabled")
    } else if (studentSp.ok) {
      pass("F-002-student-sample-practice", "student sample practice reachable")
    } else {
      fail("F-002-student-sample-practice", `student SP failed (${studentSp.status})`)
    }

    const workspace = await fetchJson(`/api/instructor/lectures/${lectureId}/workspace`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          enabled: true,
          title: "Audit Workspace",
          button_label: "Workspace",
          questions: [],
        },
      }),
    })
    if (workspace.ok) {
      pass("F-002-save-workspace", "workspace enabled")
    } else {
      fail("F-002-save-workspace", `save failed (${workspace.status})`)
    }

    const studentWs = await fetchJson(
      `/api/student/lectures/${lectureId}/workspace?studentId=${STUDENT_ID}`,
    )
    if (studentWs.ok) {
      pass("F-002-student-workspace", "student workspace reachable")
    } else {
      fail("F-002-student-workspace", `student workspace failed (${studentWs.status})`)
    }

    const unpublish = await fetchJson(`/api/instructor/lectures/${lectureId}`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: false }),
    })
    if (!unpublish.ok) {
      fail("F-002-unpublish", `unpublish failed (${unpublish.status})`)
    } else {
      pass("F-002-unpublish", "lecture unpublished")
    }

    const studentUnpublished = await fetchJson(studentLecturesPath())
    if (!studentUnpublished.ok) {
      fail("F-002-student-unpublished", `student GET failed (${studentUnpublished.status})`)
    } else if (!findLecture(studentUnpublished.body?.lectures, marker)) {
      pass("F-002-student-unpublished", "unpublished lecture hidden from students")
    } else {
      fail("F-002-student-unpublished", "unpublished lecture still visible")
    }
  } finally {
    if (lectureId != null) {
      const deleted = await deleteLecture(lectureId)
      if (deleted.ok) {
        pass("F-002-cleanup", `soft-deleted audit lecture ${lectureId}`)
      } else {
        fail("F-002-cleanup", `cleanup failed (${deleted.status}) — lecture ${lectureId} may remain`)
      }
    }
  }
}

async function main() {
  console.log(`Lectures production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID}`)

  await runAuthProbes()
  await runPublishStudentE2E()

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
