import type { StudentSession } from "./session"
import type { GradeCategoryKey } from "./grades-api"
import {
  fetchAssessmentsForKind,
  quizItemCardScore,
  quizItemListStatus,
} from "../components/assessments/assessment-list-logic"
import type { AssessmentListKind } from "../components/assessments/assessment-config"
import { studentApi, type AssessmentHistoryItem, type QuizItem } from "./student-api"
import {
  categoryLabel,
  formatRelativeTime,
  rewardsApi,
  type AttendanceRecord,
  type ClassroomPointRecord,
  type TradeHistoryItem,
} from "./rewards-api"
import { collaborationApi, type ProjectRecord } from "./collaboration-api"

export type GradeBreakdownItem = {
  id: string
  title: string
  subtitle?: string
  valueLabel?: string
  statusLabel?: string
  statusTone?: "success" | "neutral" | "live" | "warning"
  sortTime?: number
  assessmentId?: number
  assessmentType?: string
  attemptId?: number
  classroomPointId?: number
  projectId?: number
}

function categoryToAssessmentKind(key: GradeCategoryKey): AssessmentListKind | null {
  switch (key) {
    case "quiz":
      return "quiz"
    case "homework":
      return "homework"
    case "midterm":
      return "mid_semester"
    case "final":
      return "final"
    default:
      return null
  }
}

function parseTime(value?: string | null): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

function formatScoreLabel(score: number | null | undefined, isCredits = false): string | undefined {
  if (score == null || Number.isNaN(score)) return undefined
  if (isCredits) return `${Math.round(score)} cr`
  return `${Math.round(score * 10) / 10}%`
}

function historyBestScore(item: AssessmentHistoryItem): number | null {
  if (item.best_score != null && !Number.isNaN(item.best_score)) return item.best_score
  const attempts = item.attempts ?? []
  const percentages = attempts
    .map((a) => a.percentage)
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
  if (percentages.length === 0) return null
  return Math.max(...percentages)
}

function historyLatestAttemptId(item: AssessmentHistoryItem): number | undefined {
  const attempts = item.attempts ?? []
  const latest = attempts
    .filter((a) => a.is_completed || a.completed_at)
    .sort((a, b) => parseTime(b.completed_at) - parseTime(a.completed_at))[0]
  return latest?.id
}

function historyCompletedAt(item: AssessmentHistoryItem): string | undefined {
  if (item.completed_at) return item.completed_at
  const attempts = item.attempts ?? []
  const latest = attempts
    .filter((a) => a.completed_at)
    .sort((a, b) => parseTime(b.completed_at) - parseTime(a.completed_at))[0]
  return latest?.completed_at ?? undefined
}

function assessmentKindForItem(item: QuizItem, kind: AssessmentListKind): string {
  if (item.assessment_type?.trim()) return item.assessment_type
  if (kind === "mid_semester") return "mid_semester"
  if (kind === "final") return "final"
  if (kind === "homework") return "homework"
  return "quiz"
}

function assessmentItemFromQuiz(
  item: QuizItem,
  kind: AssessmentListKind,
  history?: AssessmentHistoryItem,
): GradeBreakdownItem {
  const score = quizItemCardScore(item) ?? (history ? historyBestScore(history) : null)
  const { label, pillTone } = quizItemListStatus(item)
  const assessmentType = assessmentKindForItem(item, kind)
  const completedAt = historyCompletedAt(history ?? ({} as AssessmentHistoryItem)) ?? item.available_until

  return {
    id: `assessment-${item.id}`,
    title: item.title,
    subtitle: completedAt ? formatRelativeTime(completedAt) : undefined,
    valueLabel: formatScoreLabel(score),
    statusLabel: label,
    statusTone: pillTone,
    sortTime: parseTime(completedAt) || item.id,
    assessmentId: item.id,
    assessmentType,
    attemptId: history ? historyLatestAttemptId(history) : item.attempt_id,
  }
}

async function fetchAssessmentBreakdown(
  session: StudentSession,
  categoryKey: GradeCategoryKey,
): Promise<GradeBreakdownItem[]> {
  const kind = categoryToAssessmentKind(categoryKey)
  if (!kind) return []

  const [assessments, historyPayload] = await Promise.all([
    fetchAssessmentsForKind(session, kind),
    studentApi.getAssessmentHistory(session).catch(() => ({ history: [], assessmentHistory: [] })),
  ])

  const history = historyPayload.history ?? historyPayload.assessmentHistory ?? []
  const historyById = new Map(history.map((item) => [item.id, item]))

  const items = assessments.map((item) =>
    assessmentItemFromQuiz(item, kind, historyById.get(item.id)),
  )

  return items.sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0))
}

function attendanceItem(record: AttendanceRecord): GradeBreakdownItem {
  const present =
    record.status?.toLowerCase() === "present" || record.status?.toLowerCase() === "late"
  const when = record.timestamp ?? record.startTime

  return {
    id: `attendance-${record.id}`,
    title: record.classTitle ?? "Class session",
    subtitle: when ? formatRelativeTime(when) : undefined,
    valueLabel:
      record.pointsEarned != null && record.pointsEarned !== ""
        ? `+${Number(record.pointsEarned)}`
        : undefined,
    statusLabel: record.status ?? "Recorded",
    statusTone: present ? "success" : "warning",
    sortTime: parseTime(when) || record.id,
  }
}

async function fetchAttendanceBreakdown(session: StudentSession): Promise<GradeBreakdownItem[]> {
  const data = await rewardsApi.getAttendanceRecords(session)
  const records = data.records ?? []
  return records.map(attendanceItem).sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0))
}

function classroomItem(record: ClassroomPointRecord): GradeBreakdownItem {
  const when = record.awarded_at ?? record.created_at
  const pts = Number(record.points ?? 0)
  const status = (record.status ?? "approved").toLowerCase()

  return {
    id: `classroom-${record.id}`,
    title: record.reason || record.submission_title || "Classroom points",
    subtitle: when ? `${categoryLabel(record.category)} · ${formatRelativeTime(when)}` : categoryLabel(record.category),
    valueLabel: pts > 0 ? `+${pts.toFixed(pts % 1 ? 1 : 0)}` : undefined,
    statusLabel:
      status === "approved" ? "Approved" : status === "pending" ? "Pending" : status === "rejected" ? "Rejected" : "Awarded",
    statusTone: status === "approved" ? "success" : status === "pending" ? "live" : status === "rejected" ? "warning" : "neutral",
    sortTime: parseTime(when) || record.id,
    classroomPointId: record.id,
  }
}

async function fetchClassroomBreakdown(session: StudentSession): Promise<GradeBreakdownItem[]> {
  const data = await rewardsApi.getClassroomPoints(session)
  const points = data.points ?? []
  return points.map(classroomItem).sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0))
}

function parseEngagementRecord(raw: unknown, index: number): GradeBreakdownItem | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const title =
    (typeof row.title === "string" && row.title) ||
    (typeof row.reason === "string" && row.reason) ||
    (typeof row.description === "string" && row.description) ||
    (typeof row.source === "string" && row.source) ||
    (typeof row.activity === "string" && row.activity) ||
    (typeof row.summary === "string" && row.summary) ||
    null
  if (!title) return null

  const credits =
    Number(row.credits ?? row.credit ?? row.engagement_credits ?? row.amount ?? row.points ?? row.value) || 0
  const when =
    (typeof row.created_at === "string" && row.created_at) ||
    (typeof row.awarded_at === "string" && row.awarded_at) ||
    (typeof row.timestamp === "string" && row.timestamp) ||
    undefined

  return {
    id: `engagement-${row.id ?? index}`,
    title,
    subtitle: when ? formatRelativeTime(when) : undefined,
    valueLabel: credits > 0 ? `+${Math.round(credits * 10) / 10} cr` : undefined,
    statusLabel: credits > 0 ? "Earned" : undefined,
    statusTone: credits > 0 ? "success" : "neutral",
    sortTime: parseTime(when) || index,
  }
}

function tradeHistoryItem(tx: TradeHistoryItem): GradeBreakdownItem | null {
  const credits = Number(tx.credits_gained ?? 0)
  if (credits <= 0) return null

  return {
    id: `trade-${tx.id}`,
    title: tx.summary?.trim() || "Trade center conversion",
    subtitle: tx.transaction_type ? tx.transaction_type.replace(/_/g, " ") : undefined,
    valueLabel: `+${credits} cr`,
    statusLabel: "Traded",
    statusTone: "success",
    sortTime: parseTime(tx.created_at) || tx.id,
  }
}

async function fetchEngagementBreakdown(session: StudentSession): Promise<GradeBreakdownItem[]> {
  const [creditsPayload, tradePayload] = await Promise.all([
    studentApi.getEngagementCredits(session).catch(() => ({})),
    rewardsApi.getTradeHistory(session).catch(() => ({ transactions: [] })),
  ])

  const items: GradeBreakdownItem[] = []
  const seen = new Set<string>()

  for (const key of ["activities", "history", "credits", "items", "transactions", "earned", "records"]) {
    const arr = (creditsPayload as Record<string, unknown>)[key]
    if (!Array.isArray(arr)) continue
    arr.forEach((raw, index) => {
      const item = parseEngagementRecord(raw, index)
      if (item && !seen.has(item.id)) {
        seen.add(item.id)
        items.push(item)
      }
    })
  }

  for (const tx of tradePayload.transactions ?? []) {
    const item = tradeHistoryItem(tx)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }

  return items.sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0))
}

function projectItem(project: ProjectRecord): GradeBreakdownItem {
  const when = project.updated_at ?? project.created_at
  const status = (project.status ?? "pending").toLowerCase()

  return {
    id: `project-${project.id}`,
    title: project.title,
    subtitle: project.group?.name ?? (when ? formatRelativeTime(when) : undefined),
    statusLabel:
      status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : status === "pending" ? "Pending review" : "In progress",
    statusTone: status === "approved" ? "success" : status === "rejected" ? "warning" : status === "pending" ? "live" : "neutral",
    sortTime: parseTime(when) || project.id,
    projectId: project.id,
  }
}

async function fetchProjectBreakdown(session: StudentSession): Promise<GradeBreakdownItem[]> {
  try {
    const data = await collaborationApi.getProjects(session)
    const projects = data.projects ?? []
    return projects.map(projectItem).sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0))
  } catch {
    return []
  }
}

export async function fetchGradeCategoryBreakdown(
  session: StudentSession,
  categoryKey: GradeCategoryKey,
): Promise<GradeBreakdownItem[]> {
  switch (categoryKey) {
    case "quiz":
    case "homework":
    case "midterm":
    case "final":
      return fetchAssessmentBreakdown(session, categoryKey)
    case "attendance":
      return fetchAttendanceBreakdown(session)
    case "classroom":
      return fetchClassroomBreakdown(session)
    case "engagement":
      return fetchEngagementBreakdown(session)
    case "project":
      return fetchProjectBreakdown(session)
    default:
      return []
  }
}
