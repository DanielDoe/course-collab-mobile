import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildFlashcardMcq,
  flashcardMcqHasSingleCorrectAnswer,
  gradeFlashcardMcqChoice,
} from "./flashcard-quiz"
import type { FlashcardCard } from "./flashcards-api"

describe("flashcard MCQ grading", () => {
  const deck: FlashcardCard[] = [
    { id: 1, frontText: "FORTRAN", backText: "Procedural language", customDistractors: [] },
    { id: 2, frontText: "HTML", backText: "Markup language", customDistractors: [] },
    { id: 3, frontText: "ALGOL", backText: "Another procedural language", customDistractors: [] },
  ]

  it("builds exactly one correct choice", () => {
    const mcq = buildFlashcardMcq(deck[0], deck, { direction: "front_to_back" })
    assert.ok(mcq)
    assert.equal(flashcardMcqHasSingleCorrectAnswer(mcq!), true)
  })

  it("grades the programmed correct choice as correct", () => {
    const mcq = buildFlashcardMcq(deck[0], deck, { direction: "front_to_back" })
    assert.ok(mcq)
    const correct = mcq!.choices.find((choice) => choice.isCorrect)
    const wrong = mcq!.choices.find((choice) => !choice.isCorrect)
    assert.ok(correct)
    assert.ok(wrong)
    assert.equal(gradeFlashcardMcqChoice(correct!), true)
    assert.equal(gradeFlashcardMcqChoice(wrong!), false)
  })
})
