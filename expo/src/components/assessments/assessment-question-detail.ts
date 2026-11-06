import type { AssessmentResultQuestion } from "../../lib/assessment-results-api"
import { parseCodeWriteSavedAnswer } from "../../lib/assessment-quiz/assessment-answer-mapper"
import { stripHtml } from "../../lib/practice-session"

export const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const

export type QuestionOption = {
  key: (typeof OPTION_KEYS)[number]
  letter: string
  text: string
}

export function formatQuestionType(type?: string): string {
  if (!type) return "Question"
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatTimeSpent(seconds?: number | null): string {
  if (seconds == null || seconds < 0) return "—"
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${seconds}s`
}

export function isCodeQuestionType(type?: string): boolean {
  const t = (type ?? "").toLowerCase()
  return [
    "code_write",
    "code_problem",
    "debug_code",
    "code_explain",
    "code_write_plot",
    "code_debug",
  ].includes(t)
}

export function isMultiSelectType(type?: string): boolean {
  const t = (type ?? "").toLowerCase()
  return t === "select_all" || t === "multi_output"
}

export function hasMcqOptions(q: AssessmentResultQuestion): boolean {
  return OPTION_KEYS.some((key) => {
    const val = q[key]
    return val != null && String(val).trim() !== ""
  })
}

export function getQuestionOptions(q: AssessmentResultQuestion): QuestionOption[] {
  return OPTION_KEYS.flatMap((key) => {
    const raw = q[key]
    if (raw == null || String(raw).trim() === "") return []
    return [{ key, letter: key.split("_")[1].toUpperCase(), text: String(raw) }]
  })
}

function normalizeAnswer(value?: string | null): string {
  return String(value ?? "").trim()
}

function isLetterAnswer(value: string): boolean {
  return /^[A-E]$/i.test(value)
}

export function optionMatchesAnswer(optionLetter: string, optionText: string, answer: string): boolean {
  if (!answer) return false
  if (isLetterAnswer(answer)) return answer.toUpperCase() === optionLetter
  return answer.toLowerCase() === stripHtml(optionText).toLowerCase()
}

export function parseAnswerArray(raw?: string | null): string[] {
  if (!raw || !String(raw).trim()) return []
  try {
    const parsed = JSON.parse(String(raw))
    if (Array.isArray(parsed)) return parsed.map((v) => String(v))
  } catch {
    /* fall through */
  }
  if (String(raw).includes(",")) {
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return [String(raw).trim()]
}

export function resolveOptionFromToken(
  q: AssessmentResultQuestion,
  token: string,
): { letter: string; text: string } {
  const trimmed = token.trim()
  if (isLetterAnswer(trimmed)) {
    const key = `option_${trimmed.toLowerCase()}` as (typeof OPTION_KEYS)[number]
    const text = q[key]
    return { letter: trimmed.toUpperCase(), text: text ? String(text) : trimmed }
  }
  for (const opt of getQuestionOptions(q)) {
    if (stripHtml(opt.text).toLowerCase() === stripHtml(trimmed).toLowerCase()) {
      return { letter: opt.letter, text: opt.text }
    }
  }
  return { letter: "", text: trimmed }
}

export function isCircuitSubmissionType(type?: string): boolean {
  return (type ?? "").toLowerCase() === "circuit_submission"
}

export function extractStudentAnswer(q: AssessmentResultQuestion): string | null {
  const type = (q.question_type ?? "").toLowerCase()
  const qExt = q as AssessmentResultQuestion & { code?: string }

  if (isCodeQuestionType(type)) {
    const fromCode = parseCodeWriteSavedAnswer(qExt.code ?? null)
    if (fromCode.code) return fromCode.code
    const fromSelected = parseCodeWriteSavedAnswer(q.selected_answer ?? null)
    if (fromSelected.code) return fromSelected.code
  } else if (type !== "circuit_submission" && qExt.code && String(qExt.code).trim()) {
    return String(qExt.code)
  }

  if (q.selected_answer != null && String(q.selected_answer).trim() !== "") {
    const selected = String(q.selected_answer)
    if (type === "circuit_submission") {
      if (selected.trim().startsWith("{")) return selected
    } else {
      return selected
    }
  }

  if (q.answer_data) {
    try {
      const ad = typeof q.answer_data === "string" ? JSON.parse(q.answer_data) : q.answer_data
      if (ad && typeof ad === "object") {
        if (type === "multi_part" || type === "circuit_submission") {
          return typeof q.answer_data === "string" ? q.answer_data : JSON.stringify(ad, null, 2)
        }
        if (ad.code && String(ad.code).trim()) return String(ad.code)
        if (ad.answer != null) {
          return typeof ad.answer === "string" ? ad.answer : JSON.stringify(ad.answer, null, 2)
        }
      }
    } catch {
      if (typeof q.answer_data === "string") return q.answer_data
    }
  }

  return null
}

export function extractPlotImage(q: AssessmentResultQuestion): string | null {
  if (typeof q.plotImage === "string" && q.plotImage.trim()) return q.plotImage.trim()
  const fromSelected = parseCodeWriteSavedAnswer(q.selected_answer ?? null).plotImage
  if (fromSelected) return fromSelected
  const fromCode = parseCodeWriteSavedAnswer((q as AssessmentResultQuestion & { code?: string }).code ?? null)
  if (fromCode.plotImage) return fromCode.plotImage
  if (!q.answer_data) return null
  const raw = typeof q.answer_data === "string" ? q.answer_data : JSON.stringify(q.answer_data)
  const nested = parseCodeWriteSavedAnswer(raw)
  if (nested.plotImage) return nested.plotImage
  try {
    const ad = typeof q.answer_data === "string" ? JSON.parse(q.answer_data) : q.answer_data
    if (ad && typeof ad === "object") {
      const inner = parseCodeWriteSavedAnswer(typeof (ad as { code?: unknown }).code === "string" ? String((ad as { code: string }).code) : null)
      if (inner.plotImage) return inner.plotImage
      if (typeof (ad as { plotImage?: unknown }).plotImage === "string") {
        const plot = String((ad as { plotImage: string }).plotImage).trim()
        return plot || null
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export function formatDisplayAnswer(raw: string | null, q: AssessmentResultQuestion): string {
  if (!raw || !raw.trim()) return "No answer submitted"

  const type = (q.question_type ?? "").toLowerCase()
  if (isMultiSelectType(type)) {
    const tokens = parseAnswerArray(raw)
    if (tokens.length === 0) return "No answer submitted"
    return tokens
      .map((token) => {
        const resolved = resolveOptionFromToken(q, token)
        return resolved.letter ? `${resolved.letter}. ${resolved.text}` : resolved.text
      })
      .join("\n")
  }

  if (hasMcqOptions(q) && !isCodeQuestionType(type)) {
    const resolved = resolveOptionFromToken(q, raw)
    if (resolved.letter) {
      return `${resolved.letter}. ${resolved.text}`
    }
  }

  if (isCodeQuestionType(type) || type === "fill_code" || type === "fill_blank") {
    return raw
  }

  return raw
}

export function formatCorrectAnswer(q: AssessmentResultQuestion): string | null {
  const raw = q.correct_answer
  if (!raw || !String(raw).trim()) return null

  const type = (q.question_type ?? "").toLowerCase()
  if (isMultiSelectType(type)) {
    const tokens = parseAnswerArray(String(raw))
    return tokens
      .map((token) => {
        const resolved = resolveOptionFromToken(q, token)
        return resolved.letter ? `${resolved.letter}. ${resolved.text}` : resolved.text
      })
      .join("\n")
  }

  if (hasMcqOptions(q)) {
    const resolved = resolveOptionFromToken(q, String(raw))
    if (resolved.letter) return `${resolved.letter}. ${resolved.text}`
  }

  if (isCodeQuestionType(type)) return String(raw)

  return String(raw)
}

export function shouldShowCorrectAnswer(q: AssessmentResultQuestion): boolean {
  const type = (q.question_type ?? "").toLowerCase()
  if (["multi_part", "circuit_submission"].includes(type)) return false
  if (isCodeQuestionType(type)) return false
  return Boolean(q.correct_answer && String(q.correct_answer).trim())
}

export function isSelectAllOptionCorrect(
  q: AssessmentResultQuestion,
  optionLetter: string,
  optionText: string,
): boolean {
  const tokens = parseAnswerArray(q.correct_answer)
  return tokens.some((token) => optionMatchesAnswer(optionLetter, optionText, token))
}

export function isSelectAllOptionSelected(
  q: AssessmentResultQuestion,
  optionLetter: string,
  optionText: string,
): boolean {
  const tokens = parseAnswerArray(q.selected_answer)
  return tokens.some((token) => optionMatchesAnswer(optionLetter, optionText, token))
}

export type OptionRowState = {
  isCorrect: boolean
  isSelected: boolean
  badge?: string
}

export function getOptionRowState(q: AssessmentResultQuestion, opt: QuestionOption): OptionRowState {
  const type = (q.question_type ?? "").toLowerCase()

  if (isMultiSelectType(type)) {
    const isCorrect = isSelectAllOptionCorrect(q, opt.letter, opt.text)
    const isSelected = isSelectAllOptionSelected(q, opt.letter, opt.text)
    let badge: string | undefined
    if (isSelected && isCorrect) badge = "Your answer · Correct"
    else if (isSelected) badge = "Your answer · Incorrect"
    else if (isCorrect) badge = "Correct answer"
    return { isCorrect, isSelected, badge }
  }

  const correctAnswer = normalizeAnswer(q.correct_answer)
  const selectedAnswer = normalizeAnswer(q.selected_answer)
  const isCorrect = optionMatchesAnswer(opt.letter, opt.text, correctAnswer)
  const isSelected = optionMatchesAnswer(opt.letter, opt.text, selectedAnswer)

  let badge: string | undefined
  if (isSelected && isCorrect) badge = "Your answer · Correct"
  else if (isSelected) badge = "Your answer · Incorrect"
  else if (isCorrect) badge = "Correct answer"

  return { isCorrect, isSelected, badge }
}

export type ContentSegment = { kind: "text" | "code"; value: string }

export function splitCodeSegments(text: string): ContentSegment[] {
  if (!text.includes("```")) return [{ kind: "text", value: text }]
  const parts = text.split("```")
  const segments: ContentSegment[] = []
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const lines = part.split("\n")
      const code = lines.slice(1).join("\n").trim() || part.trim()
      segments.push({ kind: "code", value: code })
    } else if (part.trim()) {
      segments.push({ kind: "text", value: part })
    }
  })
  return segments
}
