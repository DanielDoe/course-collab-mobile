import type { QuestionMedia } from "./classroom-submission"
import { parseQuestionConfig } from "./classroom-submission"
import type { InstructorQuizQuestion } from "./instructor-api"
import { isMultiSelectType } from "./practice-session"

export type PreviewQuestion = InstructorQuizQuestion & {
  hint?: string | null
  question_media?: QuestionMedia | string | null
  solution_upload_config?: unknown
  circuit_spec?: unknown
  subquestions?: unknown
  time_limit?: number | null
  ai_code_language?: string | null
}

export function normalizePreviewQuestion(raw: InstructorQuizQuestion): PreviewQuestion {
  const q = raw as PreviewQuestion
  let media = q.question_media
  if (typeof media === "string") {
    try {
      media = JSON.parse(media) as QuestionMedia
    } catch {
      media = null
    }
  }
  let uploadConfig = q.solution_upload_config
  if (typeof uploadConfig === "string") {
    try {
      uploadConfig = JSON.parse(uploadConfig)
    } catch {
      uploadConfig = null
    }
  }
  return { ...q, question_media: media ?? null, solution_upload_config: uploadConfig ?? null }
}

export function sortPreviewQuestions(questions: InstructorQuizQuestion[]): PreviewQuestion[] {
  return [...questions]
    .map(normalizePreviewQuestion)
    .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
}

export function getPreviewOptions(q: PreviewQuestion): { letter: string; text: string }[] {
  const entries: { letter: string; text: string }[] = []
  const map = [
    ["A", q.option_a],
    ["B", q.option_b],
    ["C", q.option_c],
    ["D", q.option_d],
    ["E", q.option_e ?? ""],
  ] as const
  for (const [letter, text] of map) {
    if (text?.trim()) entries.push({ letter, text: text.trim() })
  }
  return entries
}

export function hasPreviewMcqOptions(q: PreviewQuestion): boolean {
  return getPreviewOptions(q).length > 0
}

export function isFillBlankType(type: string): boolean {
  const t = type.toLowerCase()
  return t === "fill_blank" || t === "fill_in_blank" || t === "short_answer" || t === "fill_code"
}

export function isCodePreviewType(type: string): boolean {
  const t = type.toLowerCase()
  return (
    t === "code" ||
    t === "coding" ||
    [
      "code_write",
      "code_problem",
      "debug_code",
      "code_explain",
      "code_write_plot",
      "code_debug",
    ].includes(t)
  )
}

export function isCircuitSubmissionType(type: string): boolean {
  return type.toLowerCase() === "circuit_submission"
}

export function isMultiPartType(type: string): boolean {
  return type.toLowerCase() === "multi_part"
}

export function previewTypeLabel(type: string, hasOptions = false): string {
  const t = type.toLowerCase()
  if (isMultiSelectType(t)) return "Select all that apply"
  if (isFillBlankType(t)) return t === "fill_code" ? "Fill in code" : "Short answer"
  if (isCodePreviewType(t)) return "Code submission"
  if (isCircuitSubmissionType(t)) return "Circuit submission"
  if (isMultiPartType(t)) return "Multi-part"
  if (hasOptions) return "Single choice"
  return formatQuestionType(type)
}

export function previewInteractionHint(type: string): string {
  const t = type.toLowerCase()
  if (isCircuitSubmissionType(t)) return "Students upload diagrams, photos, or PDFs of their circuit work."
  if (isCodePreviewType(t)) return "Students write and submit code in the editor."
  if (isMultiPartType(t)) return "Students answer each part separately."
  if (isMultiSelectType(t)) return "Students can select more than one option."
  if (isFillBlankType(t)) return "Students type their answer in a text field."
  return "Students tap one option to answer."
}

function formatQuestionType(type?: string): string {
  if (!type) return "Question"
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getSolutionUploadMeta(q: PreviewQuestion) {
  const cfg =
    q.solution_upload_config ??
    parseQuestionConfig({ solution_upload_config: q.solution_upload_config })?.solution_upload_config
  if (!cfg || typeof cfg !== "object") return null
  const c = cfg as {
    title?: string
    submission_instructions?: string
    max_files?: number
    require_solution_upload?: boolean
  }
  return c
}

export function parseMultiPartItems(q: PreviewQuestion): Array<{ label: string; text: string }> {
  if (Array.isArray(q.subquestions)) {
    return q.subquestions.map((part, i) => {
      if (typeof part === "string") return { label: `Part ${i + 1}`, text: part }
      if (part && typeof part === "object") {
        const p = part as Record<string, unknown>
        const label = String(p.label ?? p.title ?? `Part ${i + 1}`)
        const text = String(p.question_text ?? p.text ?? p.prompt ?? "")
        return { label, text }
      }
      return { label: `Part ${i + 1}`, text: "" }
    })
  }
  return []
}
