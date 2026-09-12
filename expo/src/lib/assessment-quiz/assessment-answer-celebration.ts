import type { FlashcardCelebrationPayload } from "../../components/flashcards/FlashcardKnownCelebration"
import type { PracticeAnswerReview } from "../lecture-types"
import { isEvalPartialCredit, practiceHubFeedbackSummary } from "../lecture-sample-practice-grading"
import type { EvaluateAnswerResult } from "./assessment-quiz-types"
import { isProvisionalAiEvaluation } from "./assessment-ai-eval"

export function buildAssessmentAnswerCelebration(input: {
  evalResult: EvaluateAnswerResult
  review: PracticeAnswerReview | null
  maxPoints: number
}): FlashcardCelebrationPayload {
  const { evalResult, review, maxPoints } = input
  const pointsEarned = evalResult.pointsEarned ?? 0
  const scorePct =
    typeof evalResult.score === "number"
      ? evalResult.score
      : maxPoints > 0 && typeof evalResult.pointsEarned === "number"
        ? (evalResult.pointsEarned / maxPoints) * 100
        : undefined
  const partial = isEvalPartialCredit(
    {
      isCorrect: evalResult.isCorrect,
      score: scorePct,
      pointsEarned: evalResult.pointsEarned,
      maxPoints: evalResult.maxPoints ?? maxPoints,
    },
    review,
  )

  const summary = practiceHubFeedbackSummary(
    review,
    partial ? "Partial credit." : evalResult.isCorrect ? "Correct!" : "Answer recorded.",
    {
      isCorrect: evalResult.isCorrect,
      score: scorePct,
      pointsEarned: evalResult.pointsEarned,
      maxPoints: evalResult.maxPoints ?? maxPoints,
    },
  )

  const needsReview = Boolean(evalResult.requiresManualReview || evalResult.requiresReview)
  const aiGraded = isProvisionalAiEvaluation(evalResult)

  const messageLines: string[] = []
  if (summary.trim()) messageLines.push(summary.trim())
  if (maxPoints > 0 && (pointsEarned > 0 || aiGraded)) {
    const ptsLabel =
      pointsEarned % 1 === 0 ? String(pointsEarned) : pointsEarned.toFixed(1)
    const maxLabel = maxPoints % 1 === 0 ? String(maxPoints) : maxPoints.toFixed(1)
    messageLines.push(`${ptsLabel}/${maxLabel} pt${maxPoints === 1 ? "" : "s"}`)
  }
  if (aiGraded) {
    messageLines.push("Provisional — instructor may adjust")
  } else if (needsReview) {
    messageLines.push("Instructor review pending")
  }

  let zeroPointsTitle = "Answer recorded"
  if (evalResult.isCorrect) zeroPointsTitle = aiGraded ? "AI graded" : "Correct!"
  else if (partial) zeroPointsTitle = aiGraded ? "Provisional grade" : "Partial credit"
  else if (aiGraded) zeroPointsTitle = "Provisional grade"
  else if (needsReview) zeroPointsTitle = "Submitted"

  return {
    pointsEarned,
    pointsLabel: "pts",
    zeroPointsTitle,
    messageLines: messageLines.slice(0, 3),
    tone: evalResult.isCorrect
      ? "success"
      : partial || aiGraded
        ? "warning"
        : needsReview
          ? "default"
          : "danger",
  }
}
