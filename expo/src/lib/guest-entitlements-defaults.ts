import type { GuestEntitlements, GuestPlansResponse } from "./guest-types"
import {
  GUEST_CORA_CAREER_LIFETIME_CREDITS,
  GUEST_FREE_STARTER_CORA_CREDITS,
} from "./guest-membership-config"

/** Fallback when /api/guest/entitlements is unavailable (pre-deploy or offline). */
export function defaultGuestEntitlements(): GuestEntitlements {
  return {
    plan: "guest_free",
    capabilities: [
      "recommendations.request",
      "recommendations.view",
      "recommendations.brief",
      "messages.send",
    ],
    coraCareerLifetime: false,
    coraCredits: { available: GUEST_FREE_STARTER_CORA_CREDITS, isLow: false },
    flags: {
      guestWorkspaceEnabled: true,
      guestMembershipEnabled: true,
      coraCareerEnabled: true,
      guestRecommendationBriefEnabled: true,
      guestCareerResumeEnabled: true,
      guestCareerInterviewEnabled: true,
      guestCareerPersonalStatementEnabled: true,
      guestCareerApplicationPlanEnabled: true,
    },
    nav: {
      recommendations: true,
      career: true,
      messages: true,
    },
    planConfig: {
      priceLabel: "$0 · Lifetime",
      coraCreditsIncluded: GUEST_FREE_STARTER_CORA_CREDITS,
      upgradePriceLabel: "$19.99 one-time",
    },
  }
}

export function defaultGuestPlans(): GuestPlansResponse {
  return {
    checkoutEnabled: true,
    plans: [
      {
        id: "guest_free",
        label: "Career Member Free",
        priceLabel: "$0 · Lifetime",
        description: "Recommendation letters, messages, and credit-free brief assistance.",
        coraCreditsIncluded: GUEST_FREE_STARTER_CORA_CREDITS,
      },
      {
        id: "cora_career",
        label: "Cora Career Lifetime",
        priceLabel: "$19.99 one-time",
        description: `Lifetime career Cora tools plus ${GUEST_CORA_CAREER_LIFETIME_CREDITS.toLocaleString()} starter credits.`,
        coraCreditsIncluded: GUEST_CORA_CAREER_LIFETIME_CREDITS,
        highlight: true,
      },
    ],
    creditPacks: [
      {
        id: "quick_boost",
        label: "Quick Boost",
        credits: 10_000,
        priceLabel: "$2.99",
        priceCents: 299,
        description:
          "Top up for a résumé pass, one statement draft, or a short interview prep session.",
        highlights: ["1–2 focused AI sessions", "Résumé or statement touch-up", "Never expires"],
      },
      {
        id: "application_pack",
        label: "Application Pack",
        credits: 30_000,
        priceLabel: "$5.99",
        priceCents: 599,
        description: "Enough for a full application season — multiple programs, drafts, and revisions.",
        popular: true,
        highlights: ["Full application season", "Multiple statement drafts", "Interview prep included"],
      },
      {
        id: "career_pack",
        label: "Career Pack",
        credits: 75_000,
        priceLabel: "$9.99",
        priceCents: 999,
        description: "Extended runway across scholarships, grad school, and job applications.",
        highlights: ["Several parallel applications", "Deep résumé & portfolio review", "Heavy revision cycles"],
      },
      {
        id: "power_pack",
        label: "Power Pack",
        credits: 200_000,
        priceLabel: "$19.99",
        priceCents: 1999,
        description: "Maximum capacity for competitive cycles and multiple recommenders.",
        highlights: ["Maximum AI capacity", "Competitive program cycles", "Best $/credit value"],
      },
    ],
  }
}

export function guestHasCapability(
  entitlements: GuestEntitlements | null | undefined,
  capability: GuestEntitlements["capabilities"][number],
): boolean {
  return Boolean(entitlements?.capabilities?.includes(capability))
}

export function guestNeedsCoraCareerUpgrade(
  entitlements: GuestEntitlements | null | undefined,
): boolean {
  return entitlements?.plan !== "cora_career"
}
