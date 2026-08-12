import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { FacultyCollabStatusMeta } from "./faculty-collab-theme"
import {
  collabProjectStatusAccent,
  collabProjectStatusIcon,
  collabStatusLabel,
} from "./collaboration-list-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/**
 * Faculty projects — Color Hunt palette
 * Warm: https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 * Cool: https://colorhunt.co/palette/ffc349525ea75facd397dde9
 * Accent: https://colorhunt.co/palette/f5788bffc349525ea797dde9
 */
export const FACULTY_PROJECTS_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  studentScore: COLOR_HUNT_COOL.cyan,
  instructorScore: COLOR_HUNT_COOL.indigo,
  totalScore: COLOR_HUNT_COOL.indigo,
  scoreStar: COLOR_HUNT_COOL.gold,
  rank: COLOR_HUNT_COOL.indigo,
  presentation: COLOR_HUNT_COOL.cyan,
  presentationLive: COLOR_HUNT_COOL.sky,
  config: COLOR_HUNT.orange,
  grade: COLOR_HUNT_COOL.cyan,
  leaderboard: COLOR_HUNT.pink,
  engagement: COLOR_HUNT_COOL.sky,
  nudge: COLOR_HUNT.orange,
  success: REPORT_SOLID.correct,
  scheduled: COLOR_HUNT_COOL.sky,
  completed: REPORT_SOLID.correct,
  cancelled: REPORT_SOLID.missed,
} as const

export type FacultyProjectPanelKind =
  | "presentation"
  | "config"
  | "score"
  | "grade"
  | "rank"
  | "leaderboard"

const PANEL_THUMB_FILL: Record<FacultyProjectPanelKind, string> = {
  presentation: FACULTY_PROJECTS_COLOR.presentation,
  config: FACULTY_PROJECTS_COLOR.config,
  score: FACULTY_PROJECTS_COLOR.scoreStar,
  grade: FACULTY_PROJECTS_COLOR.grade,
  rank: FACULTY_PROJECTS_COLOR.rank,
  leaderboard: FACULTY_PROJECTS_COLOR.leaderboard,
}

export function facultyProjectPanelThumb(seed: string, fill?: string): SolidListThumb {
  return fill ? solidListThumbFixed(fill) : solidListThumbFromHash(seed)
}

export function facultyProjectPanelThumbFor(kind: FacultyProjectPanelKind, seed: string): SolidListThumb {
  return facultyProjectPanelThumb(seed, PANEL_THUMB_FILL[kind])
}

export function facultyPresentationStatusColor(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === "completed") return FACULTY_PROJECTS_COLOR.completed
  if (normalized === "cancelled") return FACULTY_PROJECTS_COLOR.cancelled
  if (normalized === "scheduled") return FACULTY_PROJECTS_COLOR.scheduled
  return FACULTY_PROJECTS_COLOR.presentationLive
}

export function facultyPresentationStatusIcon(
  status: string,
): "checkmark-circle-outline" | "close-circle-outline" | "calendar-outline" | "time-outline" {
  const normalized = status.toLowerCase()
  if (normalized === "completed") return "checkmark-circle-outline"
  if (normalized === "cancelled") return "close-circle-outline"
  if (normalized === "scheduled") return "calendar-outline"
  return "time-outline"
}

export function facultyProjectStatusMeta(status: string, seed = "0"): FacultyCollabStatusMeta {
  const thumb = facultyProjectPanelThumb(seed)
  const label = status === "pending_update" ? "Update pending" : collabStatusLabel(status, status)
  return {
    label,
    color: collabProjectStatusAccent(status, thumb),
    icon: collabProjectStatusIcon(status),
  }
}
