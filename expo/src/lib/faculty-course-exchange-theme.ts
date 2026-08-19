import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"
import type { AppThemeTokens } from "../constants/app-themes"
import { hexToRgba } from "../constants/app-themes"
import { exchangeRequestStatusColor } from "./course-exchange-shared"

/** Course Exchange — cool indigo family (Course group), not purple AI glow. */
export const FACULTY_COURSE_EXCHANGE_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  action: COLOR_HUNT_COOL.indigo,
  actionInk: "#FFFFFF",
  tabActive: COLOR_HUNT_COOL.indigo,
  link: COLOR_HUNT_COOL.cyan,
  discover: COLOR_HUNT_COOL.indigo,
  received: COLOR_HUNT.amber,
  sent: COLOR_HUNT_COOL.cyan,
  shared: COLOR_HUNT_COOL.cyan,
  settings: COLOR_HUNT_COOL.indigo,
  update: COLOR_HUNT.orange,
} as const

export function facultyCourseExchangeThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(seed)
}

export function facultyCourseExchangeCourseThumb(courseId: number | string): SolidListThumb {
  return solidListThumbFromHash(`exchange-course-${courseId}`)
}

export function facultyCourseExchangeDiscoverThumb(courseId?: number | string): SolidListThumb {
  if (courseId != null) return facultyCourseExchangeCourseThumb(courseId)
  return solidListThumbFixed(FACULTY_COURSE_EXCHANGE_COLOR.discover)
}

export function facultyCourseExchangeStatusHex(status: string): string {
  const tone = exchangeRequestStatusColor(status)
  switch (tone) {
    case "success":
      return REPORT_SOLID.correct
    case "danger":
      return REPORT_SOLID.missed
    case "warning":
      return COLOR_HUNT.amber
    default:
      return FACULTY_COURSE_EXCHANGE_COLOR.link
  }
}

export function facultyCourseExchangeActionSoft(tokens: AppThemeTokens): string {
  return hexToRgba(FACULTY_COURSE_EXCHANGE_COLOR.action, tokens.isDark ? 0.22 : 0.12)
}
