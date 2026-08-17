/** Mirrors `lib/guest/membership-config.ts` on web — keep in sync with backend. */

/** Guest Free lifetime starter balance (same as Scholar). */
export const GUEST_FREE_STARTER_CORA_CREDITS = 250

/** Cora Career lifetime purchase included credits. */
export const GUEST_CORA_CAREER_LIFETIME_CREDITS = 7_500

export function formatGuestCreditsLabel(credits: number): string {
  return credits.toLocaleString()
}
