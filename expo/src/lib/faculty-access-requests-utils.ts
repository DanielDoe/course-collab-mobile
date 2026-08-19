import type { InstructorAccountRequest } from "./instructor-api"
import { accessRequestKindLabel } from "./access-governance"

export type AccessRequestSection = "students" | "career_members" | "summer_students"

export function accountRequestSection(row: InstructorAccountRequest): AccessRequestSection {
  const kind = row.request_kind ?? ""
  const type = row.account_type ?? ""
  if (kind === "guest" || type === "career_member") return "career_members"
  if (kind === "summer_camper" || kind === "summer_student" || type === "summer_student") {
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
      (row.camp_name ?? "").toLowerCase().includes(q),
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
  return accessRequestKindLabel(row.request_kind, row.account_type)
}

export function countPendingAccessRequests(rows: InstructorAccountRequest[]): number {
  return rows.filter((row) => {
    const status = (row.status ?? "").toLowerCase()
    return status === "pending" || status === "requested"
  }).length
}
