import type {
  DashboardStatSource,
  GradeTrendPoint,
  MembershipTier,
  PerformanceComparison,
  PerformanceInsight,
  StudentDashboardStats,
} from "../types/dashboard"
import { parseMembershipTier } from "./membership-tier"
import type { StudentSession } from "./session"
import { studentAuthenticatedRequest } from "./student-api"
import {
  buildStudentDashboardFromRaw,
  type DashboardRawData,
  type GradePayload,
} from "./student-dashboard-build"

export { buildStudentDashboardFromRaw, type DashboardRawData }

function settledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null
}

function markUnavailable(
  unavailable: Partial<Record<DashboardStatSource, true>>,
  source: DashboardStatSource,
  result: PromiseSettledResult<unknown>,
): void {
  if (result.status === "rejected") unavailable[source] = true
}

async function fetchStudentDashboardRawData(session: StudentSession): Promise<DashboardRawData> {
  const enc = encodeURIComponent
  const databaseId = session.databaseId
  const homeworkStudentId = session.id || databaseId
  const section = session.section

  const results = await Promise.allSettled([
    studentAuthenticatedRequest<GradePayload>(
      session,
      `/api/grades/student?studentId=${enc(databaseId)}&session=${enc(section)}&recalculate=true`,
    ),
    studentAuthenticatedRequest<{ quizHistory?: NonNullable<DashboardRawData["quizHistory"]> }>(
      session,
      `/api/student/quiz-history?studentId=${enc(databaseId)}`,
    ),
    homeworkStudentId && section
      ? studentAuthenticatedRequest<{
          homeworkHistory?: NonNullable<DashboardRawData["homeworkHistory"]>
          stats?: { overdue?: number; pending?: number }
        }>(
          session,
          `/api/student/homework-history?studentId=${enc(homeworkStudentId)}&session=${enc(section)}`,
        )
      : Promise.resolve(null),
    studentAuthenticatedRequest<{ attendance?: Record<string, number> }>(
      session,
      `/api/attendance/score?studentId=${enc(databaseId)}`,
    ),
    studentAuthenticatedRequest<{ streak?: { currentStreak?: number } }>(
      session,
      `/api/attendance/streaks?studentId=${enc(databaseId)}`,
    ),
    studentAuthenticatedRequest<{ quizzes?: { available_until?: string }[] }>(
      session,
      `/api/student/quizzes?studentDatabaseId=${enc(databaseId)}&assessmentType=quiz`,
    ),
    studentAuthenticatedRequest<{ finals?: { status?: string }[] }>(
      session,
      `/api/student/finals?session=${enc(section)}&studentId=${enc(homeworkStudentId)}`,
    ),
    studentAuthenticatedRequest<{ summary?: { total_points?: number | string } }>(
      session,
      section && section !== "ALL"
        ? `/api/classroom-points?studentId=${enc(databaseId)}&session=${enc(section)}`
        : `/api/classroom-points?studentId=${enc(databaseId)}`,
    ),
  ])

  const [
    gradeResult,
    quizResult,
    homeworkResult,
    attendanceResult,
    streaksResult,
    quizzesResult,
    finalsResult,
    pointsResult,
  ] = results

  const unavailable: Partial<Record<DashboardStatSource, true>> = {}
  markUnavailable(unavailable, "grade", gradeResult)
  markUnavailable(unavailable, "quizzes", quizResult)
  markUnavailable(unavailable, "homework", homeworkResult)
  markUnavailable(unavailable, "attendance", attendanceResult)
  markUnavailable(unavailable, "streaks", streaksResult)
  markUnavailable(unavailable, "finals", finalsResult)
  markUnavailable(unavailable, "points", pointsResult)

  if (!results.some((result) => result.status === "fulfilled")) {
    throw new Error("Could not load dashboard data.")
  }

  const gradePayload = settledValue(gradeResult)
  const quizPayload = settledValue(quizResult)
  const homeworkPayload = settledValue(homeworkResult)
  const attendancePayload = settledValue(attendanceResult)
  const streaksPayload = settledValue(streaksResult)
  const quizzesPayload = settledValue(quizzesResult)
  const finalsPayload = settledValue(finalsResult)
  const pointsPayload = settledValue(pointsResult)

  return {
    gradePayload,
    quizHistory: quizPayload ? quizPayload.quizHistory ?? [] : null,
    homeworkHistory: homeworkPayload ? homeworkPayload.homeworkHistory ?? [] : null,
    homeworkStats: homeworkPayload?.stats ?? null,
    attendance: attendancePayload?.attendance ?? null,
    attendanceStreak:
      streaksPayload != null ? Number(streaksPayload.streak?.currentStreak ?? 0) : null,
    upcomingQuizzes: quizzesPayload ? quizzesPayload.quizzes ?? [] : null,
    finalsTaken:
      finalsPayload == null
        ? null
        : Array.isArray(finalsPayload.finals) &&
          finalsPayload.finals.some((f) => f.status === "completed"),
    classroomPoints:
      pointsPayload != null ? Number(pointsPayload.summary?.total_points ?? 0) : null,
    unavailable,
  }
}

/** Authenticated dashboard widgets. One failed GET does not drop the rest. */
export async function fetchStudentDashboardBundle(session: StudentSession): Promise<{
  stats: StudentDashboardStats
  trend: GradeTrendPoint[]
  comparison: PerformanceComparison[]
  insights: PerformanceInsight[]
}> {
  const raw = await fetchStudentDashboardRawData(session)
  return buildStudentDashboardFromRaw(raw)
}

export async function fetchStudentDashboardStats(session: StudentSession): Promise<StudentDashboardStats> {
  const { stats } = await fetchStudentDashboardBundle(session)
  return stats
}

export async function fetchGradeTrend(session: StudentSession): Promise<GradeTrendPoint[]> {
  const { trend } = await fetchStudentDashboardBundle(session)
  return trend
}

export async function fetchPerformanceComparison(session: StudentSession): Promise<PerformanceComparison[]> {
  const { comparison } = await fetchStudentDashboardBundle(session)
  return comparison
}

export async function fetchPerformanceInsights(session: StudentSession): Promise<PerformanceInsight[]> {
  const { insights } = await fetchStudentDashboardBundle(session)
  return insights
}

export async function fetchMembershipTier(session: StudentSession): Promise<MembershipTier> {
  const payload = await studentAuthenticatedRequest<{ membership?: { tier?: string } }>(
    session,
    `/api/student/membership?studentId=${encodeURIComponent(session.databaseId)}`,
  )
  if (payload.membership?.tier) {
    return parseMembershipTier(payload.membership.tier)
  }

  if (session.id) {
    const infoPayload = await studentAuthenticatedRequest<{ student?: { membership_tier?: string } }>(
      session,
      `/api/student/info?student_id=${encodeURIComponent(session.id)}`,
    )
    if (infoPayload.student?.membership_tier) {
      return parseMembershipTier(infoPayload.student.membership_tier)
    }
  }

  return "Scholar"
}

export async function fetchClassroomPoints(session: StudentSession): Promise<number> {
  const enc = encodeURIComponent
  const path =
    session.section && session.section !== "ALL"
      ? `/api/classroom-points?studentId=${enc(session.databaseId)}&session=${enc(session.section)}`
      : `/api/classroom-points?studentId=${enc(session.databaseId)}`
  const payload = await studentAuthenticatedRequest<{ summary?: { total_points?: number | string } }>(
    session,
    path,
  )
  return Number(payload.summary?.total_points ?? 0)
}

export async function fetchNotificationCount(session: StudentSession): Promise<number> {
  const payload = await studentAuthenticatedRequest<{
    notifications?: { is_read?: boolean }[]
    unreadCount?: number
    unread_count?: number
  }>(session, `/api/student/notifications?studentId=${encodeURIComponent(session.databaseId)}&limit=50`)
  if (typeof payload.unread_count === "number") return payload.unread_count
  if (typeof payload.unreadCount === "number") return payload.unreadCount
  return Array.isArray(payload.notifications)
    ? payload.notifications.filter((n) => !n.is_read).length
    : 0
}
