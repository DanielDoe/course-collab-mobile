import type { GuestEntitlements } from "./guest-types"

const POLL_INTERVAL_MS = 2500
const MAX_ATTEMPTS = 12

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Poll entitlements until plan/credits change or attempts exhausted (post-Stripe Checkout). */
export async function pollGuestEntitlementsUntilChanged(
  fetchEntitlements: () => Promise<GuestEntitlements>,
  baseline: Pick<GuestEntitlements, "plan" | "coraCredits">,
): Promise<GuestEntitlements | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(POLL_INTERVAL_MS)
    try {
      const next = await fetchEntitlements()
      const planChanged = next.plan !== baseline.plan
      const creditsChanged = next.coraCredits.available !== baseline.coraCredits.available
      if (planChanged || creditsChanged) return next
    } catch {
      // keep polling
    }
  }
  return null
}
