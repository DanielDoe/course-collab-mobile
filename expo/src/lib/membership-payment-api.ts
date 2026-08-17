import type { StudentSession } from "./session"
import { studentApi } from "./student-api"
import { instructorApi } from "./instructor-api"
import type { MembershipTier } from "../types/dashboard"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { FacultyBillingCadence } from "./faculty-membership-plans"

export type MobilePaymentSheetResponse = {
  publishableKey: string
  customerId: string
  customerSessionClientSecret: string
  amountCents: number
  currency: string
  tier: string
  billingCadence: string
  merchantDisplayName: string
  merchantCountryCode: string
}

export type MobilePaymentIntentResponse = {
  clientSecret: string
  paymentIntentId: string
}

export async function prepareStudentMembershipPaymentSheet(
  session: StudentSession,
  tier: MembershipTier,
  billingCadence: "semester" | "monthly" = "semester",
): Promise<MobilePaymentSheetResponse> {
  return studentApi.prepareMembershipPaymentSheet(session, { tier, billingCadence })
}

export async function createStudentMembershipPaymentIntent(
  session: StudentSession,
  options: {
    tier: MembershipTier
    billingCadence?: "semester" | "monthly"
    paymentMethodId: string
    shouldSavePaymentMethod: boolean
  },
): Promise<MobilePaymentIntentResponse> {
  return studentApi.createMembershipPaymentIntent(session, options)
}

export async function prepareFacultyMembershipPaymentSheet(
  instructorId: number,
  tier: FacultyMembershipTier,
  billingCadence: FacultyBillingCadence = "semester",
): Promise<MobilePaymentSheetResponse> {
  return instructorApi.prepareMembershipPaymentSheet(instructorId, { tier, billingCadence })
}

export async function createFacultyMembershipPaymentIntent(
  instructorId: number,
  options: {
    tier: FacultyMembershipTier
    billingCadence?: FacultyBillingCadence
    paymentMethodId: string
    shouldSavePaymentMethod: boolean
  },
): Promise<MobilePaymentIntentResponse> {
  return instructorApi.createMembershipPaymentIntent(instructorId, options)
}
