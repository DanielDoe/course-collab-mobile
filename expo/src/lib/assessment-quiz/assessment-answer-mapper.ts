import type { AssessmentQuestion, SavedAnswer } from "./assessment-quiz-types"
import { isMultiSelectType } from "../question-type-utils"
import { resolveMcqEarnedFractionForSubmission } from "../lecture-sample-practice-grading"

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

/** Whether the question should render select-all checkbox options. */
export function isAssessmentMultiSelectQuestion(question: AssessmentQuestion): boolean {
  return isMultiSelectType(question.question_type)
}

export function resolveAssessmentQuestionMcqEarnedFraction(
  question: AssessmentQuestion,
  selectedLetter: string,
  selectedLetters: string[],
): number | undefined {
  const qType = question.question_type.toLowerCase()
  if (!isMultiSelectType(qType)) {
    const letter = selectedLetter.trim().toUpperCase()
    if (!letter) return undefined
    return resolveMcqEarnedFractionForSubmission({
      questionType: qType,
      options: getQuestionOptions(question).map((option) => ({ id: option.letter, text: option.text })),
      correctAnswer: question.correct_answer,
      selectedLetters: [letter],
    })
  }

  const letters = selectedLetters.map((letter) => letter.trim().toUpperCase()).filter(Boolean)
  if (letters.length === 0) return undefined

  return resolveMcqEarnedFractionForSubmission({
    questionType: qType,
    options: getQuestionOptions(question).map((option) => ({ id: option.letter, text: option.text })),
    correctAnswer: question.correct_answer,
    selectedLetters: letters,
  })
}

function parseSelectAllSavedParts(saved: string): string[] {
  const trimmed = saved.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean)
    }
  } catch {
    /* fall through */
  }

  return trimmed
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function letterFromSavedPart(question: AssessmentQuestion, part: string): string | null {
  const trimmed = part.trim()
  if (!trimmed) return null

  const letterMatch = trimmed.match(/^([A-E])\b/i)
  if (letterMatch) return letterMatch[1].toUpperCase()

  if (/^[A-E]$/i.test(trimmed)) return trimmed.toUpperCase()

  return optionTextToLetter(question, trimmed)
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

export function isCodeWritePlotQuestion(question: Pick<AssessmentQuestion, "question_type">): boolean {
  return question.question_type.toLowerCase() === "code_write_plot"
}

/** Native code editor types (plain source, no required plot). */
export function isCodeWriteQuestion(question: Pick<AssessmentQuestion, "question_type">): boolean {
  const t = question.question_type.toLowerCase()
  return t === "code_write" || t === "code" || t === "coding" || t === "code_problem"
}

export function isNativeCodeQuestion(question: Pick<AssessmentQuestion, "question_type">): boolean {
  return isCodeWriteQuestion(question) || isCodeWritePlotQuestion(question)
}

export type CodeWriteSavedPayload = {
  code: string
  plotImage: string
}

/** Restore a code_write / code_write_plot draft from selected_answer or JSON. */
export function parseCodeWriteSavedAnswer(saved: string | null | undefined): CodeWriteSavedPayload {
  if (!saved?.trim()) return { code: "", plotImage: "" }
  const trimmed = saved.trim()
  try {
    const parsed = JSON.parse(trimmed) as { code?: unknown; plotImage?: unknown }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const code = typeof parsed.code === "string" ? parsed.code : ""
      const plotImage = typeof parsed.plotImage === "string" ? parsed.plotImage : ""
      if (code || plotImage) return { code, plotImage }
    }
  } catch {
    /* plain source */
  }
  return { code: trimmed, plotImage: "" }
}

export function buildCodeWriteAnswerForSubmit(code: string, plotImage?: string | null): string {
  const source = code
  if (plotImage?.trim()) {
    return JSON.stringify({ code: source, plotImage: plotImage.trim() })
  }
  return source
}

export function codeWriteSubmissionReady(
  question: Pick<AssessmentQuestion, "question_type">,
  code: string,
  plotImage?: string | null,
): boolean {
  if (!code.trim()) return false
  if (isCodeWritePlotQuestion(question) && !plotImage?.trim()) return false
  return true
}

export function buildAnswerForSubmit(
  question: AssessmentQuestion,
  selectedLetter: string,
  selectedLetters: string[],
  textAnswer: string,
  plotImage?: string | null,
): string | string[] {
  const qType = question.question_type.toLowerCase()
  if (isNativeCodeQuestion(question)) {
    return buildCodeWriteAnswerForSubmit(textAnswer, isCodeWritePlotQuestion(question) ? plotImage : null)
  }
  if (isMultiSelectType(qType)) {
    return selectedLetters.map((l) => letterToOptionText(question, l))
  }
  if (qType === "fill_blank" || qType === "fill_in_blank" || qType === "short_answer") {
    return textAnswer.trim()
  }
  if (qType === "true_false" || qType === "mcq" || qType === "multiple_choice") {
    return selectedLetter.trim().toUpperCase()
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
    const parts = parseSelectAllSavedParts(saved)
    const letters = [
      ...new Set(
        parts
          .map((part) => letterFromSavedPart(question, part))
          .filter((letter): letter is string => Boolean(letter)),
      ),
    ]
    return { letter: "", letters, text: "" }
  }

  if (qType === "fill_blank" || qType === "fill_in_blank" || qType === "short_answer") {
    return { letter: "", letters: [], text: saved.trim() }
  }

  if (isNativeCodeQuestion(question)) {
    return { letter: "", letters: [], text: parseCodeWriteSavedAnswer(saved).code }
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
  "code_write",
  "code_write_plot",
  "code",
  "coding",
  "code_problem",
])

const WEB_ONLY = new Set([
  "multi_part",
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

export function restoreCodeWriteFromSaved(saved: SavedAnswer | undefined): CodeWriteSavedPayload {
  const parsed = parseCodeWriteSavedAnswer(coerceSavedAnswerRaw(saved))
  if (!saved?.answerData || typeof saved.answerData !== "object" || Array.isArray(saved.answerData)) {
    return parsed
  }
  const data = saved.answerData as { code?: unknown; plotImage?: unknown }
  return {
    code: parsed.code || (typeof data.code === "string" ? data.code : ""),
    plotImage: parsed.plotImage || (typeof data.plotImage === "string" ? data.plotImage : ""),
  }
}

export function coerceSavedAnswerRaw(saved: SavedAnswer | undefined): string | null {
  if (!saved) return null
  if (typeof saved.answer === "string" && saved.answer.trim()) return saved.answer.trim()
  if (saved.answerData == null) return null
  if (typeof saved.answerData === "string" && saved.answerData.trim()) return saved.answerData.trim()
  if (Array.isArray(saved.answerData)) return JSON.stringify(saved.answerData)
  try {
    return JSON.stringify(saved.answerData)
  } catch {
    return null
  }
}
