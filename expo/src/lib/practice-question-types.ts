import type { AssessmentQuestion } from "./assessment-quiz/assessment-quiz-types"
import { isCodePreviewType } from "./faculty-assessment-preview"
import { isMultiSelectType, type PracticeQuestion } from "./practice-session"

export function asAssessmentQuestion(q: PracticeQuestion): AssessmentQuestion {
  return q as unknown as AssessmentQuestion
}

export function isMultiPartQuestion(q: PracticeQuestion): boolean {
  return q.question_type.toLowerCase() === "multi_part"
}

export function isCircuitQuestion(q: PracticeQuestion): boolean {
  return q.question_type.toLowerCase() === "circuit_submission"
}

export function isCodeQuestion(q: PracticeQuestion): boolean {
  return isCodePreviewType(q.question_type)
}

export function isTextInputQuestion(q: PracticeQuestion): boolean {
  const t = q.question_type.toLowerCase()
  if (isMultiPartQuestion(q) || isCircuitQuestion(q) || isCodeQuestion(q)) return false
  return (
    t === "fill_blank" ||
    t === "fill_in_blank" ||
    t === "short_answer" ||
    t === "code_output" ||
    t === "trace_output" ||
    t === "fill_code"
  )
}

export function practiceQuestionBadge(q: PracticeQuestion): string {
  const t = q.question_type.toLowerCase()
  if (isMultiPartQuestion(q)) return "Multi-part"
  if (isCircuitQuestion(q)) return "Circuit submission"
  if (isCodeQuestion(q)) return "Code"
  if (isMultiSelectType(t)) return "Select all"
  if (isTextInputQuestion(q)) {
    if (t === "code_output" || t === "trace_output") return "Short answer"
    return "Short answer"
  }
  return "Single choice"
}
