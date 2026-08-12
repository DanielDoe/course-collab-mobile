import { reportPerformanceColor } from "./assessment-report-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/** Manage Results — Color Hunt on neutral grouped lists. */
export const FACULTY_RESULTS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  tabActive: COLOR_HUNT_COOL.indigo,
} as const

const TYPE_THUMBS: Record<string, { bg: string; ink: string }> = {
  quiz: { bg: COLOR_HUNT_COOL.indigo, ink: "#FFFFFF" },
  homework: { bg: COLOR_HUNT_COOL.cyan, ink: "#FFFFFF" },
  mid_semester: { bg: COLOR_HUNT.pink, ink: "#FFFFFF" },
  final: { bg: COLOR_HUNT_COOL.gold, ink: COLOR_HUNT.ink },
}

export function facultyResultThumb(type?: string, id?: number | string): SolidListThumb {
  const key = (type ?? "").toLowerCase()
  const preset = TYPE_THUMBS[key]
  if (preset) return solidListThumbFixed(preset.bg, preset.ink)
  return solidListThumbFromHash(id ?? type ?? "result")
}

export function facultyResultScoreColor(pct: number) {
  return reportPerformanceColor(pct)
}
