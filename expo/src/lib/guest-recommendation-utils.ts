import type { RecommendationRequest } from "./course-info-api"
import { recommendationPurposeLabel, recommendationStatusLabel } from "./faculty-recommendation-utils"
import type { StudentRecommendationRequest } from "./student-api"

export type GuestLetterFilter = "all" | "needs_you" | "in_progress" | "done"

const DONE_STATUSES = new Set(["downloaded", "rejected"])

export function countGuestLettersByFilter(rows: RecommendationRequest[]): Record<GuestLetterFilter, number> {
  return {
    all: rows.length,
    needs_you: rows.filter((row) => guestNeedsAction(row.status)).length,
    in_progress: rows.filter((row) => matchesGuestLetterFilter(row, "in_progress")).length,
    done: rows.filter((row) => DONE_STATUSES.has(String(row.status ?? "").toLowerCase())).length,
  }
}

export function matchesGuestLetterFilter(row: RecommendationRequest, filter: GuestLetterFilter): boolean {
  const status = String(row.status ?? "").toLowerCase()
  if (filter === "all") return true
  if (filter === "needs_you") return guestNeedsAction(status)
  if (filter === "done") return DONE_STATUSES.has(status)
  return !guestNeedsAction(status) && !DONE_STATUSES.has(status)
}

export function filterGuestLetters(
  rows: RecommendationRequest[],
  filter: GuestLetterFilter,
  query: string,
): RecommendationRequest[] {
  const filtered = rows.filter((row) => matchesGuestLetterFilter(row, filter))
  const q = query.trim().toLowerCase()
  if (!q) return filtered

  return filtered.filter((row) => {
    const haystack = [
      recommendationPurposeLabel(row.purpose),
      row.purpose,
      row.course_code,
      row.course_description,
      row.instructor_name,
      recommendationStatusLabel(row.status),
      row.status,
      row.student_request_description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function guestNeedsAction(status: string): boolean {
  const s = String(status ?? "").trim()
  return [
    "requested",
    "info_requested",
    "approved",
    "student_form_pending",
    "ai_generated",
    "revision_requested",
    "finalized",
  ].includes(s)
}

export function guestCanApproveRequest(status: string): boolean {
  return status === "requested"
}

export function guestCanRespondToInfo(status: string): boolean {
  return status === "info_requested"
}

export function guestCanEditQuestionnaire(status: string): boolean {
  return ["approved", "student_form_pending"].includes(status)
}

export function guestCanSubmitQuestionnaire(status: string): boolean {
  return ["approved", "student_form_pending"].includes(status)
}

export function guestCanGenerateAiDrafts(status: string, allowAi?: boolean): boolean {
  return Boolean(allowAi) && ["approved", "ai_generated"].includes(status)
}

export function guestCanPickDraft(status: string): boolean {
  return status === "ai_generated"
}

export function guestCanEditLetter(status: string): boolean {
  return ["approved", "ai_generated", "revision_requested"].includes(status)
}

export function guestCanSubmitLetter(status: string): boolean {
  return ["approved", "ai_generated", "revision_requested"].includes(status)
}

export function guestCanDownload(status: string, deliveryMode?: string | null): boolean {
  if (!["finalized", "downloaded"].includes(status)) return false
  const mode = String(deliveryMode ?? "student_download").toLowerCase()
  return mode === "student_download"
}

export function guestDeliveryStatusLabel(deliveryMode?: string | null, status?: string): string | null {
  const mode = String(deliveryMode ?? "").toLowerCase()
  if (mode === "confidential" && ["finalized", "downloaded"].includes(String(status ?? ""))) {
    return "Completed (confidential delivery — no file download)"
  }
  if (mode === "faculty_submits" && ["finalized", "downloaded"].includes(String(status ?? ""))) {
    return "Completed — your instructor submitted the letter directly"
  }
  if (mode === "designated_recipient" && ["finalized", "downloaded"].includes(String(status ?? ""))) {
    return "Completed — sent to the designated recipient"
  }
  return null
}

export function guestCanCancel(status: string): boolean {
  return ["requested", "info_requested", "approved", "student_form_pending"].includes(status)
}

export function guestIsTerminal(status: string): boolean {
  return ["rejected", "downloaded"].includes(status)
}

export function summarizeGuestRequests(requests: RecommendationRequest[]) {
  const active = requests.filter((r) => !guestIsTerminal(r.status) && r.status !== "finalized").length
  const awaitingYou = requests.filter((r) => guestNeedsAction(r.status)).length
  const completed = requests.filter((r) => ["finalized", "downloaded"].includes(r.status)).length
  return { total: requests.length, active, awaitingYou, completed }
}

export function resolveRecommendationPdfUrl(
  request: StudentRecommendationRequest,
  files?: Array<{ pdf_url?: string; file_url?: string }>,
): string | null {
  const fromFile = files?.[0]?.pdf_url ?? files?.[0]?.file_url ?? null
  if (fromFile) return fromFile
  const latest = (request as { latest_pdf_url?: string | null }).latest_pdf_url
  return latest ?? null
}
