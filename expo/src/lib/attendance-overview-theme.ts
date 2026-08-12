import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { GRADES_WARM, gradePerformanceColor } from "./grades-theme"

/**
 * Attendance overview — signature warm Color Hunt palette.
 * @see https://colorhunt.co/palette/e73f1efb6c00f9b637ffdd9c
 */
export const ATTENDANCE_WARM = GRADES_WARM

/** Cool accents for charts & secondary KPIs */
export const ATTENDANCE_COOL = COLOR_HUNT_COOL

export type AttendanceStatKey =
  | "attended"
  | "missed"
  | "remaining"
  | "streak"
  | "points"
  | "best"
  | "goal"

export type AttendanceStatTheme = {
  icon:
    | "checkmark-circle-outline"
    | "close-circle-outline"
    | "calendar-outline"
    | "flame-outline"
    | "flash-outline"
    | "trophy-outline"
    | "flag-outline"
  fill: string
  iconInk: string
  labelInk: string
}

export const ATTENDANCE_STAT_THEMES: Record<AttendanceStatKey, AttendanceStatTheme> = {
  attended: {
    icon: "checkmark-circle-outline",
    fill: "#22C55E",
    iconInk: "#FFFFFF",
    labelInk: "#15803D",
  },
  missed: {
    icon: "close-circle-outline",
    fill: ATTENDANCE_WARM.red,
    iconInk: "#FFFFFF",
    labelInk: ATTENDANCE_WARM.red,
  },
  remaining: {
    icon: "calendar-outline",
    fill: ATTENDANCE_COOL.cyan,
    iconInk: "#FFFFFF",
    labelInk: ATTENDANCE_COOL.indigo,
  },
  streak: {
    icon: "flame-outline",
    fill: ATTENDANCE_WARM.gold,
    iconInk: ATTENDANCE_WARM.ink,
    labelInk: ATTENDANCE_WARM.ink,
  },
  points: {
    icon: "flash-outline",
    fill: ATTENDANCE_WARM.orange,
    iconInk: "#FFFFFF",
    labelInk: ATTENDANCE_WARM.orange,
  },
  best: {
    icon: "trophy-outline",
    fill: ATTENDANCE_COOL.indigo,
    iconInk: "#FFFFFF",
    labelInk: ATTENDANCE_COOL.indigo,
  },
  goal: {
    icon: "flag-outline",
    fill: ATTENDANCE_COOL.gold,
    iconInk: ATTENDANCE_WARM.ink,
    labelInk: ATTENDANCE_WARM.inkMuted,
  },
}

export const ATTENDANCE_STATUS_COLORS = {
  present: "#22C55E",
  late: ATTENDANCE_WARM.orange,
  absent: ATTENDANCE_WARM.red,
  other: ATTENDANCE_COOL.indigo,
} as const

export function attendanceProgressColor(pct: number): string {
  return gradePerformanceColor(pct)
}

export function attendanceProgressTrack(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.12)" : hexToRgba(ATTENDANCE_WARM.orange, 0.16)
}

export function attendanceWeeklyBarColor(rate: number, total: number): string {
  if (total <= 0) return hexToRgba(ATTENDANCE_COOL.indigo, 0.35)
  return gradePerformanceColor(rate)
}
