import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

/** Student dashboard — fixed Color Hunt swatches per metric / action. */
export const DASHBOARD_KPI_THUMBS = {
  overallGrade: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  quizAverage: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  homeworkAverage: solidListThumbFixed(COLOR_HUNT.pink),
  attendance: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  missingWork: solidListThumbFixed(COLOR_HUNT.orange),
  missingWorkClear: solidListThumbFixed("#636366"),
  classroomPoints: solidListThumbFixed(COLOR_HUNT.amber, COLOR_HUNT.ink),
  upcoming: solidListThumbFixed(COLOR_HUNT.yellow, COLOR_HUNT.ink),
  engagement: solidListThumbFixed(COLOR_HUNT_COOL.sky, "#1E3A5F"),
} as const satisfies Record<string, SolidListThumb>

export const DASHBOARD_QUICK_ACTION_THUMBS = {
  quizzes: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  grades: solidListThumbFixed(COLOR_HUNT.pink),
  homework: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  practice: solidListThumbFixed(COLOR_HUNT.orange),
} as const

export type DashboardEngagementId = "points" | "streak" | "credits" | "attendance"

export type DashboardEngagementTheme = {
  thumb: SolidListThumb
  accent: string
  surface: () => {
    background: string
    border: string
    value: string
    label: string
    progressTrack: string
    progressFill: string
    deco: string
    iconThumb: SolidListThumb
  }
}

export const DASHBOARD_ENGAGEMENT: Record<DashboardEngagementId, DashboardEngagementTheme> = {
  points: {
    thumb: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
    accent: COLOR_HUNT_COOL.indigo,
    surface: () => engagementCardSurface(COLOR_HUNT_COOL.indigo),
  },
  streak: {
    thumb: solidListThumbFixed(COLOR_HUNT.orange),
    accent: COLOR_HUNT.orange,
    surface: () => engagementCardSurface(COLOR_HUNT.orange),
  },
  credits: {
    thumb: solidListThumbFixed(COLOR_HUNT.pink),
    accent: COLOR_HUNT.pink,
    surface: () => engagementCardSurface(COLOR_HUNT.pink),
  },
  attendance: {
    thumb: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
    accent: COLOR_HUNT_COOL.cyan,
    surface: () => engagementCardSurface(COLOR_HUNT_COOL.cyan),
  },
}

function engagementCardSurface(accent: string) {
  return {
    background: accent,
    border: accent,
    value: "#FFFFFF",
    label: hexToRgba("#FFFFFF", 0.84),
    progressTrack: hexToRgba("#FFFFFF", 0.28),
    progressFill: "#FFFFFF",
    deco: hexToRgba("#FFFFFF", 0.16),
    iconThumb: {
      fill: hexToRgba("#FFFFFF", 0.22),
      icon: "#FFFFFF",
      label: accent,
    },
  }
}

export const DASHBOARD_INSIGHT = {
  warning: {
    accent: COLOR_HUNT.orange,
    soft: (isDark: boolean) => hexToRgba(COLOR_HUNT.orange, isDark ? 0.24 : 0.12),
    border: (isDark: boolean) => hexToRgba(COLOR_HUNT.orange, isDark ? 0.4 : 0.28),
  },
  tip: {
    accent: COLOR_HUNT_COOL.cyan,
    soft: (isDark: boolean) => hexToRgba(COLOR_HUNT_COOL.cyan, isDark ? 0.24 : 0.12),
    border: (isDark: boolean) => hexToRgba(COLOR_HUNT_COOL.cyan, isDark ? 0.4 : 0.28),
  },
} as const

export const DASHBOARD_ANNOUNCEMENT_ACCENTS = [
  COLOR_HUNT_COOL.indigo,
  COLOR_HUNT.orange,
  COLOR_HUNT.pink,
  COLOR_HUNT_COOL.cyan,
  COLOR_HUNT.amber,
] as const

export function dashboardAnnouncementAccent(index: number): string {
  const slot =
    ((index % DASHBOARD_ANNOUNCEMENT_ACCENTS.length) + DASHBOARD_ANNOUNCEMENT_ACCENTS.length) %
    DASHBOARD_ANNOUNCEMENT_ACCENTS.length
  return DASHBOARD_ANNOUNCEMENT_ACCENTS[slot]!
}
