/**
 * Run: npx tsx --test src/lib/faculty-question-bank-topics.test.ts
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  filterBankTopics,
  filterBankTypes,
  questionBankTopicPageCount,
  questionBankTopicPageLabel,
  questionBankTypePageLabel,
  QUESTION_BANK_TOPICS_PAGE_SIZE,
  sliceQuestionBankTopicPage,
} from "./faculty-question-bank-topics"

const topics = [
  { name: "MATLAB", description: "Arrays and plots" },
  { name: "Pointers", description: null },
  { name: "Introduction to Programming", description: "Basics" },
]

describe("question bank topics browse", () => {
  it("filters topics by name or description", () => {
    assert.deepEqual(
      filterBankTopics(topics, "pointer").map((t) => t.name),
      ["Pointers"],
    )
    assert.deepEqual(
      filterBankTopics(topics, "plot").map((t) => t.name),
      ["MATLAB"],
    )
    assert.equal(filterBankTopics(topics, "  ").length, 3)
  })

  it("pages topic cards", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ name: `Topic ${i}` }))
    assert.equal(questionBankTopicPageCount(many.length), 2)
    assert.equal(QUESTION_BANK_TOPICS_PAGE_SIZE, 8)
    assert.deepEqual(
      sliceQuestionBankTopicPage(many, 0).map((t) => t.name),
      many.slice(0, 8).map((t) => t.name),
    )
    assert.equal(sliceQuestionBankTopicPage(many, 1).length, 2)
    assert.equal(questionBankTopicPageLabel(10, 0), "Showing 1–8 of 10")
    assert.equal(questionBankTopicPageLabel(10, 1), "Showing 9–10 of 10")
  })
})

describe("question bank types browse", () => {
  it("filters types by label, id, or description", () => {
    const rows = [
      { label: "Multiple Choice", type: "mcq", description: null },
      { label: "Code Problem", type: "code_problem", description: "Write a program" },
      { label: "Lab Rubric", type: "custom_lab", description: "Custom rubric" },
    ]
    assert.deepEqual(
      filterBankTypes(rows, "choice").map((r) => r.type),
      ["mcq"],
    )
    assert.deepEqual(
      filterBankTypes(rows, "code_problem").map((r) => r.type),
      ["code_problem"],
    )
    assert.deepEqual(
      filterBankTypes(rows, "rubric").map((r) => r.type),
      ["custom_lab"],
    )
  })

  it("labels type pages", () => {
    assert.equal(questionBankTypePageLabel(10, 0), "Showing 1–8 of 10")
    assert.equal(questionBankTypePageLabel(0, 0), "0 types")
  })
})
