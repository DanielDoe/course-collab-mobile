#!/usr/bin/env node
/**
 * Faculty flashcards production audit — closes F-001 (auth/IDOR) and F-002 (publish→student).
 *
 * Run: npm run audit:flashcards-production
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

function studentHeaders() {
  return { "x-student-id": STUDENT_ID }
}

function findDeck(decks, marker) {
  return (decks ?? []).find((d) => d.title === marker || d.title?.includes(marker))
}

async function runAuthProbes() {
  console.log("\n=== F-001 Auth / scope / IDOR ===\n")

  const missingInstructor = await fetchJson("/api/instructor/flashcards/decks", {
    headers: { "x-course-id": COURSE_ID },
  })
  if (missingInstructor.status === 401) {
    pass("F-001-missing-instructor", "401 Unauthorized")
  } else {
    fail("F-001-missing-instructor", `expected 401, got ${missingInstructor.status}`)
  }

  const invalidCourse = await fetchJson("/api/instructor/flashcards/decks", {
    headers: instructorHeaders("999999"),
  })
  if (invalidCourse.status === 404 && invalidCourse.body?.error === "Course not found") {
    pass("F-001-invalid-course", "404 Course not found")
  } else {
    fail("F-001-invalid-course", `expected 404, got ${invalidCourse.status}`)
  }

  const idorList = await fetchJson("/api/instructor/flashcards/decks", {
    headers: instructorHeaders(IDOR_COURSE_ID),
  })
  if (idorList.status === 403) {
    pass("F-001-idor-list", `403 Forbidden on foreign course ${IDOR_COURSE_ID}`)
  } else {
    fail("F-001-idor-list", `expected 403, got ${idorList.status}`)
  }

  const idorCreate = await fetchJson("/api/instructor/flashcards/decks", {
    method: "POST",
    headers: { ...instructorHeaders(IDOR_COURSE_ID), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "IDOR probe" }),
  })
  if (idorCreate.status === 403) {
    pass("F-001-idor-create", "403 Forbidden on foreign course POST")
  } else {
    fail("F-001-idor-create", `expected 403, got ${idorCreate.status}`)
  }

  const unknownInstructor = await fetchJson("/api/instructor/flashcards/decks", {
    headers: { "x-instructor-id": "999999", "x-course-id": COURSE_ID },
  })
  if ([401, 403, 404].includes(unknownInstructor.status)) {
    pass("F-001-unknown-instructor", `${unknownInstructor.status} blocks unknown instructor`)
  } else {
    fail("F-001-unknown-instructor", `expected 401/403/404, got ${unknownInstructor.status}`)
  }

  const missingStudent = await fetchJson("/api/student/flashcards/decks")
  if (missingStudent.status === 401) {
    pass("F-001-student-auth", "401 without x-student-id")
  } else {
    fail("F-001-student-auth", `expected 401, got ${missingStudent.status}`)
  }
}

async function runPublishStudentE2E() {
  console.log("\n=== F-002 Publish → student Flashcards + Practice Hub ===\n")

  const marker = `Audit Flashcards ${Date.now()}`
  let deckId = null

  try {
    const created = await fetchJson("/api/instructor/flashcards/decks", {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: marker,
        description: "Production audit probe — safe to ignore.",
        isPublished: true,
        showInPracticeHub: true,
      }),
    })
    if (!created.ok || !created.body?.deck?.id) {
      fail("F-002-create-deck", `create failed (${created.status})`)
      return
    }
    deckId = created.body.deck.id
    pass("F-002-create-deck", `deck id ${deckId}`)

    const cardRes = await fetchJson(`/api/instructor/flashcards/decks/${deckId}/cards`, {
      method: "POST",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        frontText: "Audit front",
        backText: "Audit back",
        sortOrder: 0,
      }),
    })
    if (!cardRes.ok) {
      fail("F-002-add-card", `add card failed (${cardRes.status})`)
      return
    }
    pass("F-002-add-card", "card added")

    const studentAll = await fetchJson("/api/student/flashcards/decks", {
      headers: studentHeaders(),
    })
    if (!studentAll.ok) {
      fail("F-002-student-list", `student GET failed (${studentAll.status})`)
      return
    }
    const inCourse = findDeck(studentAll.body?.courseDecks, marker)
    if (inCourse) {
      pass("F-002-student-list", "published deck visible in courseDecks")
    } else {
      fail("F-002-student-list", "published deck missing from courseDecks")
    }

    const studentHub = await fetchJson("/api/student/flashcards/decks?practiceHub=true", {
      headers: studentHeaders(),
    })
    if (!studentHub.ok) {
      fail("F-002-practice-hub", `practice hub GET failed (${studentHub.status})`)
    } else {
      const inHub = findDeck(studentHub.body?.courseDecks, marker)
      if (inHub) {
        pass("F-002-practice-hub", "deck visible with practiceHub=true")
      } else {
        fail("F-002-practice-hub", "deck missing from Practice Hub list")
      }
    }

    const studentDeck = await fetchJson(`/api/student/flashcards/decks/${deckId}`, {
      headers: studentHeaders(),
    })
    const deckMeta = studentDeck.body?.deck
    const totalCards =
      deckMeta?.cardCount ??
      studentDeck.body?.studySettings?.totalCards ??
      studentDeck.body?.cards?.length ??
      0
    if (studentDeck.ok && deckMeta && totalCards > 0) {
      pass("F-002-student-study", `student deck endpoint reachable (${totalCards} cards on deck)`)
    } else {
      fail("F-002-student-study", `student deck GET failed or no cards (${studentDeck.status})`)
    }

    const unpublish = await fetchJson(`/api/instructor/flashcards/decks/${deckId}`, {
      method: "PATCH",
      headers: { ...instructorHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: false }),
    })
    if (!unpublish.ok) {
      fail("F-002-unpublish", `unpublish failed (${unpublish.status})`)
    } else {
      pass("F-002-unpublish", "faculty unpublished deck")
    }

    const studentAfterUnpublish = await fetchJson("/api/student/flashcards/decks", {
      headers: studentHeaders(),
    })
    const stillVisible = findDeck(studentAfterUnpublish.body?.courseDecks, marker)
    if (!stillVisible) {
      pass("F-002-student-unpublished", "unpublished deck hidden from students")
    } else {
      fail("F-002-student-unpublished", "unpublished deck still in courseDecks")
    }
  } finally {
    if (deckId != null) {
      const deleted = await fetchJson(`/api/instructor/flashcards/decks/${deckId}`, {
        method: "DELETE",
        headers: instructorHeaders(),
      })
      if (deleted.ok) {
        pass("F-002-cleanup", `soft-deleted audit deck ${deckId}`)
      } else {
        fail("F-002-cleanup", `cleanup failed (${deleted.status}) — deck ${deckId} may remain`)
      }
    }
  }
}

async function main() {
  console.log(`Flashcards production audit → ${BASE}`)
  console.log(`Scope: instructor=${INSTRUCTOR_ID} course=${COURSE_ID} student=${STUDENT_ID}`)

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
