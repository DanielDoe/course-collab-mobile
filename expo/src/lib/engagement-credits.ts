/** Gradebook engagement credits display max (matches web `ENGAGEMENT_POINTS.gradebookTotalMax`). */
export const GRADEBOOK_ENGAGEMENT_CREDITS_MAX = 100

/** Normalize gradebook engagement credits for UI (0–100, one decimal). */
export function clampGradebookEngagementCredits(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return (
    Math.round(Math.min(GRADEBOOK_ENGAGEMENT_CREDITS_MAX, Math.max(0, n)) * 10) / 10
  )
}
