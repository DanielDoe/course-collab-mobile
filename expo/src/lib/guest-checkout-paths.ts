import type { Router } from "expo-router"
import {
  openGuestCoraCareerPurchase,
  openGuestCreditPurchase,
  isIosPurchaseUiHidden,
  requiresExternalWebPurchase,
} from "./purchase-navigation"
import type { GuestSession } from "./session"

export const GUEST_CORA_CAREER_CHECKOUT_ROUTE = "/guest/cora-career/checkout"

export function openGuestCoraCareerCheckout(router: Router, session?: GuestSession | null): void {
  if (isIosPurchaseUiHidden()) return
  if (requiresExternalWebPurchase() && session) {
    void openGuestCoraCareerPurchase(session)
    return
  }
  router.push(GUEST_CORA_CAREER_CHECKOUT_ROUTE as never)
}

export function openGuestCoraCreditsCheckout(
  router: Router,
  packId: string,
  session?: GuestSession | null,
): void {
  if (isIosPurchaseUiHidden()) return
  if (requiresExternalWebPurchase() && session) {
    void openGuestCreditPurchase(session, packId)
    return
  }
  router.push({
    pathname: "/guest/cora-credits/checkout",
    params: { packId },
  } as never)
}

export function openGuestCoraCareerSuccess(router: Router): void {
  router.replace("/guest/cora-career/success" as never)
}

export function openGuestCoraCreditsSuccess(router: Router, packId?: string): void {
  router.replace({
    pathname: "/guest/cora-credits/success",
    params: packId ? { packId } : {},
  } as never)
}
