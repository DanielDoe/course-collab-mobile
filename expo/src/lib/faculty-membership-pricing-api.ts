import { API_BASE_URL } from "../constants"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { FacultyBillingCadence } from "./faculty-membership-plans"

export type FacultyMembershipPlanPricing = {
  id: FacultyMembershipTier
  name?: string
  displayName?: string
  description?: string
  tagline?: string
  semesterPriceCents: number
  annualPriceCents: number
  priceSource?: "stripe" | "constants"
  featureBullets?: string[]
  recommended?: boolean
}

export type FacultyMembershipPlansResponse = {
  plans: FacultyMembershipPlanPricing[]
  billing?: {
    availableCadences?: FacultyBillingCadence[]
    defaultCadence?: FacultyBillingCadence
  }
  source?: "stripe" | "constants"
}

const FALLBACK_PLANS: FacultyMembershipPlanPricing[] = [
  { id: "Free", semesterPriceCents: 0, annualPriceCents: 0 },
  { id: "Pro", semesterPriceCents: 9900, annualPriceCents: 24900 },
  { id: "Enterprise", semesterPriceCents: 19900, annualPriceCents: 49900 },
]

function normalizePlan(raw: Record<string, unknown>): FacultyMembershipPlanPricing | null {
  const id = raw.id
  if (id !== "Free" && id !== "Pro" && id !== "Enterprise") return null
  const semesterRaw = raw.semesterPriceInCents ?? raw.semesterPriceCents
  const annualRaw = raw.annualPriceInCents ?? raw.annualPriceCents
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : undefined,
    displayName: typeof raw.displayName === "string" ? raw.displayName : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    tagline: typeof raw.tagline === "string" ? raw.tagline : undefined,
    semesterPriceCents: typeof semesterRaw === "number" ? semesterRaw : 0,
    annualPriceCents: typeof annualRaw === "number" ? annualRaw : 0,
    priceSource: raw.priceSource === "stripe" || raw.priceSource === "constants" ? raw.priceSource : undefined,
    featureBullets: Array.isArray(raw.featureBullets)
      ? raw.featureBullets.filter((item): item is string => typeof item === "string")
      : undefined,
    recommended: raw.recommended === true,
  }
}

export async function fetchFacultyMembershipPlanPricing(
  instructorId?: number,
): Promise<FacultyMembershipPlansResponse> {
  const query = instructorId ? `?instructorId=${encodeURIComponent(String(instructorId))}` : ""
  try {
    const response = await fetch(`${API_BASE_URL}/api/instructor/membership/plans${query}`, {
      headers: { Accept: "application/json" },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = (await response.json()) as { plans?: Array<Record<string, unknown>>; billing?: FacultyMembershipPlansResponse["billing"]; source?: string }
    const plans = (body?.plans ?? [])
      .map(normalizePlan)
      .filter((plan): plan is FacultyMembershipPlanPricing => plan != null)
    if (plans.length > 0) {
      return {
        plans,
        billing: body.billing ?? {
          availableCadences: ["semester", "annual"],
          defaultCadence: "semester",
        },
        source: body.source === "stripe" ? "stripe" : "constants",
      }
    }
  } catch {
    /* use fallback below */
  }
  return {
    plans: FALLBACK_PLANS,
    billing: { availableCadences: ["semester", "annual"], defaultCadence: "semester" },
    source: "constants",
  }
}

export function semesterPriceCentsForFacultyTier(
  pricing: FacultyMembershipPlansResponse | null | undefined,
  tier: FacultyMembershipTier,
): number {
  const fromApi = pricing?.plans.find((plan) => plan.id === tier)?.semesterPriceCents
  if (typeof fromApi === "number") return fromApi
  return FALLBACK_PLANS.find((plan) => plan.id === tier)?.semesterPriceCents ?? 0
}

export function annualPriceCentsForFacultyTier(
  pricing: FacultyMembershipPlansResponse | null | undefined,
  tier: FacultyMembershipTier,
): number {
  const fromApi = pricing?.plans.find((plan) => plan.id === tier)?.annualPriceCents
  if (typeof fromApi === "number") return fromApi
  return FALLBACK_PLANS.find((plan) => plan.id === tier)?.annualPriceCents ?? 0
}

export function priceCentsForFacultyTier(
  pricing: FacultyMembershipPlansResponse | null | undefined,
  tier: FacultyMembershipTier,
  cadence: FacultyBillingCadence,
): number {
  if (cadence === "annual") return annualPriceCentsForFacultyTier(pricing, tier)
  return semesterPriceCentsForFacultyTier(pricing, tier)
}
