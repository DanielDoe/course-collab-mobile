#!/usr/bin/env node
/**
 * Faculty academic-terms production audit — closes F-001 (auth/IDOR) and F-002 (activate→student).
 *
 * Run: npm run audit:academic-terms-production
 *
 * Activate probe creates a far-future disposable term, switches activeTerm, verifies student
 * GET /api/student/courses, then restores the previous active term and deletes the probe.
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ROSTER_ID = process.env.AUDIT_STUDENT_ID || "910000001"

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

function instructorHeaders() {
  return {
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": COURSE_ID,
  }
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / IDOR ===\n")

  const missing = await fetchJson("/api/instructor/academic-terms")
  if (missing.status === 401) {
    pass("F-001-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor", `expected 401, got ${missing.status}`)
  }

  const unknown = await fetchJson("/api/instructor/academic-terms", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknown.status)) {
    pass("F-001-unknown-instructor", `${unknown.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknown.status}`)
  }

  const unauthPut = await fetchJson("/api/instructor/academic-terms/999999001", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year: 2099, term: "Winter" }),
  })
  if (unauthPut.status === 401) {
    pass("F-001-unauth-put", "401 on PUT without instructor")
  } else {
    fail(
      "F-001-unauth-put",
      `expected 401, got ${unauthPut.status} — deploy academic-term-instructor-auth if still open`,
    )
  }

  const unauthDelete = await fetchJson("/api/instructor/academic-terms/999999001", {
    method: "DELETE",
  })
  if (unauthDelete.status === 401) {
    pass("F-001-unauth-delete", "401 on DELETE without instructor")
  } else {
    fail(
      "F-001-unauth-delete",
      `expected 401, got ${unauthDelete.status} — deploy [id] auth if still open`,
    )
  }

  const unauthSessionDelete = await fetchJson("/api/instructor/sessions/999999001", {
    method: "DELETE",
  })
  if ([401, 400, 403, 404].includes(unauthSessionDelete.status)) {
    pass("F-001-unauth-session-delete", `${unauthSessionDelete.status} session DELETE without scope`)
  } else {
    fail("F-001-unauth-session-delete", `expected 401/404, got ${unauthSessionDelete.status}`)
  }

  const unauthActivate = await fetchJson("/api/instructor/academic-terms/999999001/activate", {
    method: "POST",
  })
  if ([401, 400, 403, 404].includes(unauthActivate.status)) {
    pass("F-001-unauth-activate", `${unauthActivate.status} activate without instructor`)
  } else {
    fail("F-001-unauth-activate", `expected 401, got ${unauthActivate.status}`)
  }

  const studentUnauth = await fetchJson("/api/student/courses")
  if (studentUnauth.status === 401) {
    pass("F-001-student-courses-auth", "401 Authentication required")
  } else {
    fail("F-001-student-courses-auth", `expected 401, got ${studentUnauth.status}`)
  }
}

async function runActivateStudentE2E() {
  console.log("\n=== F-002 Activate → student activeTerm ===\n")

  const list = await fetchJson("/api/instructor/academic-terms", { headers: instructorHeaders() })
  const terms = list.body?.terms ?? []
  if (!list.ok || !Array.isArray(terms)) {
    fail("F-002-baseline", `faculty GET failed (${list.status})`)
    return
  }
  const baseline = terms.find((t) => t.is_active)
  if (!baseline?.id) {
    fail("F-002-baseline", "no active term on production — aborting to avoid leaving none")
    return
  }
  pass("F-002-baseline", `active ${baseline.term} ${baseline.year} (id ${baseline.id})`)

  const roster = await fetchJson("/api/instructor/students", { headers: instructorHeaders() })
  const leader = (roster.body?.students ?? []).find(
    (s) => String(s.student_id) === STUDENT_ROSTER_ID || String(s.id) === STUDENT_ROSTER_ID,
  )
  if (!leader?.id) {
    fail("F-002-student-db", `could not resolve ${STUDENT_ROSTER_ID}`)
    return
  }
  pass("F-002-student-db", `student db id ${leader.id}`)

  const markerYear = 2099
  const markerTerm = "Winter"
  let probeId = terms.find((t) => Number(t.year) === markerYear && t.term === markerTerm)?.id ?? null
  let created = false

  if (probeId == null) {
    const createdRes = await fetchJson("/api/instructor/academic-terms", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        year: markerYear,
        term: markerTerm,
        start_date: "2099-01-05",
        end_date: "2099-03-15",
        is_active: false,
      }),
    })
    probeId = createdRes.body?.term?.id ?? null
    if (!createdRes.ok || probeId == null) {
      fail("F-002-create-probe", `create failed (${createdRes.status}) ${createdRes.body?.error ?? ""}`)
      return
    }
    created = true
    pass("F-002-create-probe", `term id ${probeId}`)
  } else {
    pass("F-002-create-probe", `reusing existing ${markerTerm} ${markerYear} (id ${probeId})`)
  }

  let restored = false
  try {
    const activate = await fetchJson(`/api/instructor/academic-terms/${probeId}/activate`, {
      method: "POST",
      headers: instructorHeaders(),
    })
    if (!activate.ok || activate.body?.term?.id !== probeId) {
      fail("F-002-activate", `activate failed (${activate.status})`)
      return
    }
    pass("F-002-activate", `set active to ${markerTerm} ${markerYear}`)

    const facultyAfter = await fetchJson("/api/instructor/academic-terms", {
      headers: instructorHeaders(),
    })
    const activeRows = (facultyAfter.body?.terms ?? []).filter((t) => t.is_active)
    if (activeRows.length === 1 && activeRows[0].id === probeId) {
      pass("F-001-single-active", "exactly one active term after activate")
    } else {
      fail("F-001-single-active", `expected 1 active probe term, got ${activeRows.length}`)
    }

    const student = await fetchJson("/api/student/courses", {
      headers: { "x-student-id": String(leader.id) },
    })
    if (!student.ok) {
      fail("F-002-student-active", `student GET failed (${student.status})`)
    } else if (student.body?.activeTerm?.id === probeId) {
      pass("F-002-student-active", `student activeTerm=${student.body.activeTerm.label}`)
    } else {
      fail(
        "F-002-student-active",
        `expected activeTerm id ${probeId}, got ${JSON.stringify(student.body?.activeTerm)}`,
      )
    }
  } finally {
    const restore = await fetchJson(`/api/instructor/academic-terms/${baseline.id}/activate`, {
      method: "POST",
      headers: instructorHeaders(),
    })
    restored = restore.ok
    if (restored) {
      pass("F-002-restore", `restored ${baseline.term} ${baseline.year}`)
    } else {
      fail("F-002-restore", `restore failed (${restore.status}) — MANUAL: activate term ${baseline.id}`)
    }

    if (created && probeId != null && restored) {
      const deleted = await fetchJson(`/api/instructor/academic-terms/${probeId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
      if (deleted.ok || deleted.status === 404) {
        pass("F-002-cleanup", `deleted probe term ${probeId}`)
      } else {
        fail("F-002-cleanup", `cleanup failed (${deleted.status}) — term ${probeId} may remain`)
      }
    }
  }
}

async function main() {
  console.log(`Academic terms production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ROSTER_ID}`)

  await runAuthProbes()
  await runActivateStudentE2E()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
