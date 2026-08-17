#!/usr/bin/env node
/**
 * Faculty syllabus production audit — closes F-002 (publish→student) and F-003 (auth/IDOR).
 *
 * Run:
 *   node expo/scripts/audit-syllabus-production.mjs
 *   AUDIT_API_BASE=https://coursecollab.vercel.app node expo/scripts/audit-syllabus-production.mjs
 *
 * Uses App Store review demo scope by default (instructor 15 / course 16 / student 910000001).
 * Publish probe adds a disposable custom section, verifies student visibility, then restores.
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
  console.log("\n=== F-003 Auth / scope / IDOR ===\n")

  const missingInstructor = await fetchJson("/api/instructor/syllabus", {
    headers: { "x-course-id": COURSE_ID },
  })
  if (missingInstructor.status === 401) {
    pass("F-003-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-003-missing-instructor", `expected 401, got ${missingInstructor.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/syllabus", {
    headers: instructorHeaders("999999"),
  })
  if (invalidCourse.status === 404 && invalidCourse.body?.error === "Course not found") {
    pass("F-003-invalid-course", "404 Course not found")
  } else {
    fail("F-003-invalid-course", `expected 404, got ${invalidCourse.status}`)
  }

  const idorGet = await fetchJson("/api/instructor/syllabus", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorGet.status === 403) {
    pass("F-003-idor-get", `403 Forbidden on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-003-idor-get", `expected 403, got ${idorGet.status}`)
  }

  const idorPut = await fetchJson("/api/instructor/syllabus", {
    method: "PUT",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({ sections: [] }),
  })
  if (idorPut.status === 403) {
    pass("F-003-idor-put", `403 Forbidden on foreign course PUT`)
  } else {
    fail("F-003-idor-put", `expected 403, got ${idorPut.status}`)
  }

  const viewOnlyPut = await fetchJson("/api/instructor/syllabus", {
    method: "PUT",
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "x", sections: [{ sectionId: "x", title: "x", order: 1, type: "text", content: {} }] }),
  })
  if (viewOnlyPut.status === 401 || viewOnlyPut.status === 403 || viewOnlyPut.status === 404) {
    pass("F-003-unauthorized-put", `${viewOnlyPut.status} blocks unknown instructor PUT`)
  } else {
    fail("F-003-unauthorized-put", `expected 401/403/404, got ${viewOnlyPut.status}`)
  }
}

async function runPublishStudentE2E() {
  console.log("\n=== F-002 Publish → student visibility ===\n")

  const baseline = await fetchJson("/api/instructor/syllabus", { headers: instructorHeaders() })
  if (!baseline.ok || !baseline.body?.syllabus) {
    fail("F-002-baseline", `faculty GET failed (${baseline.status})`)
    return
  }

  const snapshot = structuredClone(baseline.body.syllabus)
  pass("F-002-baseline", `loaded ${snapshot.sections.length} sections (${snapshot.status})`)

  if (baseline.body.canEdit !== true) {
    fail("F-002-can-edit", `expected canEdit true for owner, got ${baseline.body.canEdit}`)
  } else {
    pass("F-002-can-edit", "owner canEdit=true")
  }

  const markerId = `custom-audit-${Date.now()}`
  const markerTitle = `Audit Marker ${Date.now()}`
  const probeSections = [
    ...snapshot.sections,
    {
      sectionId: markerId,
      title: markerTitle,
      order: snapshot.sections.length + 1,
      type: "text",
      content: { markdown: "Production audit probe — safe to ignore." },
      isRequired: false,
      isVisible: true,
      isEditable: true,
    },
  ]

  let restored = false
  try {
    const publishVisible = await fetchJson("/api/instructor/syllabus", {
      method: "PUT",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: snapshot.title,
        term: snapshot.term,
        contentMode: snapshot.contentMode,
        sections: probeSections,
        action: "publish",
      }),
    })
    if (!publishVisible.ok || publishVisible.body?.syllabus?.status !== "published") {
      fail("F-002-publish-visible", `publish failed (${publishVisible.status})`)
      return
    }
    pass("F-002-publish-visible", "faculty publish with visible marker")

    const studentVisible = await fetchJson(
      `/api/student/syllabus?studentId=${encodeURIComponent(STUDENT_ID)}`,
    )
    if (!studentVisible.ok) {
      fail("F-002-student-visible", `student GET failed (${studentVisible.status})`)
      return
    }
    const studentSections = studentVisible.body?.syllabus?.sections ?? []
    const foundVisible = studentSections.some(
      (s) => s.sectionId === markerId || s.title === markerTitle,
    )
    if (foundVisible) {
      pass("F-002-student-visible", "student sees published marker section")
    } else {
      fail("F-002-student-visible", "marker section missing from student payload")
    }

    const hiddenSections = probeSections.map((s) =>
      s.sectionId === markerId ? { ...s, isVisible: false } : s,
    )
    const publishHidden = await fetchJson("/api/instructor/syllabus", {
      method: "PUT",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: snapshot.title,
        term: snapshot.term,
        contentMode: snapshot.contentMode,
        sections: hiddenSections,
        action: "publish",
      }),
    })
    if (!publishHidden.ok) {
      fail("F-002-publish-hidden", `hide publish failed (${publishHidden.status})`)
    } else {
      pass("F-002-publish-hidden", "published with marker hidden")
    }

    const studentHidden = await fetchJson(
      `/api/student/syllabus?studentId=${encodeURIComponent(STUDENT_ID)}`,
    )
    const stillVisible = (studentHidden.body?.syllabus?.sections ?? []).some(
      (s) => s.sectionId === markerId || s.title === markerTitle,
    )
    if (!stillVisible) {
      pass("F-002-student-hidden", "hidden marker excluded from student payload")
    } else {
      fail("F-002-student-hidden", "hidden marker still visible to student")
    }
  } finally {
    const restore = await fetchJson("/api/instructor/syllabus", {
      method: "PUT",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: snapshot.title,
        term: snapshot.term,
        contentMode: snapshot.contentMode,
        sections: snapshot.sections,
        action: snapshot.status === "published" ? "publish" : undefined,
      }),
    })
    restored = restore.ok
    if (restored) {
      pass("F-002-restore", "restored baseline syllabus")
    } else {
      fail("F-002-restore", `restore failed (${restore.status}) — manual cleanup may be needed`)
    }
  }
}

async function main() {
  console.log(`Syllabus production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID}`)

  await runAuthProbes()
  await runPublishStudentE2E()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`)
  if (failed.length) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
