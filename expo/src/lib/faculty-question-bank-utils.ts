import { normalizeHtmlLineBreaks, normalizeQuestionMedia, type QuestionMedia } from "./classroom-submission"
import type { InstructorBankQuestion, QuestionBankSavePayload } from "./instructor-api"

export type QuestionBankTab = "all" | "topics" | "types" | "deleted"

export type DeletedAssessmentFilter = "ALL" | "quiz" | "homework" | "mid_semester" | "final"

export type BankEditableOption = { option_text: string; is_correct: boolean; option_order: number }

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const

export const DIFFICULTY_OPTIONS = [
  { value: "ALL", label: "All difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
]

export const BANK_DIFFICULTY_OPTIONS = DIFFICULTY_OPTIONS.filter((o) => o.value !== "ALL")

export const BANK_QUESTION_TYPES = [
  { id: "mcq", label: "Multiple Choice", requiresOptions: true },
  { id: "true_false", label: "True / False", requiresOptions: true },
  { id: "select_all", label: "Select All That Apply", requiresOptions: true },
  { id: "fill_blank", label: "Fill in the Blank", requiresOptions: false },
  { id: "code_problem", label: "Code Problem", requiresOptions: false },
  { id: "code_write", label: "Code Write", requiresOptions: false },
  { id: "code_write_plot", label: "Code Write + Plot", requiresOptions: false },
  { id: "code_explain", label: "Code Explain", requiresOptions: false },
  { id: "debug_code", label: "Debug Code", requiresOptions: false },
  { id: "trace_output", label: "Trace Output", requiresOptions: false },
  { id: "multi_part", label: "Multi-Part", requiresOptions: false },
  { id: "circuit_submission", label: "Circuit Submission", requiresOptions: false },
] as const

export const EVALUATION_MODE_OPTIONS = [
  { value: "auto", label: "Auto-graded" },
  { value: "manual", label: "Manual grading" },
  { value: "ai", label: "AI-assisted" },
]

export function questionBankTypeLabel(type: string): string {
  if (type.startsWith("custom_")) {
    return type
      .replace(/^custom_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  const match = BANK_QUESTION_TYPES.find((t) => t.id === type.toLowerCase())
  if (match) return match.label
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function bankTypeRequiresOptions(type: string): boolean {
  return BANK_QUESTION_TYPES.find((t) => t.id === type.toLowerCase())?.requiresOptions ?? false
}

export function evaluationModeLabel(mode?: string | null): string {
  const key = (mode ?? "auto").toLowerCase()
  return EVALUATION_MODE_OPTIONS.find((o) => o.value === key)?.label ?? key.replace(/_/g, " ")
}

export function difficultyTone(difficulty: string): "success" | "warning" | "danger" | "neutral" {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "success"
    case "hard":
      return "danger"
    case "medium":
      return "warning"
    default:
      return "neutral"
  }
}

export function stripQuestionPreview(text: string): string {
  return normalizeHtmlLineBreaks(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseBankQuestionMedia(raw: unknown): QuestionMedia | null {
  return normalizeQuestionMedia(raw)
}

export function normalizeBankOptions(raw: unknown): string[] {
  if (raw == null || raw === "") return []
  let arr: unknown = raw
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw)
    } catch {
      return [raw.trim()].filter(Boolean)
    }
  }
  if (!Array.isArray(arr)) return []
  return arr
    .map((opt) => {
      if (typeof opt === "string") return opt.trim()
      if (opt && typeof opt === "object") {
        const o = opt as Record<string, unknown>
        return String(o.text ?? o.option_text ?? o.label ?? "").trim()
      }
      return String(opt).trim()
    })
    .filter((t) => t.length > 0)
}

function parseCorrectAnswerRaw(raw: unknown): string | string[] | null {
  if (raw == null || raw === "") return null
  if (Array.isArray(raw)) return raw.map((x) => String(x))
  if (typeof raw === "string") {
    const t = raw.trim()
    try {
      const p = JSON.parse(t)
      if (typeof p === "string") return p.trim()
      if (Array.isArray(p)) return p.map((x) => String(x))
    } catch {
      return t
    }
    return t
  }
  return String(raw)
}

export function isBankOptionCorrect(optionIndex: number, correctAnswer: unknown, options: string[]): boolean {
  const letter = OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1)
  const text = options[optionIndex] ?? ""
  const parsed = parseCorrectAnswerRaw(correctAnswer)
  if (parsed == null) return false
  if (Array.isArray(parsed)) {
    return parsed.some((ans) => {
      const a = ans.trim()
      const upper = a.toUpperCase()
      return upper === letter || a === text.trim()
    })
  }
  const upper = parsed.trim().toUpperCase()
  if (/^[A-F]$/.test(upper)) return upper === letter
  return parsed.trim() === text.trim()
}

export function bankQuestionOptionsToEditable(rawOptions: unknown, correctAnswer: unknown): BankEditableOption[] {
  const texts = normalizeBankOptions(rawOptions)
  return texts.map((option_text, index) => ({
    option_text,
    is_correct: isBankOptionCorrect(index, correctAnswer, texts),
    option_order: index + 1}))
}

export function formatBankCorrectAnswerDisplay(
  correctAnswer: unknown,
  options: string[],
  questionType: string,
): string {
  const parsed = parseCorrectAnswerRaw(correctAnswer)
  if (parsed == null) return "—"
  const type = questionType.toLowerCase()
  if (type === "select_all" && Array.isArray(parsed)) {
    if (parsed.length === 0) return "—"
    return parsed
      .map((item) => {
        const idx = options.findIndex((opt, i) => isBankOptionCorrect(i, item, options) || opt.trim() === item.trim())
        if (idx >= 0) return OPTION_LETTERS[idx] ?? String(idx + 1)
        if (/^[A-F]$/i.test(item.trim())) return item.trim().toUpperCase()
        return item.length > 48 ? `${item.slice(0, 48)}…` : item
      })
      .join(", ")
  }
  if (Array.isArray(parsed)) {
    return parsed.length ? parsed.join(", ") : "—"
  }
  const str = parsed.trim()
  if (!str) return "—"
  if (/^[A-F]$/i.test(str)) return str.toUpperCase()
  const idx = options.findIndex((opt, i) => isBankOptionCorrect(i, str, options))
  if (idx >= 0) return OPTION_LETTERS[idx] ?? String(idx + 1)
  return str.length > 80 ? `${str.slice(0, 80)}…` : str
}

export function parseBankGuidelines(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter((v) => v.trim())
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed.map(String).filter((v) => v.trim())
    } catch {
      return raw.trim() ? [raw.trim()] : []
    }
  }
  return []
}

export type BankSubquestionPart = { label: string; text: string; points?: number | null }

export function parseBankSubquestions(raw: unknown): BankSubquestionPart[] {
  if (!Array.isArray(raw)) return []
  return raw.map((part, index) => {
    if (typeof part === "string") return { label: `Part ${index + 1}`, text: part }
    if (part && typeof part === "object") {
      const p = part as Record<string, unknown>
      return {
        label: String(p.label ?? p.title ?? `Part ${index + 1}`),
        text: String(p.question_text ?? p.text ?? p.prompt ?? ""),
        points: typeof p.points === "number" ? p.points : null}
    }
    return { label: `Part ${index + 1}`, text: "" }
  })
}

export function parseBankSolutionConfig(raw: unknown): {
  submission_instructions?: string
  max_files?: number
  title?: string
} | null {
  if (raw == null || raw === "") return null
  try {
    const value = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw
    if (!value || typeof value !== "object") return null
    const cfg = value as Record<string, unknown>
    return {
      title: typeof cfg.title === "string" ? cfg.title : undefined,
      submission_instructions:
        typeof cfg.submission_instructions === "string" ? cfg.submission_instructions : undefined,
      max_files: typeof cfg.max_files === "number" ? cfg.max_files : undefined}
  } catch {
    return null
  }
}

export function formatBankDate(iso?: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function buildBankQuestionSavePayload(input: {
  question_text: string
  question_type: string
  difficulty: string
  topic: string
  hint: string
  explanation: string
  sample_answer: string
  expected_answer: string
  evaluation_mode: string
  guidelines: string[]
  options: BankEditableOption[]
  question_media?: QuestionMedia | null
  subquestions?: unknown
  solution_upload_config?: unknown
}): QuestionBankSavePayload {
  const type = input.question_type.toLowerCase()
  const requiresOptions = bankTypeRequiresOptions(type)
  const filledOptions = input.options.filter((opt) => opt.option_text.trim())
  const formattedOptions = filledOptions.map((opt, index) => ({
    id: OPTION_LETTERS[index] ?? String(index + 1),
    text: opt.option_text.trim(),
  }))
  const correctIndex = filledOptions.findIndex((opt) => opt.is_correct)
  const correctAnswer = requiresOptions
    ? type === "select_all"
      ? formattedOptions.filter((_, index) => filledOptions[index]?.is_correct).map((opt) => opt.text)
      : correctIndex >= 0
        ? (OPTION_LETTERS[correctIndex] ?? "A")
        : "A"
    : null

  const payload: QuestionBankSavePayload = {
    question_text: input.question_text.trim(),
    question_type: type,
    difficulty: input.difficulty || "medium",
    topic: input.topic.trim() || null,
    hint: input.hint.trim() || null,
    explanation: input.explanation.trim() || null,
    sample_answer: input.sample_answer.trim() || null,
    expected_answer: input.expected_answer.trim() || null,
    evaluation_mode: input.evaluation_mode || (type === "circuit_submission" ? "manual" : "auto"),
    answer_guidelines: input.guidelines.filter((g) => g.trim()),
    question_media: input.question_media ?? null,
    subquestions: input.subquestions ?? null,
    solution_upload_config: input.solution_upload_config ?? null,
    options: requiresOptions ? formattedOptions : [],
    correct_answer: correctAnswer}

  if (type === "multi_part") {
    payload.options = []
    payload.correct_answer = null
  }

  if (type === "circuit_submission") {
    payload.options = []
    payload.correct_answer = null
    payload.evaluation_mode = "manual"
    if (!payload.solution_upload_config) {
      payload.solution_upload_config = {
        require_solution_upload: true,
        submission_instructions:
          "Upload clear photos or PDFs of your circuit diagram, calculations, and final answers.",
        max_files: 10}
    }
  }

  return payload
}

export function duplicateBankQuestionPayload(question: InstructorBankQuestion): QuestionBankSavePayload {
  const options = bankQuestionOptionsToEditable(question.options, question.correct_answer)
  return buildBankQuestionSavePayload({
    question_text: question.question_text,
    question_type: question.question_type,
    difficulty: question.difficulty ?? "medium",
    topic: question.topic ?? "",
    hint: question.hint ?? "",
    explanation: question.explanation ?? "",
    sample_answer: question.sample_answer ?? "",
    expected_answer: question.expected_answer ?? "",
    evaluation_mode: question.evaluation_mode ?? "auto",
    guidelines: parseBankGuidelines(question.answer_guidelines),
    options,
    question_media: parseBankQuestionMedia(question.question_media),
    subquestions: question.subquestions,
    solution_upload_config: question.solution_upload_config})
}

export function filterBankQuestions(
  questions: InstructorBankQuestion[],
  search: string,
  typeFilter: string,
  difficultyFilter: string,
  topicFilter: string | null,
): InstructorBankQuestion[] {
  const q = search.trim().toLowerCase()
  return questions.filter((item) => {
    if (typeFilter !== "ALL" && item.question_type !== typeFilter) return false
    if (difficultyFilter !== "ALL" && item.difficulty?.toLowerCase() !== difficultyFilter) return false
    if (topicFilter && item.topic !== topicFilter) return false
    if (!q) return true
    const hay = [item.question_text, item.topic, item.question_type].filter(Boolean).join(" ").toLowerCase()
    return hay.includes(q)
  })
}

export function groupQuestionsByType(questions: InstructorBankQuestion[]) {
  const map = new Map<string, number>()
  for (const q of questions) {
    const key = q.question_type || "other"
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([type, count]) => ({ type, count, label: questionBankTypeLabel(type) }))
    .sort((a, b) => b.count - a.count)
}

export function deletedAssessmentTypeLabel(type?: string): string {
  switch (type) {
    case "homework":
      return "Homework"
    case "mid_semester":
      return "Mid-Semester"
    case "final":
      return "Final"
    case "quiz":
    default:
      return "Quiz"
  }
}

export function gracePeriodRemaining(deletedAt: string): { hours: number; minutes: number; expired: boolean } {
  const deletedTime = new Date(deletedAt).getTime()
  const expiresAt = deletedTime + 24 * 60 * 60 * 1000
  const remainingMs = expiresAt - Date.now()
  if (remainingMs <= 0) return { hours: 0, minutes: 0, expired: true }
  const hours = Math.floor(remainingMs / (1000 * 60 * 60))
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
  return { hours, minutes, expired: false }
}

export function parseBankOptions(raw: unknown): string[] {
  return normalizeBankOptions(raw)
}
