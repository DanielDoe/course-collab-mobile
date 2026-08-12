import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumb } from "./solid-list-thumb"

/** Faculty announcements — Color Hunt accents on neutral list chrome. */
export const FACULTY_ANNOUNCEMENT_COLOR = {
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  link: COLOR_HUNT_COOL.cyan,
  ai: COLOR_HUNT_COOL.indigo,
  pinned: COLOR_HUNT_COOL.cyan,
  high: REPORT_SOLID.missed,
  medium: COLOR_HUNT.orange,
  low: COLOR_HUNT_COOL.indigo,
  active: REPORT_SOLID.correct,
} as const

export function facultyAnnouncementListThumb(index: number): SolidListThumb {
  return solidListThumb(index)
}

export function facultyAnnouncementPriorityMeta(priority?: string): {
  label: string
  color: string
  icon: "alert-circle" | "warning-outline" | "information-circle-outline"
} | null {
  if (!priority) return null
  if (priority === "high") {
    return { label: "High priority", color: FACULTY_ANNOUNCEMENT_COLOR.high, icon: "alert-circle" }
  }
  if (priority === "medium") {
    return { label: "Medium priority", color: FACULTY_ANNOUNCEMENT_COLOR.medium, icon: "warning-outline" }
  }
  return { label: "Low priority", color: FACULTY_ANNOUNCEMENT_COLOR.low, icon: "information-circle-outline" }
}

export function facultyAnnouncementPinnedMeta(): {
  label: string
  color: string
  icon: "pin"
} {
  return { label: "Pinned", color: FACULTY_ANNOUNCEMENT_COLOR.pinned, icon: "pin" }
}
