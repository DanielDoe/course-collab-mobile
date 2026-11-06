import { normalizeQuestionMedia, repairLatexDamagedByJsonEscapes, type QuestionMedia } from "./classroom-submission"
import { parseCircuitWorkspace, workspaceHasContent, type CircuitWorkspace } from "./circuit-workspace"
import type { LectureWorkspaceCategory, LectureWorkspaceConfig, LectureWorkspaceQuestion } from "./lecture-types"

const DEFAULT_BUTTON_LABEL = "Workspace"
const DEFAULT_TITLE = "In-Class Workspace"

function parseJsonField(raw: unknown): unknown {
  if (typeof raw !== "string" || !raw.trim()) return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function rawLooksLikeSamplePracticeQuestion(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false
  const o = raw as Record<string, unknown>
  const subQs = o.subquestions ?? o.sub_questions
  return Array.isArray(subQs) && subQs.length > 0
}

function workspaceRecordLayers(record: Record<string, unknown>): Record<string, unknown>[] {
  const layers: Record<string, unknown>[] = [record]
  for (const key of ["config", "workspace", "workspace_config", "lecture_workspace", "data", "result"] as const) {
    const parsed = parseJsonField(record[key])
    if (parsed && typeof parsed === "object") {
      layers.push(parsed as Record<string, unknown>)
    }
  }
  return layers
}

function questionArrayCandidates(record: Record<string, unknown>): unknown[] {
  const keys = ["questions", "problems", "items", "workspace_questions", "lecture_workspace_questions"] as const
  const out: unknown[] = []
  for (const layer of workspaceRecordLayers(record)) {
    for (const key of keys) {
      out.push(...coerceWorkspaceQuestionsArray(layer[key]))
    }
  }
  return out
}

function dedupeWorkspaceQuestionRaw(raw: unknown[]): unknown[] {
  const seen = new Set<string>()
  const out: unknown[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    if (rawLooksLikeSamplePracticeQuestion(item)) continue
    const record = item as Record<string, unknown>
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : typeof record.id === "number" && Number.isFinite(record.id)
          ? String(record.id)
          : ""
    const key = id || `idx-${out.length}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function coerceWorkspaceQuestionsArray(raw: unknown): unknown[] {
  const parsed = parseJsonField(raw)
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>
    const values = Object.values(record).filter((item) => item && typeof item === "object")
    if (values.length > 0) return values
  }
  return []
}

export function rawLooksLikeWorkspaceQuestion(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false
  if (rawLooksLikeSamplePracticeQuestion(raw)) return false
  const o = raw as Record<string, unknown>
  const hasText = Boolean(
    String(o.question_text ?? o.problem_text ?? o.prompt ?? o.title ?? o.name ?? "").trim(),
  )
  return (
    o.category != null ||
    o.step_by_step_solution != null ||
    o.instructor_solution_workspace != null ||
    o.instructor_solution != null ||
    o.published_solution != null ||
    o.reference_solution != null ||
    hasText
  )
}

export function filterWorkspaceQuestionRaw(raw: unknown[]): unknown[] {
  return raw.filter(rawLooksLikeWorkspaceQuestion)
}

/** Mirror faculty viewer: unwrap `{ config }` / `{ workspace: { config } }` envelopes. */
export function unwrapLectureWorkspacePayload(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object") return raw
  const record = raw as Record<string, unknown>
  const config = parseJsonField(record.config)
  if (config && typeof config === "object") return config

  const workspace = parseJsonField(record.workspace ?? record.lecture_workspace)
  if (workspace && typeof workspace === "object") {
    const ws = workspace as Record<string, unknown>
    const nested = parseJsonField(ws.config)
    if (nested && typeof nested === "object") return nested
    return workspace
  }

  return raw
}

export function workspaceQuestionsFromRecord(record: Record<string, unknown>): unknown[] {
  return dedupeWorkspaceQuestionRaw(questionArrayCandidates(record))
}

export function workspacePayloadHasQuestions(body: unknown): boolean {
  return parseLectureWorkspaceStudentApiResponse(body).questions.length > 0
}

export function groupWorkspaceQuestions(
  questions: LectureWorkspaceQuestion[],
): Array<{ label: string; questions: LectureWorkspaceQuestion[] }> {
  const hasTopics = questions.some((question) => question.topic?.trim())
  if (!hasTopics) {
    return [{ label: "", questions }]
  }

  const groups = new Map<string, LectureWorkspaceQuestion[]>()
  const order: string[] = []
  for (const question of questions) {
    const label = question.topic?.trim() || categoryLabel(question.category)
    if (!groups.has(label)) {
      groups.set(label, [])
      order.push(label)
    }
    groups.get(label)?.push(question)
  }

  return order.map((label) => ({ label, questions: groups.get(label) ?? [] }))
}

export function categoryLabel(category: LectureWorkspaceCategory): string {
  switch (category) {
    case "nodal":
      return "Nodal analysis"
    case "mesh":
      return "Mesh analysis"
    case "thevenin_norton":
      return "Thevenin / Norton"
    default:
      return category
  }
}

function parseQuestionMedia(raw: unknown): QuestionMedia | undefined {
  return normalizeQuestionMedia(raw) ?? undefined
}

function parseInstructorSolutionWorkspace(raw: Record<string, unknown>): CircuitWorkspace | null {
  const candidates: unknown[] = [
    raw.instructor_solution_workspace,
    raw.instructor_solution,
    raw.published_solution,
    raw.reference_solution,
    raw.demo_solution,
    raw.instructor_answer,
    raw.model_answer,
    raw.worked_solution,
  ]

  for (const candidate of candidates) {
    if (candidate == null) continue
    if (typeof candidate === "object" && candidate !== null && "workspace" in candidate) {
      const nested = parseCircuitWorkspace((candidate as Record<string, unknown>).workspace)
      if (nested && workspaceHasContent(nested)) return nested
    }
    const parsed = parseCircuitWorkspace(candidate)
    if (parsed && workspaceHasContent(parsed)) return parsed
  }

  return null
}

function normalizeSolution(raw: unknown): LectureWorkspaceQuestion["step_by_step_solution"] {
  if (!raw || typeof raw !== "object") {
    return { format: "markdown_latex", content: [] }
  }
  const o = raw as Record<string, unknown>
  const lines = Array.isArray(o.content)
    ? o.content.map((line) => String(line).trim()).filter(Boolean)
    : []
  const content = lines.map((line) => repairLatexDamagedByJsonEscapes(line)).filter(Boolean)
  return { format: "markdown_latex", content }
}

function normalizeWorkspaceCategory(raw: unknown): LectureWorkspaceCategory | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  if (value === "nodal" || value === "nodal_analysis") return "nodal"
  if (value === "mesh" || value === "mesh_analysis") return "mesh"
  if (
    value === "thevenin_norton" ||
    value === "thevenin" ||
    value === "norton" ||
    value === "thevenin__norton"
  ) {
    return "thevenin_norton"
  }
  return null
}

export function normalizeLectureWorkspaceQuestion(
  raw: unknown,
  fallbackIndex = 0,
): LectureWorkspaceQuestion | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim()
      : typeof o.id === "number" && Number.isFinite(o.id)
        ? String(o.id)
        : `q${fallbackIndex + 1}`
  const category = normalizeWorkspaceCategory(o.category) ?? "nodal"
  const title = String(
    o.title ?? o.name ?? o.label ?? o.question_text ?? o.problem_text ?? `Question ${fallbackIndex + 1}`,
  ).trim()
  const question_text = repairLatexDamagedByJsonEscapes(
    String(
      o.question_text ??
        o.problem_text ??
        o.prompt ??
        o.body ??
        o.text ??
        o.description ??
        title,
    ).trim(),
  )
  if (!question_text && !title) return null

  return {
    id,
    category,
    title: title || `Question ${fallbackIndex + 1}`,
    topic: typeof o.topic === "string" ? o.topic.trim() : undefined,
    question_text: question_text || title,
    question_media: parseQuestionMedia(o.question_media ?? o),
    step_by_step_solution: normalizeSolution(o.step_by_step_solution ?? o.solution),
    instructor_solution_workspace: parseInstructorSolutionWorkspace(o),
    solution_unlocked: o.solution_unlocked === true,
    solution_available: o.solution_available === true,
  }
}

export function parseLectureWorkspaceStudentApiResponse(raw: unknown): LectureWorkspaceConfig {
  if (raw == null || typeof raw !== "object") {
    return { enabled: true, title: DEFAULT_TITLE, button_label: DEFAULT_BUTTON_LABEL, questions: [] }
  }
  const unwrapped = unwrapLectureWorkspacePayload(raw)
  if (unwrapped == null || typeof unwrapped !== "object") {
    return { enabled: true, title: DEFAULT_TITLE, button_label: DEFAULT_BUTTON_LABEL, questions: [] }
  }
  const record = unwrapped as Record<string, unknown>
  const configRaw = record.config != null ? parseJsonField(record.config) : null
  const configRecord =
    configRaw && typeof configRaw === "object" ? (configRaw as Record<string, unknown>) : null

  const rawQuestions = dedupeWorkspaceQuestionRaw(questionArrayCandidates(record))

  const questions = rawQuestions
    .map((q, idx) => normalizeLectureWorkspaceQuestionLenient(q, idx))
    .filter((q): q is LectureWorkspaceQuestion => q != null)

  const titleSource = record.title ?? configRecord?.title
  const labelSource = record.button_label ?? configRecord?.button_label
  const enabledSource = record.enabled ?? configRecord?.enabled

  const drafts: Record<string, string> = {}
  const rawDrafts = Array.isArray(record.drafts) ? record.drafts : []
  for (const row of rawDrafts) {
    if (!row || typeof row !== "object") continue
    const draft = row as { question_id?: unknown; student_answer?: unknown }
    const questionId = String(draft.question_id ?? "").trim()
    if (!questionId) continue
    drafts[questionId] =
      typeof draft.student_answer === "string"
        ? draft.student_answer
        : JSON.stringify(draft.student_answer ?? {})
  }

  return {
    enabled: enabledSource !== false,
    title:
      typeof titleSource === "string" && titleSource.trim() ? titleSource.trim() : DEFAULT_TITLE,
    button_label:
      typeof labelSource === "string" && labelSource.trim()
        ? labelSource.trim()
        : DEFAULT_BUTTON_LABEL,
    questions,
    drafts,
  }
}

function normalizeLectureWorkspaceQuestionLenient(
  raw: unknown,
  fallbackIndex = 0,
): LectureWorkspaceQuestion | null {
  const normalized = normalizeLectureWorkspaceQuestion(raw, fallbackIndex)
  if (normalized) return normalized
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const title = String(o.title ?? o.question_text ?? o.problem_text ?? `Question ${fallbackIndex + 1}`).trim()
  const questionText = String(
    o.question_text ?? o.problem_text ?? o.prompt ?? o.body ?? o.text ?? title,
  ).trim()
  if (!title && !questionText) return null
  return {
    id:
      typeof o.id === "string" && o.id.trim()
        ? o.id.trim()
        : typeof o.id === "number" && Number.isFinite(o.id)
          ? String(o.id)
          : `q${fallbackIndex + 1}`,
    category: normalizeWorkspaceCategory(o.category) ?? "nodal",
    title: title || `Question ${fallbackIndex + 1}`,
    topic: typeof o.topic === "string" ? o.topic.trim() : undefined,
    question_text: repairLatexDamagedByJsonEscapes(questionText || title),
    question_media: parseQuestionMedia(o.question_media),
    step_by_step_solution: normalizeSolution(o.step_by_step_solution ?? o.solution),
    instructor_solution_workspace: parseInstructorSolutionWorkspace(o),
    solution_unlocked: o.solution_unlocked === true,
    solution_available: o.solution_available === true,
  }
}

export function parseLectureWorkspace(raw: unknown): LectureWorkspaceConfig {
  if (raw == null || raw === "") {
    return { enabled: true, title: DEFAULT_TITLE, button_label: DEFAULT_BUTTON_LABEL, questions: [] }
  }
  if (typeof raw === "object" && Object.keys(raw as object).length === 0) {
    return { enabled: true, title: DEFAULT_TITLE, button_label: DEFAULT_BUTTON_LABEL, questions: [] }
  }
  const o = raw as Record<string, unknown>
  const configRaw = o.config != null ? parseJsonField(o.config) : null
  const configRecord =
    configRaw && typeof configRaw === "object" ? (configRaw as Record<string, unknown>) : null
  const questionsRaw = dedupeWorkspaceQuestionRaw(questionArrayCandidates(o))
  const questions = questionsRaw
    .map((q, idx) => normalizeLectureWorkspaceQuestion(q, idx))
    .filter((q): q is LectureWorkspaceQuestion => q != null)

  const titleSource = o.title ?? configRecord?.title
  const labelSource = o.button_label ?? configRecord?.button_label
  const enabledSource = o.enabled ?? configRecord?.enabled

  return {
    enabled: enabledSource !== false,
    title:
      typeof titleSource === "string" && titleSource.trim() ? titleSource.trim() : DEFAULT_TITLE,
    button_label:
      typeof labelSource === "string" && labelSource.trim()
        ? labelSource.trim()
        : DEFAULT_BUTTON_LABEL,
    questions,
  }
}

export function workspaceQuestionHasAuthoredSolution(question: LectureWorkspaceQuestion): boolean {
  return question.step_by_step_solution.content.some((line) => line.trim().length > 0)
}

export function isWorkspaceSolutionUnlocked(question: LectureWorkspaceQuestion): boolean {
  return question.solution_unlocked === true
}

export function solutionMarkdownFromQuestion(question: LectureWorkspaceQuestion): string {
  if (!isWorkspaceSolutionUnlocked(question) && question.solution_available) return ""
  return question.step_by_step_solution.content.join("\n\n")
}

export function solutionLinesToText(content: string[]): string {
  return content.join("\n")
}

export function textToSolutionLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
