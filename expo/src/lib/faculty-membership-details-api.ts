import { API_BASE_URL } from "../constants"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { FacultySession } from "./session"
import { instructorApi } from "./instructor-api"

export type FacultyMembershipPaymentMethod = {
  label: string
  brand?: string | null
  last4?: string | null
}

export type FacultyMembershipSubscriptionDetails = {
  tier: FacultyMembershipTier
  status: string
  isActive: boolean
  purchasedAt: string | null
  validThrough: string | null
  billingCadence: "semester" | "annual" | null
  cancelAtPeriodEnd: boolean
  autoRenew: boolean
  paymentMethod: FacultyMembershipPaymentMethod | null
  isFreeTier: boolean
  hasStripeSubscription: boolean
}

export type FacultyMembershipDetailsResponse = {
  currentTier: FacultyMembershipTier
  subscription: FacultyMembershipSubscriptionDetails
  billing?: {
    availableCadences?: Array<"semester" | "annual">
    defaultCadence?: "semester" | "annual"
  }
}

export async function fetchFacultyMembershipDetails(
  session: FacultySession,
): Promise<FacultyMembershipDetailsResponse> {
  return instructorApi.getMembershipDetails(session.id)
}

export async function cancelFacultyMembershipSubscription(
  session: FacultySession,
): Promise<{ message?: string }> {
  return instructorApi.cancelMembership(session.id)
}

export async function reactivateFacultyMembershipSubscription(
  session: FacultySession,
): Promise<{ message?: string; plan?: string }> {
  return instructorApi.reactivateMembership(session.id)
}

export function formatFacultyMembershipDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function facultyMembershipStatusLabel(
  plan: FacultyMembershipTier,
  currentTier: FacultyMembershipTier,
  details: FacultyMembershipSubscriptionDetails | null,
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

  const tierRank: Record<FacultyMembershipTier, number> = {
    Free: 0,
    Pro: 1,
    Enterprise: 2,
  }
  if (tierRank[currentTier] > tierRank[plan]) {
    return { label: "Included in your plan", tone: "included" }
  }

  return { label: "Not active", tone: "inactive" }
}

export function buildFallbackFacultyMembershipDetails(
  tier: FacultyMembershipTier,
  expiresAt?: string | null,
): FacultyMembershipDetailsResponse {
  const isFreeTier = tier === "Free"
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
    billing: { availableCadences: ["semester", "annual"], defaultCadence: "semester" },
  }
}

export async function fetchFacultyMembershipDetailsSafe(
  session: FacultySession,
  fallbackTier: FacultyMembershipTier,
  fallbackExpiresAt?: string | null,
): Promise<FacultyMembershipDetailsResponse> {
  try {
    return await fetchFacultyMembershipDetails(session)
  } catch {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/instructor/membership/details?instructorId=${encodeURIComponent(String(session.id))}`,
        { headers: { Accept: "application/json" } },
      )
      if (response.ok) {
        return (await response.json()) as FacultyMembershipDetailsResponse
      }
    } catch {
      /* use fallback */
    }
    return buildFallbackFacultyMembershipDetails(fallbackTier, fallbackExpiresAt)
  }
}
