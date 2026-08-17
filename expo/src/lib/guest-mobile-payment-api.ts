import { ApiError } from "./api"
import { isGuestApiUnavailableError } from "./guest-entitlements-production"
import { guestApi } from "./guest-api"
import type { MobilePaymentIntentResponse, MobilePaymentSheetResponse } from "./membership-payment-api"
import type { GuestSession } from "./session"

/** Guest native PaymentSheet routes are not deployed on all servers yet. */
export class GuestNativePaymentUnavailableError extends Error {
  readonly code = "GUEST_NATIVE_PAYMENT_UNAVAILABLE"

  constructor(message = "Native guest checkout is not available on this server yet.") {
    super(message)
    this.name = "GuestNativePaymentUnavailableError"
  }
}

export function isGuestNativePaymentUnavailable(error: unknown): boolean {
  if (error instanceof GuestNativePaymentUnavailableError) return true
  if (isGuestApiUnavailableError(error)) return true
  if (error instanceof ApiError && error.status === 404) return true
  return false
}

export type GuestCreditPackSheet = MobilePaymentSheetResponse & { packId: string; credits: number }

export async function prepareGuestCreditPackMobilePayment(
  session: GuestSession,
  packId: string,
): Promise<GuestCreditPackSheet> {
  return guestApi.prepareCreditPackMobilePayment(session, packId)
}

export async function createGuestCreditPackMobilePaymentIntent(
  session: GuestSession,
  options: { packId: string; paymentMethodId: string; shouldSavePaymentMethod: boolean },
): Promise<MobilePaymentIntentResponse> {
  return guestApi.createCreditPackMobilePaymentIntent(session, options)
}

export async function prepareGuestCoraCareerMobilePayment(
  session: GuestSession,
): Promise<MobilePaymentSheetResponse> {
  return guestApi.prepareCoraCareerMobilePayment(session)
}

export async function createGuestCoraCareerMobilePaymentIntent(
  session: GuestSession,
  options: { paymentMethodId: string; shouldSavePaymentMethod: boolean },
): Promise<MobilePaymentIntentResponse> {
  return guestApi.createCoraCareerMobilePaymentIntent(session, options)
}
