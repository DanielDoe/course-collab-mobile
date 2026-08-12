import type { InstructorRecommendationRequest } from "./instructor-api"

export const RECOMMENDATION_PURPOSES = [
  { id: "scholarship", label: "Scholarship" },
  { id: "internship", label: "Internship" },
  { id: "graduate_school", label: "Graduate school" },
  { id: "job_application", label: "Job application" },
  { id: "research_opportunity", label: "Research opportunity" },
  { id: "other", label: "Other" },
] as const

export type RecommendationFilter = "all" | "pending" | "active" | "done"

const PENDING_STATUSES = new Set(["requested"])
const ACTIVE_STATUSES = new Set([
  "approved",
  "info_requested",
  "student_form_pending",
  "ai_generated",
  "student_selected",
  "instructor_review_pending",
  "revision_requested",
])
const DONE_STATUSES = new Set(["finalized", "downloaded", "rejected"])

export function filterRecommendations(
  rows: InstructorRecommendationRequest[],
  filter: RecommendationFilter,
  query: string,
): InstructorRecommendationRequest[] {
  let filtered = rows
  if (filter === "pending") {
    filtered = filtered.filter((r) => PENDING_STATUSES.has(r.status))
  } else if (filter === "active") {
    filtered = filtered.filter((r) => ACTIVE_STATUSES.has(r.status))
  } else if (filter === "done") {
    filtered = filtered.filter((r) => DONE_STATUSES.has(r.status))
  }

  const q = query.trim().toLowerCase()
  if (!q) return filtered
  return filtered.filter(
    (r) =>
      (r.student_name ?? "").toLowerCase().includes(q) ||
      (r.student_email ?? "").toLowerCase().includes(q) ||
      (r.course_code ?? "").toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q) ||
      (r.recipient_name ?? "").toLowerCase().includes(q),
  )
}

export function countRecommendationsByFilter(
  rows: InstructorRecommendationRequest[],
): Record<RecommendationFilter, number> {
  return {
    all: rows.length,
    pending: rows.filter((r) => PENDING_STATUSES.has(r.status)).length,
    active: rows.filter((r) => ACTIVE_STATUSES.has(r.status)).length,
    done: rows.filter((r) => DONE_STATUSES.has(r.status)).length}
}

export function recommendationPurposeLabel(purpose: string): string {
  return RECOMMENDATION_PURPOSES.find((p) => p.id === purpose)?.label ?? purpose.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function recommendationStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function recommendationStatusTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "live" {
  const s = status.toLowerCase()
  if (s === "downloaded") return "live"
  if (s === "finalized") return "warning"
  if (s === "rejected") return "danger"
  if (["requested", "info_requested", "revision_requested"].includes(s)) return "warning"
  if (["student_selected", "instructor_review_pending", "ai_generated", "approved"].includes(s)) return "live"
  return "neutral"
}

export function formatRecommendationDeadline(value?: string | null): string {
  if (!value) return "No deadline"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

/** Compact date for narrow stat chips — avoids mid-word wraps in 3-column rows. */
export function formatRecommendationDeadlineShort(value?: string | null): string {
  if (!value) return "None"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function recommendationPillarShort(pillar: string): string {
  const map: Record<string, string> = {
    "Pre-flight": "Pre-flight",
    Clearance: "Clearance",
    Intake: "Intake",
    "Letter studio": "Letter",
    "Your review": "Review",
    "Revision loop": "Revision",
    "Finish line": "Final",
    Complete: "Done",
    Closed: "Closed",
    "In progress": "Active"}
  return map[pillar] ?? (pillar.length > 9 ? `${pillar.slice(0, 8)}…` : pillar)
}

export function recommendationPurposeShort(purpose: string): string {
  const map: Record<string, string> = {
    scholarship: "Scholar.",
    internship: "Intern.",
    graduate_school: "Grad",
    job_application: "Job",
    research_opportunity: "Research",
    other: "Other"}
  return map[purpose] ?? recommendationPurposeLabel(purpose).slice(0, 9)
}

export function formatRecommendationReLine(
  studentName: string,
  purpose: string | null | undefined,
  purposeOtherDetail?: string | null,
): string {
  const p = typeof purpose === "string" ? purpose.trim().toLowerCase() : ""
  const name = studentName.trim() || "Student"
  if (p === "other") {
    const custom = typeof purposeOtherDetail === "string" ? purposeOtherDetail.trim() : ""
    if (!custom) return `Re: Recommendation — ${name} (Other)`
    return /^re\s*:/i.test(custom) ? custom : `Re: ${custom}`
  }
  const purposeText = recommendationPurposeLabel(p)
  return `Re: Recommendation — ${name} (${purposeText})`
}

export function instructorCanDecideInitialRequest(status: string): boolean {
  return status === "requested"
}

export function instructorCanRequestMoreInfo(status: string): boolean {
  return status === "requested" || status === "approved" || status === "info_requested"
}

export function instructorCanClassicFinalize(status: string): boolean {
  return status === "student_selected" || status === "instructor_review_pending"
}

export function instructorCanReleaseLetter(status: string): boolean {
  return status !== "rejected" && status !== "requested"
}

export function instructorCanRequestRevision(status: string): boolean {
  return status === "student_selected" || status === "instructor_review_pending"
}

export function instructorCanEditRequestMetadata(status: string): boolean {
  return status !== "rejected"
}

export type RecommendationJourney = {
  step: number
  total: number
  pillar: string
  headline: string
  subline: string
  runway: string
}

function runwayDots(step: number, total = 12): string {
  const clamped = Math.min(Math.max(step, 0), total)
  return Array.from({ length: total }, (_, i) => (i < clamped ? "●" : "○")).join("")
}

export function getRecommendationJourney(args: {
  status: string
  hasQuestionnaire?: boolean
  aiDraftCount?: number
}): RecommendationJourney {
  const st = String(args.status ?? "").trim()
  const hasQ = Boolean(args.hasQuestionnaire)
  const drafts = Math.max(0, Number(args.aiDraftCount) || 0)
  const total = 12

  if (st === "rejected") {
    return { step: 0, total, pillar: "Closed", headline: "Request closed", subline: "Declined by instructor", runway: runwayDots(1) }
  }
  if (st === "requested") {
    return { step: 1, total, pillar: "Pre-flight", headline: "Awaiting your approval", subline: "Step 1 of 12 · Initial review", runway: runwayDots(1) }
  }
  if (st === "info_requested") {
    return { step: 3, total, pillar: "Pre-flight", headline: "Details requested", subline: "Step 3 of 12 · Waiting on student reply", runway: runwayDots(3) }
  }
  if (st === "approved") {
    if (!hasQ) {
      return { step: 4, total, pillar: "Clearance", headline: "Approved · Questionnaire pending", subline: "Step 4 of 12 · Student fills questionnaire", runway: runwayDots(4) }
    }
    return { step: 6, total, pillar: "Letter studio", headline: drafts > 0 ? "Drafts in play" : "Student drafting", subline: "Step 6 of 12 · Letter in progress", runway: runwayDots(6) }
  }
  if (st === "student_form_pending") {
    return { step: 4, total, pillar: "Intake", headline: "Questionnaire in progress", subline: "Step 4 of 12 · Student submitting answers", runway: runwayDots(4) }
  }
  if (st === "ai_generated") {
    return { step: 7, total, pillar: "Letter studio", headline: "AI drafts ready", subline: "Step 7 of 12 · Student comparing drafts", runway: runwayDots(7) }
  }
  if (st === "student_selected") {
    return { step: 8, total, pillar: "Your review", headline: "Letter submitted", subline: "Step 8 of 12 · Ready for instructor review", runway: runwayDots(8) }
  }
  if (st === "instructor_review_pending") {
    return { step: 9, total, pillar: "Your review", headline: "Polishing letter", subline: "Step 9 of 12 · Edit and release PDF", runway: runwayDots(9) }
  }
  if (st === "revision_requested") {
    return { step: 10, total, pillar: "Revision loop", headline: "Revisions requested", subline: "Step 10 of 12 · Student must resubmit", runway: runwayDots(10) }
  }
  if (st === "finalized") {
    return { step: 11, total, pillar: "Finish line", headline: "Ready to download", subline: "Step 11 of 12 · PDF unlocked", runway: runwayDots(11) }
  }
  if (st === "downloaded") {
    return { step: 12, total, pillar: "Complete", headline: "Delivered", subline: "Step 12 of 12 · Student downloaded PDF", runway: runwayDots(12) }
  }
  return { step: 4, total, pillar: "In progress", headline: recommendationStatusLabel(st), subline: `Step 4 of 12`, runway: runwayDots(4) }
}

export type RecommendationPipelineTone = "teal" | "blue" | "violet" | "amber" | "rose" | "sky" | "slate"

export function getRecommendationPipelineTone(status: string, step: number): RecommendationPipelineTone {
  const st = String(status ?? "").trim()
  if (st === "rejected") return "rose"
  if (st === "finalized") return "amber"
  if (st === "downloaded") return "sky"
  if (st === "revision_requested") return "amber"
  if (st === "requested" || st === "info_requested") return "amber"
  if (step >= 9) return "violet"
  if (step >= 6) return "sky"
  if (step >= 4) return "teal"
  return "amber"
}

export function getRecommendationStatTones(
  status: string,
  step: number,
): { step: RecommendationPipelineTone; stage: RecommendationPipelineTone; deadline: RecommendationPipelineTone } {
  const stage = getRecommendationPipelineTone(status, step)
  return {
    step: "teal",
    stage,
    deadline: status === "rejected" ? "slate" : "amber"}
}

export function formatLetterSalutationPreview(recipientName: string, recipientOrganization = ""): string {
  const target = recipientName.trim() || recipientOrganization.trim()
  if (!target) return "To Whom It May Concern:"
  const lower = target.toLowerCase()
  if (lower === "to whom it may concern" || lower === "to whom it may concern:") return "To Whom It May Concern:"
  if (lower.startsWith("dear ")) return target.endsWith(":") ? target : `${target}:`
  return `Dear ${target}:`
}

export const PROFILE_FIELD_LABELS: Array<{ key: string; label: string }> = [
  { key: "student_strengths", label: "Strengths" },
  { key: "achievements", label: "Achievements" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
  { key: "leadership_examples", label: "Leadership" },
  { key: "goals", label: "Goals" },
  { key: "class_experience", label: "Class experience" },
  { key: "personal_qualities", label: "Personal qualities" },
  { key: "letter_for", label: "Letter for" },
  { key: "special_instructions", label: "Special instructions" },
  { key: "tone", label: "Tone" },
  { key: "content_mode", label: "Content mode" },
]
