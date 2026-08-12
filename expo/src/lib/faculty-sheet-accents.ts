import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_SHEET_COLOR } from "./faculty-sheet-theme"
import type { FacultySheetTone } from "./themed-sheet-tones"

export type FacultySheetSolidAccent = {
  fill: string
  icon: string
}

/** Solid Color Hunt icon tiles for sheet KPI chips and tool rows. */
export const FACULTY_SHEET_SOLID = {
  cyan: { fill: COLOR_HUNT_COOL.cyan, icon: "#FFFFFF" },
  indigo: { fill: COLOR_HUNT_COOL.indigo, icon: "#FFFFFF" },
  orange: { fill: GRADES_WARM.orange, icon: "#FFFFFF" },
  pink: { fill: COLOR_HUNT.pink, icon: "#FFFFFF" },
  gold: { fill: COLOR_HUNT_COOL.gold, icon: COLOR_HUNT.ink },
  sky: { fill: COLOR_HUNT_COOL.sky, icon: "#1E3A5F" },
  slate: { fill: REPORT_SOLID.skipped, icon: "#FFFFFF" },
  red: { fill: REPORT_SOLID.missed, icon: "#FFFFFF" },
  green: { fill: REPORT_SOLID.correct, icon: REPORT_SOLID.correctInk },
} as const satisfies Record<string, FacultySheetSolidAccent>

export function facultySheetSolidAccent(tone: FacultySheetTone): FacultySheetSolidAccent {
  switch (tone) {
    case "teal":
      return FACULTY_SHEET_SOLID.cyan
    case "blue":
      return FACULTY_SHEET_SOLID.indigo
    case "violet":
      return FACULTY_SHEET_SOLID.pink
    case "amber":
      return FACULTY_SHEET_SOLID.orange
    case "rose":
      return FACULTY_SHEET_SOLID.red
    case "sky":
      return FACULTY_SHEET_SOLID.sky
    case "slate":
    default:
      return FACULTY_SHEET_SOLID.slate
  }
}

/** Soft wash behind solid tiles — metric rows only. */
export function facultySheetSoftAccent(tone: FacultySheetTone, isDark: boolean): string {
  const { fill } = facultySheetSolidAccent(tone)
  return isDark ? `${fill}2E` : `${fill}18`
}

export function facultySheetToneIcon(tone: FacultySheetTone): string {
  switch (tone) {
    case "teal":
      return FACULTY_SHEET_COLOR.link
    case "blue":
      return FACULTY_SHEET_COLOR.ai
    case "violet":
      return COLOR_HUNT.pink
    case "amber":
      return FACULTY_SHEET_COLOR.nudge
    case "rose":
      return FACULTY_SHEET_COLOR.danger
    case "sky":
      return COLOR_HUNT_COOL.sky
    case "slate":
    default:
      return REPORT_SOLID.skipped
  }
}
