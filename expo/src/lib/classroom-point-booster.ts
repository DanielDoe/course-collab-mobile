const CLASSROOM_BASE_POINTS = 2.5

/** Display points when the API stored 2.5 but a timing booster applies. */
export function resolveClassroomDisplayPoints(
  points: number,
  pointBooster?: number | null,
): number {
  const booster = Math.max(1, Number(pointBooster) || 1)
  const stored = Number(points) || 0
  if (stored > 0 && stored <= CLASSROOM_BASE_POINTS + 0.01 && booster > 1) {
    return Number.parseFloat((stored * booster).toFixed(2))
  }
  return stored
}
