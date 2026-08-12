import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"

/** Faculty action sheets / modals — Color Hunt accents on neutral grouped surfaces. */
export const FACULTY_SHEET_COLOR = {
  action: GRADES_WARM.orange,
  actionInk: "#FFFFFF",
  link: COLOR_HUNT_COOL.cyan,
  ai: COLOR_HUNT_COOL.indigo,
  thumb: COLOR_HUNT_COOL.indigo,
  nudge: COLOR_HUNT.orange,
  danger: REPORT_SOLID.missed,
  success: REPORT_SOLID.correct,
} as const
