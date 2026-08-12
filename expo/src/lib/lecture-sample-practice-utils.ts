import { normalizeQuestionMedia, repairLatexDamagedByJsonEscapes, type QuestionMedia } from "./classroom-submission"
import type { LectureSamplePracticeConfig, LectureSamplePracticeQuestion } from "./lecture-types"

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const

export type MultiPartSubOption = { id: string; text: string }

export type MultiPartSubQuestion = {
  id: string
  type: string
  points?: number
  prompt: string
  options: MultiPartSubOption[] | string[]
  correct_answer?: string
  correct_answers?: string[]
  explanation?: string
}

function repairOptionText(text: string): string {
  return repairLatexDamagedByJsonEscapes(text)
}

export function parseSubquestions(raw: unknown): MultiPartSubQuestion[] {
  if (raw == null || raw === "") return []
  let arr: unknown = raw
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []

  const parsed: MultiPartSubQuestion[] = []
  for (const item of arr) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    const id = String(o.id ?? "").trim()
    const prompt = repairOptionText(String(o.prompt ?? "").trim())
    if (!id || !prompt) continue

    let options: MultiPartSubOption[] = []
    if (Array.isArray(o.options)) {
      options = o.options.map((opt, idx) => {
        if (typeof opt === "string") {
          return { id: LETTERS[idx] ?? String(idx + 1), text: repairOptionText(opt) }
        }
        if (opt && typeof opt === "object") {
          const oo = opt as Record<string, unknown>
          return {
            id: String(oo.id ?? LETTERS[idx] ?? idx + 1).trim(),
            text: repairOptionText(String(oo.text ?? oo.option_text ?? "").trim()),
          }
        }
        return { id: LETTERS[idx] ?? String(idx + 1), text: repairOptionText(String(opt)) }
      })
    } else if (o.options && typeof o.options === "object") {
      const rec = o.options as Record<string, unknown>
      options = Object.keys(rec)
        .sort()
        .map((key) => ({
          id: key.trim().toUpperCase(),
          text: repairOptionText(String(rec[key] ?? "").trim()),
        }))
    }

    parsed.push({
      id,
      type: String(o.type ?? "mcq").toLowerCase(),
      points: typeof o.points === "number" ? o.points : Number(o.points) || 1,
      prompt,
      options,
      correct_answer:
        typeof o.correct_answer === "string" ? o.correct_answer.trim().toUpperCase() : undefined,
      correct_answers: Array.isArray(o.correct_answers)
        ? o.correct_answers.map((x) => String(x).trim().toUpperCase())
        : undefined,
      explanation: typeof o.explanation === "string" ? o.explanation : undefined,
    })
  }

  return parsed
}

export function getGradableSubquestions(raw: unknown): MultiPartSubQuestion[] {
  return parseSubquestions(raw).filter((sq) => {
    const t = sq.type.toLowerCase()
    return t !== "file_upload" && t !== "solution_upload"
  })
}

export function subquestionOptionLabels(sq: MultiPartSubQuestion): { letter: string; text: string }[] {
  return sq.options.map((opt, i) => {
    if (typeof opt === "string") {
      return { letter: LETTERS[i] ?? String(i + 1), text: opt }
    }
    return { letter: opt.id || LETTERS[i] || String(i + 1), text: opt.text }
  })
}

export function subquestionOptionsToText(options: MultiPartSubQuestion["options"] | undefined): string {
  return subquestionOptionLabels({ id: "a", type: "mcq", prompt: "", options: options ?? [] })
    .map((opt) => opt.text)
    .join("\n")
}

export function subquestionOptionsFromText(text: string): MultiPartSubOption[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.map((line, index) => ({
    id: LETTERS[index] ?? String(index + 1),
    text: line,
  }))
}

function parseQuestionMedia(raw: unknown): QuestionMedia | undefined {
  return normalizeQuestionMedia(raw) ?? undefined
}

export function normalizeSamplePracticeQuestion(
  raw: unknown,
  fallbackIndex = 0,
): LectureSamplePracticeQuestion | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id =
    typeof o.id === "string" && o.id.trim() ? o.id.trim() : `q${fallbackIndex + 1}`
  const title = String(o.title ?? o.question_text ?? `Question ${fallbackIndex + 1}`).trim()
  const question_text = String(o.question_text ?? title).trim()
  if (!question_text) return null

  const gradable = getGradableSubquestions(o.subquestions ?? o.sub_questions)
  const question_media = parseQuestionMedia(o.question_media)

  return {
    id,
    title,
    topic: typeof o.topic === "string" ? o.topic : undefined,
    difficulty: typeof o.difficulty === "string" ? o.difficulty : undefined,
    question_text,
    subquestions: gradable,
    question_media,
  }
}

export function parseLectureSamplePractice(raw: unknown): LectureSamplePracticeConfig {
  if (!raw || typeof raw !== "object") {
    return { enabled: false, button_label: "Sample Practice", questions: [] }
  }
  const o = raw as Record<string, unknown>
  const questionsRaw = Array.isArray(o.questions) ? o.questions : []
  const questions = questionsRaw
    .map((q, idx) => normalizeSamplePracticeQuestion(q, idx))
    .filter((q): q is LectureSamplePracticeQuestion => q != null)

  return {
    enabled: o.enabled === true,
    button_label:
      typeof o.button_label === "string" && o.button_label.trim()
        ? o.button_label.trim()
        : "Sample Practice",
    questions,
  }
}
