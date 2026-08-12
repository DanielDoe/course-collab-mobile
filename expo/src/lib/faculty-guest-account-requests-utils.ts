import type { RecommendationGuestAccountRequest } from "./instructor-api"

export type GuestAccountStatusFilter = "all" | "pending" | "approved" | "rejected"

export type GuestAccountSortKey =
  | "submitted_desc"
  | "submitted_asc"
  | "letters_desc"
  | "name_asc"
  | "recent_activity_desc"

export const GUEST_ACCOUNT_STATUS_OPTIONS: Array<{ value: GuestAccountStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export const GUEST_ACCOUNT_SORT_OPTIONS: Array<{ value: GuestAccountSortKey; label: string }> = [
  { value: "submitted_desc", label: "Newest application" },
  { value: "submitted_asc", label: "Oldest application" },
  { value: "letters_desc", label: "Most letters in course" },
  { value: "recent_activity_desc", label: "Recent letter activity" },
  { value: "name_asc", label: "Applicant A–Z" },
]

export function guestAccountStatusLabel(status: string): string {
  const s = String(status ?? "").trim()
  if (!s) return "Unknown"
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function guestAccountStatusTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "live" {
  const s = status.toLowerCase()
  if (s === "pending") return "warning"
  if (s === "approved") return "live"
  if (s === "rejected") return "danger"
  return "neutral"
}

export function formatGuestAccountDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function formatGuestAccountRelative(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 14) return `${days}d ago`
  if (days < 60) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function matchesGuestSearch(row: RecommendationGuestAccountRequest, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    row.full_name,
    row.email,
    row.organization,
    row.section,
    row.student_id,
    row.status,
    row.guest_purpose_detail,
    row.rejection_reason,
  ]
    .map((x) => String(x ?? "").toLowerCase())
    .join(" ")
  return hay.includes(q)
}

function guestActivityTimestamp(row: RecommendationGuestAccountRequest): number {
  const updated = row.last_request_updated_at ? new Date(String(row.last_request_updated_at)).getTime() : 0
  const created = row.created_at ? new Date(String(row.created_at)).getTime() : 0
  return Math.max(updated, created)
}

export function filterGuestAccountRequests(
  rows: RecommendationGuestAccountRequest[],
  search: string,
  statusFilter: GuestAccountStatusFilter,
  sort: GuestAccountSortKey,
): RecommendationGuestAccountRequest[] {
  let out = rows.filter((r) => matchesGuestSearch(r, search))
  if (statusFilter !== "all") {
    out = out.filter((r) => String(r.status).toLowerCase() === statusFilter)
  }
  const copy = [...out]
  copy.sort((a, b) => {
    if (sort === "name_asc") {
      return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" })
    }
    if (sort === "letters_desc") {
      return (Number(b.rec_letter_total) || 0) - (Number(a.rec_letter_total) || 0)
    }
    if (sort === "submitted_asc" || sort === "submitted_desc") {
      const ta = new Date(String(a.created_at ?? 0)).getTime()
      const tb = new Date(String(b.created_at ?? 0)).getTime()
      return sort === "submitted_desc" ? tb - ta : ta - tb
    }
    return guestActivityTimestamp(b) - guestActivityTimestamp(a)
  })
  return copy
}

export function countPendingGuestAccountRequests(rows: RecommendationGuestAccountRequest[]): number {
  return rows.filter((r) => String(r.status).toLowerCase() === "pending").length
}
