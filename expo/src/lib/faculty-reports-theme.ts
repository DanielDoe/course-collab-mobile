import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { ReportTemplateTone } from "./instructor-reports-utils"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/** Manage Reports — Color Hunt template thumbs + module chrome. */
export const FACULTY_REPORTS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  tabActive: COLOR_HUNT_COOL.indigo,
  ai: COLOR_HUNT_COOL.indigo,
} as const

const TONE_THUMBS: Record<ReportTemplateTone, SolidListThumb> = {
  teal: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  blue: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  violet: solidListThumbFixed(COLOR_HUNT.pink),
  amber: solidListThumbFixed(COLOR_HUNT.orange),
  rose: solidListThumbFixed(COLOR_HUNT.pinkDeep),
  sky: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  slate: solidListThumbFixed(COLOR_HUNT.ink, "#FFFFFF"),
}

export function facultyReportTemplateThumb(tone: ReportTemplateTone): SolidListThumb {
  return TONE_THUMBS[tone] ?? solidListThumbFixed(COLOR_HUNT_COOL.indigo)
}

export function facultyReportSavedThumb(seed: string | number): SolidListThumb {
  return solidListThumbFromHash(`report-${seed}`)
}
