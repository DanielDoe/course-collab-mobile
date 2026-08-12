import type { ClassroomPointAssignment, ClassroomPointRow, ClassroomPointsSummaryRow, PracticePointRow } from "./instructor-api"

export const MANUAL_AWARD_CATEGORIES = [
  { value: "presentation", label: "Presentation" },
  { value: "participation", label: "Participation" },
  { value: "quiz_bonus", label: "Quiz bonus" },
  { value: "extra_credit", label: "Extra credit" },
  { value: "other", label: "Other" },
] as const

export type ClassroomPointsTab = "overview" | "pending" | "leaderboard" | "awards" | "assignments"

export function formatClassroomPoints(value: number | string | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return "0"
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

export function formatClassroomDisplayText(text: string | null | undefined): string {
  if (!text?.trim()) return ""
  return text
    .replace(/§\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function classroomPointTitle(point: Pick<ClassroomPointRow, "submission_title" | "reason">): string {
  const raw = point.submission_title?.trim() || point.reason?.trim() || "Submission"
  return formatClassroomDisplayText(raw) || "Submission"
}

export function isCodeSubmission(point: Pick<ClassroomPointRow, "category">): boolean {
  return point.category === "code_submission"
}

export function isSolutionSubmission(point: Pick<ClassroomPointRow, "category">): boolean {
  return point.category === "solution_submission"
}

export function assignmentKindLabel(kind?: string): string {
  if (kind === "solution") return "Solution"
  if (kind === "code") return "Code"
  return "Assignment"
}

export function pendingPrimaryCount(points: ClassroomPointRow[]): number {
  return points.filter((p) => !p.isDuplicate).length
}

export function computeOverviewStats(input: {
  pending: ClassroomPointRow[]
  practicePending: PracticePointRow[]
  summary: ClassroomPointsSummaryRow[]
  assignments: ClassroomPointAssignment[]
}) {
  const pendingReview = pendingPrimaryCount(input.pending)
  const practicePending = input.practicePending.length
  const withPoints = input.summary.filter((s) => Number(s.total_points) > 0)
  const totalAwarded = withPoints.reduce((sum, s) => sum + Number(s.total_points), 0)
  const activeAssignments = input.assignments.filter((a) => a.is_active !== false).length
  const aiFlags = input.pending.filter((p) => p.ai_suspicion && !p.isDuplicate).length

  return {
    pendingReview,
    practicePending,
    studentsWithPoints: withPoints.length,
    totalAwarded,
    activeAssignments,
    aiFlags}
}

export function filterSummaryBySearch(
  rows: ClassroomPointsSummaryRow[],
  query: string,
): ClassroomPointsSummaryRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    [row.full_name, row.student_number, row.session].join(" ").toLowerCase().includes(q),
  )
}

export function filterPointsBySearch(rows: ClassroomPointRow[], query: string): ClassroomPointRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    [
      row.student_name,
      row.student_number,
      row.submission_title,
      row.reason,
      row.session,
      row.category,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q),
  )
}

export function filterAssignmentsBySearch(
  rows: ClassroomPointAssignment[],
  query: string,
): ClassroomPointAssignment[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) =>
    [row.title, row.description, row.session, row.submission_kind]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q),
  )
}
