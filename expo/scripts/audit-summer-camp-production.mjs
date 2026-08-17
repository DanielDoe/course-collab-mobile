#!/usr/bin/env node
/**
 * Faculty Summer Camp production audit — F-001 auth, F-002/F-004 publish→browse→enroll.
 *
 * Run: npm run audit:summer-camp-production
 */
const BASE = (process.env.AUDIT_API_BASE || "https://coursecollab.vercel.app").replace(/\/$/, "")
const INSTRUCTOR_ID = process.env.AUDIT_INSTRUCTOR_ID || "15"
const COURSE_ID = process.env.AUDIT_COURSE_ID || "16"
const STUDENT_ID = process.env.AUDIT_STUDENT_ID || "910000001"
const UNKNOWN_INSTRUCTOR = process.env.AUDIT_UNKNOWN_INSTRUCTOR_ID || "999999"

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

function instructorHeaders(extra = {}) {
  return {
    "x-instructor-id": INSTRUCTOR_ID,
    "x-course-id": COURSE_ID,
    ...extra,
  }
}

function findTrainingInBrowse(browseBody, markerTitle) {
  for (const camp of browseBody?.camps ?? []) {
    for (const t of camp.trainings ?? []) {
      if (t.title === markerTitle || t.title?.includes(markerTitle)) return t
    }
  }
  return null
}

async function runAuthProbes() {
  console.log("\n=== F-001 / F-002 Auth & scoped camper create ===\n")

  const missingInstructor = await fetchJson("/api/instructor/summer-camp/camps", {
    headers: { "x-course-id": COURSE_ID },
  })
  if (missingInstructor.status === 401) {
    pass("F-002-missing-instructor", "401 Unauthorized on camps GET")
  } else {
    fail("F-002-missing-instructor", `expected 401, got ${missingInstructor.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/summer-camp/camps", {
    headers: { "x-instructor-id": UNKNOWN_INSTRUCTOR, "x-course-id": COURSE_ID },
  })
  if (unknownInstructor.status === 401) {
    pass("F-002-unknown-instructor", "401 blocks unknown instructor")
  } else {
    fail("F-002-unknown-instructor", `expected 401, got ${unknownInstructor.status}`)
  }

  const unauthCreate = await fetchJson("/api/instructor/summer-camp/campers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create_account",
      fullName: "Audit Probe",
      email: `audit-${Date.now()}@invalid.test`,
      school: "Audit",
      password: "AuditPass1",
    }),
  })
  if (unauthCreate.status === 401) {
    pass("F-001-scoped-create", "401 without instructor on create_account")
  } else {
    fail("F-001-scoped-create", `expected 401, got ${unauthCreate.status}`)
  }

  const authedCreate = await fetchJson("/api/instructor/summer-camp/campers", {
    method: "POST",
    headers: { ...instructorHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create_account",
      fullName: "Audit Camper",
      email: `audit-camper-${Date.now()}@coursecollab.demo`,
      school: "Audit School",
      password: "AuditPass1",
      programRole: "summer_camper",
    }),
  })
  if (authedCreate.ok && authedCreate.body?.success) {
    pass("F-001-faculty-create", "faculty create_account succeeds with x-instructor-id")
  } else {
    fail("F-001-faculty-create", `faculty create failed (${authedCreate.status})`)
  }
}

async function runPublishBrowseEnrollE2E() {
  console.log("\n=== F-004 Publish → browse → enroll ===\n")

  const marker = `Audit Camp ${Date.now()}`
  const trackMarker = `Audit Track ${Date.now()}`
  let campId = null
  let trainingId = null

  try {
    const createdCamp = await fetchJson("/api/instructor/summer-camp/camps", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: marker,
        description: "Production audit probe",
        status: "draft",
      }),
    })
    if (!createdCamp.ok || !createdCamp.body?.camp?.id) {
      fail("F-004-create-camp", `create camp failed (${createdCamp.status})`)
      return
    }
    campId = createdCamp.body.camp.id
    pass("F-004-create-camp", `camp id ${campId}`)

    const createdTrack = await fetchJson("/api/instructor/summer-camp/trainings", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        camp_id: campId,
        title: trackMarker,
        description: "Audit track",
        status: "draft",
      }),
    })
    if (!createdTrack.ok || !createdTrack.body?.training?.id) {
      fail("F-004-create-track", `create track failed (${createdTrack.status})`)
      return
    }
    trainingId = createdTrack.body.training.id
    pass("F-004-create-track", `training id ${trainingId}`)

    const publishCamp = await fetchJson("/api/instructor/summer-camp/camps", {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ camp_id: campId, status: "published" }),
    })
    const publishTrack = await fetchJson("/api/instructor/summer-camp/trainings", {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ training_id: trainingId, status: "published" }),
    })
    if (!publishCamp.ok || !publishTrack.ok) {
      fail("F-004-publish", `publish failed (camp ${publishCamp.status}, track ${publishTrack.status})`)
      return
    }
    pass("F-004-publish", "program + track published")

    const browse = await fetchJson(
      `/api/summer-camp/browse-trainings?studentDatabaseId=${encodeURIComponent(STUDENT_ID)}`,
    )
    if (!browse.ok) {
      fail("F-004-browse", `browse failed (${browse.status})`)
      return
    }
    const found = findTrainingInBrowse(browse.body, trackMarker)
    if (found?.id === trainingId) {
      pass("F-004-browse", "published track visible in browse-trainings")
    } else {
      fail("F-004-browse", "published track missing from browse")
    }

    const enroll = await fetchJson("/api/summer-camp/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-student-id": STUDENT_ID },
      body: JSON.stringify({ trainingId, studentId: STUDENT_ID }),
    })
    if (enroll.ok && enroll.body?.enrollment) {
      pass("F-004-enroll", enroll.body.alreadyEnrolled ? "already enrolled (ok)" : "enrollment created")
    } else {
      fail("F-004-enroll", `enroll failed (${enroll.status}) ${JSON.stringify(enroll.body?.error ?? "")}`)
    }
  } finally {
    if (trainingId != null) {
      await fetchJson("/api/instructor/summer-camp/trainings", {
        method: "PATCH",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ training_id: trainingId, status: "draft" }),
      })
    }
    if (campId != null) {
      const del = await fetchJson("/api/instructor/summer-camp/camps", {
        method: "DELETE",
        headers: { ...instructorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ camp_id: campId }),
      })
      if (del.ok) {
        pass("F-004-cleanup", `removed audit camp ${campId}`)
      } else {
        await fetchJson("/api/instructor/summer-camp/camps", {
          method: "PATCH",
          headers: { ...instructorHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ camp_id: campId, status: "draft" }),
        })
        pass("F-004-cleanup", `reverted camp ${campId} to draft (delete blocked: ${del.status})`)
      }
    }
  }
}

async function main() {
  console.log(`Summer Camp production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID}`)

  await runAuthProbes()
  await runPublishBrowseEnrollE2E()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${failed.length ? "FAILED" : "PASSED"} — ${results.length - failed.length}/${results.length} checks\n`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
