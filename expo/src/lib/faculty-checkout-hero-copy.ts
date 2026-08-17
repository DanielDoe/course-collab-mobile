import type { Ionicons } from "@expo/vector-icons"
import type { FacultyMembershipTier } from "../types/dashboard"
import type { FacultyMembershipPlan } from "./faculty-membership-plans"
import type { FacultyBillingCadence } from "./faculty-membership-plans"
import type { MembershipCheckoutHeroCopy } from "./membership-checkout-hero-copy"

export const FACULTY_CHECKOUT_HERO_COPY: Record<FacultyMembershipTier, MembershipCheckoutHeroCopy> = {
  Free: {
    badgeIcon: "school-outline",
    headlineLine1: "Teach smarter.",
    headlineAccent: "Start free.",
    description: "Explore CourseCollab or teach a single small course at no cost.",
    paymentNote: "Free tier",
  },
  Pro: {
    badgeIcon: "sparkles-outline",
    headlineLine1: "Unlock your",
    headlineAccent: "teaching edge.",
    description: "Cora Teaching Copilot and full course authoring for your semester.",
    paymentNote: "Semester or annual billing",
  },
  Enterprise: {
    badgeIcon: "business-outline",
    headlineLine1: "Scale across",
    headlineAccent: "your department.",
    description: "Multi-section coordination, analytics, and enterprise Cora capacity.",
    paymentNote: "Semester or annual billing",
  },
}

export function facultyCheckoutHeroCopy(plan: FacultyMembershipPlan): MembershipCheckoutHeroCopy {
  return FACULTY_CHECKOUT_HERO_COPY[plan.id]
}

export function facultyCheckoutPaymentNote(cadence: FacultyBillingCadence): string {
  return cadence === "annual" ? "Annual billing" : "One-time semester access"
}
