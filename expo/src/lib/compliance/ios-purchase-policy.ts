import { Platform } from "react-native"

/**
 * iOS App Store payment compliance.
 * Central purchase routing lives in purchase-navigation.ts.
 */
export const IOS_PURCHASE_POLICY = {
  nativeDigitalCheckoutAllowed: Platform.OS !== "ios",
  restorePurchasesSupported: false,
  purchaseUiHidden: Platform.OS === "ios",
} as const

export {
  requiresExternalWebPurchase,
  shouldBlockNativeDigitalCheckout,
  isIosPurchaseUiHidden,
  shouldShowPurchaseCta,
  iosMembershipRequiredNotice,
  iosInsufficientCoraCreditsNotice,
  iosCoraLiteNotice,
  iosLowCoraCreditsNotice,
  tierLockedAlertButtons,
  insufficientCreditsAlertButtons,
  resolvePurchaseWebUrl,
  openPurchaseWebPath,
  openMembershipPurchase,
  openBillingPortal,
  openUpgradePage,
  openCreditPurchase,
  openGuestCreditPurchase,
  openGuestCoraCareerPurchase,
  iosMembershipPurchaseNotice,
  iosCoraCreditsPurchaseNotice,
  iosExternalPurchaseCtaLabel,
  iosManageOnWebCtaLabel,
} from "../purchase-navigation"

/** @deprecated Use resolvePurchaseWebUrl. */
export function membershipWebCheckoutUrl(path: string): string {
  const { resolvePurchaseWebUrl } = require("../purchase-navigation") as typeof import("../purchase-navigation")
  return resolvePurchaseWebUrl(path)
}
