import type { Ionicons } from "@expo/vector-icons"
import type { FacultyMembershipTier } from "../types/dashboard"

export type FacultyBillingCadence = "semester" | "annual"

export type FacultyMembershipPlan = {
  id: FacultyMembershipTier
  name: string
  tagline: string
  semesterPriceCents: number
  annualPriceCents: number
  headerBg: string
  accent: string
  accentDark: string
  softBg: string
  softBorder: string
  icon: keyof typeof Ionicons.glyphMap
  perks: string[]
  highlight?: string
}

export type FacultyMembershipFeatureRow = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  free: string | false
  pro: string | false
  enterprise: string | false
}

/** Tier card colors — Color Hunt cool palette; fixed at render (not appearance theme). */
export const FACULTY_MEMBERSHIP_PLANS: FacultyMembershipPlan[] = [
  {
    id: "Free",
    name: "Instructor Free",
    tagline: "Explore CourseCollab or teach a single small course",
    semesterPriceCents: 0,
    annualPriceCents: 0,
    headerBg: "#3D4578",
    accent: "#525EA7",
    accentDark: "#3D4578",
    softBg: "rgba(82, 94, 167, 0.12)",
    softBorder: "rgba(82, 94, 167, 0.28)",
    icon: "school-outline",
    perks: [
      "Up to 1 course & 50 students",
      "Basic assessment management",
      "Question Bank & manual content",
      "Basic grading tools",
      "Limited Cora Copilot (100 AI requests / semester)",
      "Community support",
    ],
  },
  {
    id: "Pro",
    name: "Instructor Pro",
    tagline: "Cora Teaching Copilot + complete course authoring suite",
    semesterPriceCents: 9900,
    annualPriceCents: 24900,
    headerBg: "#3A8FB8",
    accent: "#5FACD3",
    accentDark: "#3A8FB8",
    softBg: "rgba(95, 172, 211, 0.12)",
    softBorder: "rgba(95, 172, 211, 0.28)",
    icon: "sparkles-outline",
    highlight: "Most popular",
    perks: [
      "Everything in Free",
      "Unlimited courses & students",
      "Full Cora Teaching Copilot",
      "AI question, quiz, homework & exam generators",
      "AI lecture, flashcard, rubric & notes generators",
      "Student risk detection & course analytics",
      "Office hour & recommendation letter assistants",
      "Export to PDF, Word, and PowerPoint",
      "Priority AI models & priority support",
    ],
  },
  {
    id: "Enterprise",
    name: "Instructor Enterprise",
    tagline: "Department-scale teaching for coordinated multi-section courses",
    semesterPriceCents: 19900,
    annualPriceCents: 49900,
    headerBg: "#C9922A",
    accent: "#FFC349",
    accentDark: "#C9922A",
    softBg: "rgba(255, 195, 73, 0.16)",
    softBorder: "rgba(255, 195, 73, 0.32)",
    icon: "business-outline",
    highlight: "Best for departments",
    perks: [
      "Everything in Pro",
      "Multiple instructors & shared question banks",
      "Shared Cora knowledge base",
      "Department & cross-course analytics",
      "Teaching Assistant management",
      "Department templates & shared assessment libraries",
      "Accreditation & ABET report generation",
      "Collaborative course authoring",
      "Advanced permissions & dedicated onboarding",
    ],
  },
]

export const FACULTY_MEMBERSHIP_FEATURE_MATRIX: FacultyMembershipFeatureRow[] = [
  {
    id: "courses",
    label: "Courses & students",
    icon: "book-outline",
    free: "1 course · 50 students",
    pro: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    id: "cora",
    label: "Cora Teaching Copilot",
    icon: "sparkles-outline",
    free: "500 credits / semester",
    pro: "15,000 credits / semester",
    enterprise: "35,000 credits / semester",
  },
  {
    id: "ai-generators",
    label: "AI content generators",
    icon: "bulb-outline",
    free: false,
    pro: "Included",
    enterprise: "Included",
  },
  {
    id: "analytics",
    label: "Course analytics",
    icon: "bar-chart-outline",
    free: false,
    pro: "Included",
    enterprise: "Included",
  },
  {
    id: "risk",
    label: "Student risk detection",
    icon: "alert-circle-outline",
    free: false,
    pro: "Included",
    enterprise: "Included",
  },
  {
    id: "export",
    label: "Export PDF / Word / PPT",
    icon: "document-outline",
    free: false,
    pro: "Included",
    enterprise: "Included",
  },
  {
    id: "department",
    label: "Department analytics",
    icon: "analytics-outline",
    free: false,
    pro: false,
    enterprise: "Included",
  },
  {
    id: "tas",
    label: "Teaching Assistant management",
    icon: "people-outline",
    free: false,
    pro: false,
    enterprise: "Included",
  },
  {
    id: "shared-banks",
    label: "Shared question banks",
    icon: "library-outline",
    free: false,
    pro: false,
    enterprise: "Included",
  },
]

const TIER_RANK: Record<FacultyMembershipTier, number> = {
  Free: 0,
  Pro: 1,
  Enterprise: 2,
}

export function getFacultyMembershipPlan(tier: FacultyMembershipTier): FacultyMembershipPlan {
  return FACULTY_MEMBERSHIP_PLANS.find((plan) => plan.id === tier) ?? FACULTY_MEMBERSHIP_PLANS[0]
}

export function isFacultyTierAtLeast(
  current: FacultyMembershipTier,
  required: FacultyMembershipTier,
): boolean {
  return TIER_RANK[current] >= TIER_RANK[required]
}

export function nextFacultyUpgradeTier(current: FacultyMembershipTier): FacultyMembershipTier | null {
  if (current === "Free") return "Pro"
  if (current === "Pro") return "Enterprise"
  return null
}

export function formatFacultyPriceFromCents(cents: number): string {
  if (cents <= 0) return "Free"
  return `$${(cents / 100).toFixed(2)}`
}

export function formatFacultySemesterPrice(cents: number): string {
  if (cents <= 0) return "Free"
  return `${formatFacultyPriceFromCents(cents)}/semester`
}

export function formatFacultyAnnualPrice(cents: number): string {
  if (cents <= 0) return "Free"
  return `${formatFacultyPriceFromCents(cents)}/year`
}

export function formatFacultyPlanPriceLabel(cents: number, cadence: FacultyBillingCadence): string {
  if (cents <= 0) return "Free"
  return cadence === "annual" ? formatFacultyAnnualPrice(cents) : formatFacultySemesterPrice(cents)
}

export function facultyPlanPriceCents(plan: FacultyMembershipPlan, cadence: FacultyBillingCadence): number {
  return cadence === "annual" ? plan.annualPriceCents : plan.semesterPriceCents
}

/** Savings vs buying three semesters separately (Fall + Spring + Summer). */
export function facultyAnnualSavingsCents(semesterCents: number, annualCents: number): number {
  return Math.max(0, semesterCents * 3 - annualCents)
}

export function formatFacultyCadenceAccessLabel(cadence: FacultyBillingCadence): string {
  return cadence === "annual" ? "12 months access" : "through end of term"
}

export function formatFacultyCadenceShortLabel(cadence: FacultyBillingCadence): string {
  return cadence === "annual" ? "Annual · one-time" : "Per semester · one-time"
}

export function mergeFacultyPlanPricing(
  plans: FacultyMembershipPlan[],
  semesterPricing: Record<FacultyMembershipTier, number>,
  annualPricing: Record<FacultyMembershipTier, number>,
): FacultyMembershipPlan[] {
  return plans.map((plan) => ({
    ...plan,
    semesterPriceCents: semesterPricing[plan.id] ?? plan.semesterPriceCents,
    annualPriceCents: annualPricing[plan.id] ?? plan.annualPriceCents,
  }))
}
