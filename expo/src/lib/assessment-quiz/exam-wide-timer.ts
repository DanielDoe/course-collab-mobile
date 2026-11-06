import {
  defaultSectionTemplate,
  type SectionConfig,
} from "../faculty-assessment-sections"

const EXAM_WIDE_TYPES = new Set([
  "quiz",
  "quizzes",
  "homework",
  "homeworks",
  "mid_semester",
  "midsem",
  "midsemester",
  "midterm",
  "mid_term",
  "final",
  "finals",
  "final_exam",
])

function typeKey(assessmentType: string | null | undefined): string {
  return String(assessmentType ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
}

export function isExamWideAssessmentType(assessmentType: string | null | undefined): boolean {
  return EXAM_WIDE_TYPES.has(typeKey(assessmentType))
}

/** Quiz and homework: 60 minutes. Mid-semester and finals: 90 minutes. */
export function defaultExamWideTimerSeconds(assessmentType: string | null | undefined): number {
  const t = typeKey(assessmentType)
  if (
    t === "final" ||
    t === "finals" ||
    t === "final_exam" ||
    t === "mid_semester" ||
    t === "midsem" ||
    t === "midsemester" ||
    t === "midterm" ||
    t === "mid_term"
  ) {
    return 5400
  }
  return 3600
}

export function resolveExamWideTimerSeconds(
  sectionConfig: unknown,
  assessmentType: string | null | undefined,
): number | null {
  if (!isExamWideAssessmentType(assessmentType)) return null
  const sections = Array.isArray(sectionConfig) ? sectionConfig : null
  const raw = sections?.[0] && typeof sections[0] === "object"
    ? (sections[0] as { exam_shared_timer_seconds?: unknown }).exam_shared_timer_seconds
    : null
  const stored = Number(raw)
  if (Number.isFinite(stored) && stored > 0) return Math.floor(stored)
  return defaultExamWideTimerSeconds(assessmentType)
}

export function formatExamClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function examWideMinuteOptions(currentMinutes?: number): { value: string; label: string }[] {
  const presets = [30, 45, 60, 75, 90, 120, 150, 180]
  const minutes = new Set(presets)
  if (currentMinutes && currentMinutes > 0) minutes.add(Math.round(currentMinutes))
  return [...minutes]
    .sort((a, b) => a - b)
    .map((mins) => ({ value: String(mins), label: mins === 60 ? "1 hour" : mins === 90 ? "1 hour 30 min" : `${mins} min` }))
}

export function applyExamWideMinutes(
  sections: SectionConfig[] | null,
  minutes: number,
  assessmentType: string,
): SectionConfig[] {
  const seconds = Math.max(60, Math.floor(minutes) * 60)
  const base = sections && sections.length > 0 ? sections : defaultSectionTemplate(assessmentType)
  return base.map((section, index) => ({
    ...section,
    timer_mode: "section_timer",
    total_time_seconds: seconds,
    allow_backtracking: section.allow_backtracking ?? true,
    auto_submit_on_expire: true,
    timers: undefined,
    exam_shared_timer_seconds: index === 0 ? seconds : undefined,
  }))
}
