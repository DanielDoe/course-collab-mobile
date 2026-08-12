import { API_BASE_URL } from "../constants"
import type { MembershipTier } from "../types/dashboard"

export type MembershipPlanPricing = {
  id: MembershipTier
  name?: string
  displayName?: string
  description?: string
  semesterPriceCents: number
  monthlyPriceCents?: number
  priceSource?: "stripe" | "constants"
}

export type MembershipPlansResponse = {
  plans: MembershipPlanPricing[]
  billing?: {
    semesterOnly?: boolean
    availableCadences?: Array<"semester" | "monthly">
    defaultCadence?: "semester" | "monthly"
  }
  source?: "stripe" | "constants"
}

const FALLBACK_PLANS: MembershipPlanPricing[] = [
  { id: "Scholar", semesterPriceCents: 0, monthlyPriceCents: 0 },
  { id: "Explorer", semesterPriceCents: 2499, monthlyPriceCents: 599 },
  { id: "Trailblazer", semesterPriceCents: 3999, monthlyPriceCents: 999 },
]

export async function fetchMembershipPlanPricing(
  studentId?: string,
): Promise<MembershipPlansResponse> {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""
  try {
    const response = await fetch(`${API_BASE_URL}/api/student/membership/plans${query}`, {
      headers: { Accept: "application/json" },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = (await response.json()) as MembershipPlansResponse
    if (Array.isArray(body?.plans) && body.plans.length > 0) return body
  } catch {
    /* use fallback below */
  }
  return {
    plans: FALLBACK_PLANS,
    billing: { semesterOnly: true, defaultCadence: "semester", availableCadences: ["semester"] },
    source: "constants",
  }
}

export function semesterPriceCentsForTier(
  pricing: MembershipPlansResponse | null | undefined,
  tier: MembershipTier,
): number {
  const fromApi = pricing?.plans.find((plan) => plan.id === tier)?.semesterPriceCents
  if (typeof fromApi === "number") return fromApi
  return FALLBACK_PLANS.find((plan) => plan.id === tier)?.semesterPriceCents ?? 0
}
