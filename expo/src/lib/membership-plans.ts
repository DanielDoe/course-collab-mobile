import type { Ionicons } from "@expo/vector-icons"
import type { MembershipTier } from "../types/dashboard"

export type BillingCadence = "monthly" | "semester"

export type MembershipPlan = {
  id: MembershipTier
  name: string
  tagline: string
  monthlyPriceCents: number
  semesterPriceCents: number
  listPriceCents?: number
  /** Solid plan header background */
  headerBg: string
  accent: string
  accentDark: string
  softBg: string
  softBorder: string
  icon: keyof typeof Ionicons.glyphMap
  perks: string[]
  highlight?: string
}

export type MembershipFeatureRow = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  scholar: string | false
  explorer: string | false
  trailblazer: string | false
}

/** Tier card colors — Color Hunt cool palette; fixed at render (not appearance theme). */
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "Scholar",
    name: "Scholar",
    tagline: "Everything you need for your course",
    monthlyPriceCents: 0,
    semesterPriceCents: 0,
    headerBg: "#3D4578",
    accent: "#525EA7",
    accentDark: "#3D4578",
    softBg: "rgba(82, 94, 167, 0.12)",
    softBorder: "rgba(82, 94, 167, 0.28)",
    icon: "school-outline",
    perks: [
      "Lectures, syllabus & class calendar",
      "Quizzes, homework, exams & grades",
      "Forum, groups & project playground",
      "Classroom points, attendance & trade center",
      "Practice Hub topic previews",
      "Flashcard deck previews",
      "Announcements & office hours requests",
    ],
  },
  {
    id: "Explorer",
    name: "Explorer",
    tagline: "AI-powered learning on your schedule",
    monthlyPriceCents: 599,
    semesterPriceCents: 1999,
    listPriceCents: 2999,
    headerBg: "#3A8FB8",
    accent: "#5FACD3",
    accentDark: "#3A8FB8",
    softBg: "rgba(95, 172, 211, 0.12)",
    softBorder: "rgba(95, 172, 211, 0.28)",
    icon: "compass-outline",
    highlight: "Most popular",
    perks: [
      "Everything in Scholar",
      "Cora — personalized Q&A",
      "AI Notetaker for lecture capture",
      "Practice Hub — half of each topic unlocked",
      "Flashcards — half of each deck unlocked",
      "Practice hub leaderboard rankings",
      "Extended due-date platform perks",
      "Early access to new learning modules",
    ],
  },
  {
    id: "Trailblazer",
    name: "Trailblazer",
    tagline: "Full platform power for top performers",
    monthlyPriceCents: 999,
    semesterPriceCents: 3999,
    listPriceCents: 4999,
    headerBg: "#C9922A",
    accent: "#FFC349",
    accentDark: "#C9922A",
    softBg: "rgba(255, 195, 73, 0.16)",
    softBorder: "rgba(255, 195, 73, 0.32)",
    icon: "diamond-outline",
    highlight: "Best value",
    perks: [
      "Everything in Explorer",
      "Practice Hub — full question bank per topic",
      "Flashcards — full deck access",
      "CodeBench IDE with multi-language AI assist",
      "Analytics & More — badges, streaks, XP",
      "Deep submission & performance insights",
      "Advanced coding leaderboard stats",
      "Priority support response",
    ],
  },
]

export const MEMBERSHIP_FEATURE_MATRIX: MembershipFeatureRow[] = [
  {
    id: "course",
    label: "Course modules & grades",
    icon: "book-outline",
    scholar: "Included",
    explorer: "Included",
    trailblazer: "Included",
  },
  {
    id: "cora",
    label: "Cora AI tutor",
    icon: "chatbubble-ellipses-outline",
    scholar: "250 credits / month",
    explorer: "30,000 credits / month",
    trailblazer: "75,000 credits / month",
  },
  {
    id: "notetaker",
    label: "AI Notetaker",
    icon: "mic-outline",
    scholar: false,
    explorer: "Included",
    trailblazer: "Included",
  },
  {
    id: "practice",
    label: "Practice Hub access",
    icon: "fitness-outline",
    scholar: "Topic previews",
    explorer: "50% per topic",
    trailblazer: "Full question bank",
  },
  {
    id: "flashcards",
    label: "Flashcards access",
    icon: "layers-outline",
    scholar: "Deck previews",
    explorer: "50% per deck",
    trailblazer: "Full deck access",
  },
  {
    id: "leaderboard",
    label: "Practice leaderboard",
    icon: "podium-outline",
    scholar: false,
    explorer: "Included",
    trailblazer: "Included",
  },
  {
    id: "codebench",
    label: "CodeBench IDE",
    icon: "code-slash-outline",
    scholar: false,
    explorer: false,
    trailblazer: "Included",
  },
  {
    id: "analytics",
    label: "Analytics & achievements",
    icon: "bar-chart-outline",
    scholar: false,
    explorer: false,
    trailblazer: "Included",
  },
  {
    id: "retakes",
    label: "Quiz retake allowance",
    icon: "refresh-outline",
    scholar: "1 attempt",
    explorer: "2 attempts",
    trailblazer: "3 attempts",
  },
]

const TIER_RANK: Record<MembershipTier, number> = {
  Scholar: 0,
  Explorer: 1,
  Trailblazer: 2,
}

export function getMembershipPlan(tier: MembershipTier): MembershipPlan {
  return MEMBERSHIP_PLANS.find((p) => p.id === tier) ?? MEMBERSHIP_PLANS[0]
}

export function isTierAtLeast(current: MembershipTier, required: MembershipTier): boolean {
  return TIER_RANK[current] >= TIER_RANK[required]
}

export function nextUpgradeTier(current: MembershipTier): MembershipTier | null {
  if (current === "Scholar") return "Explorer"
  if (current === "Explorer") return "Trailblazer"
  return null
}

export function formatPriceFromCents(cents: number): string {
  if (cents <= 0) return "Free"
  return `$${(cents / 100).toFixed(2)}`
}

export function formatSemesterPrice(cents: number): string {
  if (cents <= 0) return "Free"
  return `${formatPriceFromCents(cents)}/semester`
}

/** Merge live API semester prices onto static plan metadata. */
export function mergePlanPricing(
  plans: MembershipPlan[],
  pricing: Record<MembershipTier, number>,
): MembershipPlan[] {
  return plans.map((plan) => ({
    ...plan,
    semesterPriceCents: pricing[plan.id] ?? plan.semesterPriceCents,
  }))
}

export function formatListPriceFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
