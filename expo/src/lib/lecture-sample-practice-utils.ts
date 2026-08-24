import { normalizeQuestionMedia, repairLatexDamagedByJsonEscapes, type QuestionMedia } from "./classroom-submission"
import { rawLooksLikeWorkspaceQuestion } from "./lecture-workspace-utils"
import type {
  LectureSamplePracticeConfig,
  LectureSamplePracticeEvaluateResult,
  LectureSamplePracticeQuestion,
  LectureSamplePracticeStudentState,
} from "./lecture-types"
import {
  normalizeGradableSubquestionAnswers,
  normalizeStructuredOptions,
  subquestionOptionLabels,
} from "./lecture-sample-practice-grading"

export {
  formatMcqSubquestionCorrectAnswer,
  isMcqSubquestionCorrect,
  isMcqSubquestionOptionCorrect,
  normalizeStructuredOptions,
  resolveMcqCorrectLetter,
  subquestionOptionLabels,
} from "./lecture-sample-practice-grading"

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const

function normalizeGradableSubquestions(subs: MultiPartSubQuestion[]): MultiPartSubQuestion[] {
  return subs.map((sq) => normalizeGradableSubquestionAnswers(sq))
}

export type MultiPartSubOption = { id: string; text: string }

export type MultiPartSubQuestion = {
  id: string
  type: string
  points?: number
  prompt: string
  options: MultiPartSubOption[]
  correct_answer?: string
  correct_answers?: string[]
  explanation?: string
}

function repairOptionText(text: string): string {
  return repairLatexDamagedByJsonEscapes(text)
}

function legacyOptionsFromColumns(o: Record<string, unknown>): string[] | undefined {
  const cols = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const
  const texts = cols.map((key) => String(o[key] ?? "").trim()).filter(Boolean)
  return texts.length > 0 ? texts : undefined
}

function buildSubquestionsFromTopLevelMcq(o: Record<string, unknown>): unknown[] | undefined {
  const existing = o.subquestions ?? o.sub_questions
  if (Array.isArray(existing) && existing.length > 0) return undefined

  const qType = String(o.question_type ?? "mcq").toLowerCase()
  if (!["mcq", "true_false", "select_all"].includes(qType)) return undefined

  const legacy = legacyOptionsFromColumns(o)
  const options = legacy ?? o.options
  const hasOptions =
    options != null &&
    (typeof options === "string"
      ? options.trim().length > 0
      : Array.isArray(options)
        ? options.length > 0
        : typeof options === "object")

  if (!hasOptions) return undefined

  const prompt = String(o.question_text ?? o.prompt ?? "").trim()
  return [
    {
      id: "a",
      type: qType === "true_false" ? "mcq" : qType,
      points: typeof o.points === "number" ? o.points : Number(o.points) || 1,
      prompt: prompt || "Select the best answer.",
      options,
      correct_answer: typeof o.correct_answer === "string" ? o.correct_answer.trim() : undefined,
      correct_answers: Array.isArray(o.correct_answers)
        ? o.correct_answers.map((x) => String(x).trim()).filter(Boolean)
        : undefined,
      explanation: typeof o.explanation === "string" ? o.explanation : undefined,
    },
  ]
}

function extractSubquestionsRaw(o: Record<string, unknown>): unknown {
  const built = buildSubquestionsFromTopLevelMcq(o)
  if (built) return built
  return o.subquestions ?? o.sub_questions
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

    const options = normalizeStructuredOptions(o.options)
      .map((opt) => ({
        id: opt.id.trim().toUpperCase() || opt.id,
        text: repairOptionText(opt.text),
      }))
      .filter((opt) => opt.text.length > 0)

    parsed.push({
      id,
      type: String(o.type ?? "mcq").toLowerCase(),
      points: typeof o.points === "number" ? o.points : Number(o.points) || 1,
      prompt,
      options,
      correct_answer: typeof o.correct_answer === "string" ? o.correct_answer.trim() : undefined,
      correct_answers: Array.isArray(o.correct_answers)
        ? o.correct_answers.map((x) => String(x).trim()).filter(Boolean)
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

function normalizeComparableSampleText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export function isGenericSamplePracticePartPrompt(prompt: string, type?: string): boolean {
  const p = normalizeComparableSampleText(prompt)
  if (!p) return true
  const t = (type ?? "").toLowerCase()
  if (t === "select_all" && (p.startsWith("select all") || p === "select all that apply.")) {
    return true
  }
  if (t === "true_false" && (p.includes("true or false") || p.includes("above statement"))) {
    return true
  }
  return false
}

export function samplePracticePromptDiffersFromStem(question: {
  question_text: string
  subquestions: MultiPartSubQuestion[]
}): boolean {
  const gradable = getGradableSubquestions(question.subquestions)
  if (gradable.length !== 1) return gradable.length > 1
  const sq = gradable[0]
  const stem = question.question_text.trim()
  const prompt = sq.prompt.trim()
  if (!prompt) return false
  if (!stem) return true
  if (normalizeComparableSampleText(prompt) === normalizeComparableSampleText(stem)) return false
  if (isGenericSamplePracticePartPrompt(prompt, sq.type)) return false
  return true
}

export function syncSamplePracticeQuestionPrompts(
  question: LectureSamplePracticeQuestion,
): LectureSamplePracticeQuestion {
  if (samplePracticePromptDiffersFromStem(question)) return question
  const gradable = getGradableSubquestions(question.subquestions)
  if (gradable.length !== 1) return question
  const sq = gradable[0]
  const stem = question.question_text.trim()
  return {
    ...question,
    subquestions: question.subquestions.map((s) =>
      s.id === sq.id ? { ...s, prompt: stem } : s,
    ),
  }
}

export function subquestionOptionsToText(options: MultiPartSubQuestion["options"] | undefined): string {
  return subquestionOptionLabels({ options: options ?? [] })
    .map((opt) => opt.text)
    .join("\n")
}

export function subquestionOptionsFromText(text: string): MultiPartSubOption[] {
  return normalizeStructuredOptions(text)
}

function parseQuestionMedia(raw: unknown): QuestionMedia | undefined {
  return normalizeQuestionMedia(raw) ?? undefined
}

export function normalizeSamplePracticeQuestion(
  raw: unknown,
  fallbackIndex = 0,
): LectureSamplePracticeQuestion | null {
  if (!raw || typeof raw !== "object") return null
  if (rawLooksLikeWorkspaceQuestion(raw) && !rawLooksLikeSamplePracticeQuestion(raw)) return null
  const o = raw as Record<string, unknown>
  const id =
    typeof o.id === "string" && o.id.trim() ? o.id.trim() : `q${fallbackIndex + 1}`
  const title = String(o.title ?? o.question_text ?? `Question ${fallbackIndex + 1}`).trim()
  const stem = String(o.question_text ?? title).trim()
  const question_media = parseQuestionMedia(o.question_media)

  const flatOptions = normalizeStructuredOptions(o.options)
  if (flatOptions.length >= 2) {
    const questionType = String(o.question_type ?? "mcq").toLowerCase() as LectureSamplePracticeQuestion["question_type"]
    const normalized = normalizeGradableSubquestionAnswers({
      id: "a",
      type: questionType,
      prompt: stem,
      options: flatOptions,
      correct_answer: typeof o.correct_answer === "string" ? o.correct_answer : undefined,
      correct_answers: Array.isArray(o.correct_answers)
        ? o.correct_answers.map((x) => String(x).trim()).filter(Boolean)
        : undefined,
    })
    if (!stem) return null
    return {
      id,
      title,
      topic: typeof o.topic === "string" ? o.topic : undefined,
      difficulty: typeof o.difficulty === "string" ? o.difficulty : undefined,
      points: typeof o.points === "number" ? o.points : Number(o.points) || undefined,
      question_type:
        questionType === "select_all" || questionType === "true_false" ? questionType : "mcq",
      question_text: stem,
      options: normalized.options,
      correct_answer: normalized.correct_answer,
      correct_answers: normalized.correct_answers,
      explanation: typeof o.explanation === "string" ? o.explanation : undefined,
      question_media,
    }
  }

  const gradable = normalizeGradableSubquestions(getGradableSubquestions(extractSubquestionsRaw(o)))
  if (gradable.length === 0) return null
  const sq = gradable[0]
  const normalized = normalizeGradableSubquestionAnswers(sq)
  const questionType = String(o.question_type ?? sq.type ?? "mcq").toLowerCase() as LectureSamplePracticeQuestion["question_type"]
  const prompt = sq.prompt.trim()
  const stemNorm = stem.trim()
  let question_text = stemNorm
  if (prompt && normalizeComparableSampleText(prompt) !== normalizeComparableSampleText(stemNorm)) {
    if (!isGenericSamplePracticePartPrompt(prompt, sq.type)) {
      question_text = stemNorm ? `${stemNorm}\n\n${prompt}` : prompt
    }
  }
  if (!question_text) return null

  return {
    id,
    title,
    topic: typeof o.topic === "string" ? o.topic : undefined,
    difficulty: typeof o.difficulty === "string" ? o.difficulty : undefined,
    points: typeof o.points === "number" ? o.points : Number(o.points) || sq.points || 1,
    question_type:
      questionType === "select_all" || questionType === "true_false" ? questionType : "mcq",
    question_text,
    options: normalized.options,
    correct_answer: normalized.correct_answer,
    correct_answers: normalized.correct_answers,
    explanation: normalized.explanation ?? sq.explanation,
    question_media,
  }
}

export function parseLectureSamplePractice(raw: unknown): LectureSamplePracticeConfig {
  if (!raw || typeof raw !== "object") {
    return { enabled: false, button_label: "Sample Practice", questions: [] }
  }
  const o = raw as Record<string, unknown>
  const configParsed =
    o.config != null
      ? typeof o.config === "string"
        ? (() => {
            try {
              return JSON.parse(o.config) as unknown
            } catch {
              return null
            }
          })()
        : o.config
      : null
  const configRecord =
    configParsed && typeof configParsed === "object" ? (configParsed as Record<string, unknown>) : null
  const questionsRaw = Array.isArray(o.questions)
    ? o.questions
    : configRecord && Array.isArray(configRecord.questions)
      ? configRecord.questions
      : []
  const questions = questionsRaw
    .map((q, idx) => normalizeSamplePracticeQuestion(q, idx))
    .filter((q): q is LectureSamplePracticeQuestion => q != null)

  const enabledSource = o.enabled ?? configRecord?.enabled
  const labelSource = o.button_label ?? configRecord?.button_label

  return {
    enabled:
      enabledSource === false || enabledSource === 0
        ? false
        : questions.length > 0 || enabledSource === true,
    button_label:
      typeof labelSource === "string" && labelSource.trim()
        ? labelSource.trim()
        : "Sample Practice",
    questions,
  }
}

/** Parse student GET /sample-practice responses (config wrapper + bare questions). */
export function parseLectureSamplePracticeStudentApiResponse(
  raw: unknown,
): LectureSamplePracticeStudentState {
  if (raw == null || typeof raw !== "object") {
    return { enabled: false, button_label: "Sample Practice", questions: [], attempts: [] }
  }
  const record = raw as Record<string, unknown>
  const config = parseLectureSamplePractice(raw)
  const attemptsRaw = record.attempts
  const attempts = Array.isArray(attemptsRaw)
    ? attemptsRaw
        .map((row) => {
          if (!row || typeof row !== "object") return null
          const attempt = row as Record<string, unknown>
          const questionId = String(attempt.question_id ?? "").trim()
          if (!questionId) return null
          return {
            question_id: questionId,
            is_correct: Boolean(attempt.is_correct),
            score_percentage: Number(attempt.score_percentage ?? 0),
            student_answer: attempt.student_answer,
            completed_at:
              typeof attempt.completed_at === "string" ? attempt.completed_at : undefined,
            result:
              attempt.result && typeof attempt.result === "object"
                ? (attempt.result as LectureSamplePracticeEvaluateResult)
                : undefined,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row != null)
    : []
  return { ...config, attempts }
}

export function rawLooksLikeSamplePracticeQuestion(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false
  const o = raw as Record<string, unknown>
  const subQs = o.subquestions ?? o.sub_questions
  if (Array.isArray(subQs) && subQs.length > 0) return true
  if (o.category != null || o.step_by_step_solution != null || o.instructor_solution_workspace != null) {
    return false
  }
  const qType = String(o.question_type ?? "mcq").toLowerCase()
  if (["mcq", "true_false", "select_all"].includes(qType)) {
    if (o.options != null) return true
    if (legacyOptionsFromColumns(o)) return true
  }
  return false
}

export function filterSamplePracticeQuestionRaw(raw: unknown[]): unknown[] {
  return raw.filter(rawLooksLikeSamplePracticeQuestion)
}

export function samplePracticeQuestionsFromRecord(record: Record<string, unknown>): unknown[] {
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record.result && typeof record.result === "object"
        ? (record.result as Record<string, unknown>)
        : null

  const candidates = [
    record.questions,
    record.sample_practice_questions,
    nested?.questions,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      const filtered = filterSamplePracticeQuestionRaw(candidate)
      if (filtered.length > 0) return filtered
    }
  }
  return Array.isArray(record.questions) ? filterSamplePracticeQuestionRaw(record.questions) : []
}

export function samplePracticePayloadHasQuestions(body: unknown): boolean {
  if (!body || typeof body !== "object") return false
  return samplePracticeQuestionsFromRecord(body as Record<string, unknown>).length > 0
}
