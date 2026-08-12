import { COLOR_HUNT_COOL } from "../../lib/codebench-badge-theme"
import { podiumRankSolidThumb, type PodiumRank } from "../../lib/leaderboard-podium-theme"
import type {
  LeaderboardEntry,
  PracticeLeaderboardDisplay,
  PracticeLeaderboardPrivacy,
} from "../../lib/practice-leaderboard-normalize"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { solidListThumb, solidListThumbFixed } from "../../lib/solid-list-thumb"
import { adaptThumbPaletteForAppearance, listThumbPalette, type ListThumbPaletteOptions } from "../theme/list-thumb-palette"
import { SYSTEM } from "../../constants/faculty-native-theme"

export type LeaderboardCardPalette = {
  color: string
  soft: string
  border: string
}

export type PracticeLeaderboardViewOptions = PracticeLeaderboardPrivacy & PracticeLeaderboardDisplay

export function leaderboardSolidThumb(
  index: number,
  isCurrentUser: boolean,
  rank?: number,
): SolidListThumb {
  if (rank != null && rank >= 1 && rank <= 3) {
    return podiumRankSolidThumb(rank as PodiumRank)
  }
  if (isCurrentUser) return solidListThumbFixed(COLOR_HUNT_COOL.indigo)
  return solidListThumb(index)
}

export function isLeaderboardPeerBlurred(
  entry: LeaderboardEntry,
  blurPeerNames: boolean,
): boolean {
  return blurPeerNames && !entry.is_current_user
}

export function leaderboardDisplayName(
  entry: LeaderboardEntry,
  options?: Pick<PracticeLeaderboardViewOptions, "blurPeerNames">,
): string {
  if (entry.is_current_user) return "You"
  if (options?.blurPeerNames) return "Student"
  return entry.student_name?.trim() || "Student"
}

/** @deprecated Use leaderboardSolidThumb */
export function leaderboardThumbPalette(
  index: number,
  isCurrentUser: boolean,
  isDark = false,
  options?: ListThumbPaletteOptions,
): LeaderboardCardPalette {
  const surface = options?.surfaceColor
  if (isCurrentUser) return adaptThumbPaletteForAppearance(SYSTEM.indigo, isDark, surface)
  return listThumbPalette(index, isDark, options)
}

export function leaderboardScorePct(entry: LeaderboardEntry): number {
  return Math.round(entry.avg_practice_score ?? 0)
}

export function leaderboardPoints(entry: LeaderboardEntry): number {
  return entry.total_practice_points ?? 0
}

export function leaderboardStreak(entry: LeaderboardEntry): number {
  return entry.current_streak_days ?? 0
}

export function leaderboardPointsLabel(
  entry: LeaderboardEntry,
  options?: Pick<PracticeLeaderboardViewOptions, "blurPeerNames">,
): string {
  if (isLeaderboardPeerBlurred(entry, options?.blurPeerNames ?? false)) return "••• pts"
  return `${leaderboardPoints(entry).toLocaleString()} pts`
}

export function leaderboardMetaLabel(
  entry: LeaderboardEntry,
  options?: Pick<PracticeLeaderboardViewOptions, "blurPeerNames">,
): string {
  if (isLeaderboardPeerBlurred(entry, options?.blurPeerNames ?? false)) return "Details hidden"
  return `${leaderboardPoints(entry).toLocaleString()} pts · ${leaderboardStreak(entry)} day streak`
}

export function leaderboardScoreLabel(
  entry: LeaderboardEntry,
  options?: PracticeLeaderboardViewOptions,
): string | null {
  if (options?.showAccuracy === false) return null
  if (isLeaderboardPeerBlurred(entry, options?.blurPeerNames ?? false)) return "Hidden"
  return `${leaderboardScorePct(entry)}% avg`
}

export function leaderboardPrivacyCaption(
  blurPeerNames: boolean,
  selfRank?: number | null,
): string | null {
  if (!blurPeerNames) return null
  if (selfRank != null) {
    return `Your rank: #${selfRank} — other students are hidden for privacy.`
  }
  return "Rankings by XP — other students are hidden for privacy."
}
