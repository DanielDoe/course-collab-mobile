import type { MembershipTier } from "../types/dashboard"
import type { MembershipPlan } from "./membership-plans"

import type { Ionicons } from "@expo/vector-icons"

export type MembershipCheckoutHeroCopy = {
  badgeIcon: keyof typeof Ionicons.glyphMap
  headlineLine1: string
  headlineAccent: string
  description: string
  paymentNote: string
}

export const MEMBERSHIP_CHECKOUT_HERO_COPY: Record<MembershipTier, MembershipCheckoutHeroCopy> = {
  Scholar: {
    badgeIcon: "school-outline",
    headlineLine1: "Learn more.",
    headlineAccent: "Stress less.",
    description: "Everything you need for your course — included with enrollment.",
    paymentNote: "Included with enrollment",
  },
  Explorer: {
    badgeIcon: "sparkles-outline",
    headlineLine1: "Unlock your",
    headlineAccent: "learning edge.",
    description: "AI-powered learning tools built around your semester.",
    paymentNote: "One-time semester access",
  },
  Trailblazer: {
    badgeIcon: "diamond-outline",
    headlineLine1: "Lead your",
    headlineAccent: "semester.",
    description: "Full platform power for top performers — analytics, CodeBench, and more.",
    paymentNote: "One-time semester access",
  },
}

export function membershipCheckoutHeroCopy(plan: MembershipPlan): MembershipCheckoutHeroCopy {
  return MEMBERSHIP_CHECKOUT_HERO_COPY[plan.id]
}
