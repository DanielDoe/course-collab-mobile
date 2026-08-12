import type { IoniconName } from "@/components/icons/AppIcon"
import { hexToRgba } from "../constants/app-themes"
import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed } from "./solid-list-thumb"

export type PodiumRank = 1 | 2 | 3

/**
 * Medal podium ranks — Color Hunt palettes.
 * Gold · Indigo · Orange bronze
 * @see https://colorhunt.co/palette/ffc349525ea75facd397dde9
 * @see https://colorhunt.co/palette/ff6a1cffda62ffae56f5788b
 */
export const PODIUM_MEDAL = {
  first: COLOR_HUNT_COOL.gold,
  second: COLOR_HUNT_COOL.indigo,
  third: COLOR_HUNT.orange,
} as const

export const PODIUM_BAR_HEIGHT = {
  1: 92,
  2: 68,
  3: 54,
} as const

export const PODIUM_BAR_HEIGHT_TALL = {
  1: 96,
  2: 72,
  3: 58,
} as const

export type PodiumRankStyle = {
  color: string
  bg: string
  barGradient: [string, string]
  barWash: string
  crown: string
  iconInk: string
  /** Rank 1 uses ribbon; 2/3 use medal. */
  icon: IoniconName
}

export function podiumRankColor(rank: number, isDark = false): string {
  if (rank === 1) return PODIUM_MEDAL.first
  if (rank === 2) return PODIUM_MEDAL.second
  if (rank === 3) return PODIUM_MEDAL.third
  return isDark ? "#98989D" : "#8E8E93"
}

export function podiumRankStyle(rank: PodiumRank, isDark: boolean): PodiumRankStyle {
  const color = podiumRankColor(rank, isDark)
  return {
    color,
    bg: hexToRgba(color, isDark ? 0.2 : 0.16),
    barGradient: [hexToRgba(color, 0.55), color],
    barWash: hexToRgba(color, 0.14),
    crown: color,
    iconInk: rank === 1 ? COLOR_HUNT.ink : "#FFFFFF",
    icon: rank === 1 ? "ribbon" : "medal-outline",
  }
}

export function podiumRankSolidThumb(rank: PodiumRank): SolidListThumb {
  const fill = podiumRankColor(rank)
  const icon = rank === 1 ? COLOR_HUNT.ink : "#FFFFFF"
  return solidListThumbFixed(fill, icon)
}

export function podiumRankBadgeBg(rank: number, isDark: boolean): string | undefined {
  if (rank < 1 || rank > 3) return undefined
  return hexToRgba(podiumRankColor(rank, isDark), isDark ? 0.24 : 0.18)
}

export function podiumHeroGradient(isDark: boolean): readonly [string, string, string] {
  if (isDark) {
    return ["#3D4578", COLOR_HUNT_COOL.indigo, COLOR_HUNT.orangeDeep] as const
  }
  return [COLOR_HUNT_COOL.indigo, COLOR_HUNT_COOL.cyan, COLOR_HUNT.orange] as const
}
