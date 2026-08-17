#!/usr/bin/env node
/**
 * Faculty groups production audit — closes F-001 (auth/IDOR), F-002 (approve→student), F-003 (student list leak).
 *
 * Run: npm run audit:groups-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"
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

function findGroup(items, marker) {
  return (items ?? []).find((g) => g.name === marker || g.name?.includes(marker))
}

async function runAuthProbes() {
  console.log("\n=== F-001 / F-003 Auth / scope / IDOR ===\n")

  const sessionOnly = await fetchJson(`/api/groups?session=${encodeURIComponent(SESSION)}`)
  if ([401, 400, 403].includes(sessionOnly.status)) {
    pass("F-003-session-only", `${sessionOnly.status} without student or instructor`)
  } else if (sessionOnly.ok && Array.isArray(sessionOnly.body?.groups) && sessionOnly.body.groups.length > 0) {
    fail(
      "F-003-session-only",
      `expected 401, got ${sessionOnly.status} with ${sessionOnly.body.groups.length} groups — deploy student-course-scope fix`,
    )
  } else if (sessionOnly.ok) {
    fail("F-003-session-only", `expected 401, got ${sessionOnly.status} empty list`)
  } else {
    fail("F-003-session-only", `expected 401, got ${sessionOnly.status}`)
  }

  const invalidStudent = await fetchJson(`/api/groups?session=${encodeURIComponent(SESSION)}`, {
    headers: { "x-student-id": "999999" },
  })
  if ([401, 403, 404].includes(invalidStudent.status)) {
    pass("F-003-invalid-student", `${invalidStudent.status} blocks bogus x-student-id`)
  } else if (invalidStudent.ok && Array.isArray(invalidStudent.body?.groups)) {
    fail(
      "F-003-invalid-student",
      `expected 404, got ${invalidStudent.status} with ${invalidStudent.body.groups.length} groups — deploy scope fix`,
    )
  } else {
    fail("F-003-invalid-student", `expected 401/404, got ${invalidStudent.status}`)
  }

  const invalidInstructor = await fetchJson("/api/groups", {
    headers: { "x-instructor-id": INSTRUCTOR_ID, "x-course-id": "999999" },
  })
  if ([401, 403, 404].includes(invalidInstructor.status)) {
    pass("F-001-invalid-course", `${invalidInstructor.status} invalid instructor course`)
  } else {
    fail("F-001-invalid-course", `expected 401/403/404, got ${invalidInstructor.status}`)
  }

  const idorList = await fetchJson("/api/groups", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorList.status === 403 || idorList.status === 404) {
    pass("F-001-idor-list", `${idorList.status} on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-001-idor-list", `expected 403/404, got ${idorList.status}`)
  }

  const unauthApprove = await fetchJson("/api/groups/999999001/approve", { method: "POST" })
  if ([401, 403, 404].includes(unauthApprove.status)) {
    pass("F-001-unauth-approve", `${unauthApprove.status} approve without instructor`)
  } else {
    fail(
      "F-001-unauth-approve",
      `expected 401/403/404, got ${unauthApprove.status} — deploy group-request-auth if still 200`,
    )
  }
}

async function runFacultyStudentE2E() {
  console.log("\n=== F-002 Create-on-behalf → student visibility ===\n")

  const roster = await fetchJson(`/api/instructor/students?sessionCode=${encodeURIComponent(SESSION)}`, {
    headers: instructorHeaders(),
  })
  const students = roster.body?.students ?? []
  const leader = students.find((s) => String(s.student_id) === STUDENT_ID || String(s.id) === STUDENT_ID)
  if (!roster.ok || !leader?.id) {
    fail("F-002-roster", `could not resolve leader ${STUDENT_ID} (${roster.status})`)
    return
  }
  pass("F-002-roster", `leader db id ${leader.id}`)

  const marker = `Audit Group ${Date.now()}`
  let groupId = null

  try {
    const created = await fetchJson("/api/groups", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: marker,
        session: SESSION,
        createdBy: leader.id,
        initialMembers: [],
      }),
    })
    const createdId = created.body?.groupId ?? created.body?.group?.id
    if (!created.ok || createdId == null) {
      fail("F-002-create", `create-on-behalf failed (${created.status}) ${created.body?.error ?? ""}`)
      return
    }
    groupId = Number(createdId)
    pass("F-002-create", `group id ${groupId} status=${created.body?.group?.status ?? "?"}`)

    const facultyList = await fetchJson("/api/groups", { headers: instructorHeaders() })
    const facultyRow = findGroup(facultyList.body?.groups, marker)
    if (facultyRow) {
      pass("F-002-faculty-list", `faculty sees ${facultyRow.status}`)
    } else {
      fail("F-002-faculty-list", "created group missing from faculty list")
    }

    const unauthMutate = await fetchJson(`/api/groups/${groupId}/approve`, { method: "POST" })
    if ([401, 403].includes(unauthMutate.status)) {
      pass("F-001-unauth-approve-existing", `${unauthMutate.status} approve existing group without instructor`)
    } else {
      fail(
        "F-001-unauth-approve-existing",
        `expected 401/403, got ${unauthMutate.status} — deploy group-request-auth if still 200`,
      )
    }

    const studentList = await fetchJson(`/api/groups?session=${encodeURIComponent(SESSION)}`, {
      headers: studentHeaders(),
    })
    if (!studentList.ok) {
      fail("F-002-student-list", `student GET failed (${studentList.status})`)
    } else {
      const visible = findGroup(studentList.body?.groups, marker)
      if (visible) {
        pass("F-002-student-visible", `enrolled student sees group (${visible.status})`)
      } else {
        fail("F-002-student-visible", "created group missing from student feed")
      }
    }

    const otherList = await fetchJson(`/api/groups?session=${encodeURIComponent(SESSION)}`, {
      headers: studentHeaders(OTHER_STUDENT_ID),
    })
    const leaked = findGroup(otherList.body?.groups, marker)
    if (otherList.status === 403 || otherList.status === 404 || !leaked) {
      pass("F-001-student-course-scope", `other-course student does not see ${marker}`)
    } else {
      fail("F-001-student-course-scope", "group leaked to a student on another course")
    }

    if (facultyRow?.status === "pending" || created.body?.group?.status === "pending") {
      const approved = await fetchJson(`/api/groups/${groupId}/approve`, {
        method: "POST",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (approved.ok) {
        pass("F-002-approve", "faculty approved pending group")
      } else {
        fail("F-002-approve", `approve failed (${approved.status})`)
      }
    } else {
      pass("F-002-approve", "individual group auto-approved (no extra member)")
    }

    const studentAfter = await fetchJson(`/api/groups?session=${encodeURIComponent(SESSION)}`, {
      headers: studentHeaders(),
    })
    const afterRow = findGroup(studentAfter.body?.groups, marker)
    if (afterRow && (afterRow.status === "approved" || afterRow.status === "pending")) {
      pass("F-002-student-after-approve", `student still sees ${afterRow.status}`)
    } else if (afterRow) {
      fail("F-002-student-after-approve", `unexpected status ${afterRow.status}`)
    } else {
      fail("F-002-student-after-approve", "group missing after approve")
    }

    const deleted = await fetchJson(`/api/groups/${groupId}`, {
      method: "DELETE",
      headers: instructorHeaders(),
    })
    if (deleted.ok) {
      pass("F-002-delete", `faculty deleted group ${groupId}`)
      groupId = null
    } else {
      fail("F-002-delete", `delete failed (${deleted.status})`)
    }

    const studentGone = await fetchJson(`/api/groups?session=${encodeURIComponent(SESSION)}`, {
      headers: studentHeaders(),
    })
    const stillVisible = findGroup(studentGone.body?.groups, marker)
    if (!stillVisible) {
      pass("F-002-student-removed", "deleted group hidden from student feed")
    } else {
      fail("F-002-student-removed", "deleted group still in student feed")
    }
  } finally {
    if (groupId != null) {
      const cleanup = await fetchJson(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
      if (cleanup.ok || cleanup.status === 404) {
        pass("F-002-cleanup", `removed audit group ${groupId}`)
      } else {
        fail("F-002-cleanup", `cleanup failed (${cleanup.status}) — group ${groupId} may remain`)
      }
    }
  }
}

async function main() {
  console.log(`Groups production audit → ${BASE}`)
  console.log(
    `Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} session=${SESSION} student=${STUDENT_ID}`,
  )

  await runAuthProbes()
  await runFacultyStudentE2E()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
