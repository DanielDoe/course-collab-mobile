import type { AiFeedback } from "./assessment-results-api"
import { stripHtml } from "./practice-session"

/** Plain-text line for structured AI feedback cards (no WebView / KaTeX). */
export function toPlainFeedbackText(input: string): string {
  let text = stripHtml(input)
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, "$1")
  text = text.replace(/\$([^$\n]+)\$/g, "$1")
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, "$1")
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, "$1")
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1")
  text = text.replace(/\*([^*]+)\*/g, "$1")
  text = text.replace(/^[-*•]\s+/gm, "")
  return text.replace(/\s+\n/g, "\n").trim()
}

export function formatCriteriaKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

/** Structured AI feedback worth showing instead of raw submission replay. */
export function hasProcessedAiFeedback(feedback?: AiFeedback | null): boolean {
  if (!feedback) return false
  const breakdown = feedback.gradeBreakdown
  return !!(
    feedback.status ||
    feedback.statusMessage ||
    feedback.score != null ||
    feedback.feedback?.trim() ||
    feedback.detailedExplanation?.trim() ||
    feedback.criteria ||
    (Array.isArray((feedback as AiFeedback & { rubric?: unknown[] }).rubric) &&
      ((feedback as AiFeedback & { rubric?: unknown[] }).rubric?.length ?? 0) > 0) ||
    breakdown?.reasoning?.trim() ||
    (breakdown?.strengths?.length ?? 0) > 0 ||
    (breakdown?.weaknesses?.length ?? 0) > 0 ||
    (breakdown?.improvements?.length ?? 0) > 0 ||
    (feedback.suggestions?.length ?? 0) > 0
  )
}
