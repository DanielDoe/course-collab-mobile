import { getAppEnvironment } from "./environment"

export const PAYMENTS_CONFIG = {
  /** Android Google Pay via Stripe Payment Sheet; iOS uses external CourseCollab web checkout. */
  provider: "stripe" as const,
  iosNativeDigitalCheckout: false,
  androidNativeDigitalCheckout: true,
  restorePurchasesSupported: false,
  entitlementsApiPath: "/api/account/entitlements",
} as const

export function validateProductionPaymentsConfig(): string[] {
  const errors: string[] = []
  if (getAppEnvironment() !== "production") return errors

  if (PAYMENTS_CONFIG.iosNativeDigitalCheckout) {
    errors.push("iOS native digital checkout must remain disabled.")
  }

  return errors
}
