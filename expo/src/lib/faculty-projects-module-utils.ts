export const PROJECT_LECTURE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const

export const PROJECT_MODULE_SESSIONS: Array<{ code: string; label: string }> = [
  { code: "ELEG1304P01", label: "ELEG1304P01" },
  { code: "ELEG1301P01", label: "ELEG1301P01" },
]

export function projectModuleSessionCodes(): string[] {
  return PROJECT_MODULE_SESSIONS.map((s) => s.code)
}

export function formatPresentationTime(value: string | null | undefined): string {
  if (!value) return "—"
  const raw = String(value).trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return raw
  const hour = Number(match[1])
  const minute = match[2]
  const suffix = hour >= 12 ? "PM" : "AM"
  const h12 = hour % 12 || 12
  return `${h12}:${minute} ${suffix}`
}

export function formatPresentationDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(String(value).slice(0, 10) + "T12:00:00")
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

export function presentationStatusLabel(status: string): string {
  const s = String(status ?? "").trim()
  if (!s) return "Unknown"
  return s
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
}

export function presentationStatusTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "live" {
  const s = status.toLowerCase()
  if (s === "scheduled") return "live"
  if (s === "completed") return "live"
  if (s === "cancelled") return "danger"
  return "neutral"
}

export type ProjectScoreRow = {
  projectId: number
  title: string
  groupName: string
  leaderName: string
  session: string
  studentVotes: number
  instructorVotes: number
  studentPoints: number
  instructorPoints: number
  totalScore: number
  status: string
}

export function buildProjectScores(
  projects: import("./instructor-api").InstructorProject[],
  voteTotals: Record<string, import("./instructor-api").ProjectVoteTotalsRow>,
): ProjectScoreRow[] {
  return projects.map((project) => {
    const row = voteTotals[String(project.id)]
    return {
      projectId: project.id,
      title: project.title,
      groupName: project.group?.name ?? "",
      leaderName: project.leader?.full_name ?? "",
      session: project.group?.session ?? "",
      studentVotes: row?.studentVotes ?? 0,
      instructorVotes: row?.instructorVotes ?? 0,
      studentPoints: row?.studentPoints ?? 0,
      instructorPoints: row?.instructorPoints ?? 0,
      totalScore: row?.totalScore ?? 0,
      status: project.status,
    }
  })
}

export type ProjectStudentGradeRow = {
  studentId: number
  projectId: number
  studentNumber: string
  fullName: string
  groupName: string
  projectTitle: string
  session: string
  groupScore: number
  effectiveScore: number
  overrideScore: number | null
  studentPoints: number
  instructorPoints: number
}

export function letterGradeFromScore(score: number): string {
  if (score >= 45) return "A"
  if (score >= 40) return "B"
  if (score >= 35) return "C"
  if (score >= 30) return "D"
  return "F"
}
