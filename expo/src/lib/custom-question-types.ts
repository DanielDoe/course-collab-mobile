import { BANK_QUESTION_TYPES } from "./faculty-question-bank-utils"

export type QuestionBankTypeCategory = "choice" | "coding" | "structured"

export type CustomQuestionTypeFieldKind =
  | "text"
  | "textarea"
  | "options"
  | "code"
  | "rubric"
  | "media"
  | "boolean"

export type CustomQuestionTypeField = {
  key: string
  label: string
  kind: CustomQuestionTypeFieldKind
  required?: boolean
  description?: string
}

export type CustomQuestionTypeSchema = {
  fields: CustomQuestionTypeField[]
}

export type CustomQuestionTypeDraft = {
  typeId: string
  label: string
  description: string
  category: QuestionBankTypeCategory
  requiresOptions: boolean
  usesCodeEditor: boolean
  usesGradingGuidelines: boolean
  schema: CustomQuestionTypeSchema
  aiQuestionPrompt: string
}

export type CustomQuestionTypeRecord = CustomQuestionTypeDraft & {
  id: number
  courseId: number
  createdAt: string
}

const CUSTOM_TYPE_ID_RE = /^custom_[a-z0-9_]+$/

export function isCustomQuestionTypeId(typeId: string): boolean {
  return CUSTOM_TYPE_ID_RE.test(typeId)
}

export type QuestionBankTypeMeta = {
  id: string
  label: string
  description: string
  category: QuestionBankTypeCategory
  requiresOptions: boolean
  usesCodeEditor: boolean
  usesGradingGuidelines: boolean
}

const CATEGORY_MAP: Record<string, QuestionBankTypeCategory> = {
  mcq: "choice",
  true_false: "choice",
  select_all: "choice",
  fill_blank: "choice",
  code_problem: "coding",
  code_write: "coding",
  code_write_plot: "coding",
  code_explain: "coding",
  debug_code: "coding",
  trace_output: "coding",
  multi_part: "structured",
  circuit_submission: "structured",
}

export function builtInTypeMeta(typeId: string): QuestionBankTypeMeta | undefined {
  const match = BANK_QUESTION_TYPES.find((t) => t.id === typeId.toLowerCase())
  if (!match) return undefined
  const category = CATEGORY_MAP[match.id] ?? "structured"
  const usesCodeEditor = category === "coding"
  return {
    id: match.id,
    label: match.label,
    description: match.label,
    category,
    requiresOptions: match.requiresOptions,
    usesCodeEditor,
    usesGradingGuidelines: !match.requiresOptions && match.id !== "multi_part",
  }
}

export function customTypeToMeta(row: CustomQuestionTypeDraft): QuestionBankTypeMeta {
  return {
    id: row.typeId,
    label: row.label,
    description: row.description,
    category: row.category,
    requiresOptions: row.requiresOptions,
    usesCodeEditor: row.usesCodeEditor,
    usesGradingGuidelines: row.usesGradingGuidelines,
  }
}

export function resolveQuestionBankTypeMeta(
  typeId: string,
  customTypes: CustomQuestionTypeDraft[] = [],
): QuestionBankTypeMeta | undefined {
  const builtIn = builtInTypeMeta(typeId)
  if (builtIn) return builtIn
  const custom = customTypes.find((t) => t.typeId === typeId)
  return custom ? customTypeToMeta(custom) : undefined
}

const ALLOWED_FIELD_KINDS = new Set<CustomQuestionTypeFieldKind>([
  "text",
  "textarea",
  "options",
  "code",
  "rubric",
  "media",
  "boolean",
])
const FIELD_KEY_RE = /^[a-z][a-z0-9_]{0,47}$/
const MAX_SCHEMA_FIELDS = 12
const MAX_FIELD_LABEL = 80
const MAX_FIELD_DESCRIPTION = 400
const MAX_AI_PROMPT = 2000

export function validateCustomQuestionTypeDraft(draft: CustomQuestionTypeDraft): string | null {
  if (!draft.label.trim()) return "Type name is required."
  if (!draft.description.trim()) return "Describe what this question type is for."
  if (!isCustomQuestionTypeId(draft.typeId)) {
    return "Type id must start with custom_ and use lowercase letters, numbers, or underscores."
  }
  if (!["choice", "coding", "structured"].includes(draft.category)) return "Invalid category."
  if (!Array.isArray(draft.schema.fields) || draft.schema.fields.length === 0) {
    return "Schema must include at least one field."
  }
  if (draft.schema.fields.length > MAX_SCHEMA_FIELDS) {
    return `Schema may include at most ${MAX_SCHEMA_FIELDS} fields.`
  }
  const seen = new Set<string>()
  for (const field of draft.schema.fields) {
    if (!field || typeof field !== "object") return "Invalid schema field."
    const key = String(field.key ?? "")
    if (!FIELD_KEY_RE.test(key)) {
      return "Each field needs a lowercase key (letters, numbers, underscores)."
    }
    if (seen.has(key)) return "Schema field keys must be unique."
    seen.add(key)
    if (!ALLOWED_FIELD_KINDS.has(field.kind)) return "Unknown schema field kind."
    if (!String(field.label ?? "").trim()) return "Each field needs a label."
    if (String(field.label).length > MAX_FIELD_LABEL) return "Field label is too long."
    if (field.description && String(field.description).length > MAX_FIELD_DESCRIPTION) {
      return "Field description is too long."
    }
  }
  if (draft.aiQuestionPrompt && draft.aiQuestionPrompt.length > MAX_AI_PROMPT) {
    return "AI prompt is too long."
  }
  return null
}

export const QUESTION_BANK_TYPE_CATEGORIES: Array<{ id: QuestionBankTypeCategory; label: string }> = [
  { id: "choice", label: "Choice & recall" },
  { id: "coding", label: "Coding" },
  { id: "structured", label: "Structured" },
]
