import assert from "node:assert/strict"
import test from "node:test"
import { countQuestionPaintTargets, questionPaintReadyAfterMark } from "./question-paint-ready"

test("countQuestionPaintTargets counts prompt and non-empty options", () => {
  assert.equal(countQuestionPaintTargets({ promptText: "", optionTexts: ["A", ""] }), 1)
  assert.equal(
    countQuestionPaintTargets({
      promptText: "What is 2 + 2?",
      optionTexts: ["3", "4", "   "],
    }),
    3,
  )
  assert.equal(countQuestionPaintTargets({ promptText: "   ", optionTexts: [] }), 0)
})

test("questionPaintReadyAfterMark treats a zero target as already ready", () => {
  assert.equal(questionPaintReadyAfterMark(0, 0), true)
  assert.equal(questionPaintReadyAfterMark(1, 3), false)
  assert.equal(questionPaintReadyAfterMark(3, 3), true)
})
