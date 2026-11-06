import type {
  InstructorAccountRequest,
  RecommendationGuestAccountRequest,
  SummerCampRequest,
} from "./instructor-api"
import {
  questionBankBrowsePageCount,
  questionBankBrowsePageLabel,
  sliceQuestionBankBrowsePage,
} from "./faculty-question-bank-topics"

export type AccessRequestSection = "students" | "career_members" | "summer_students"

export const ACCESS_REQUESTS_PAGE_SIZE = 8

export function accountRequestSection(row: InstructorAccountRequest): AccessRequestSection {
  const kind = (row.request_kind ?? "").toLowerCase()
  const type = (row.account_type ?? "").toLowerCase()
  const section = (row.section ?? "").trim().toUpperCase()
  if (
    kind === "guest" ||
    type === "career_member" ||
    section === "GUEST" ||
    Boolean(row.guest_purpose)
  ) {
    return "career_members"
  }
  if (
    kind === "summer_camper" ||
    kind === "summer_student" ||
    kind === "camp_password_reset" ||
    type === "summer_student" ||
    section === "SUMMER_CAMP"
  ) {
    return "summer_students"
  }
  return "students"
}

export function filterAccessRequestsBySection(
  rows: InstructorAccountRequest[],
  section: AccessRequestSection,
): InstructorAccountRequest[] {
  return rows.filter((row) => accountRequestSection(row) === section)
}

export function filterAccessRequestsSearch(
  rows: InstructorAccountRequest[],
  query: string,
): InstructorAccountRequest[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (row) =>
      row.full_name.toLowerCase().includes(q) ||
      row.student_id.toLowerCase().includes(q) ||
      (row.email ?? "").toLowerCase().includes(q) ||
      (row.organization ?? "").toLowerCase().includes(q) ||
      (row.section ?? "").toLowerCase().includes(q) ||
      (row.camp_name ?? "").toLowerCase().includes(q) ||
      (row.school_affiliation ?? "").toLowerCase().includes(q),
  )
}

export function accessRequestScopeLabel(row: InstructorAccountRequest): string {
  const section = accountRequestSection(row)
  if (section === "summer_students") {
    return row.camp_name ?? row.organization ?? row.school_affiliation ?? "Summer program"
  }
  if (section === "career_members") {
    return row.organization ?? "Career Member"
  }
  return row.section ?? "Course section"
}

export function accessRequestTypeLabel(row: InstructorAccountRequest): string {
  const kind = (row.request_kind ?? "").toLowerCase()
  const type = (row.account_type ?? "").toLowerCase()
  if (type === "career_member" || kind === "guest") return "Career Member"
  if (type === "summer_student" || kind === "summer_student" || kind === "summer_camper") {
    return "Summer Student"
  }
  if (kind === "camp_password_reset") return "Camp password reset"
  if (type === "faculty" || kind === "faculty") return "Faculty"
  return "Student"
}

export function countPendingAccessRequests(rows: InstructorAccountRequest[]): number {
  return rows.filter((row) => {
    const status = (row.status ?? "").toLowerCase()
    return status === "pending" || status === "requested"
  }).length
}

export function summerCampRequestAsAccountRequest(row: SummerCampRequest): InstructorAccountRequest {
  return {
    id: row.id,
    full_name: row.full_name,
    student_id: row.student_id,
    email: row.email,
    status: row.status,
    created_at: row.created_at,
    request_kind: row.request_kind,
    account_type:
      row.request_kind === "summer_camper" || row.request_kind === "summer_student"
        ? "summer_student"
        : undefined,
    organization: row.organization,
    school_affiliation: row.school_affiliation,
    section: "SUMMER_CAMP",
  }
}

export function recommendationGuestAsAccountRequest(
  row: RecommendationGuestAccountRequest,
): InstructorAccountRequest {
  return {
    id: row.id,
    full_name: row.full_name,
    student_id: row.student_id,
    section: row.section || "GUEST",
    email: row.email,
    status: row.status,
    created_at: row.created_at ?? "",
    request_kind: row.request_kind ?? "guest",
    account_type: "career_member",
    guest_purpose: row.guest_purpose,
    guest_purpose_detail: row.guest_purpose_detail,
    organization: row.organization,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    rejection_reason: row.rejection_reason,
  }
}

export function mergeAccessRequestRows(
  ...lists: Array<InstructorAccountRequest[] | undefined>
): InstructorAccountRequest[] {
  const byId = new Map<number, InstructorAccountRequest>()
  for (const list of lists) {
    for (const row of list ?? []) {
      if (!Number.isFinite(row?.id)) continue
      const existing = byId.get(row.id)
      byId.set(row.id, existing ? { ...existing, ...row } : row)
    }
  }
  return [...byId.values()].sort((a, b) => {
    const rank = (status: string) => {
      const s = status.toLowerCase()
      if (s === "pending" || s === "requested") return 0
      if (s === "approved") return 1
      if (s === "rejected") return 2
      return 3
    }
    const byStatus = rank(a.status) - rank(b.status)
    if (byStatus !== 0) return byStatus
    return String(b.created_at).localeCompare(String(a.created_at))
  })
}

export function accessRequestPageCount(total: number): number {
  return questionBankBrowsePageCount(total, ACCESS_REQUESTS_PAGE_SIZE)
}

export function sliceAccessRequestPage<T>(items: T[], page: number): T[] {
  return sliceQuestionBankBrowsePage(items, page, ACCESS_REQUESTS_PAGE_SIZE)
}

export function accessRequestPageLabel(noun: string, total: number, page: number): string {
  return questionBankBrowsePageLabel(noun, total, page, ACCESS_REQUESTS_PAGE_SIZE)
}
