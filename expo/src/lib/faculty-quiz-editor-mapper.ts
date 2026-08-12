import type { QuestionMedia } from "./classroom-submission"
import type { PreviewQuestion } from "./faculty-assessment-preview"
import { parseSectionConfig, type SectionConfig } from "./faculty-assessment-sections"
import type { InstructorQuizDetail, InstructorQuizQuestion } from "./instructor-api"
import { defaultTimeLimit } from "./faculty-quiz-editor-config"

export type QuizQuestionDraft = {
  id?: number
  question_text: string
  question_type: string
  question_order?: number
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e: string
  correct_answer: string
  max_points: number | null
  points: number
  time_limit: number | null
  hint: string
  hint_penalty: number
  anti_cheat_exempt: boolean
  ai_code_language: string | null
  question_media: QuestionMedia | null
  circuit_spec: Record<string, unknown> | null
  subquestions: unknown
  solution_upload_config: unknown
  bank_question_id: number | null
}

export type QuizEditorDraft = {
  title: string
  description: string
  coverage: string
  time_per_question: number
  available_from: string
  available_until: string
  retake_enabled: boolean
  retake_limit: number
  retake_policy: string
  review_before_retake: boolean
  forfeit_retake_on_report_view: boolean
  lock_student_results_review: boolean
  strict_mode_enabled: boolean
  block_copy_paste: boolean
  track_tab_switches: boolean
  track_mouse_movement: boolean
  warn_on_tab_switch: boolean
  max_tab_switches: number
  auto_submit_on_violations: boolean
  track_gemini_window: boolean
  max_gemini_strikes: number
  keystroke_playback_enforced: boolean
  require_fullscreen: boolean
  geo_required: boolean
  geo_lat: string
  geo_lng: string
  geo_radius_meters: number
  rollover_enabled: boolean
  rollover_hours: number
  ai_evaluation_mode: string
  ai_model: string
  ai_enable_opus_fallback: boolean
  ai_opus_confidence_threshold: number
  allowed_ai_code_languages: string[]
  enable_superpowers: boolean
  allowed_superpowers: string[]
  restrict_access_to_students: boolean
  allowed_student_ids: number[]
  access_restriction_session_id: number | null
  max_concurrent_students: number | null
  section_config: SectionConfig[] | null
  counts_toward_course_grade: boolean
  questions: QuizQuestionDraft[]
  total_attempts?: number
}

export function createBlankQuestion(order: number, assessmentType: string): QuizQuestionDraft {
  const type = "mcq"
  return {
    question_text: "",
    question_type: type,
    question_order: order,
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    option_e: "",
    correct_answer: "A",
    max_points: assessmentType === "final" ? 1 : null,
    points: 1,
    time_limit: defaultTimeLimit(type),
    hint: "",
    hint_penalty: 0,
    anti_cheat_exempt: false,
    ai_code_language: null,
    question_media: null,
    circuit_spec: null,
    subquestions: null,
    solution_upload_config: null,
    bank_question_id: null}
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

function parseBool(value: unknown, fallback = false): boolean {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    return s === "true" || s === "t" || s === "1"
  }
  return fallback
}

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function normalizeQuestion(raw: InstructorQuizQuestion, index: number): QuizQuestionDraft {
  const type = (raw.question_type ?? "mcq").toLowerCase()
  const media = parseJsonField<QuestionMedia | null>(raw.question_media, null)
  const circuit = parseJsonField<Record<string, unknown> | null>(raw.circuit_spec, null)
  const ext = raw as InstructorQuizQuestion & {
    correct_answer?: string
    anti_cheat_exempt?: boolean
    hint_penalty?: number
    bank_question_id?: number | null
  }

  return {
    id: raw.id,
    question_text: raw.question_text ?? "",
    question_type: type,
    question_order: raw.question_order ?? index + 1,
    option_a: raw.option_a ?? "",
    option_b: raw.option_b ?? "",
    option_c: raw.option_c ?? "",
    option_d: raw.option_d ?? "",
    option_e: raw.option_e ?? "",
    correct_answer: ext.correct_answer ?? "",
    max_points: raw.max_points ?? raw.points ?? null,
    points: raw.points ?? raw.max_points ?? 1,
    time_limit: raw.time_limit ?? defaultTimeLimit(type),
    hint: raw.hint ?? "",
    hint_penalty: ext.hint_penalty ?? 0,
    anti_cheat_exempt: parseBool(ext.anti_cheat_exempt),
    ai_code_language: raw.ai_code_language ?? null,
    question_media: media,
    circuit_spec: circuit,
    subquestions: raw.subquestions ?? null,
    solution_upload_config: raw.solution_upload_config ?? null,
    bank_question_id: ext.bank_question_id ?? null}
}

export function quizDetailToEditorDraft(quiz: InstructorQuizDetail): QuizEditorDraft {
  const rawLangs = Array.isArray(quiz.allowed_ai_code_languages)
    ? quiz.allowed_ai_code_languages.filter((l) => typeof l === "string" && l !== "none")
    : []
  const legacyCodeLang = (quiz as { code_language?: string | null }).code_language
  const langs =
    rawLangs.length > 0
      ? rawLangs
      : legacyCodeLang && legacyCodeLang !== "none" && legacyCodeLang.trim()
        ? [legacyCodeLang.trim()]
        : []

  return {
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    coverage: quiz.coverage ?? "",
    time_per_question: quiz.time_per_question ?? 60,
    available_from: toLocalDatetime(quiz.available_from),
    available_until: toLocalDatetime(quiz.available_until),
    retake_enabled: parseBool(quiz.retake_enabled),
    retake_limit: quiz.retake_limit ?? 0,
    retake_policy: quiz.retake_policy ?? "best",
    review_before_retake: parseBool(quiz.review_before_retake),
    forfeit_retake_on_report_view: parseBool(quiz.forfeit_retake_on_report_view, true),
    lock_student_results_review: parseBool(quiz.lock_student_results_review),
    strict_mode_enabled: parseBool(quiz.strict_mode_enabled),
    block_copy_paste: parseBool(quiz.block_copy_paste),
    track_tab_switches: parseBool(quiz.track_tab_switches),
    track_mouse_movement: parseBool(quiz.track_mouse_movement),
    warn_on_tab_switch: parseBool(quiz.warn_on_tab_switch),
    max_tab_switches: quiz.max_tab_switches ?? 3,
    auto_submit_on_violations: parseBool(quiz.auto_submit_on_violations),
    track_gemini_window: parseBool(quiz.track_gemini_window),
    max_gemini_strikes: quiz.max_gemini_strikes ?? 3,
    keystroke_playback_enforced: parseBool(quiz.keystroke_playback_enforced, true),
    require_fullscreen: parseBool(quiz.require_fullscreen),
    geo_required: parseBool(quiz.geo_required),
    geo_lat: quiz.geo_lat != null ? String(quiz.geo_lat) : "",
    geo_lng: quiz.geo_lng != null ? String(quiz.geo_lng) : "",
    geo_radius_meters: quiz.geo_radius_meters ?? 100,
    rollover_enabled: parseBool(quiz.rollover_enabled),
    rollover_hours: quiz.rollover_hours ?? 24,
    ai_evaluation_mode: quiz.ai_evaluation_mode ?? "standard",
    ai_model: quiz.ai_model ?? "auto",
    ai_enable_opus_fallback: parseBool(quiz.ai_enable_opus_fallback),
    ai_opus_confidence_threshold: quiz.ai_opus_confidence_threshold ?? 0.8,
    allowed_ai_code_languages: langs,
    enable_superpowers: parseBool(quiz.enable_superpowers),
    allowed_superpowers: Array.isArray(quiz.allowed_superpowers)
      ? quiz.allowed_superpowers.filter((s) => typeof s === "string")
      : [],
    restrict_access_to_students: parseBool(quiz.restrict_access_to_students),
    allowed_student_ids: parseAllowedStudentIds(quiz.allowed_student_ids),
    access_restriction_session_id: quiz.access_restriction_session_id ?? null,
    max_concurrent_students:
      quiz.max_concurrent_students != null ? Number(quiz.max_concurrent_students) : null,
    section_config: parseSectionConfig(quiz.section_config),
    counts_toward_course_grade: quiz.counts_toward_course_grade !== false,
    questions: (quiz.questions ?? []).map(normalizeQuestion),
    total_attempts: quiz.total_attempts}
}

function parseAllowedStudentIds(raw: unknown): number[] {
  if (raw == null) return []
  if (typeof raw === "string") {
    try {
      return parseAllowedStudentIds(JSON.parse(raw))
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n))
}

function convertToUtc(dateTimeLocal: string): string | null {
  if (!dateTimeLocal.trim()) return null
  const d = new Date(dateTimeLocal)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function normalizeCorrectAnswerForSave(q: QuizQuestionDraft): string {
  const type = q.question_type.toLowerCase()
  if (type === "circuit_submission" || type === "circuit_multi_part" || type === "multi_part") {
    return ""
  }
  if (type === "true_false") {
    const v = q.correct_answer.trim().toUpperCase()
    if (v === "A" || v === "TRUE" || v === "T") return "A"
    if (v === "B" || v === "FALSE" || v === "F") return "B"
    return q.correct_answer.trim()
  }
  if (type === "select_all" || type === "multi_output") {
    return q.correct_answer.trim()
  }
  if (["mcq", "multiple_choice"].includes(type)) {
    const letter = q.correct_answer.trim().toUpperCase()
    if (/^[A-E]$/.test(letter)) return letter
    return q.correct_answer.trim()
  }
  return q.correct_answer.trim()
}

export function editorDraftToUpdatePayload(
  draft: QuizEditorDraft,
  assessmentType: string,
  options?: { sendNotifications?: boolean },
) {
  const isFinal = assessmentType === "final"
  const isSingleSitting = assessmentType === "mid_semester" || assessmentType === "final"

  const questions = draft.questions.map((q, index) => ({
    ...q,
    question_order: index + 1,
    correct_answer: normalizeCorrectAnswerForSave(q),
    anti_cheat_exempt: q.anti_cheat_exempt,
    max_points: q.max_points ?? q.points ?? 1,
    points: q.points ?? q.max_points ?? 1,
    option_e: q.option_e?.trim() ? q.option_e : null,
    hint: q.hint?.trim() || null,
    hint_penalty: q.hint_penalty ?? 0,
    ai_code_language: q.ai_code_language || null,
    question_media: q.question_media,
    circuit_spec: q.circuit_spec,
    subquestions: q.subquestions,
    solution_upload_config: q.solution_upload_config,
    bank_question_id: q.bank_question_id}))

  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    coverage: draft.coverage.trim() || null,
    time_per_question: draft.time_per_question,
    available_from: convertToUtc(draft.available_from),
    available_until: convertToUtc(draft.available_until),
    questions,
    sendNotifications: options?.sendNotifications ?? false,
    retake_enabled: isSingleSitting ? false : draft.retake_enabled,
    retake_limit: isSingleSitting ? 0 : draft.retake_limit,
    retake_policy: draft.retake_policy,
    review_before_retake: draft.review_before_retake,
    forfeit_retake_on_report_view: draft.forfeit_retake_on_report_view,
    lock_student_results_review: draft.lock_student_results_review,
    strict_mode_enabled: isFinal ? true : draft.strict_mode_enabled,
    block_copy_paste: isFinal ? true : draft.block_copy_paste,
    track_tab_switches: isFinal ? true : draft.track_tab_switches,
    track_mouse_movement: isFinal ? true : draft.track_mouse_movement,
    warn_on_tab_switch: isFinal ? true : draft.warn_on_tab_switch,
    max_tab_switches: isFinal ? Math.max(5, draft.max_tab_switches) : draft.max_tab_switches,
    auto_submit_on_violations: isFinal ? true : draft.auto_submit_on_violations,
    track_gemini_window: isFinal ? true : draft.track_gemini_window,
    max_gemini_strikes: isFinal ? Math.max(5, draft.max_gemini_strikes) : draft.max_gemini_strikes,
    keystroke_playback_enforced: isFinal ? true : draft.keystroke_playback_enforced,
    require_fullscreen: isFinal ? true : draft.require_fullscreen,
    geo_required: draft.geo_required,
    geo_lat: draft.geo_lat.trim() ? Number(draft.geo_lat) : null,
    geo_lng: draft.geo_lng.trim() ? Number(draft.geo_lng) : null,
    geo_radius_meters: draft.geo_radius_meters,
    rollover_enabled: isSingleSitting || isFinal ? false : draft.rollover_enabled,
    rollover_hours: Math.max(1, Math.min(72, draft.rollover_hours || 1)),
    ai_evaluation_mode: draft.ai_evaluation_mode,
    ai_model: draft.ai_model || "auto",
    ai_enable_opus_fallback: draft.ai_enable_opus_fallback,
    ai_opus_confidence_threshold: draft.ai_opus_confidence_threshold,
    code_language: draft.allowed_ai_code_languages[0] ?? "",
    allowed_ai_code_languages: draft.allowed_ai_code_languages,
    section_config:
      draft.section_config && draft.section_config.length > 0 ? draft.section_config : null,
    max_concurrent_students: draft.max_concurrent_students,
    enable_superpowers: isFinal ? false : draft.enable_superpowers,
    allowed_superpowers: isFinal || !draft.enable_superpowers ? null : draft.allowed_superpowers,
    restrict_access_to_students: draft.restrict_access_to_students,
    allowed_student_ids: draft.restrict_access_to_students ? draft.allowed_student_ids : null,
    access_restriction_session_id: draft.restrict_access_to_students
      ? draft.access_restriction_session_id
      : null,
    counts_toward_course_grade: draft.counts_toward_course_grade}
}

export function draftQuestionToPreview(q: QuizQuestionDraft): PreviewQuestion {
  return {
    id: q.id ?? -1,
    question_text: q.question_text,
    question_type: q.question_type,
    question_order: q.question_order,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    option_e: q.option_e,
    max_points: q.max_points ?? q.points,
    points: q.points,
    hint: q.hint,
    question_media: q.question_media,
    solution_upload_config: q.solution_upload_config,
    circuit_spec: q.circuit_spec,
    subquestions: q.subquestions,
    time_limit: q.time_limit,
    ai_code_language: q.ai_code_language}
}
