import { API_BASE_URL } from "../constants"
import type { MembershipTier } from "../types/dashboard"
import type { StudentSession } from "./session"
import { studentApi } from "./student-api"

export type MembershipPaymentMethod = {
  label: string
  brand?: string | null
  last4?: string | null
}

export type MembershipSubscriptionDetails = {
  tier: MembershipTier
  status: string
  isActive: boolean
  purchasedAt: string | null
  validThrough: string | null
  billingCadence: "semester" | "monthly" | null
  cancelAtPeriodEnd: boolean
  autoRenew: boolean
  paymentMethod: MembershipPaymentMethod | null
  isFreeTier: boolean
  hasStripeSubscription: boolean
}

export type MembershipDetailsResponse = {
  currentTier: MembershipTier
  subscription: MembershipSubscriptionDetails
  billing?: {
    semesterOnly?: boolean
    availableCadences?: Array<"semester" | "monthly">
  }
}

export async function fetchMembershipDetails(
  session: StudentSession,
): Promise<MembershipDetailsResponse> {
  return studentApi.getMembershipDetails(session)
}

export async function cancelMembershipSubscription(session: StudentSession): Promise<{ message?: string }> {
  return studentApi.cancelMembership(session)
}

export async function reactivateMembershipSubscription(
  session: StudentSession,
): Promise<{ message?: string; plan?: string }> {
  return studentApi.reactivateMembership(session)
}

export function formatMembershipDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function membershipStatusLabel(
  plan: MembershipTier,
  currentTier: MembershipTier,
  details: MembershipSubscriptionDetails | null,
): { label: string; tone: "active" | "inactive" | "included" | "warning" | "expired" } {
  if (plan === currentTier) {
    if (!details || details.isFreeTier) {
      return { label: "Active · included", tone: "active" }
    }
    if (details.cancelAtPeriodEnd) {
      return { label: "Active · ends soon", tone: "warning" }
    }
    if (details.status === "expired" || details.status === "cancelled" || details.status === "canceled") {
      return { label: "Expired", tone: "expired" }
    }
    return { label: "Active", tone: "active" }
  }

  const tierRank: Record<MembershipTier, number> = {
    Scholar: 0,
    Explorer: 1,
    Trailblazer: 2,
  }
  if (tierRank[currentTier] > tierRank[plan]) {
    return { label: "Included in your plan", tone: "included" }
  }

  return { label: "Not active", tone: "inactive" }
}

/** Fallback when details API is unavailable (not yet deployed). */
export function buildFallbackMembershipDetails(
  tier: MembershipTier,
  expiresAt?: string | null,
): MembershipDetailsResponse {
  const isFreeTier = tier === "Scholar"
  return {
    currentTier: tier,
    subscription: {
      tier,
      status: "active",
      isActive: !isFreeTier,
      purchasedAt: null,
      validThrough: expiresAt ?? null,
      billingCadence: "semester",
      cancelAtPeriodEnd: false,
      autoRenew: false,
      paymentMethod: null,
      isFreeTier,
      hasStripeSubscription: false,
    },
    billing: { semesterOnly: true, availableCadences: ["semester"] },
  }
}

export async function fetchMembershipDetailsSafe(
  session: StudentSession,
  fallbackTier: MembershipTier,
  fallbackExpiresAt?: string | null,
): Promise<MembershipDetailsResponse> {
  try {
    return await fetchMembershipDetails(session)
  } catch {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/student/membership/details?studentId=${encodeURIComponent(session.databaseId)}`,
        { headers: { Accept: "application/json" } },
      )
      if (response.ok) {
        return (await response.json()) as MembershipDetailsResponse
      }
    } catch {
      /* use fallback */
    }
    return buildFallbackMembershipDetails(fallbackTier, fallbackExpiresAt)
  }
}
