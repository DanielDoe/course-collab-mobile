import type { Ionicons } from "@expo/vector-icons"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { FACULTY_SHEET_SOLID, type FacultySheetSolidAccent } from "./faculty-sheet-accents"
import type { FacultySheetTone } from "./themed-sheet-tones"
import { solidListThumbFromHash } from "./solid-list-thumb"

export function facultyStudentProfileHeroThumb(seed: string | number) {
  return solidListThumbFromHash(seed)
}

export function facultyStudentProfileEngagementPillTone(
  label: string,
): "success" | "warning" | "live" | "neutral" {
  if (label === "Star performer") return "success"
  if (label === "Active learner") return "live"
  if (label === "Steady progress") return "warning"
  return "warning"
}

export const PROFILE_KPI_SOLID = {
  engagement: FACULTY_SHEET_SOLID.cyan,
  avgScore: FACULTY_SHEET_SOLID.sky,
  points: FACULTY_SHEET_SOLID.orange,
} as const

const PROFILE_METRIC_SOLID: Record<string, FacultySheetSolidAccent> = {
  Engagement: FACULTY_SHEET_SOLID.cyan,
  "Avg score": FACULTY_SHEET_SOLID.sky,
  Submissions: FACULTY_SHEET_SOLID.indigo,
  "Class points": FACULTY_SHEET_SOLID.gold,
  Attempts: FACULTY_SHEET_SOLID.pink,
  "Office hours": FACULTY_SHEET_SOLID.cyan,
  Letters: FACULTY_SHEET_SOLID.indigo,
  Resets: FACULTY_SHEET_SOLID.slate,
  "In progress": FACULTY_SHEET_SOLID.orange,
  "Open issues": FACULTY_SHEET_SOLID.red,
  Flagged: FACULTY_SHEET_SOLID.red,
}

export function facultyStudentProfileMetricSolid(label: string): FacultySheetSolidAccent {
  return PROFILE_METRIC_SOLID[label] ?? FACULTY_SHEET_SOLID.slate
}

export function facultyStudentProfileTimelineSolid(
  tone: "teal" | "blue" | "amber" | "violet" | "rose" | "slate",
): FacultySheetSolidAccent {
  const map: Record<typeof tone, FacultySheetTone> = {
    teal: "teal",
    blue: "blue",
    amber: "amber",
    violet: "violet",
    rose: "rose",
    slate: "slate",
  }
  switch (map[tone]) {
    case "teal":
      return FACULTY_SHEET_SOLID.cyan
    case "blue":
      return FACULTY_SHEET_SOLID.indigo
    case "amber":
      return FACULTY_SHEET_SOLID.orange
    case "violet":
      return FACULTY_SHEET_SOLID.pink
    case "rose":
      return FACULTY_SHEET_SOLID.red
    default:
      return FACULTY_SHEET_SOLID.slate
  }
}

export const PROFILE_META_SOLID = {
  lastActive: FACULTY_SHEET_SOLID.cyan,
  memberSince: FACULTY_SHEET_SOLID.indigo,
} as const

export const PROFILE_TYPE_BAR_COLORS = [
  COLOR_HUNT_COOL.cyan,
  COLOR_HUNT_COOL.indigo,
  COLOR_HUNT.orange,
  COLOR_HUNT.pink,
  COLOR_HUNT_COOL.gold,
  COLOR_HUNT.amber,
] as const

export type ProfileSummaryMetricIcon = keyof typeof Ionicons.glyphMap
