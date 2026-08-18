import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  inferAssessmentTypeFromTitle,
  mergeAssessmentHistoryById,
  quizHistoryToAssessmentItems,
} from "./assessment-history-map"

describe("inferAssessmentTypeFromTitle", () => {
  it("maps a homework title to homework", () => {
    assert.equal(inferAssessmentTypeFromTitle("ECE 2202 - Homework 7"), "homework")
  })

  it("maps Final Exam to final", () => {
    assert.equal(inferAssessmentTypeFromTitle("ECE 2202 - Final Exam 1"), "final")
  })

  it("maps a generic title to quiz", () => {
    assert.equal(inferAssessmentTypeFromTitle("Weekly Check-in"), "quiz")
  })
})

describe("quizHistoryToAssessmentItems", () => {
  it("maps attempt_id onto attempts[].id", () => {
    const items = quizHistoryToAssessmentItems([
      {
        quiz_id: 172,
        quiz_title: "ECE 2202 - Homework 7",
        attempts: [
          {
            attempt_id: 4463,
            percentage: 88,
            completed_at: "2026-08-01T12:00:00.000Z",
          },
        ],
      },
    ])
    assert.equal(items.length, 1)
    assert.equal(items[0]?.id, 172)
    assert.equal(items[0]?.assessment_type, "homework")
    assert.equal(items[0]?.attempts?.[0]?.id, 4463)
    assert.equal(items[0]?.attempts?.[0]?.is_completed, true)
    assert.equal(items[0]?.best_score, 88)
    assert.equal(items[0]?.status, "completed")
  })

  it("returns [] for empty input", () => {
    assert.deepEqual(quizHistoryToAssessmentItems([]), [])
    assert.deepEqual(quizHistoryToAssessmentItems(undefined), [])
    assert.deepEqual(quizHistoryToAssessmentItems(null), [])
    assert.deepEqual(quizHistoryToAssessmentItems({}), [])
    assert.deepEqual(quizHistoryToAssessmentItems({ quizHistory: [] }), [])
  })

  it("marks incomplete attempts as in_progress", () => {
    const items = quizHistoryToAssessmentItems({
      quizHistory: [
        {
          quiz_id: 201,
          quiz_title: "AUDIT-E2E Final leftover",
          attempts: [{ attempt_id: 4492, completed_at: "" }],
        },
      ],
    })
    assert.equal(items[0]?.assessment_type, "final")
    assert.equal(items[0]?.attempts?.[0]?.is_completed, false)
    assert.equal(items[0]?.status, "in_progress")
  })
})

describe("mergeAssessmentHistoryById", () => {
  it("keeps quiz-history rows and appends unseen assessment-history ids", () => {
    const quiz = quizHistoryToAssessmentItems([
      { quiz_id: 162, quiz_title: "Final Exam 1", attempts: [{ attempt_id: 4452, percentage: 90, completed_at: "2026-07-01T00:00:00.000Z" }] },
    ])
    const merged = mergeAssessmentHistoryById(quiz, [
      { id: 999, title: "Extra from AH", assessment_type: "quiz", status: "completed" },
    ])
    assert.equal(merged.length, 2)
    assert.equal(merged.find((row) => row.id === 162)?.title, "Final Exam 1")
    assert.equal(merged.find((row) => row.id === 999)?.title, "Extra from AH")
  })
})
