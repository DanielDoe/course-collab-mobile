import {
  prepareAssessmentReportMarkdown,
  prepareAssessmentReportMarkdownList,
} from "../assessment-report-markdown"
import type { EvaluateAnswerResult } from "./assessment-quiz-types"
import { isProvisionalAiEvaluation } from "./assessment-ai-eval"

export { isProvisionalAiEvaluation }

function parseStoredAiFeedback(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  const fb = raw as Record<string, unknown>
  if (fb.feedback === "Processing...") return null
  const feedbackText = typeof fb.feedback === "string" ? fb.feedback : ""
  const hasContent =
    fb.aiGraded === true ||
    fb.multiPartMcqGraded === true ||
    fb.multiPartAiGraded === true ||
    Boolean(fb.solutionFeedback) ||
    (Array.isArray(fb.strengths) && fb.strengths.length > 0) ||
    (Array.isArray(fb.improvements) && fb.improvements.length > 0) ||
    (feedbackText.length > 0 &&
      feedbackText !== "Evaluation failed - use Re-evaluate on results page")
  return hasContent ? fb : null
}

function formatAwardedPoints(pointsEarned?: number, maxPoints?: number): string | null {
  if (typeof pointsEarned !== "number" || typeof maxPoints !== "number" || maxPoints <= 0) {
    return null
  }
  const earned = pointsEarned % 1 === 0 ? String(pointsEarned) : pointsEarned.toFixed(1)
  const max = maxPoints % 1 === 0 ? String(maxPoints) : maxPoints.toFixed(1)
  return `${earned}/${max} pts`
}

/** Build rich markdown feedback from server eval payload (mirrors web quiz-taker). */
export function formatEvaluateAnswerFeedback(
  evalResult: Pick<
    EvaluateAnswerResult,
    | "feedback"
    | "aiFeedback"
    | "isCorrect"
    | "requiresManualReview"
    | "requiresReview"
    | "aiGraded"
    | "pointsEarned"
    | "maxPoints"
  >,
  fallback: string,
): string {
  const parsed =
    parseStoredAiFeedback(evalResult.aiFeedback) ??
    (typeof evalResult.feedback === "string" && evalResult.feedback.trim()
      ? { feedback: evalResult.feedback }
      : null)

  const needsReview = Boolean(evalResult.requiresManualReview || evalResult.requiresReview)
  const aiGraded =
    evalResult.aiGraded === true ||
    Boolean(parsed && parsed.aiGraded === true) ||
    isProvisionalAiEvaluation(evalResult)
  const awarded = formatAwardedPoints(evalResult.pointsEarned, evalResult.maxPoints)

  if (!parsed) {
    const parts: string[] = []
    if (aiGraded) {
      parts.push("**Provisional AI grade** — your instructor may still adjust this score.")
    } else if (needsReview) {
      parts.push("**Submitted for instructor review.**")
    }
    if (awarded) parts.push(`Awarded **${awarded}**.`)
    parts.push(fallback)
    return prepareAssessmentReportMarkdownList(parts.filter((part) => part.trim()))
  }

  const parts: string[] = []
  if (aiGraded) {
    parts.push("**Provisional AI grade** — your instructor may still adjust this score.")
  } else if (needsReview) {
    parts.push("**Submitted for instructor review.**")
  }
  if (awarded) parts.push(`Awarded **${awarded}**.`)

  const main =
    typeof parsed.feedback === "string"
      ? parsed.feedback
      : typeof parsed.solutionFeedback === "string"
        ? parsed.solutionFeedback
        : ""
  if (main.trim()) parts.push(main.trim())

  if (Array.isArray(parsed.strengths) && parsed.strengths.length) {
    parts.push(
      "**Strengths**\n" +
        parsed.strengths.map((s) => `- ${String(s)}`).join("\n"),
    )
  }
  if (Array.isArray(parsed.improvements) && parsed.improvements.length) {
    parts.push(
      "**Improvements**\n" +
        parsed.improvements.map((s) => `- ${String(s)}`).join("\n"),
    )
  }

  if (parts.length <= (aiGraded || needsReview || awarded ? 1 : 0)) {
    parts.push(fallback)
  }

  return prepareAssessmentReportMarkdownList(parts.filter((part) => part.trim()))
}
