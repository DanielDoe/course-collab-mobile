import type { Ionicons } from "@expo/vector-icons"

export type GuestCoraCareerCheckoutHeroCopy = {
  badgeIcon: keyof typeof Ionicons.glyphMap
  headlineLine1: string
  headlineAccent: string
  description: string
  paymentNote: string
}

export const GUEST_CORA_CAREER_CHECKOUT_HERO_COPY: GuestCoraCareerCheckoutHeroCopy = {
  badgeIcon: "ribbon-outline",
  headlineLine1: "Unlock your",
  headlineAccent: "career toolkit.",
  description: "Lifetime Cora Career coaching plus starter credits for applications and interviews.",
  paymentNote: "One-time lifetime purchase",
}

/** Short one-line perks for checkout review (matches membership checkout density). */
export function guestCoraCareerCheckoutPerks(creditsIncluded: number): string[] {
  return [
    "Everything in Guest Free — letters, messages, and briefs",
    "Cora Career Assistant for applications and career decisions",
    "Résumé review, interview prep, and personal statement coaching",
    "Application plan builder with deadline checklists",
    `${creditsIncluded.toLocaleString()} lifetime Cora credits included`,
  ]
}
