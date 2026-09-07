import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

/** Faculty dashboard KPI — same Color Hunt solid thumb pattern as student `dashboard-theme.ts`. */
export const FACULTY_DASHBOARD_QUICK_ACTION_THUMBS = {
  points: solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  issues: solidListThumbFixed(COLOR_HUNT.orange),
  officeHours: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  messages: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  lectures: solidListThumbFixed(COLOR_HUNT_COOL.sky, "#1E3A5F"),
  quizzes: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  attendance: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  calendar: solidListThumbFixed(COLOR_HUNT.yellow, COLOR_HUNT.ink),
  announcements: solidListThumbFixed(COLOR_HUNT.pink),
  playground: solidListThumbFixed(COLOR_HUNT.orange),
} as const satisfies Record<string, SolidListThumb>

export const FACULTY_DASHBOARD_KPI_THUMBS = {
  activeQuizzes: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  students: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  quizAttempts: solidListThumbFixed(COLOR_HUNT.orange),
  pendingIssues: solidListThumbFixed(COLOR_HUNT.orange),
  pendingIssuesClear: solidListThumbFixed("#636366"),
  upcoming: solidListThumbFixed(COLOR_HUNT.yellow, COLOR_HUNT.ink),
  submissions24h: solidListThumbFixed(COLOR_HUNT.pink),
} as const satisfies Record<string, SolidListThumb>

/** Chart series + legend — Color Hunt cool/warm (not Tailwind emerald). */
export const FACULTY_CHART_COLORS = {
  primary: COLOR_HUNT_COOL.cyan,
  primaryDark: COLOR_HUNT_COOL.indigo,
  primaryLight: COLOR_HUNT_COOL.sky,
  target: COLOR_HUNT.amber,
  targetLine: hexToRgba(COLOR_HUNT.amber, 0.55),
  targetBorder: hexToRgba(COLOR_HUNT.amber, 0.65),
  pie: [
    COLOR_HUNT_COOL.indigo,
    COLOR_HUNT_COOL.cyan,
    COLOR_HUNT.pink,
    COLOR_HUNT.orange,
    COLOR_HUNT_COOL.gold,
  ] as const,
  grid: "rgba(148,163,184,0.2)",
  tick: "#64748b",
} as const

export type FacultyDashboardKpiId = keyof typeof FACULTY_DASHBOARD_KPI_THUMBS

export function facultyDashboardKpiThumb(
  id: "pendingIssues",
  hasIssues: boolean,
): SolidListThumb
export function facultyDashboardKpiThumb(
  id: Exclude<keyof typeof FACULTY_DASHBOARD_KPI_THUMBS, "pendingIssues" | "pendingIssuesClear">,
): SolidListThumb
export function facultyDashboardKpiThumb(
  id: keyof typeof FACULTY_DASHBOARD_KPI_THUMBS,
  hasIssues?: boolean,
): SolidListThumb {
  if (id === "pendingIssues") {
    return hasIssues
      ? FACULTY_DASHBOARD_KPI_THUMBS.pendingIssues
      : FACULTY_DASHBOARD_KPI_THUMBS.pendingIssuesClear
  }
  return FACULTY_DASHBOARD_KPI_THUMBS[id]
}
