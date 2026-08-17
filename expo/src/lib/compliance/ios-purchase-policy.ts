import { Platform } from "react-native"
import { resolveApiBaseUrl } from "../../config/api"

/**
 * iOS App Store payment compliance.
 *
 * Digital memberships and Cora credits are not sold through native Stripe Payment Sheet on iOS.
 * Users may upgrade on the CourseCollab website; entitlements sync server-side.
 */
export const IOS_PURCHASE_POLICY = {
  nativeDigitalCheckoutAllowed: Platform.OS !== "ios",
  restorePurchasesSupported: false,
} as const

export function shouldBlockNativeDigitalCheckout(): boolean {
  return Platform.OS === "ios"
}

export function membershipWebCheckoutUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function iosMembershipPurchaseNotice(): string {
  return "Membership upgrades are completed on the CourseCollab website. Your plan syncs automatically after payment — you are not charged inside the iPhone app checkout sheet."
}

export function iosCoraCreditsPurchaseNotice(): string {
  return "Cora credit packs are purchased on the CourseCollab website. Credits sync to your account after payment completes."
}
