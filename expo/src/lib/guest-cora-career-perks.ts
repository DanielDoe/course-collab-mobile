import type { Ionicons } from "@expo/vector-icons"
import {
  GUEST_CORA_CAREER_LIFETIME_CREDITS,
  GUEST_FREE_STARTER_CORA_CREDITS,
} from "./guest-membership-config"

export type GuestPlanPerk = {
  id: string
  label: string
  detail?: string
  icon: keyof typeof Ionicons.glyphMap
}

export type GuestPlanPerkTier = {
  id: "guest_free" | "cora_career"
  label: string
  priceLabel: string
  tagline: string
  creditsIncluded: number
  perks: GuestPlanPerk[]
}

export const GUEST_FREE_PERKS: GuestPlanPerk[] = [
  {
    id: "recommendations",
    label: "Recommendation letter requests",
    detail: "Request, track, and manage letters in one workspace",
    icon: "document-text-outline",
  },
  {
    id: "messages",
    label: "Instructor messaging",
    detail: "Coordinate deadlines and follow-ups securely",
    icon: "mail-outline",
  },
  {
    id: "briefs",
    label: "Credit-free recommendation briefs",
    detail: "Generate and refine briefs without spending credits",
    icon: "sparkles-outline",
  },
  {
    id: "starter-credits",
    label: `${GUEST_FREE_STARTER_CORA_CREDITS.toLocaleString()} lifetime starter credits`,
    detail: "Use across eligible Cora tools while you explore the platform",
    icon: "wallet-outline",
  },
]

export const GUEST_CORA_CAREER_PERKS: GuestPlanPerk[] = [
  {
    id: "everything-free",
    label: "Everything in Guest Free",
    detail: "Letters, messages, briefs, and your starter balance",
    icon: "layers-outline",
  },
  {
    id: "career-assistant",
    label: "Cora Career Assistant",
    detail: "Chat-first coaching for applications and career decisions",
    icon: "chatbubbles-outline",
  },
  {
    id: "resume",
    label: "Résumé review",
    detail: "Structure, bullet polish, and impact-focused feedback",
    icon: "reader-outline",
  },
  {
    id: "interview",
    label: "Interview prep",
    detail: "Practice prompts, framing, and follow-up strategy",
    icon: "mic-outline",
  },
  {
    id: "personal-statement",
    label: "Personal statement coaching",
    detail: "Draft, refine, and align your narrative",
    icon: "create-outline",
  },
  {
    id: "application-plan",
    label: "Application plan builder",
    detail: "Deadlines, materials, and milestone checklists",
    icon: "calendar-outline",
  },
  {
    id: "lifetime-credits",
    label: `${GUEST_CORA_CAREER_LIFETIME_CREDITS.toLocaleString()} lifetime Cora credits`,
    detail: "One-time purchase — no subscription",
    icon: "flash-outline",
  },
]

export function buildGuestPlanTiers(opts?: {
  freePriceLabel?: string
  careerPriceLabel?: string
  careerCreditsIncluded?: number
}): GuestPlanPerkTier[] {
  const careerCredits = opts?.careerCreditsIncluded ?? GUEST_CORA_CAREER_LIFETIME_CREDITS
  const careerCreditPerk = GUEST_CORA_CAREER_PERKS.find((p) => p.id === "lifetime-credits")
  const careerPerks = GUEST_CORA_CAREER_PERKS.map((perk) =>
    perk.id === "lifetime-credits" && careerCreditPerk
      ? {
          ...perk,
          label: `${careerCredits.toLocaleString()} lifetime Cora credits`,
        }
      : perk,
  )

  return [
    {
      id: "guest_free",
      label: "Career Member Free",
      priceLabel: opts?.freePriceLabel ?? "$0 · Lifetime",
      tagline: "Recommendation letters and workspace essentials",
      creditsIncluded: GUEST_FREE_STARTER_CORA_CREDITS,
      perks: GUEST_FREE_PERKS,
    },
    {
      id: "cora_career",
      label: "Cora Career",
      priceLabel: opts?.careerPriceLabel ?? "$19.99 one-time",
      tagline: "Lifetime career coaching tools and credits",
      creditsIncluded: careerCredits,
      perks: careerPerks,
    },
  ]
}
