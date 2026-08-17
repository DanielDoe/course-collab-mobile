import type { Router } from "expo-router"

export const GUEST_CORA_CAREER_CHECKOUT_ROUTE = "/guest/cora-career/checkout"

export function openGuestCoraCareerCheckout(router: Router): void {
  router.push(GUEST_CORA_CAREER_CHECKOUT_ROUTE as never)
}

export function openGuestCoraCreditsCheckout(router: Router, packId: string): void {
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
