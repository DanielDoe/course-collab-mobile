/**
 * Cora Credit economy — mirrors web `lib/cora/credits/economy.ts`.
 * Server is authoritative for charges; client uses this for UX gating/copy.
 */

export const CORA_CREDITS_PER_USD = 1000
export const CORA_MIN_PREMIUM_CREDITS = 5
export const CORA_LOW_BALANCE_FRACTION = 0.25
export const CORA_CRITICAL_BALANCE_FRACTION = 0.1
export const CORA_EXPENSIVE_TASK_THRESHOLD = 100
/** Alias matching web `CORA_COST_CONFIRMATION_THRESHOLD`. */
export const CORA_COST_CONFIRMATION_THRESHOLD = CORA_EXPENSIVE_TASK_THRESHOLD
export const PURCHASED_CORA_CREDIT_EXPIRY_DAYS = 365

export type StudentCoraTier = "Scholar" | "Explorer" | "Trailblazer"
export type InstructorCoraTier = "Free" | "Pro" | "Enterprise"
export type CoraMode = "premium" | "lite"

/** Monthly included membership credits (students). Do not roll over. */
export const STUDENT_CORA_MONTHLY: Record<StudentCoraTier, number> = {
  Scholar: 250,
  Explorer: 30000,
  Trailblazer: 75000,
}

/** Semester included credits (faculty). */
export const INSTRUCTOR_CORA_SEMESTER: Record<InstructorCoraTier, number> = {
  Free: 500,
  Pro: 15000,
  Enterprise: 35000,
}

/** Annual included credits when billed annually. */
export const INSTRUCTOR_CORA_ANNUAL: Record<InstructorCoraTier, number> = {
  Free: 500,
  Pro: 45000,
  Enterprise: 105000,
}

const LITE_BLOCK_RE =
  /\b(generate|create|draft|write|build|compose|make me|design)\b.{0,40}\b(quiz|exam|midterm|final|homework|questions?|flashcards?|study plan|lecture|slides?|rubric|announcement)\b/i

const LITE_ALLOW_RE =
  /\b(what|when|where|which|how many|why|explain|help me understand|show|find|open|go to|navigate|my grade|deadline|due|announcement|schedule|calendar|syllabus|study|review)\b/i

/**
 * Cora Lite: cheap CourseCollab ops when premium balance is 0.
 * Blocks expensive generation; allows navigation / retrieval / simple Q&A.
 */
export function isCoraLiteEligible(message: string): boolean {
  const text = (message || "").trim()
  if (!text) return true
  if (LITE_BLOCK_RE.test(text)) return false
  if (text.length > 500) return false
  return LITE_ALLOW_RE.test(text) || text.length < 160
}

export function studentMonthlyAllocation(tier: StudentCoraTier | string | null | undefined): number {
  if (!tier) return 0
  const key = String(tier) as StudentCoraTier
  return STUDENT_CORA_MONTHLY[key] ?? 0
}

export function instructorPeriodAllocation(
  tier: InstructorCoraTier | string | null | undefined,
  cadence: "semester" | "annual" | null | undefined,
): number {
  const t = (tier as InstructorCoraTier) || "Free"
  if (cadence === "annual") return INSTRUCTOR_CORA_ANNUAL[t] ?? INSTRUCTOR_CORA_ANNUAL.Free
  return INSTRUCTOR_CORA_SEMESTER[t] ?? INSTRUCTOR_CORA_SEMESTER.Free
}

export function formatCoraCreditsLabel(credits: number, mode?: CoraMode): string {
  if (mode === "lite" || credits <= 0) return "Cora Lite"
  return `${Math.round(credits).toLocaleString()} credits`
}
