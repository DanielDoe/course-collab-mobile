import { Linking } from "react-native"
import type { StudentSession } from "./session"
import type { MembershipTier } from "../types/dashboard"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { FacultyBillingCadence } from "./faculty-membership-plans"
import { startFacultyMembershipUpgrade, startStudentMembershipUpgrade } from "./membership-checkout-api"

/**
 * Opens Stripe's hosted Checkout (checkout.stripe.com) — not CourseCollab web.
 * Success/cancel return via coursecollab:// deep links so webhooks + sync can run.
 */
export async function openStudentStripeHostedCheckout(
  session: StudentSession,
  tier: MembershipTier,
  billingCadence: "semester" | "monthly" = "semester",
): Promise<{ sessionId?: string }> {
  const result = await startStudentMembershipUpgrade(session, tier, billingCadence)
  if (!result.requiresPayment) {
    return { sessionId: result.sessionId }
  }
  const url = result.redirectUrl?.trim()
  if (!url) {
    throw new Error(result.message || "Checkout URL was not returned by the server.")
  }
  const canOpen = await Linking.canOpenURL(url)
  if (!canOpen) {
    throw new Error("Unable to open Stripe checkout.")
  }
  await Linking.openURL(url)
  return { sessionId: result.sessionId }
}

export async function openFacultyStripeHostedCheckout(
  instructorId: number,
  tier: FacultyMembershipTier,
  billingCadence: FacultyBillingCadence = "semester",
): Promise<{ sessionId?: string }> {
  const result = await startFacultyMembershipUpgrade(instructorId, tier, billingCadence)
  if (!result.requiresPayment) {
    return { sessionId: result.sessionId }
  }
  const url = result.redirectUrl?.trim()
  if (!url) {
    throw new Error(result.message || "Checkout URL was not returned by the server.")
  }
  const canOpen = await Linking.canOpenURL(url)
  if (!canOpen) {
    throw new Error("Unable to open Stripe checkout.")
  }
  await Linking.openURL(url)
  return { sessionId: result.sessionId }
}
