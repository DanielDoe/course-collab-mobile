import type { IoniconName } from "@/components/icons/AppIcon"
import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumb } from "./solid-list-thumb"

/** Rotating solid Color Hunt thumb — matches lecture / collaboration list cards. */
export function playgroundListThumb(index: number): SolidListThumb {
  return solidListThumb(index)
}

export function playgroundGameStatusAccent(completedAt: string | null, thumb: SolidListThumb): string {
  if (!completedAt) return COLOR_HUNT.orange
  return REPORT_SOLID.correct
}

export function playgroundGameStatusIcon(completedAt: string | null): IoniconName {
  if (!completedAt) return "time-outline"
  return "checkmark-circle"
}

export function playgroundGameStatusLabel(completedAt: string | null): string {
  if (!completedAt) return "In progress"
  return new Date(completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Join hero — warm Color Hunt CTA fills. */
export const PLAYGROUND_JOIN = {
  primary: COLOR_HUNT.orange,
  primaryInk: "#FFFFFF",
  secondaryFill: hexToRgba(COLOR_HUNT.orange, 0.12),
  secondaryBorder: hexToRgba(COLOR_HUNT.orange, 0.28),
  secondaryInk: COLOR_HUNT.orangeDeep,
} as const

/** Tier badge — cool gold band from Color Hunt palette. */
export const PLAYGROUND_TIER = {
  fill: hexToRgba(COLOR_HUNT_COOL.gold, 0.22),
  ink: COLOR_HUNT.ink,
  icon: COLOR_HUNT.orangeDeep,
} as const

/** Leaderboard shortcut tile. */
export const PLAYGROUND_LEADERBOARD_THUMB: SolidListThumb = {
  fill: COLOR_HUNT_COOL.indigo,
  icon: "#FFFFFF",
  label: COLOR_HUNT_COOL.indigo,
}
