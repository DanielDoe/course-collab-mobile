import assert from "node:assert/strict"
import test from "node:test"
import { buildAssessmentAnswerCelebration } from "./assessment-answer-celebration"

test("buildAssessmentAnswerCelebration formats partial credit with points", () => {
  const payload = buildAssessmentAnswerCelebration({
    evalResult: {
      isCorrect: false,
      pointsEarned: 0.5,
      maxPoints: 1,
      score: 50,
    },
    review: {
      isCorrect: false,
      isPartialCredit: true,
      score: 50,
      summary: "Partially correct (50%).",
      options: [],
      correctLetters: [],
      correctTexts: [],
    },
    maxPoints: 1,
  })

  assert.equal(payload.pointsEarned, 0.5)
  assert.equal(payload.pointsLabel, "pts")
  assert.equal(payload.zeroPointsTitle, "Partial credit")
  assert.equal(payload.tone, "warning")
  assert.ok(payload.messageLines?.some((line) => line.includes("50%")))
  assert.ok(payload.messageLines?.some((line) => line.includes("0.5/1 pt")))
})

test("buildAssessmentAnswerCelebration formats full credit", () => {
  const payload = buildAssessmentAnswerCelebration({
    evalResult: {
      isCorrect: true,
      pointsEarned: 1,
      maxPoints: 1,
      score: 100,
    },
    review: {
      isCorrect: true,
      isPartialCredit: false,
      score: 100,
      summary: "Correct!",
      options: [],
      correctLetters: [],
      correctTexts: [],
    },
    maxPoints: 1,
  })

  assert.equal(payload.pointsEarned, 1)
  assert.equal(payload.tone, "success")
  assert.ok(payload.messageLines?.some((line) => line.includes("Correct")))
})

test("buildAssessmentAnswerCelebration marks AI autograde as provisional", () => {
  const payload = buildAssessmentAnswerCelebration({
    evalResult: {
      isCorrect: false,
      aiGraded: true,
      requiresManualReview: true,
      pointsEarned: 7,
      maxPoints: 10,
      score: 70,
    },
    review: null,
    maxPoints: 10,
  })

  assert.equal(payload.zeroPointsTitle, "Provisional grade")
  assert.equal(payload.tone, "warning")
  assert.ok(payload.messageLines?.some((line) => line.includes("7/10")))
  assert.ok(payload.messageLines?.some((line) => /provisional/i.test(line)))
})
