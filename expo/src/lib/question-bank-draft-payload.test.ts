import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { DraftQuestionBankItem } from "./question-bank-ai-types"
import {
  toQuestionBankBulkCreatePayload,
  validateQuestionBankDraftsForCreate,
} from "./question-bank-draft-payload"

function draft(overrides: Partial<DraftQuestionBankItem> = {}): DraftQuestionBankItem {
  return {
    draftId: "d1",
    question_text: "What is 2+2?",
    question_type: "mcq",
    difficulty: "easy",
    topic: "Math",
    options: ["3", "4"],
    correct_answer: "4",
    hint: null,
    explanation: null,
    evaluation_mode: "auto",
    answer_guidelines: [],
    sample_answer: null,
    subquestions: null,
    source_note: null,
    ...overrides,
  }
}

describe("question bank draft payload", () => {
  it("strips draftId before insert", () => {
    const [item] = toQuestionBankBulkCreatePayload([draft()])
    assert.equal("draftId" in item, false)
    assert.equal(item.question_text, "What is 2+2?")
  })

  it("rejects an empty selection", () => {
    assert.equal(validateQuestionBankDraftsForCreate([]), "Select at least one question.")
  })

  it("rejects blank question text", () => {
    assert.match(validateQuestionBankDraftsForCreate([draft({ question_text: "  " })]) ?? "", /question text/)
  })
})
