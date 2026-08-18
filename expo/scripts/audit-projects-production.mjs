#!/usr/bin/env node
/**
 * Faculty projects production audit — F-001–F-004 auth/IDOR + F-005 approve→student E2E.
 *
 * Run: npm run audit:projects-production
 *
 * Do not mutate project 87. Mutation probes use a disposable project.
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const SESSION = process.env.AUDIT_SESSION || "ECE2202"
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

function studentHeaders(studentId = STUDENT_ID) {
  return { "x-student-id": String(studentId) }
}

function expectDenied(id, result, label) {
  if ([401, 403].includes(result.status)) {
    pass(id, `${result.status} ${label}`)
    return true
  }
  fail(id, `expected 401/403, got ${result.status} — deploy project-request-auth`)
  return false
}

async function resolveLeaderAndGroup() {
  const roster = await fetchJson(`/api/instructor/students?sessionCode=${encodeURIComponent(SESSION)}`, {
    headers: instructorHeaders(),
  })
  const leader = (roster.body?.students ?? []).find(
    (s) => String(s.student_id) === STUDENT_ID || String(s.id) === STUDENT_ID,
  )
  const groups = await fetchJson(`/api/groups?session=${encodeURIComponent(SESSION)}&status=approved`, {
    headers: instructorHeaders(),
  })
  let group = (groups.body?.groups ?? []).find((g) => Number(g.created_by) === Number(leader?.id) && !g.deleted_at)
  let createdGroupId = null
  if (!group && leader?.id) {
    const created = await fetchJson("/api/groups", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Audit Project Group ${Date.now()}`,
        session: SESSION,
        createdBy: leader.id,
        initialMembers: [],
      }),
    })
    const createdId = created.body?.groupId ?? created.body?.group?.id
    if (created.ok && createdId != null) {
      createdGroupId = Number(createdId)
      await fetchJson(`/api/groups/${createdGroupId}/approve`, {
        method: "POST",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      group = { id: createdGroupId, created_by: leader.id }
    }
  }
  return { leader, group, createdGroupId }
}

async function runAuthProbes() {
  console.log("\n=== F-001 / F-002 / F-003 / F-004 Auth / IDOR ===\n")

  expectDenied("F-003-unauth-list", await fetchJson("/api/projects/list"), "list without auth")
  expectDenied("F-003-unauth-detail", await fetchJson("/api/projects/87"), "detail without auth")
  expectDenied("F-003-unauth-leaderboard", await fetchJson("/api/projects/leaderboard"), "leaderboard without auth")

  const headerStudentList = await fetchJson(`/api/projects/list?session=${encodeURIComponent(SESSION)}`, {
    headers: studentHeaders(),
  })
  if ([401, 403].includes(headerStudentList.status)) {
    pass("F-003-header-only-student-list", `${headerStudentList.status} header-only student list rejected`)
  } else if (headerStudentList.status === 200) {
    fail(
      "F-003-header-only-student-list",
      `header-only student GET list 200 — session bind required`,
    )
  } else {
    fail("F-003-header-only-student-list", `expected 401/403, got ${headerStudentList.status}`)
  }

  const headerStudentDetail = await fetchJson("/api/projects/87", { headers: studentHeaders() })
  if ([401, 403].includes(headerStudentDetail.status)) {
    pass("F-003-header-only-student-detail", `${headerStudentDetail.status} header-only student GET 87 rejected`)
  } else if (headerStudentDetail.status === 200) {
    fail(
      "F-003-header-only-student-detail",
      `header-only student GET /api/projects/87 200 — session bind required`,
    )
  } else {
    fail("F-003-header-only-student-detail", `expected 401/403, got ${headerStudentDetail.status}`)
  }

  const { leader, group, createdGroupId: authGroupId } = await resolveLeaderAndGroup()
  let probeId = null
  if (leader?.id && group?.id) {
    const probe = await fetchJson("/api/projects/create", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: group.id,
        title: `Auth Probe ${Date.now()}`,
        studentId: leader.id,
      }),
    })
    probeId = probe.body?.project?.id ?? null
  }

  if (probeId == null) {
    fail("F-001-unauth-approve", "could not create disposable project for mutation probes")
  } else {
    expectDenied(
      "F-001-unauth-approve",
      await fetchJson(`/api/projects/${probeId}/approve`, { method: "POST" }),
      "approve without auth",
    )
    expectDenied(
      "F-002-unauth-reject",
      await fetchJson(`/api/projects/${probeId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "audit" }),
      }),
      "reject without auth",
    )
    expectDenied(
      "F-002-unauth-patch",
      await fetchJson(`/api/projects/${probeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "AUDIT MUST FAIL" }),
      }),
      "patch without auth",
    )
    expectDenied(
      "F-002-unauth-delete",
      await fetchJson(`/api/projects/${probeId}`, { method: "DELETE" }),
      "delete without auth",
    )
    await fetchJson(`/api/projects/${probeId}`, {
      method: "DELETE",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
  }
  if (authGroupId != null) {
    await fetchJson(`/api/groups/${authGroupId}`, { method: "DELETE", headers: instructorHeaders() })
  }

  const badCourse = await fetchJson("/api/projects/list", { headers: instructorHeaders("999999") })
  if ([400, 401, 403, 404].includes(badCourse.status)) {
    pass("F-004-invalid-course", `${badCourse.status} invalid course`)
  } else {
    fail("F-004-invalid-course", `expected 401/403/404, got ${badCourse.status}`)
  }

  const idorList = await fetchJson("/api/projects/list", { headers: instructorHeaders(IDOR_COURSE_ID) })
  if ([401, 403, 404].includes(idorList.status)) {
    pass("F-004-idor-list", `${idorList.status} foreign course`)
  } else {
    fail("F-004-idor-list", `expected 401/403/404, got ${idorList.status}`)
  }

  const memberScores = await fetchJson("/api/instructor/projects/member-scores")
  if (memberScores.status === 401) {
    pass("F-004-member-scores", "401 without instructor")
  } else {
    fail("F-004-member-scores", `expected 401, got ${memberScores.status}`)
  }
}

async function runFacultyStudentE2E() {
  console.log("\n=== F-005 Approve → student list ===\n")

  const { leader, group, createdGroupId } = await resolveLeaderAndGroup()
  if (!leader?.id) {
    fail("F-005-roster", `could not resolve leader ${STUDENT_ID}`)
    return
  }
  pass("F-005-roster", `leader db id ${leader.id}`)
  if (!group?.id) {
    fail("F-005-group", "could not resolve or create an approved group")
    return
  }
  pass("F-005-group", `${createdGroupId ? "created+approved" : "using approved"} group ${group.id}`)

  const title = `Audit Project ${Date.now()}`
  let projectId = null

  try {
    const created = await fetchJson("/api/projects/create", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: group.id,
        title,
        summary: "Production audit probe — delete after run",
        studentId: leader.id,
      }),
    })
    projectId = created.body?.project?.id
    if (created.status === 401) {
      fail("F-005-create", "instructor session required")
      return
    }
    if (!created.ok || projectId == null) {
      fail("F-005-create", `create failed (${created.status}) ${created.body?.error ?? ""}`)
      return
    }
    pass("F-005-create", `project ${projectId} pending`)

    const studentDraft = await fetchJson(`/api/projects/list?session=${encodeURIComponent(SESSION)}`, {
      headers: studentHeaders(),
    })
    const draftRow = (studentDraft.body?.projects ?? []).find((p) => p.id === projectId)
    if (studentDraft.status === 401) {
      fail("F-005-student-draft", "student session required")
    } else if (draftRow && draftRow.status === "approved") {
      fail("F-005-student-draft", "draft already approved before faculty approve")
    } else {
      pass("F-005-student-draft", draftRow ? `student sees ${draftRow.status}` : "draft not in student approved view")
    }

    const approved = await fetchJson(`/api/projects/${projectId}/approve`, {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    if (approved.status === 401) {
      fail("F-005-approve", "instructor session required")
      return
    }
    if (!approved.ok) {
      fail("F-005-approve", `${approved.status} ${approved.body?.error ?? ""}`)
      return
    }
    pass("F-005-approve", "faculty approved")

    const studentLive = await fetchJson(`/api/projects/list?session=${encodeURIComponent(SESSION)}`, {
      headers: studentHeaders(),
    })
    const liveRow = (studentLive.body?.projects ?? []).find((p) => p.id === projectId)
    if (studentLive.status === 401) {
      fail("F-005-student-visible", "student session required")
    } else if (liveRow && (liveRow.status === "approved" || liveRow.title === title)) {
      pass("F-005-student-visible", `student sees ${liveRow.status}`)
    } else {
      fail("F-005-student-visible", `student list missing approved project (${studentLive.status})`)
    }

    const rejected = await fetchJson(`/api/projects/${projectId}/reject`, {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "audit teardown" }),
    })
    if (!rejected.ok) {
      fail("F-005-reject", `${rejected.status} ${rejected.body?.error ?? ""}`)
    } else {
      pass("F-005-reject", "faculty rejected")
    }

    const studentAfter = await fetchJson(`/api/projects/list?session=${encodeURIComponent(SESSION)}`, {
      headers: studentHeaders(),
    })
    const afterRow = (studentAfter.body?.projects ?? []).find((p) => p.id === projectId)
    if (studentAfter.status === 401) {
      fail("F-005-student-hidden", "student session required")
    } else if (!afterRow || afterRow.status === "rejected") {
      pass("F-005-student-hidden", afterRow ? "student sees rejected" : "approved row gone")
    } else {
      fail("F-005-student-hidden", `student still sees ${afterRow.status}`)
    }
  } finally {
    if (projectId != null) {
      const deleted = await fetchJson(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (deleted.ok) pass("F-005-cleanup-project", `deleted ${projectId}`)
      else fail("F-005-cleanup-project", `${deleted.status} ${deleted.body?.error ?? ""}`)
    }
    if (createdGroupId != null) {
      await fetchJson(`/api/groups/${createdGroupId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
    }
  }
}

await runAuthProbes()
await runFacultyStudentE2E()

const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length
console.log(`\n${passed}/${results.length} PASS${failed ? ` — ${failed} failed` : ""}`)
process.exit(failed ? 1 : 0)
