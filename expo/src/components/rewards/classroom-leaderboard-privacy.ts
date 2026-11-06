import type { ClassroomLeaderboardEntry } from "../../lib/rewards-api"

function formatPoints(value: number | string | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return "0"
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function entryPlace(
  entry: Pick<ClassroomLeaderboardEntry, "rank">,
  fallbackIndex?: number,
): number {
  const rank = Number(entry.rank)
  if (Number.isFinite(rank) && rank > 0) return rank
  if (fallbackIndex != null && fallbackIndex >= 0) return fallbackIndex + 1
  return 0
}

export function isClassroomLeaderboardPeerBlurred(
  entry: Pick<ClassroomLeaderboardEntry, "is_current_user">,
  blurPeerNames: boolean,
): boolean {
  return blurPeerNames && entry.is_current_user !== true
}

/** Privacy: "Student 2", "Student 3", … by rank. Self always keeps their name. */
export function classroomLeaderboardDisplayName(
  entry: Pick<ClassroomLeaderboardEntry, "full_name" | "is_current_user" | "rank">,
  blurPeerNames: boolean,
  options?: { listIndex?: number },
): string {
  if (entry.is_current_user) {
    const self = entry.full_name?.trim() || "You"
    return self === "You" ? self : `${self} (you)`
  }
  if (isClassroomLeaderboardPeerBlurred(entry, blurPeerNames)) {
    const place = entryPlace(entry, options?.listIndex)
    return place > 0 ? `Student ${place}` : "Student"
  }
  return entry.full_name?.trim() || "Student"
}

/** Points stay visible under privacy — only names are anonymized. */
export function classroomLeaderboardPointsLabel(
  entry: Pick<ClassroomLeaderboardEntry, "total_points">,
): string {
  return `${formatPoints(entry.total_points)} pts`
}
