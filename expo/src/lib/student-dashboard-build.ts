import type {
  DashboardStatSource,
  GradeTrendPoint,
  PerformanceComparison,
  PerformanceInsight,
  StudentDashboardStats,
} from "../types/dashboard"
import { clampGradebookEngagementCredits } from "./engagement-credits"
import type { QuizListRolloverPolicy } from "./student-api"
import {
  buildGradeTrendSeries,
  buildPerformanceComparison,
  buildPerformanceInsights,
} from "./grade-trend-logic"

function optionalAverage(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

function resolveGradeTotal(payload: {
  grade?: { total_score?: number | string }
  provisional?: { totalScore?: number }
} | null): number {
  if (!payload) return 0
  if (payload.provisional?.totalScore != null) {
    return Math.round(Number(payload.provisional.totalScore) * 10) / 10
  }
  return Math.round(Number(payload.grade?.total_score ?? 0) * 10) / 10
}

type QuizHistoryItem = {
  attempts?: { percentage?: number; completed_at?: string }[]
}

type HomeworkHistoryItem = {
  status?: string
  available_until?: string
  attempts?: { percentage?: number; completed_at?: string }[]
}

export type GradePayload = {
  grade?: { engagement_credits?: number; total_score?: number; letter_grade?: string | null }
  provisional?: { totalScore?: number; letterGrade?: string | null; gradeIsProvisional?: boolean }
  classAverages?: { avg_quiz?: number; avg_homework?: number; avg_attendance?: number }
}

export type DashboardRawData = {
  gradePayload: GradePayload | null
  quizHistory: QuizHistoryItem[] | null
  homeworkHistory: HomeworkHistoryItem[] | null
  homeworkStats: { overdue?: number; pending?: number } | null
  attendance: Record<string, number> | null
  attendanceStreak: number | null
  upcomingQuizzes: { available_until?: string }[] | null
  finalsTaken: boolean | null
  classroomPoints: number | null
  unavailable: Partial<Record<DashboardStatSource, true>>
  rolloverPolicy?: QuizListRolloverPolicy | null
}

const SOURCE_LABEL: Record<DashboardStatSource, string> = {
  grade: "grades",
  quizzes: "quizzes",
  homework: "homework",
  attendance: "attendance",
  streaks: "attendance streak",
  points: "classroom points",
  finals: "finals",
}

function quizScoresFromHistory(quizHistory: QuizHistoryItem[]): number[] {
  const scores: number[] = []
  for (const q of quizHistory) {
    const best = q.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0
    if (best > 0) scores.push(best)
  }
  return scores
}

function homeworkScoresFromHistory(homeworkHistory: HomeworkHistoryItem[]): number[] {
  return homeworkHistory
    .filter((h) => h.status === "completed")
    .map((h) => h.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0)
    .filter((s) => s > 0)
}

function partialErrorFromUnavailable(
  unavailable: Partial<Record<DashboardStatSource, true>>,
): string | undefined {
  const labels = (Object.keys(unavailable) as DashboardStatSource[])
    .filter((key) => unavailable[key])
    .map((key) => SOURCE_LABEL[key])
  if (labels.length === 0) return undefined
  return `Some widgets could not load (${labels.join(", ")}). Other metrics are still shown.`
}

/** Build dashboard widgets from settled API payloads. Failed sources stay unavailable — never 0%. */
export function buildStudentDashboardFromRaw(raw: DashboardRawData): {
  stats: StudentDashboardStats
  trend: GradeTrendPoint[]
  comparison: PerformanceComparison[]
  insights: PerformanceInsight[]
} {
  const unavailable = { ...raw.unavailable }
  const quizHistory = raw.quizHistory ?? []
  const homeworkHistory = raw.homeworkHistory ?? []
  const upcomingQuizzes = raw.upcomingQuizzes ?? []

  let overallGrade = 0
  let letterGrade = "—"
  let quizAverage = 0
  let classQuizAverage: number | null = null
  let homeworkAverage = 0
  let missingAssignments = 0
  let attendancePct = 0
  let classesMissed = 0
  let engagementCredits = 0
  let upcomingDeadlines = 0

  if (raw.gradePayload) {
    overallGrade = resolveGradeTotal(raw.gradePayload)
    if (raw.gradePayload.provisional?.gradeIsProvisional) {
      letterGrade = "In progress"
    } else if (raw.gradePayload.provisional?.letterGrade) {
      letterGrade = raw.gradePayload.provisional.letterGrade
    } else if (raw.gradePayload.grade?.letter_grade) {
      letterGrade = raw.gradePayload.grade.letter_grade
    }
    classQuizAverage = optionalAverage(raw.gradePayload.classAverages?.avg_quiz)
    engagementCredits = clampGradebookEngagementCredits(raw.gradePayload.grade?.engagement_credits)
  }

  const quizScores = quizScoresFromHistory(quizHistory)
  if (quizScores.length > 0) {
    quizAverage = Math.round((quizScores.reduce((a, b) => a + b, 0) / quizScores.length) * 10) / 10
  }

  const hwScores = homeworkScoresFromHistory(homeworkHistory)
  if (hwScores.length > 0) {
    homeworkAverage = Math.round((hwScores.reduce((a, b) => a + b, 0) / hwScores.length) * 10) / 10
  }
  if (!unavailable.homework) {
    missingAssignments = (raw.homeworkStats?.overdue ?? 0) + (raw.homeworkStats?.pending ?? 0)
  }

  if (raw.attendance) {
    attendancePct = Math.round(Number(raw.attendance.attendance_percentage ?? 0) * 10) / 10
    const scored = Number(raw.attendance.sessions_scored_so_far ?? raw.attendance.total_classes ?? 0)
    const attended = Number(raw.attendance.classes_attended ?? 0)
    classesMissed = Math.max(0, scored - attended)
  }

  const now = new Date()
  if (raw.upcomingQuizzes) {
    upcomingDeadlines += upcomingQuizzes.filter((q) => q.available_until && new Date(q.available_until) > now).length
  }
  if (raw.homeworkHistory) {
    upcomingDeadlines += homeworkHistory.filter(
      (h) => h.status !== "completed" && h.available_until && new Date(h.available_until) > now,
    ).length
  }

  let riskLevel: StudentDashboardStats["riskLevel"] = "low"
  let riskReason = "Grades and attendance on track."
  const gradeKnown = !unavailable.grade
  const attendanceKnown = !unavailable.attendance

  if (gradeKnown && attendanceKnown && overallGrade >= 85 && attendancePct >= 90 && missingAssignments === 0) {
    riskLevel = "low"
    riskReason = "Grades and attendance on track."
  } else if (gradeKnown && attendanceKnown && overallGrade >= 70 && attendancePct >= 80) {
    riskLevel = "moderate"
    const reasons: string[] = []
    if (overallGrade < 85) reasons.push("grade below 85%")
    if (attendancePct < 90) reasons.push("attendance below 90%")
    if (missingAssignments > 0) reasons.push(`${missingAssignments} missing`)
    riskReason = reasons.length ? `Focus on: ${reasons.join(", ")}` : "Room to improve."
  } else if (gradeKnown || attendanceKnown) {
    riskLevel = "high"
    const reasons: string[] = []
    if (gradeKnown && overallGrade < 70) reasons.push("grade below 70%")
    if (attendanceKnown && attendancePct < 80) reasons.push("attendance below 80%")
    if (!unavailable.homework && missingAssignments > 0) reasons.push(`${missingAssignments} missing`)
    riskReason = reasons.length ? `Action needed: ${reasons.join(", ")}` : "Action needed."
  }

  const quizYou = unavailable.quizzes ? 0 : quizAverage
  const hwYou = unavailable.homework ? 0 : homeworkAverage
  const attYou = unavailable.attendance ? 0 : attendancePct

  return {
    stats: {
      overallGrade,
      letterGrade,
      quizAverage,
      classQuizAverage,
      homeworkAverage,
      missingAssignments,
      attendancePct,
      classesMissed,
      attendanceStreak: raw.attendanceStreak ?? 0,
      classroomPoints: raw.classroomPoints ?? 0,
      engagementCredits,
      upcomingDeadlines,
      riskLevel,
      riskReason,
      unavailable,
      partialError: partialErrorFromUnavailable(unavailable),
    },
    trend: buildGradeTrendSeries(unavailable.grade ? 0 : overallGrade, quizHistory, homeworkHistory, {
      quiz: quizYou,
      homework: hwYou,
    }, {
      termLabel: raw.rolloverPolicy?.academic_term_label,
      semesterEndIso: raw.rolloverPolicy?.semester_end_iso,
    }),
    comparison: buildPerformanceComparison(
      quizYou,
      optionalAverage(raw.gradePayload?.classAverages?.avg_quiz),
      hwYou,
      optionalAverage(raw.gradePayload?.classAverages?.avg_homework),
      attYou,
      optionalAverage(raw.gradePayload?.classAverages?.avg_attendance),
    ),
    insights: buildPerformanceInsights({
      quizAvg: quizYou,
      hwAvg: hwYou,
      attendancePct: attYou,
      overallGrade: unavailable.grade ? 0 : overallGrade,
      missingAssignments,
      finalTaken: raw.finalsTaken === true,
    }),
  }
}
