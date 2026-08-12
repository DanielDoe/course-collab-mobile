import type {
  InstructorAccountRequest,
  InstructorPasswordResetRequest,
  InstructorStudent} from "./instructor-api"

export type StudentDirectoryTab = "students" | "resets" | "requests"

export function directoryRequestIsPending(status?: string): boolean {
  const normalized = (status ?? "").toLowerCase()
  return normalized === "pending" || normalized === "requested"
}

export function filterStudents(students: InstructorStudent[], query: string): InstructorStudent[] {
  const q = query.trim().toLowerCase()
  if (!q) return students
  return students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.section ?? "").toLowerCase().includes(q) ||
      (s.session_code ?? "").toLowerCase().includes(q),
  )
}

export function filterPasswordResets(
  rows: InstructorPasswordResetRequest[],
  query: string,
): InstructorPasswordResetRequest[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (r) =>
      r.full_name.toLowerCase().includes(q) ||
      (r.student_number ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q),
  )
}

export function filterAccountRequests(
  rows: InstructorAccountRequest[],
  query: string,
): InstructorAccountRequest[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (r) =>
      r.full_name.toLowerCase().includes(q) ||
      r.student_id.toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.organization ?? "").toLowerCase().includes(q),
  )
}

export function accountRequestKindLabel(kind?: string): string {
  if (kind === "guest") return "Guest account"
  if (kind === "roster") return "Roster join"
  return kind?.replace(/_/g, " ") ?? "Request"
}

export function formatStudentRegisteredDate(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}
