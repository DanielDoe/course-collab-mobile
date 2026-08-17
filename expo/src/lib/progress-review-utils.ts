/** Progress review periods — aligned with web `lib/midterm-progress-review/review-period.ts`. */

export type ProgressReviewPeriod = "midterm" | "final" | "custom"

export type ReviewPeriodConfig = {
  id: ProgressReviewPeriod
  label: string
  shortLabel: string
  description: string
}

export const REVIEW_PERIOD_OPTIONS: ReviewPeriodConfig[] = [
  {
    id: "midterm",
    label: "Mid-Term",
    shortLabel: "Mid-Term",
    description: "Checkpoint through mid-semester — quizzes, homework, practice, and attendance so far.",
  },
  {
    id: "final",
    label: "Finals",
    shortLabel: "Finals",
    description: "End-of-term cumulative review including final exam performance.",
  },
  {
    id: "custom",
    label: "As of date",
    shortLabel: "Custom",
    description: "Snapshot through a specific date for ad-hoc check-ins.",
  },
]

export function parseReviewPeriod(raw: unknown): ProgressReviewPeriod {
  const s = String(raw ?? "").trim().toLowerCase()
  if (s === "final" || s === "finals") return "final"
  if (s === "custom" || s === "as_of" || s === "as-of") return "custom"
  return "midterm"
}

export function getReviewPeriodConfig(period: string | null | undefined): ReviewPeriodConfig {
  const hit = REVIEW_PERIOD_OPTIONS.find((o) => o.id === parseReviewPeriod(period))
  return hit ?? REVIEW_PERIOD_OPTIONS[0]
}

export function formatAsOfLabel(dateStr: string | null | undefined): string | null {
  if (!dateStr?.trim()) return null
  const d = new Date(`${dateStr.trim()}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function periodBadgeLabel(period: string, asOfDate?: string | null): string {
  const cfg = getReviewPeriodConfig(period)
  if (parseReviewPeriod(period) === "custom" && asOfDate) {
    const fmt = formatAsOfLabel(asOfDate)
    return fmt ? `As of ${fmt}` : cfg.shortLabel
  }
  if (parseReviewPeriod(period) === "final") return "Finals review"
  if (parseReviewPeriod(period) === "custom") return "Progress snapshot"
  return "Mid-term review"
}

export function periodNavLabel(period: ProgressReviewPeriod): string {
  return REVIEW_PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? period
}

/** YYYY-MM-DD for custom snapshot date inputs. */
export function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const AS_OF_MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
}

export function normalizeAsOfDate(raw: string | null | undefined, yearHint?: string): string | null {
  const trimmed = raw?.trim() ?? ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed.slice(0, 10))) return trimmed.slice(0, 10)
  if (!trimmed) return null

  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoPrefix) return isoPrefix[1]

  const weekdayMatch = trimmed.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]{3})\s+(\d{1,2})/i)
  if (weekdayMatch) {
    const month = AS_OF_MONTHS[weekdayMatch[1].slice(0, 3).toLowerCase()]
    if (month) {
      const day = String(parseInt(weekdayMatch[2], 10)).padStart(2, "0")
      const year = yearHint ?? String(new Date().getFullYear())
      return `${year}-${month}-${day}`
    }
  }

  const parsed = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function filterProgressReviewsForAsOfDate<
  T extends { asOfDate?: string | null },
>(reviews: T[], asOfDate: string | null): T[] {
  if (!asOfDate) return reviews
  const target = normalizeAsOfDate(asOfDate)
  if (!target) return reviews
  const yearHint = target.slice(0, 4)
  return reviews.filter((row) => normalizeAsOfDate(row.asOfDate, yearHint) === target)
}

export type ProgressReviewBatchPayload = {
  reviewPeriod?: ProgressReviewPeriod
  asOfDate?: string
  studentIds?: number[]
  dryRun?: boolean
  deliverSaved?: boolean
  previewOnly?: boolean
  onlyMissing?: boolean
  sendEmail?: boolean
  createAnnouncement?: boolean
  createNotification?: boolean
}

export type ProgressReviewBatchResult = {
  total: number
  generated: number
  dispatched: number
  emailsSent: number
  skipped: number
  errors: Array<{ studentId: number; error: string }>
  dryRun: boolean
  deliverSaved?: boolean
}
