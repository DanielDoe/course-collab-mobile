import { Linking } from "react-native"
import { guestApi } from "./guest-api"
import { markGuestCheckoutPending } from "./use-guest-checkout-return"
import type { GuestSession } from "./session"

async function openStripeHostedUrl(url: string | undefined): Promise<string | undefined> {
  const trimmed = url?.trim()
  if (!trimmed) {
    throw new Error("Checkout URL was not returned by the server.")
  }
  const canOpen = await Linking.canOpenURL(trimmed)
  if (!canOpen) {
    throw new Error("Unable to open Stripe checkout.")
  }
  await markGuestCheckoutPending()
  await Linking.openURL(trimmed)
  return trimmed
}

export async function openGuestCreditPackHostedCheckout(
  session: GuestSession,
  packId: string,
): Promise<{ sessionId?: string }> {
  const result = await guestApi.startCreditPackCheckout(session, packId)
  await openStripeHostedUrl(result.url)
  return { sessionId: result.sessionId }
}

export async function openGuestCoraCareerHostedCheckout(
  session: GuestSession,
): Promise<{ sessionId?: string }> {
  const result = await guestApi.startCoraCareerCheckout(session)
  await openStripeHostedUrl(result.url)
  return { sessionId: result.sessionId }
}
