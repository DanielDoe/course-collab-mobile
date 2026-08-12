import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import type { SolidListThumb } from "./solid-list-thumb"

/**
 * Color Hunt — https://colorhunt.co/palette/ffc349525ea75facd397dde9
 * Gold · Indigo · Cyan · Sky
 */
export const COLOR_HUNT_COOL = {
  gold: "#FFC349",
  indigo: "#525EA7",
  cyan: "#5FACD3",
  sky: "#97DDE9",
} as const

export type CodebenchBadgeTheme = {
  fill: string
  icon: string
  label: string
}

function solidBadge(fill: string, icon: string): CodebenchBadgeTheme {
  return { fill, icon, label: fill }
}

/** Solid Color Hunt fills — one distinct swatch per badge. */
export const CODEBENCH_BADGE_THEMES = {
  loops_master: solidBadge(COLOR_HUNT_COOL.indigo, "#FFFFFF"),
  bug_hunter: solidBadge(COLOR_HUNT.orange, "#FFFFFF"),
  clean_code: solidBadge(COLOR_HUNT_COOL.cyan, "#FFFFFF"),
  streak_3: solidBadge(COLOR_HUNT.amber, COLOR_HUNT.ink),
  streak_7: solidBadge(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  stl_expert: solidBadge(COLOR_HUNT.pink, "#FFFFFF"),
} as const satisfies Record<string, CodebenchBadgeTheme>

export type CodebenchBadgeId = keyof typeof CODEBENCH_BADGE_THEMES

/** CodeBench hub KPI row — solid Color Hunt swatches. */
export const CODEBENCH_KPI_ACCENTS = {
  streak: COLOR_HUNT.orange,
  badges: COLOR_HUNT_COOL.indigo,
  xp: COLOR_HUNT_COOL.cyan,
} as const

export function codebenchKpiSurface(accent: string): {
  background: string
  border: string
  value: string
  label: string
  iconThumb: SolidListThumb
} {
  return {
    background: accent,
    border: accent,
    value: "#FFFFFF",
    label: hexToRgba("#FFFFFF", 0.84),
    iconThumb: {
      fill: hexToRgba("#FFFFFF", 0.22),
      icon: "#FFFFFF",
      label: accent,
    },
  }
}
