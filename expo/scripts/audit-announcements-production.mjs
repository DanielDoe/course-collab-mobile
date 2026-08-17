#!/usr/bin/env node
/**
 * Faculty announcements production audit — closes F-001 (auth/IDOR) and F-002 (publish→student).
 *
 * Run: npm run audit:announcements-production
 *
 * Uses App Store review demo scope by default (instructor 15 / course 16 / student 910000001).
 * Publish probe creates a disposable announcement, verifies student visibility + pin + delete, then cleans up.
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const OTHER_STUDENT_ID = process.env.AUDIT_OTHER_STUDENT_ID || "910100001"
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

function studentHeaders(studentId = STUDENT_ID) {
  return { "x-student-id": String(studentId) }
}

function findAnnouncement(items, marker) {
  return (items ?? []).find((a) => a.title === marker || a.title?.includes(marker))
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missingIdentity = await fetchJson("/api/announcements")
  if (missingIdentity.status === 400 || missingIdentity.status === 401) {
    pass("F-001-missing-identity", `${missingIdentity.status} without student or instructor`)
  } else {
    fail("F-001-missing-identity", `expected 400/401, got ${missingIdentity.status}`)
  }

  const invalidInstructor = await fetchJson(
    `/api/announcements?instructorId=999999&courseId=${COURSE_ID}`,
  )
  if ([401, 403, 404].includes(invalidInstructor.status)) {
    pass("F-001-unknown-instructor", `${invalidInstructor.status} blocks unknown instructor list`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${invalidInstructor.status}`)
  }

  const idorList = await fetchJson(`/api/announcements?instructorId=${INSTRUCTOR_ID}&courseId=${IDOR_COURSE_ID}`, {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorList.status === 403) {
    pass("F-001-idor-list", `403 Forbidden on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-001-idor-list", `expected 403, got ${idorList.status}`)
  }

  const missingInstructorPost = await fetchJson("/api/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-course-id": COURSE_ID },
    body: JSON.stringify({ title: "IDOR probe", content: "no instructor header", course_id: Number(COURSE_ID) }),
  })
  if (missingInstructorPost.status === 401) {
    pass("F-001-missing-instructor-post", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor-post", `expected 401, got ${missingInstructorPost.status}`)
  }

  const idorCreate = await fetchJson("/api/announcements", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "IDOR probe",
      content: "should not publish",
      course_id: Number(IDOR_COURSE_ID),
    }),
  })
  if (idorCreate.status === 403 || idorCreate.status === 400) {
    pass("F-001-idor-create", `${idorCreate.status} blocks foreign course POST`)
  } else {
    fail("F-001-idor-create", `expected 403/400, got ${idorCreate.status}`)
  }

  const invalidStudent = await fetchJson("/api/announcements?studentId=999999")
  if (invalidStudent.status === 404) {
    pass("F-001-invalid-student", "404 Student not found")
  } else {
    fail("F-001-invalid-student", `expected 404, got ${invalidStudent.status}`)
  }
}

async function runPublishStudentE2E() {
  console.log("\n=== F-002 Publish → student feed ===\n")

  const marker = `Audit Announcement ${Date.now()}`
  let announcementId = null

  try {
    const created = await fetchJson("/api/announcements", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: marker,
        content: "Production audit probe — safe to ignore.",
        pinned: false,
        course_id: Number(COURSE_ID),
      }),
    })
    const createdId = created.body?.announcement?.id
    if (!created.ok || createdId == null) {
      fail("F-002-create", `create failed (${created.status})`)
      return
    }
    announcementId = Number(createdId)
    pass("F-002-create", `announcement id ${announcementId}`)

    const facultyGet = await fetchJson(
      `/api/announcements/${announcementId}?instructorId=${encodeURIComponent(INSTRUCTOR_ID)}`,
      { headers: instructorHeaders() },
    )
    if (facultyGet.ok && facultyGet.body?.announcement?.id === announcementId) {
      pass("F-001-faculty-get", "owner can read by id")
    } else {
      fail("F-001-faculty-get", `expected 200, got ${facultyGet.status}`)
    }

    const unauthGet = await fetchJson(`/api/announcements/${announcementId}`)
    if ([401, 403, 404].includes(unauthGet.status)) {
      pass("F-001-idor-get-unauth", `${unauthGet.status} without student or instructor`)
    } else {
      fail(
        "F-001-idor-get-unauth",
        `expected 401/403/404, got ${unauthGet.status} — deploy announcement-request-auth if still 200`,
      )
    }

    const unknownInstructorGet = await fetchJson(
      `/api/announcements/${announcementId}?instructorId=999999`,
    )
    if ([401, 403, 404].includes(unknownInstructorGet.status)) {
      pass("F-001-idor-get-unknown", `${unknownInstructorGet.status} blocks unknown instructor :id`)
    } else {
      fail(
        "F-001-idor-get-unknown",
        `expected 401/403/404, got ${unknownInstructorGet.status} — deploy GET :id course check if still 200`,
      )
    }

    const studentList = await fetchJson(`/api/announcements?studentId=${encodeURIComponent(STUDENT_ID)}`, {
      headers: studentHeaders(),
    })
    if (!studentList.ok) {
      fail("F-002-student-list", `student GET failed (${studentList.status})`)
      return
    }
    const visible = findAnnouncement(studentList.body?.announcements, marker)
    if (visible) {
      pass("F-002-student-visible", "enrolled student sees published announcement")
    } else {
      fail("F-002-student-visible", "published announcement missing from student feed")
    }

    const otherStudentList = await fetchJson(
      `/api/announcements?studentId=${encodeURIComponent(OTHER_STUDENT_ID)}`,
      { headers: studentHeaders(OTHER_STUDENT_ID) },
    )
    const leaked = findAnnouncement(otherStudentList.body?.announcements, marker)
    if (!leaked) {
      pass("F-001-student-course-scope", `other-course student ${OTHER_STUDENT_ID} does not see it`)
    } else {
      fail("F-001-student-course-scope", "announcement leaked to a student on another course")
    }

    const otherStudentGet = await fetchJson(
      `/api/announcements/${announcementId}?studentId=${encodeURIComponent(OTHER_STUDENT_ID)}`,
      { headers: studentHeaders(OTHER_STUDENT_ID) },
    )
    if (otherStudentGet.status === 404) {
      pass("F-001-idor-student-get", "404 for other-course student GET :id")
    } else {
      fail("F-001-idor-student-get", `expected 404, got ${otherStudentGet.status}`)
    }

    const pin = await fetchJson(`/api/announcements/${announcementId}`, {
      method: "PUT",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: true }),
    })
    if (pin.ok && pin.body?.announcement?.pinned === true) {
      pass("F-002-pin", "faculty pinned announcement")
    } else {
      fail("F-002-pin", `pin failed (${pin.status})`)
    }

    const studentPinned = await fetchJson(`/api/announcements?studentId=${encodeURIComponent(STUDENT_ID)}`, {
      headers: studentHeaders(),
    })
    const pinnedRow = findAnnouncement(studentPinned.body?.announcements, marker)
    const first = studentPinned.body?.announcements?.[0]
    if (pinnedRow?.pinned === true) {
      pass("F-002-student-pinned", "student feed shows pinned=true")
    } else {
      fail("F-002-student-pinned", "pinned announcement missing or not pinned for student")
    }
    if (first && (first.id === announcementId || first.title === marker)) {
      pass("F-002-pin-order", "pinned announcement is first in student feed")
    } else {
      fail("F-002-pin-order", "pinned announcement is not first in student feed")
    }

    const deleted = await fetchJson(`/api/announcements/${announcementId}`, {
      method: "DELETE",
      headers: instructorHeaders(),
    })
    if (deleted.ok) {
      pass("F-002-delete", `faculty deleted announcement ${announcementId}`)
      announcementId = null
    } else {
      fail("F-002-delete", `delete failed (${deleted.status})`)
    }

    const studentAfterDelete = await fetchJson(`/api/announcements?studentId=${encodeURIComponent(STUDENT_ID)}`, {
      headers: studentHeaders(),
    })
    const stillVisible = findAnnouncement(studentAfterDelete.body?.announcements, marker)
    if (!stillVisible) {
      pass("F-002-student-removed", "deleted announcement hidden from student feed")
    } else {
      fail("F-002-student-removed", "deleted announcement still in student feed")
    }
  } finally {
    if (announcementId != null) {
      const cleanup = await fetchJson(`/api/announcements/${announcementId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
      if (cleanup.ok || cleanup.status === 404) {
        pass("F-002-cleanup", `removed audit announcement ${announcementId}`)
      } else {
        fail("F-002-cleanup", `cleanup failed (${cleanup.status}) — announcement ${announcementId} may remain`)
      }
    }
  }
}

async function main() {
  console.log(`Announcements production audit → ${BASE}`)
  console.log(
    `Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID} otherStudent=${OTHER_STUDENT_ID}`,
  )

  await runAuthProbes()
  await runPublishStudentE2E()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
