/**
 * Hybrid assessment timer: per-question (Section I objective) vs section-level (Section II circuit).
 */

import type { SectionTimerMode } from "../faculty-assessment-sections"
import { hasActiveQuestionMedia, parseQuestionMedia } from "../classroom-submission"
import type { QuestionSection, SectionConfig } from "./student-assessment-sections"
import { getDefaultTimeLimit, isUntimedMultiPartQuestion } from "./quiz-settings"

export type { SectionTimerMode }
export { getSectionConfigForQuestionIndex } from "./student-assessment-sections"

/** Homework is practice-oriented — due dates apply, not per-question/section countdowns. */
export function isUntimedAssessmentType(assessmentType: string | null | undefined): boolean {
  const t = String(assessmentType ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
  return t === "homework" || t === "homeworks"
}

export const OBJECTIVE_QUESTION_TIMER_SECONDS = {
  mcq: 30,
  true_false: 30,
  select_all: 35,
} as const

export const OBJECTIVE_DIAGRAM_EXTRA_SECONDS = 10

export type ObjectiveQuestionTimerKey = keyof typeof OBJECTIVE_QUESTION_TIMER_SECONDS

export type QuestionTimerMediaInput = {
  question_media?: unknown
  circuit_spec?: unknown
  bank_question_media?: unknown
}

export function questionHasCircuitDiagram(question: QuestionTimerMediaInput): boolean {
  return hasActiveQuestionMedia(parseQuestionMedia(question.question_media))
}

const SECTION_TIMER_TYPES = new Set(["circuit_submission", "multi_part"])
const OBJECTIVE_TYPES = new Set(["mcq", "true_false", "select_all", "multiple_choice"])

function normalizeType(type: string): string {
  return (type || "mcq").toLowerCase().trim()
}

function isObjectiveQuestionType(qt: string): boolean {
  return OBJECTIVE_TYPES.has(qt) || qt === "multiple_choice"
}

export function resolveObjectiveBaseTimeSeconds(
  questionType: string,
  courseTimer?: {
    objective_mcq_seconds?: number
    objective_true_false_seconds?: number
    objective_select_all_seconds?: number
  } | null,
): number {
  const qt = normalizeType(questionType)
  if (qt === "mcq" || qt === "multiple_choice") {
    const n = courseTimer?.objective_mcq_seconds
    if (typeof n === "number" && n > 0) return n
    return OBJECTIVE_QUESTION_TIMER_SECONDS.mcq
  }
  if (qt === "true_false") {
    const n = courseTimer?.objective_true_false_seconds
    if (typeof n === "number" && n > 0) return n
    return OBJECTIVE_QUESTION_TIMER_SECONDS.true_false
  }
  if (qt === "select_all" || qt === "multi_output") {
    const n = courseTimer?.objective_select_all_seconds
    if (typeof n === "number" && n > 0) return n
    return OBJECTIVE_QUESTION_TIMER_SECONDS.select_all
  }
  return getDefaultTimeLimit(qt)
}

export const EXAM_SHARED_TIMER_SECTION_KEY = -1

export function getExamSharedTimerSeconds(
  parsedConfig: SectionConfig[] | null | undefined,
): number | null {
  if (!parsedConfig?.length) return null
  const n = Number(parsedConfig[0]?.exam_shared_timer_seconds)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function usesExamSharedTimer(parsedConfig: SectionConfig[] | null | undefined): boolean {
  return getExamSharedTimerSeconds(parsedConfig) != null
}

export function syncExamSharedSectionTimers(
  sectionTimers: Record<number, number>,
  parsedConfig: SectionConfig[] | null | undefined,
  seconds: number,
): void {
  sectionTimers[EXAM_SHARED_TIMER_SECTION_KEY] = seconds
  parsedConfig?.forEach((cfg, idx) => {
    if (usesSectionCountdown(cfg)) sectionTimers[idx] = seconds
  })
}

export const DEFAULT_SECTION_TIMER_SECONDS = 3600

export function resolveSectionTimerMode(section: SectionConfig | null | undefined): SectionTimerMode | null {
  if (!section) return null
  if (section.timer_mode === "per_question" || section.timer_mode === "section_timer") {
    return section.timer_mode
  }
  const types = (section.question_types || []).map(normalizeType)
  if (types.some((t) => SECTION_TIMER_TYPES.has(t))) return "section_timer"
  if (types.some((t) => OBJECTIVE_TYPES.has(t))) return "per_question"
  return null
}

export function isPerQuestionTimerSection(section: SectionConfig | null | undefined): boolean {
  return resolveSectionTimerMode(section) === "per_question"
}

export function isSectionTimerSection(section: SectionConfig | null | undefined): boolean {
  return resolveSectionTimerMode(section) === "section_timer"
}

export function sectionAllowsBacktracking(section: SectionConfig | null | undefined): boolean {
  if (!section) return true
  if (typeof section.allow_backtracking === "boolean") return section.allow_backtracking
  if (isPerQuestionTimerSection(section)) return false
  if (isSectionTimerSection(section)) return true
  return true
}

export function resolveQuestionTimeLimitSeconds(
  questionType: string,
  questionTimeLimit: number | null | undefined,
  quizDefaultSeconds: number | null | undefined,
  section: SectionConfig | null | undefined,
  courseTimer?: {
    objective_mcq_seconds?: number
    objective_true_false_seconds?: number
    objective_select_all_seconds?: number
    time_per_question_default?: number
  } | null,
  options?: { hasDiagram?: boolean },
): number {
  const qt = normalizeType(questionType)
  const inSectionTimerSection = section && isSectionTimerSection(section)

  if (isObjectiveQuestionType(qt) && !inSectionTimerSection) {
    let base = resolveObjectiveBaseTimeSeconds(qt, courseTimer)
    if (options?.hasDiagram) base += OBJECTIVE_DIAGRAM_EXTRA_SECONDS
    return base
  }

  if (section && isPerQuestionTimerSection(section)) {
    const fromSection = section.timers?.[qt as ObjectiveQuestionTimerKey]
    if (typeof fromSection === "number" && fromSection > 0) return fromSection
  }
  if (questionTimeLimit != null && questionTimeLimit > 0) return questionTimeLimit
  if (quizDefaultSeconds != null && quizDefaultSeconds > 0) return quizDefaultSeconds
  const courseDefault = courseTimer?.time_per_question_default
  if (typeof courseDefault === "number" && courseDefault > 0) return courseDefault
  return getDefaultTimeLimit(qt)
}

export function resolveSectionTotalTimeSeconds(
  section: SectionConfig | null | undefined,
  context?: {
    questionCountInSection?: number
    allSections?: SectionConfig[] | null
  },
): number {
  if (!section) return DEFAULT_SECTION_TIMER_SECONDS
  const examShared = getExamSharedTimerSeconds(context?.allSections)
  if (examShared != null && isSectionTimerSection(section)) return examShared

  const n = Number(section.total_time_seconds)
  if (Number.isFinite(n) && n > 0) return n

  return DEFAULT_SECTION_TIMER_SECONDS
}

export function usesPerQuestionCountdown(
  questionType: string,
  section: SectionConfig | null | undefined,
  allSections?: SectionConfig[] | null,
  assessmentType?: string | null,
): boolean {
  if (isUntimedAssessmentType(assessmentType)) return false
  if (usesExamSharedTimer(allSections)) return false

  const qt = normalizeType(questionType)
  if (SECTION_TIMER_TYPES.has(qt)) return false

  const mode = resolveSectionTimerMode(section)
  if (mode === "section_timer") return false
  if (mode === "per_question") return true
  return !isUntimedMultiPartQuestion(questionType)
}

export function usesSectionCountdown(
  section: SectionConfig | null | undefined,
  assessmentType?: string | null,
): boolean {
  if (isUntimedAssessmentType(assessmentType)) return false
  return isSectionTimerSection(section)
}

/**
 * Students can always open earlier questions to review them.
 * Time-out and submit lock answering, not navigation — same as web/desktop.
 */
export function canNavigateToQuestionIndex(
  _targetIndex: number,
  _currentIndex: number,
  _sections: QuestionSection[],
  _parsedConfig: SectionConfig[] | null,
  _assessmentType?: string | null,
): boolean {
  return true
}

export function formatTimerMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, "0")}`
}

export function parseCourseTimer(raw: unknown): {
  objective_mcq_seconds?: number
  objective_true_false_seconds?: number
  objective_select_all_seconds?: number
  time_per_question_default?: number
} | null {
  if (!raw || typeof raw !== "object") return null
  return raw as {
    objective_mcq_seconds?: number
    objective_true_false_seconds?: number
    objective_select_all_seconds?: number
    time_per_question_default?: number
  }
}
