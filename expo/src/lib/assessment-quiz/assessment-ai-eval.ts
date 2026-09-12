import type { EvaluateAnswerResult } from "./assessment-quiz-types"

/** Server homework submit often omits aiGraded even when the model scored the item. */
export function isProvisionalAiEvaluation(
  evalResult: Pick<EvaluateAnswerResult, "aiGraded" | "aiFeedback" | "feedback" | "pointsEarned">,
  questionType?: string,
): boolean {
  if (evalResult.aiGraded === true) return true
  const fb = evalResult.aiFeedback
  if (fb && typeof fb === "object" && (fb as { aiGraded?: unknown }).aiGraded === true) {
    return true
  }
  const qt = (questionType ?? "").toLowerCase()
  const isCode =
    qt === "code_write" ||
    qt === "code_write_plot" ||
    qt === "code" ||
    qt === "coding" ||
    qt === "code_problem"
  if (!isCode) return false
  const hasFeedback =
    (typeof evalResult.feedback === "string" && evalResult.feedback.trim().length > 0) ||
    Boolean(fb && typeof fb === "object")
  return hasFeedback && typeof evalResult.pointsEarned === "number"
}
