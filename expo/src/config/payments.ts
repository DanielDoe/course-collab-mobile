import { getAppEnvironment } from "./environment"

export const PAYMENTS_CONFIG = {
  merchantIdentifier: "merchant.com.coursecollab.app",
  /** Android uses Stripe Payment Sheet; iOS digital goods use external web checkout until StoreKit. */
  provider: "stripe" as const,
  iosNativeDigitalCheckout: false,
  restorePurchasesSupported: false,
  entitlementsApiPath: "/api/account/entitlements",
} as const

export function validateProductionPaymentsConfig(): string[] {
  const errors: string[] = []
  if (getAppEnvironment() !== "production") return errors

  if (!PAYMENTS_CONFIG.merchantIdentifier.startsWith("merchant.")) {
    errors.push("Invalid Apple Pay merchant identifier.")
  }

  if (PAYMENTS_CONFIG.iosNativeDigitalCheckout) {
    errors.push("iOS native digital checkout must remain disabled until StoreKit is implemented.")
  }

  return errors
}
