import type {
  GradeTrendPoint,
  MembershipTier,
  PerformanceComparison,
  PerformanceInsight,
  StudentDashboardStats} from "../types/dashboard"
import { getApiBaseUrl } from "../constants"
import { clampGradebookEngagementCredits } from "./engagement-credits"
import { parseMembershipTier } from "./membership-tier"
import {
  buildGradeTrendSeries,
  buildPerformanceComparison,
  buildPerformanceInsights} from "./grade-trend-logic"

async function fetchJson<T>(path: string, databaseId?: string, timeoutMs = 30000): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const headers: HeadersInit = { Accept: "application/json" }
    if (databaseId) headers["x-student-id"] = databaseId

    const res = await fetch(`${getApiBaseUrl()}${path}`, { headers, signal: controller.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
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

function resolveLetterGrade(totalScore: number): string {
  if (totalScore >= 93) return "A"
  if (totalScore >= 90) return "A-"
  if (totalScore >= 87) return "B+"
  if (totalScore >= 83) return "B"
  if (totalScore >= 80) return "B-"
  if (totalScore >= 77) return "C+"
  if (totalScore >= 73) return "C"
  if (totalScore >= 70) return "C-"
  if (totalScore >= 67) return "D+"
  if (totalScore >= 63) return "D"
  if (totalScore >= 60) return "D-"
  return "F"
}

type QuizHistoryItem = {
  attempts?: { percentage?: number; completed_at?: string }[]
}

type HomeworkHistoryItem = {
  status?: string
  available_until?: string
  attempts?: { percentage?: number; completed_at?: string }[]
}

type GradePayload = {
  grade?: { engagement_credits?: number; total_score?: number; letter_grade?: string | null }
  provisional?: { totalScore?: number; letterGrade?: string | null; gradeIsProvisional?: boolean }
  classAverages?: { avg_quiz?: number; avg_homework?: number; avg_attendance?: number }
} | null

type DashboardRawData = {
  gradePayload: GradePayload
  quizHistory: QuizHistoryItem[]
  homeworkHistory: HomeworkHistoryItem[]
  homeworkStats: { overdue?: number; pending?: number } | null
  attendance: Record<string, number> | null
  attendanceStreak: number
  upcomingQuizzes: { available_until?: string }[]
  finalsTaken: boolean
  classroomPoints: number
}

async function fetchStudentDashboardRawData(
  databaseId: string,
  displayId: string,
  section: string,
): Promise<DashboardRawData> {
  const enc = encodeURIComponent
  const homeworkStudentId = displayId || databaseId

  const [
    gradePayload,
    quizPayload,
    homeworkPayload,
    attendancePayload,
    streaksPayload,
    quizzesPayload,
    finalsPayload,
    pointsPayload,
  ] = await Promise.all([
    fetchJson<NonNullable<GradePayload>>(
      `/api/grades/student?studentId=${enc(databaseId)}&session=${enc(section)}&recalculate=true`,
      databaseId,
    ),
    fetchJson<{ quizHistory?: QuizHistoryItem[] }>(`/api/student/quiz-history?studentId=${enc(databaseId)}`, databaseId),
    homeworkStudentId && section
      ? fetchJson<{ homeworkHistory?: HomeworkHistoryItem[]; stats?: { overdue?: number; pending?: number } }>(
          `/api/student/homework-history?studentId=${enc(homeworkStudentId)}&session=${enc(section)}`,
          databaseId,
        )
      : Promise.resolve(null),
    fetchJson<{ attendance?: Record<string, number> }>(`/api/attendance/score?studentId=${enc(databaseId)}`, databaseId),
    fetchJson<{ streak?: { currentStreak?: number } }>(`/api/attendance/streaks?studentId=${enc(databaseId)}`, databaseId),
    fetchJson<{ quizzes?: { available_until?: string }[] }>(
      `/api/student/quizzes?studentDatabaseId=${enc(databaseId)}&assessmentType=quiz`,
      databaseId,
    ),
    fetchJson<{ finals?: { status?: string }[] }>(
      `/api/student/finals?session=${enc(section)}&studentId=${enc(homeworkStudentId)}`,
      databaseId,
    ),
    fetchJson<{ summary?: { total_points?: number | string } }>(
      section && section !== "ALL"
        ? `/api/classroom-points?studentId=${enc(databaseId)}&session=${enc(section)}`
        : `/api/classroom-points?studentId=${enc(databaseId)}`,
      databaseId,
    ),
  ])

  return {
    gradePayload,
    quizHistory: quizPayload?.quizHistory ?? [],
    homeworkHistory: homeworkPayload?.homeworkHistory ?? [],
    homeworkStats: homeworkPayload?.stats ?? null,
    attendance: attendancePayload?.attendance ?? null,
    attendanceStreak: Number(streaksPayload?.streak?.currentStreak ?? 0),
    upcomingQuizzes: quizzesPayload?.quizzes ?? [],
    finalsTaken:
      Array.isArray(finalsPayload?.finals) &&
      finalsPayload.finals.some((f) => f.status === "completed"),
    classroomPoints: Number(pointsPayload?.summary?.total_points ?? 0),
  }
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

function buildStatsFromRaw(raw: DashboardRawData): StudentDashboardStats {
  let overallGrade = 0
  let letterGrade = "—"
  let quizAverage = 0
  let classQuizAverage = 80
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
    } else {
      letterGrade = resolveLetterGrade(overallGrade)
    }
    if (raw.gradePayload.classAverages?.avg_quiz != null) {
      classQuizAverage = Math.round(Number(raw.gradePayload.classAverages.avg_quiz) * 10) / 10
    }
    engagementCredits = clampGradebookEngagementCredits(raw.gradePayload.grade?.engagement_credits)
  }

  const quizScores = quizScoresFromHistory(raw.quizHistory)
  if (quizScores.length > 0) {
    quizAverage = Math.round((quizScores.reduce((a, b) => a + b, 0) / quizScores.length) * 10) / 10
  }

  const hwScores = homeworkScoresFromHistory(raw.homeworkHistory)
  if (hwScores.length > 0) {
    homeworkAverage = Math.round((hwScores.reduce((a, b) => a + b, 0) / hwScores.length) * 10) / 10
  }
  missingAssignments = (raw.homeworkStats?.overdue ?? 0) + (raw.homeworkStats?.pending ?? 0)

  if (raw.attendance) {
    attendancePct = Math.round(Number(raw.attendance.attendance_percentage ?? 0) * 10) / 10
    const scored = Number(raw.attendance.sessions_scored_so_far ?? raw.attendance.total_classes ?? 0)
    const attended = Number(raw.attendance.classes_attended ?? 0)
    classesMissed = Math.max(0, scored - attended)
  }

  const now = new Date()
  upcomingDeadlines += raw.upcomingQuizzes.filter((q) => q.available_until && new Date(q.available_until) > now).length
  upcomingDeadlines += raw.homeworkHistory.filter(
    (h) => h.status !== "completed" && h.available_until && new Date(h.available_until) > now,
  ).length

  let riskLevel: StudentDashboardStats["riskLevel"] = "low"
  let riskReason = "Grades and attendance on track."

  if (overallGrade >= 85 && attendancePct >= 90 && missingAssignments === 0) {
    riskLevel = "low"
    riskReason = "Grades and attendance on track."
  } else if (overallGrade >= 70 && attendancePct >= 80) {
    riskLevel = "moderate"
    const reasons: string[] = []
    if (overallGrade < 85) reasons.push("grade below 85%")
    if (attendancePct < 90) reasons.push("attendance below 90%")
    if (missingAssignments > 0) reasons.push(`${missingAssignments} missing`)
    riskReason = reasons.length ? `Focus on: ${reasons.join(", ")}` : "Room to improve."
  } else {
    riskLevel = "high"
    const reasons: string[] = []
    if (overallGrade < 70) reasons.push("grade below 70%")
    if (attendancePct < 80) reasons.push("attendance below 80%")
    if (missingAssignments > 0) reasons.push(`${missingAssignments} missing`)
    riskReason = `Action needed: ${reasons.join(", ")}`
  }

  return {
    overallGrade,
    letterGrade,
    quizAverage,
    classQuizAverage,
    homeworkAverage,
    missingAssignments,
    attendancePct,
    classesMissed,
    attendanceStreak: raw.attendanceStreak,
    classroomPoints: raw.classroomPoints,
    engagementCredits,
    upcomingDeadlines,
    riskLevel,
    riskReason,
  }
}

/** Single network round-trip for all dashboard grade widgets. */
export async function fetchStudentDashboardBundle(
  databaseId: string,
  displayId: string,
  section: string,
): Promise<{
  stats: StudentDashboardStats
  trend: GradeTrendPoint[]
  comparison: PerformanceComparison[]
  insights: PerformanceInsight[]
}> {
  const raw = await fetchStudentDashboardRawData(databaseId, displayId, section)
  const gradeTotal = resolveGradeTotal(raw.gradePayload)
  const quizScores = quizScoresFromHistory(raw.quizHistory)
  const hwScores = homeworkScoresFromHistory(raw.homeworkHistory)

  let quizYou = 0
  let quizClass = 80
  let hwYou = 0
  let hwClass = 80
  let attYou = 0

  if (raw.gradePayload?.classAverages?.avg_quiz != null) {
    quizClass = Math.round(Number(raw.gradePayload.classAverages.avg_quiz) * 10) / 10
  }
  if (raw.gradePayload?.classAverages?.avg_homework != null) {
    hwClass = Math.round(Number(raw.gradePayload.classAverages.avg_homework) * 10) / 10
  }
  if (quizScores.length > 0) {
    quizYou = Math.round((quizScores.reduce((a, b) => a + b, 0) / quizScores.length) * 10) / 10
  }
  if (hwScores.length > 0) {
    hwYou = Math.round((hwScores.reduce((a, b) => a + b, 0) / hwScores.length) * 10) / 10
  }
  if (raw.attendance) {
    attYou = Math.round(Number(raw.attendance.attendance_percentage ?? 0) * 10) / 10
  }

  const quizAvg = quizScores.length > 0 ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : 0
  const hwAvg = hwScores.length > 0 ? hwScores.reduce((a, b) => a + b, 0) / hwScores.length : 0
  const missingAssignments = (raw.homeworkStats?.overdue ?? 0) + (raw.homeworkStats?.pending ?? 0)

  return {
    stats: buildStatsFromRaw(raw),
    trend: buildGradeTrendSeries(gradeTotal, raw.quizHistory, raw.homeworkHistory),
    comparison: buildPerformanceComparison(quizYou, quizClass, hwYou, hwClass, attYou),
    insights: buildPerformanceInsights({
      quizAvg,
      hwAvg,
      attendancePct: raw.attendance ? Number(raw.attendance.attendance_percentage ?? 0) : 0,
      overallGrade: gradeTotal,
      missingAssignments,
      finalTaken: raw.finalsTaken,
    }),
  }
}

export async function fetchStudentDashboardStats(
  databaseId: string,
  displayId: string,
  section: string,
): Promise<StudentDashboardStats> {
  const homeworkStudentId = displayId || databaseId
  const enc = encodeURIComponent

  const [gradePayload, quizPayload, homeworkPayload, attendancePayload, streaksPayload, quizzesPayload] =
    await Promise.all([
      fetchJson<{
        grade?: { engagement_credits?: number; total_score?: number; letter_grade?: string | null }
        provisional?: { totalScore?: number; letterGrade?: string | null; gradeIsProvisional?: boolean }
        classAverages?: { avg_quiz?: number; avg_homework?: number; avg_attendance?: number }
      }>(`/api/grades/student?studentId=${enc(databaseId)}&session=${enc(section)}&recalculate=true`, databaseId),
      fetchJson<{ quizHistory?: QuizHistoryItem[] }>(`/api/student/quiz-history?studentId=${enc(databaseId)}`, databaseId),
      homeworkStudentId && section
        ? fetchJson<{ homeworkHistory?: HomeworkHistoryItem[]; stats?: { overdue?: number; pending?: number } }>(
            `/api/student/homework-history?studentId=${enc(homeworkStudentId)}&session=${enc(section)}`,
            databaseId,
          )
        : Promise.resolve(null),
      fetchJson<{ attendance?: Record<string, number> }>(`/api/attendance/score?studentId=${enc(databaseId)}`, databaseId),
      fetchJson<{ streak?: { currentStreak?: number } }>(`/api/attendance/streaks?studentId=${enc(databaseId)}`, databaseId),
      fetchJson<{ quizzes?: { available_until?: string }[] }>(
        `/api/student/quizzes?studentDatabaseId=${enc(databaseId)}&assessmentType=quiz`,
        databaseId,
      ),
    ])

  let overallGrade = 0
  let letterGrade = "—"
  let quizAverage = 0
  let classQuizAverage = 80
  let homeworkAverage = 0
  let missingAssignments = 0
  let attendancePct = 0
  let classesMissed = 0
  let attendanceStreak = 0
  let classroomPoints = 0
  let engagementCredits = 0
  let upcomingDeadlines = 0

  if (gradePayload) {
    overallGrade = resolveGradeTotal(gradePayload)
    if (gradePayload.provisional?.gradeIsProvisional) {
      letterGrade = "In progress"
    } else if (gradePayload.provisional?.letterGrade) {
      letterGrade = gradePayload.provisional.letterGrade
    } else if (gradePayload.grade?.letter_grade) {
      letterGrade = gradePayload.grade.letter_grade
    } else {
      letterGrade = resolveLetterGrade(overallGrade)
    }
    if (gradePayload.classAverages?.avg_quiz != null) {
      classQuizAverage = Math.round(Number(gradePayload.classAverages.avg_quiz) * 10) / 10
    }
    engagementCredits = clampGradebookEngagementCredits(gradePayload.grade?.engagement_credits)
  }

  const quizHistory = quizPayload?.quizHistory ?? []
  const quizScores: number[] = []
  for (const q of quizHistory) {
    const best = q.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0
    if (best > 0) quizScores.push(best)
  }
  if (quizScores.length > 0) {
    quizAverage = Math.round((quizScores.reduce((a, b) => a + b, 0) / quizScores.length) * 10) / 10
  }

  const homeworkHistory = homeworkPayload?.homeworkHistory ?? []
  const hwCompleted = homeworkHistory.filter((h) => h.status === "completed")
  const hwScores = hwCompleted
    .map((h) => h.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0)
    .filter((s) => s > 0)
  if (hwScores.length > 0) {
    homeworkAverage = Math.round((hwScores.reduce((a, b) => a + b, 0) / hwScores.length) * 10) / 10
  }
  missingAssignments = (homeworkPayload?.stats?.overdue ?? 0) + (homeworkPayload?.stats?.pending ?? 0)

  const attendance = attendancePayload?.attendance
  if (attendance) {
    attendancePct = Math.round(Number(attendance.attendance_percentage ?? 0) * 10) / 10
    const scored = Number(attendance.sessions_scored_so_far ?? attendance.total_classes ?? 0)
    const attended = Number(attendance.classes_attended ?? 0)
    classesMissed = Math.max(0, scored - attended)
  }

  attendanceStreak = Number(streaksPayload?.streak?.currentStreak ?? 0)

  const pointsPath =
    section && section !== "ALL"
      ? `/api/classroom-points?studentId=${enc(databaseId)}&session=${enc(section)}`
      : `/api/classroom-points?studentId=${enc(databaseId)}`
  const pointsPayload = await fetchJson<{ summary?: { total_points?: number | string } }>(pointsPath, databaseId)
  if (pointsPayload?.summary?.total_points != null) {
    classroomPoints = Number(pointsPayload.summary.total_points)
  }

  const now = new Date()
  upcomingDeadlines += (quizzesPayload?.quizzes ?? []).filter((q) => {
    if (!q.available_until) return false
    return new Date(q.available_until) > now
  }).length
  upcomingDeadlines += homeworkHistory.filter(
    (h) => h.status !== "completed" && h.available_until && new Date(h.available_until) > now,
  ).length

  let riskLevel: StudentDashboardStats["riskLevel"] = "low"
  let riskReason = "Grades and attendance on track."

  if (overallGrade >= 85 && attendancePct >= 90 && missingAssignments === 0) {
    riskLevel = "low"
    riskReason = "Grades and attendance on track."
  } else if (overallGrade >= 70 && attendancePct >= 80) {
    riskLevel = "moderate"
    const reasons: string[] = []
    if (overallGrade < 85) reasons.push("grade below 85%")
    if (attendancePct < 90) reasons.push("attendance below 90%")
    if (missingAssignments > 0) reasons.push(`${missingAssignments} missing`)
    riskReason = reasons.length ? `Focus on: ${reasons.join(", ")}` : "Room to improve."
  } else {
    riskLevel = "high"
    const reasons: string[] = []
    if (overallGrade < 70) reasons.push("grade below 70%")
    if (attendancePct < 80) reasons.push("attendance below 80%")
    if (missingAssignments > 0) reasons.push(`${missingAssignments} missing`)
    riskReason = `Action needed: ${reasons.join(", ")}`
  }

  return {
    overallGrade,
    letterGrade,
    quizAverage,
    classQuizAverage,
    homeworkAverage,
    missingAssignments,
    attendancePct,
    classesMissed,
    attendanceStreak,
    classroomPoints,
    engagementCredits,
    upcomingDeadlines,
    riskLevel,
    riskReason}
}

export async function fetchGradeTrend(
  databaseId: string,
  displayId: string,
  section: string,
): Promise<GradeTrendPoint[]> {
  const enc = encodeURIComponent
  const homeworkStudentId = displayId || databaseId

  const [gradePayload, quizPayload, homeworkPayload] = await Promise.all([
    fetchJson<{
      grade?: { total_score?: number | string }
      provisional?: { totalScore?: number }
    }>(`/api/grades/student?studentId=${enc(databaseId)}&session=${enc(section)}&recalculate=true`, databaseId),
    fetchJson<{ quizHistory?: QuizHistoryItem[] }>(`/api/student/quiz-history?studentId=${enc(databaseId)}`, databaseId),
    homeworkStudentId && section
      ? fetchJson<{ homeworkHistory?: HomeworkHistoryItem[] }>(
          `/api/student/homework-history?studentId=${enc(homeworkStudentId)}&session=${enc(section)}`,
          databaseId,
        )
      : Promise.resolve(null),
  ])

  const gradeTotal = resolveGradeTotal(gradePayload)
  return buildGradeTrendSeries(
    gradeTotal,
    quizPayload?.quizHistory ?? [],
    homeworkPayload?.homeworkHistory ?? [],
  )
}

export async function fetchPerformanceComparison(
  databaseId: string,
  displayId: string,
  section: string,
): Promise<PerformanceComparison[]> {
  const enc = encodeURIComponent
  const homeworkStudentId = displayId || databaseId

  const [gradePayload, quizPayload, homeworkPayload, attendancePayload] = await Promise.all([
    fetchJson<{
      classAverages?: { avg_quiz?: number; avg_homework?: number; avg_attendance?: number }
    }>(`/api/grades/student?studentId=${enc(databaseId)}&session=${enc(section)}&recalculate=true`, databaseId),
    fetchJson<{ quizHistory?: QuizHistoryItem[] }>(`/api/student/quiz-history?studentId=${enc(databaseId)}`, databaseId),
    homeworkStudentId && section
      ? fetchJson<{ homeworkHistory?: HomeworkHistoryItem[] }>(
          `/api/student/homework-history?studentId=${enc(homeworkStudentId)}&session=${enc(section)}`,
          databaseId,
        )
      : Promise.resolve(null),
    fetchJson<{ attendance?: Record<string, number> }>(`/api/attendance/score?studentId=${enc(databaseId)}`, databaseId),
  ])

  let quizYou = 0
  let quizClass = 80
  let hwYou = 0
  let hwClass = 80
  let attYou = 0

  if (gradePayload?.classAverages?.avg_quiz != null) {
    quizClass = Math.round(Number(gradePayload.classAverages.avg_quiz) * 10) / 10
  }
  if (gradePayload?.classAverages?.avg_homework != null) {
    hwClass = Math.round(Number(gradePayload.classAverages.avg_homework) * 10) / 10
  }

  const quizHistory = quizPayload?.quizHistory ?? []
  const quizScores: number[] = []
  for (const q of quizHistory) {
    const best = q.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0
    if (best > 0) quizScores.push(best)
  }
  if (quizScores.length > 0) {
    quizYou = Math.round((quizScores.reduce((a, b) => a + b, 0) / quizScores.length) * 10) / 10
  }

  const hwHistory = homeworkPayload?.homeworkHistory ?? []
  const hwCompleted = hwHistory.filter((h) => h.status === "completed")
  const hwScores = hwCompleted
    .map((h) => h.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0)
    .filter((s) => s > 0)
  if (hwScores.length > 0) {
    hwYou = Math.round((hwScores.reduce((a, b) => a + b, 0) / hwScores.length) * 10) / 10
  }

  const attendance = attendancePayload?.attendance
  if (attendance) {
    attYou = Math.round(Number(attendance.attendance_percentage ?? 0) * 10) / 10
  }

  return buildPerformanceComparison(quizYou, quizClass, hwYou, hwClass, attYou)
}

export async function fetchPerformanceInsights(
  databaseId: string,
  displayId: string,
  section: string,
): Promise<PerformanceInsight[]> {
  const enc = encodeURIComponent
  const homeworkStudentId = displayId || databaseId

  const [gradePayload, quizPayload, homeworkPayload, attendancePayload, finalsPayload] = await Promise.all([
    fetchJson<{
      grade?: { total_score?: number | string }
      provisional?: { totalScore?: number }
    }>(`/api/grades/student?studentId=${enc(databaseId)}&session=${enc(section)}&recalculate=true`, databaseId),
    fetchJson<{ quizHistory?: QuizHistoryItem[] }>(`/api/student/quiz-history?studentId=${enc(databaseId)}`, databaseId),
    homeworkStudentId && section
      ? fetchJson<{
          homeworkHistory?: HomeworkHistoryItem[]
          stats?: { overdue?: number; pending?: number }
        }>(`/api/student/homework-history?studentId=${enc(homeworkStudentId)}&session=${enc(section)}`, databaseId)
      : Promise.resolve(null),
    fetchJson<{ attendance?: Record<string, number> }>(`/api/attendance/score?studentId=${enc(databaseId)}`, databaseId),
    fetchJson<{ finals?: { status?: string }[] }>(
      `/api/student/finals?session=${enc(section)}&studentId=${enc(homeworkStudentId)}`,
      databaseId,
    ),
  ])

  let quizAvg = 0
  let hwAvg = 0
  let attendancePct = 0
  let overallGrade = 0
  let missingAssignments = 0
  let finalTaken = false

  overallGrade = resolveGradeTotal(gradePayload)

  const quizHistory = quizPayload?.quizHistory ?? []
  const quizScores: number[] = []
  for (const q of quizHistory) {
    const best = q.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0
    if (best > 0) quizScores.push(best)
  }
  if (quizScores.length > 0) {
    quizAvg = quizScores.reduce((a, b) => a + b, 0) / quizScores.length
  }

  const hwHistory = homeworkPayload?.homeworkHistory ?? []
  const hwCompleted = hwHistory.filter((h) => h.status === "completed")
  const hwScores = hwCompleted
    .map((h) => h.attempts?.reduce((max, a) => Math.max(max, a.percentage ?? 0), 0) ?? 0)
    .filter((s) => s > 0)
  if (hwScores.length > 0) {
    hwAvg = hwScores.reduce((a, b) => a + b, 0) / hwScores.length
  }
  missingAssignments = (homeworkPayload?.stats?.overdue ?? 0) + (homeworkPayload?.stats?.pending ?? 0)

  const attendance = attendancePayload?.attendance
  if (attendance) {
    attendancePct = Number(attendance.attendance_percentage ?? 0)
  }

  finalTaken =
    Array.isArray(finalsPayload?.finals) &&
    finalsPayload.finals.some((f) => f.status === "completed")

  return buildPerformanceInsights({
    quizAvg,
    hwAvg,
    attendancePct,
    overallGrade,
    missingAssignments,
    finalTaken})
}

export async function fetchMembershipTier(
  databaseId: string,
  rosterId?: string,
): Promise<MembershipTier> {
  const payload = await fetchJson<{ membership?: { tier?: string } }>(
    `/api/student/membership?studentId=${encodeURIComponent(databaseId)}`,
    databaseId,
  )
  if (payload?.membership?.tier) {
    return parseMembershipTier(payload.membership.tier)
  }

  if (rosterId) {
    const infoPayload = await fetchJson<{ student?: { membership_tier?: string } }>(
      `/api/student/info?student_id=${encodeURIComponent(rosterId)}`,
      databaseId,
    )
    if (infoPayload?.student?.membership_tier) {
      return parseMembershipTier(infoPayload.student.membership_tier)
    }
  }

  return "Scholar"
}

export async function fetchClassroomPoints(databaseId: string, section: string): Promise<number> {
  const enc = encodeURIComponent
  const path =
    section && section !== "ALL"
      ? `/api/classroom-points?studentId=${enc(databaseId)}&session=${enc(section)}`
      : `/api/classroom-points?studentId=${enc(databaseId)}`
  const payload = await fetchJson<{ summary?: { total_points?: number | string } }>(path, databaseId)
  return Number(payload?.summary?.total_points ?? 0)
}

export async function fetchNotificationCount(databaseId: string): Promise<number> {
  const payload = await fetchJson<{ notifications?: { is_read?: boolean }[]; unreadCount?: number; unread_count?: number }>(
    `/api/student/notifications?studentId=${encodeURIComponent(databaseId)}&limit=50`,
    databaseId,
  )
  if (typeof payload?.unread_count === "number") return payload.unread_count
  if (typeof payload?.unreadCount === "number") return payload.unreadCount
  return Array.isArray(payload?.notifications)
    ? payload.notifications.filter((n) => !n.is_read).length
    : 0
}
