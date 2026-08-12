import type { PlaygroundQuestion } from "./collaboration-api"

export function normalizePlaygroundQuestion(raw: Record<string, unknown>): PlaygroundQuestion {
  const rawOptions = raw.options ?? raw.option_list
  let options: string[] = []

  if (Array.isArray(rawOptions)) {
    options = rawOptions.map((entry) => String(entry ?? "").trim()).filter(Boolean)
  } else if (typeof rawOptions === "string" && rawOptions.trim()) {
    try {
      const parsed = JSON.parse(rawOptions) as unknown
      if (Array.isArray(parsed)) {
        options = parsed.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      }
    } catch {
      options = rawOptions
        .split("|")
        .map((entry) => entry.trim())
        .filter(Boolean)
    }
  }

  const bankRaw = raw.bankQuestionId ?? raw.bank_question_id

  return {
    id: Number(raw.id),
    bankQuestionId: bankRaw != null && Number.isFinite(Number(bankRaw)) ? Number(bankRaw) : undefined,
    questionText: String(raw.questionText ?? raw.question_text ?? "").trim(),
    questionType: String(raw.questionType ?? raw.question_type ?? "MCQ"),
    options,
    correctAnswer: raw.correctAnswer ?? raw.correct_answer,
    hint: raw.hint != null ? String(raw.hint) : undefined,
    difficulty: raw.difficulty != null ? String(raw.difficulty) : undefined,
    topic: raw.topic != null ? String(raw.topic) : undefined,
  }
}

export function normalizePlaygroundQuestions(list: unknown): PlaygroundQuestion[] {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => normalizePlaygroundQuestion(item as Record<string, unknown>))
    .filter((question) => Number.isFinite(question.id) && question.id > 0 && question.questionText.length > 0)
}

export function formatPlaygroundDifficulty(value?: string): string | null {
  if (!value?.trim()) return null
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function playgroundQuestionTypeLabel(type?: string): string {
  const normalized = (type ?? "MCQ").toUpperCase()
  if (normalized === "TRUE_FALSE") return "True / False"
  if (normalized === "MCQ") return "Multiple choice"
  return normalized.replace(/_/g, " ")
}

export function letterForOptionIndex(index: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  return alphabet[index] ?? String(index + 1)
}
