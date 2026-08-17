/**
 * Payment methods for Cora Credit Packs (small one-time amounts).
 * Card + Link only — Cash App / ACH redirects are flaky for $1.99–$9.99 packs
 * and were leaving the sheet stuck or blank after dismiss.
 */
export function coraPackPaymentMethodTypes(): string[] {
  return ["card", "link"]
}

/**
 * Membership semester checkout methods (larger amounts).
 * Keep in sync with v0-coursecollabv3/lib/membership-mobile-payment-methods.ts
 */
export function membershipPaymentMethodTypesForAmount(_amountCents: number): string[] {
  return ["card", "link", "cashapp", "us_bank_account"]
}
