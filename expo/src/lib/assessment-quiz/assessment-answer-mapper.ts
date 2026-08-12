import type { AssessmentQuestion } from "./assessment-quiz-types"
import { isMultiSelectType } from "../practice-session"

export function getQuestionOptions(
  question: AssessmentQuestion,
): { letter: string; text: string }[] {
  const entries: { letter: string; text: string }[] = []
  const map = [
    ["A", question.option_a],
    ["B", question.option_b],
    ["C", question.option_c],
    ["D", question.option_d],
    ["E", question.option_e ?? ""],
  ] as const
  for (const [letter, text] of map) {
    if (text?.trim()) entries.push({ letter, text: text.trim() })
  }
  return entries
}

export function letterToOptionText(question: AssessmentQuestion, letter: string): string {
  const map: Record<string, string | undefined> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
    E: question.option_e,
  }
  return map[letter]?.trim() ?? letter
}

export function optionTextToLetter(question: AssessmentQuestion, answer: string): string | null {
  const normalized = answer.trim().toLowerCase()
  if (!normalized) return null
  if (/^[a-e]$/i.test(normalized)) return normalized.toUpperCase()

  for (const { letter, text } of getQuestionOptions(question)) {
    if (text.trim().toLowerCase() === normalized) return letter
  }
  return null
}

export function buildAnswerForSubmit(
  question: AssessmentQuestion,
  selectedLetter: string,
  selectedLetters: string[],
  textAnswer: string,
): string | string[] {
  const qType = question.question_type.toLowerCase()
  if (isMultiSelectType(qType)) {
    return selectedLetters.map((l) => letterToOptionText(question, l))
  }
  if (qType === "fill_blank" || qType === "fill_in_blank" || qType === "short_answer") {
    return textAnswer.trim()
  }
  if (qType === "true_false") {
    return selectedLetter ? letterToOptionText(question, selectedLetter) : textAnswer.trim()
  }
  return selectedLetter ? letterToOptionText(question, selectedLetter) : textAnswer.trim()
}

export function restoreSelectionFromSavedAnswer(
  question: AssessmentQuestion,
  saved: string | null,
): { letter: string; letters: string[]; text: string } {
  if (!saved?.trim()) return { letter: "", letters: [], text: "" }

  const qType = question.question_type.toLowerCase()
  if (isMultiSelectType(qType)) {
    let parts: string[] = []
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) parts = parsed.map(String)
    } catch {
      parts = saved.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
    }
    const letters = parts
      .map((p) => optionTextToLetter(question, p) ?? (/^[a-e]$/i.test(p) ? p.toUpperCase() : null))
      .filter((l): l is string => !!l)
    return { letter: "", letters, text: "" }
  }

  if (qType === "fill_blank" || qType === "fill_in_blank" || qType === "short_answer") {
    return { letter: "", letters: [], text: saved.trim() }
  }

  const letter = optionTextToLetter(question, saved)
  return { letter: letter ?? "", letters: [], text: "" }
}

const NATIVE_SUPPORTED = new Set([
  "mcq",
  "true_false",
  "select_all",
  "multi_output",
  "fill_blank",
  "fill_in_blank",
  "short_answer",
  "code_output",
  "trace_output",
  "circuit_submission",
])

const WEB_ONLY = new Set([
  "multi_part",
  "code",
  "coding",
  "code_write",
  "code_write_plot",
  "code_problem",
  "code_explain",
  "code_debug",
  "debug_code",
])

export function isNativeSupportedQuestionType(type: string): boolean {
  const t = type.toLowerCase()
  if (t === "circuit_submission") return true
  if (WEB_ONLY.has(t) || (t.startsWith("circuit_") && t !== "circuit_submission")) return false
  return NATIVE_SUPPORTED.has(t)
}

export function isUnsupportedQuestion(question: AssessmentQuestion): boolean {
  return !isNativeSupportedQuestionType(question.question_type)
}

export function unsupportedQuestionLabel(type: string): string {
  const t = type.toLowerCase()
  if (t.startsWith("circuit_") && t !== "circuit_submission") return "Circuit workspace"
  if (t.includes("code")) return "Code question"
  if (t === "multi_part") return "Multi-part question"
  return "Advanced question"
}

export function isCircuitSubmissionQuestion(question: AssessmentQuestion): boolean {
  return question.question_type.toLowerCase() === "circuit_submission"
}
