import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import type { SectionTheme } from "../constants/section-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM, gradesCategoryAccent } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumb, solidListThumbFixed } from "./solid-list-thumb"

/**
 * Course Info module — Color Hunt accents.
 * Card containers stay neutral; color applies to icon tiles, CTAs, bars, and chips.
 */
export const COURSE_INFO_COLOR = {
  primary: COLOR_HUNT_COOL.indigo,
  secondary: COLOR_HUNT_COOL.cyan,
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  highlight: COLOR_HUNT.pink,
  badge: COLOR_HUNT_COOL.gold,
  badgeInk: COLOR_HUNT.ink,
  aiSummary: COLOR_HUNT.pink,
  infoWash: COLOR_HUNT_COOL.cyan,
} as const

export const COURSE_INFO_ACTION = {
  fill: COURSE_INFO_COLOR.action,
  ink: COURSE_INFO_COLOR.actionInk,
} as const

export const COURSE_INFO_POLICIES = {
  governance: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  notice: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  membership: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
} as const

export const COURSE_INFO_PROGRESS_REVIEW_SECTIONS = {
  strengths: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  focus: solidListThumbFixed(COLOR_HUNT.orange),
  assessments: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  practice: solidListThumbFixed(COLOR_HUNT.orange),
  attendance: solidListThumbFixed(GRADES_WARM.gold, GRADES_WARM.ink),
  classroom: solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  actionPlan: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
} as const

export const COURSE_INFO_EVALUATION = {
  overall: GRADES_WARM.gold,
  recommend: COLOR_HUNT.pink,
  passGoal: COLOR_HUNT_COOL.indigo,
  npsBar: GRADES_WARM.orange,
  ecFlash: COLOR_HUNT_COOL.gold,
} as const

export const COURSE_INFO_RECOMMENDATION = {
  request: solidListThumbFixed(COLOR_HUNT.pink),
  form: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
} as const

export const COURSE_INFO_OFFICE_HOURS = {
  form: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  requests: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
} as const

export function courseInfoThemeFromTokens(tokens: AppThemeTokens): SectionTheme {
  const primary = COURSE_INFO_COLOR.primary
  const soft = hexToRgba(primary, tokens.isDark ? 0.24 : 0.14)
  const softBorder = hexToRgba(primary, tokens.isDark ? 0.4 : 0.28)
  return {
    id: "course-info",
    label: "Course Info",
    primary,
    primaryDark: "#3D4578",
    primaryLight: COLOR_HUNT_COOL.cyan,
    soft,
    softBorder,
    gradient: ["#3D4578", primary, COLOR_HUNT_COOL.cyan],
    navActiveBg: soft,
    navActiveBorder: softBorder,
    ink: tokens.text,
  }
}

export function courseInfoProgressTrack(fill: string, isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.12)" : hexToRgba(fill, 0.16)
}

export function courseInfoProgressReviewAccent(label: string): string {
  const key = label.toLowerCase()
  if (key === "quiz") return gradesCategoryAccent("quiz")
  if (key === "homework") return gradesCategoryAccent("homework")
  if (key === "midterm") return gradesCategoryAccent("midterm")
  if (key === "attendance") return gradesCategoryAccent("attendance")
  if (key === "classroom") return gradesCategoryAccent("classroom")
  if (key === "overall") return GRADES_WARM.orange
  return COURSE_INFO_COLOR.primary
}

export function courseInfoSyllabusThumb(index: number): SolidListThumb {
  return solidListThumb(index)
}

/** Faculty syllabus — solid status chips aligned with Course Info Color Hunt. */
export const COURSE_INFO_SYLLABUS_STATUS = {
  published: { bg: REPORT_SOLID.correct, text: REPORT_SOLID.correctInk },
  draft: { bg: hexToRgba(COLOR_HUNT.orange, 0.18), text: COLOR_HUNT.orangeDeep },
  required: { bg: hexToRgba(COLOR_HUNT_COOL.indigo, 0.2), text: COLOR_HUNT_COOL.indigo },
  custom: { bg: hexToRgba(COLOR_HUNT_COOL.gold, 0.22), text: COLOR_HUNT.ink },
  hidden: { bg: hexToRgba("#636366", 0.16), text: "#636366" },
} as const

export function courseInfoStatusAccent(status?: string): string {
  const s = (status ?? "").toLowerCase()
  if (["approved", "completed", "done", "scheduled", "ready"].some((k) => s.includes(k))) {
    return REPORT_SOLID.correct
  }
  if (["pending", "submitted", "in_review", "review", "draft"].some((k) => s.includes(k))) {
    return COLOR_HUNT.orange
  }
  if (["rejected", "cancelled", "canceled", "denied"].some((k) => s.includes(k))) {
    return REPORT_SOLID.missed
  }
  return COURSE_INFO_COLOR.primary
}

export function courseInfoHeroBadgeStyle(isDark: boolean) {
  if (isDark) {
    return {
      background: hexToRgba(GRADES_WARM.gold, 0.88),
      text: GRADES_WARM.ink,
    }
  }
  return {
    background: hexToRgba(COURSE_INFO_COLOR.badge, 0.18),
    text: GRADES_WARM.ink,
  }
}

export function courseInfoHeroStatStyle(isDark: boolean) {
  return {
    value: GRADES_WARM.orange,
    label: isDark ? "rgba(255,255,255,0.84)" : GRADES_WARM.inkMuted,
  }
}

export function courseInfoAiSummaryStyle(isDark: boolean) {
  return {
    background: hexToRgba(COURSE_INFO_COLOR.aiSummary, isDark ? 0.2 : 0.12),
    border: hexToRgba(COURSE_INFO_COLOR.aiSummary, isDark ? 0.36 : 0.24),
    accent: COURSE_INFO_COLOR.aiSummary,
  }
}
