import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { solidListThumbFixed } from "./solid-list-thumb"

/** Cora Insights KPI row — solid Color Hunt swatches. */
export const CORA_INSIGHTS_KPI = {
  questions: {
    accent: COLOR_HUNT_COOL.indigo,
    icon: "chatbubble-outline" as const,
  },
  streak: {
    accent: COLOR_HUNT.orange,
    icon: "flame-outline" as const,
  },
  mastered: {
    accent: COLOR_HUNT.pink,
    icon: "ribbon-outline" as const,
  },
  reasoning: {
    accent: COLOR_HUNT_COOL.cyan,
    icon: "bulb-outline" as const,
  },
} as const

export type CoraInsightsKpiId = keyof typeof CORA_INSIGHTS_KPI

export const CORA_INSIGHTS_HERO_THUMB = solidListThumbFixed(COLOR_HUNT_COOL.indigo)
