import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { FLASHCARD_STUDENT_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("student flashcards client auth contract", () => {
  it("builds flashcard list/study/editor through studentAuthenticatedRequest", () => {
    const source = readFileSync(join(here, "flashcards-api.ts"), "utf8")
    assert.match(source, /studentAuthenticatedRequest/)
    assert.doesNotMatch(source, /mfaTrustRequestHeadersForStudent/)
    assert.doesNotMatch(source, /"x-student-id":\s*session\.databaseId/)
    for (const path of FLASHCARD_STUDENT_API_PATHS) {
      assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
  })

  it("shows an invalid-route empty state for non-finite deckId", () => {
    const invalidRoute = readFileSync(
      join(here, "../components/flashcards/FlashcardInvalidRoute.tsx"),
      "utf8",
    )
    assert.match(invalidRoute, /export function FlashcardInvalidRoute/)
    assert.match(invalidRoute, /FacultyEmptyState/)
    assert.doesNotMatch(invalidRoute, /originWhitelist/)

    const studyRoute = readFileSync(join(here, "../../app/(app)/flashcards/[deckId].tsx"), "utf8")
    assert.match(studyRoute, /FlashcardInvalidRoute/)
    assert.match(studyRoute, /Number\.isFinite\(deckNum\)/)
    assert.doesNotMatch(studyRoute, /originWhitelist/)

    const editRoute = readFileSync(join(here, "../../app/(app)/flashcards/[deckId]/edit.tsx"), "utf8")
    assert.match(editRoute, /FlashcardInvalidRoute/)
    assert.match(editRoute, /Number\.isFinite\(deckNum\)/)
    assert.doesNotMatch(editRoute, /originWhitelist/)

    const study = readFileSync(join(here, "../components/flashcards/FlashcardStudyScreen.tsx"), "utf8")
    assert.match(study, /FlashcardInvalidRoute/)
    assert.match(study, /!Number\.isFinite\(deckId\) \|\| deckId < 1/)
    assert.doesNotMatch(study, /originWhitelist/)

    const editor = readFileSync(
      join(here, "../components/flashcards/FlashcardDeckEditorScreen.tsx"),
      "utf8",
    )
    assert.match(editor, /FlashcardInvalidRoute/)
    assert.match(editor, /!Number\.isFinite\(deckId\) \|\| deckId < 1/)
    assert.doesNotMatch(editor, /originWhitelist/)
  })
})
