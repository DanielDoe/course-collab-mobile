import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { solidListThumbFixed } from "./solid-list-thumb"

export const ANALYTICS_SUMMARY_KPI = {
  streak: { accent: COLOR_HUNT.orange, icon: "flame-outline" as const },
  badges: { accent: COLOR_HUNT_COOL.indigo, icon: "ribbon-outline" as const },
  subs: { accent: COLOR_HUNT_COOL.cyan, icon: "code-slash-outline" as const },
  rank: { accent: COLOR_HUNT_COOL.gold, icon: "trophy-outline" as const },
  submissions: { accent: COLOR_HUNT.orange, icon: "git-commit-outline" as const },
  activeDays: { accent: COLOR_HUNT_COOL.indigo, icon: "calendar-outline" as const },
} as const

export type AnalyticsSummaryKpiId = keyof typeof ANALYTICS_SUMMARY_KPI

export const ANALYTICS_XP_FILL = COLOR_HUNT.orange
export const ANALYTICS_LEVEL_ACCENT = COLOR_HUNT.amber
export const ANALYTICS_LEVEL_INK = COLOR_HUNT.ink

export const ANALYTICS_LIST_THUMBS = {
  ide: solidListThumbFixed(COLOR_HUNT.orange),
  evaluate: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  practice: solidListThumbFixed(COLOR_HUNT.pink),
  recommendation: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  task: solidListThumbFixed(COLOR_HUNT.yellow, COLOR_HUNT.ink),
  streakSubmissions: solidListThumbFixed(COLOR_HUNT.orange),
  streakActiveDays: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  badgeSummary: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  streakHero: solidListThumbFixed(COLOR_HUNT.orange),
} as const

export const ANALYTICS_CALENDAR_ACTIVE = COLOR_HUNT_COOL.cyan
