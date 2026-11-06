import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import type { PlaygroundSessionQuestion } from "./instructor-api"

const here = dirname(fileURLToPath(import.meta.url))
import {
  applyPlaygroundSessionQuestionDraft,
  buildPlaygroundSessionQuestionsPutBody,
  draftFromPlaygroundSessionQuestion,
  playgroundSessionQuestionsHaveSnapshotEdits,
} from "./faculty-playground-session-questions"

const question: PlaygroundSessionQuestion = {
  id: 41,
  bankQuestionId: 900,
  questionOrder: 1,
  questionText: "What is Ohm's law?",
  questionType: "mcq",
  difficulty: "easy",
  topic: "Circuits",
  options: ["V = IR", "P = IV", "F = ma"],
  correctAnswer: "V = IR",
  explanation: "Voltage equals current times resistance.",
}

describe("playground session-only question edit", () => {
  it("applies wording to the session snapshot without changing bankQuestionId", () => {
    const draft = draftFromPlaygroundSessionQuestion(question)
    const result = applyPlaygroundSessionQuestionDraft(question, {
      ...draft,
      questionText: "State Ohm's law",
      correctAnswer: "V = IR",
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.question.bankQuestionId, 900)
      assert.equal(result.question.id, 41)
      assert.equal(result.question.questionText, "State Ohm's law")
    }
  })

  it("rejects a correct answer that is not one of the choices", () => {
    const result = applyPlaygroundSessionQuestionDraft(question, {
      ...draftFromPlaygroundSessionQuestion(question),
      correctAnswer: "Not an option",
    })
    assert.equal(result.ok, false)
  })

  it("includes snapshots on persist only when the session copy changed", () => {
    const edited = { ...question, questionText: "State Ohm's law" }
    assert.equal(playgroundSessionQuestionsHaveSnapshotEdits([question], [edited]), true)
    assert.equal(playgroundSessionQuestionsHaveSnapshotEdits([question], [question]), false)

    const withSnapshots = buildPlaygroundSessionQuestionsPutBody({
      questions: [edited],
      durationSec: 15,
      includeSnapshots: true,
    })
    assert.deepEqual(withSnapshots.questionIds, [900])
    assert.equal(withSnapshots.questions?.[0]?.questionText, "State Ohm's law")
    assert.equal(withSnapshots.questions?.[0]?.bankQuestionId, 900)

    const orderOnly = buildPlaygroundSessionQuestionsPutBody({
      questions: [question],
      durationSec: 10,
      includeSnapshots: false,
    })
    assert.equal(orderOnly.questions, undefined)
  })

  it("session detail edits the in-session copy instead of the Question Bank editor", () => {
    const source = readFileSync(
      join(here, "../components/faculty/FacultyPlaygroundSessionDetailModal.tsx"),
      "utf8",
    )
    assert.match(source, /FacultyPlaygroundQuestionEditorModal/)
    assert.match(source, /Edit session question/)
    assert.match(source, /playgroundSessionQuestionsEditable/)
    assert.doesNotMatch(source, /FacultyQuestionBankEditorModal/)
    assert.doesNotMatch(source, /updateQuestionBankQuestion/)
  })
})
