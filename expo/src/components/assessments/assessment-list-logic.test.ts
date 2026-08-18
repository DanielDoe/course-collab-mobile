import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { assessmentListEmptyCopy } from "./assessment-list-empty-copy"

const CLOSED_SUMMER = {
  show_closed_notice: true,
  academic_term_label: "Summer 2026",
} as const

describe("assessmentListEmptyCopy", () => {
  it("shows a closed-term notice for quizzes when show_closed_notice is true", () => {
    const copy = assessmentListEmptyCopy("quiz", CLOSED_SUMMER)
    assert.equal(copy.title, "Quizzes are closed")
    assert.match(copy.body, /Summer 2026/)
    assert.match(copy.body, /closed/i)
    assert.match(copy.body, /quizzes/i)
  })

  it("shows a closed-term notice for homework when show_closed_notice is true", () => {
    const copy = assessmentListEmptyCopy("homework", CLOSED_SUMMER)
    assert.equal(copy.title, "Homework is closed")
    assert.match(copy.body, /Summer 2026/)
    assert.match(copy.body, /closed/i)
    assert.match(copy.body, /homework/i)
  })

  it("does not show the closed-term notice for finals", () => {
    const copy = assessmentListEmptyCopy("final", CLOSED_SUMMER, "Final Exams")
    assert.equal(copy.title, "No final exams yet")
    assert.equal(copy.body, "Check back when your instructor publishes new assessments.")
  })

  it("does not show the closed-term notice for mid-semester exams", () => {
    const copy = assessmentListEmptyCopy("mid_semester", CLOSED_SUMMER, "Mid-Semester")
    assert.equal(copy.title, "No mid-semester yet")
    assert.equal(copy.body, "Check back when your instructor publishes new assessments.")
  })

  it("uses the default empty copy when policy is missing", () => {
    const copy = assessmentListEmptyCopy("quiz")
    assert.equal(copy.title, "No quizzes yet")
    assert.equal(copy.body, "Check back when your instructor publishes new assessments.")
  })

  it("uses the default empty copy when show_closed_notice is false", () => {
    const copy = assessmentListEmptyCopy("quiz", {
      show_closed_notice: false,
      academic_term_label: "Summer 2026",
    })
    assert.equal(copy.title, "No quizzes yet")
    assert.equal(copy.body, "Check back when your instructor publishes new assessments.")
  })
})
