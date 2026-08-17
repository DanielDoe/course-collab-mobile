import type { MembershipTier } from "../types/dashboard"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { StudentSession } from "./session"
import { studentApi } from "./student-api"
import { instructorApi } from "./instructor-api"
import type { FacultyBillingCadence } from "./faculty-membership-plans"

export type MembershipUpgradeResponse = {
  success?: boolean
  requiresPayment?: boolean
  redirectUrl?: string | null
  sessionId?: string
  clientSecret?: string | null
  tier?: string
  message?: string
}

export type MembershipSyncResponse = {
  success?: boolean
  tier?: string
  updated?: boolean
  error?: string
}

export async function startStudentMembershipUpgrade(
  session: StudentSession,
  tier: MembershipTier,
  billingCadence: "semester" | "monthly" = "semester",
): Promise<MembershipUpgradeResponse> {
  return studentApi.upgradeMembership(session, { tier, billingCadence, mobileReturn: true })
}

export async function syncStudentMembershipFromStripe(
  session: StudentSession,
): Promise<MembershipSyncResponse> {
  return studentApi.syncMembershipStripe(session)
}

export async function startFacultyMembershipUpgrade(
  instructorId: number,
  tier: FacultyMembershipTier,
  billingCadence: FacultyBillingCadence = "semester",
): Promise<MembershipUpgradeResponse> {
  return instructorApi.upgradeMembership(instructorId, { tier, billingCadence, mobileReturn: true })
}

export async function syncFacultyMembershipFromStripe(
  instructorId: number,
  sessionId?: string,
): Promise<MembershipSyncResponse> {
  return instructorApi.syncMembershipStripe(instructorId, sessionId)
}
