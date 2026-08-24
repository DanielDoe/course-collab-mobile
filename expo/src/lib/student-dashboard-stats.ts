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
import { ApiError, studentAuthenticatedRequest, type QuizListRolloverPolicy } from "./student-api"
import { studentContentPath } from "./student-content-context"
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

/** Dual-role auth misses and empty-term 500s are 0, not a failed widget. */
function emptyIfSoftMiss<T>(promise: Promise<T>, empty: T): Promise<T> {
  return promise.catch((err) => {
    if (
      err instanceof ApiError &&
      (err.status === 401 || err.status === 403 || err.status === 404 || err.status === 500)
    ) {
      return empty
    }
    throw err
  })
}

async function fetchStudentDashboardRawData(session: StudentSession): Promise<DashboardRawData> {
  const homeworkStudentId = session.id || session.databaseId

  const results = await Promise.allSettled([
    emptyIfSoftMiss(
      studentAuthenticatedRequest<GradePayload>(
        session,
        studentContentPath(session, "/api/grades/student"),
      ),
      {},
    ),
    emptyIfSoftMiss(
      studentAuthenticatedRequest<{ quizHistory?: NonNullable<DashboardRawData["quizHistory"]> }>(
        session,
        studentContentPath(session, "/api/student/quiz-history"),
      ),
      { quizHistory: [] },
    ),
    homeworkStudentId
      ? studentAuthenticatedRequest<{
          homeworkHistory?: NonNullable<DashboardRawData["homeworkHistory"]>
          stats?: { overdue?: number; pending?: number }
        }>(
          session,
          studentContentPath(session, "/api/student/homework-history", {
            studentId: homeworkStudentId,
          }),
        )
      : Promise.resolve(null),
    emptyIfSoftMiss(
      studentAuthenticatedRequest<{ attendance?: Record<string, number> }>(
        session,
        studentContentPath(session, "/api/attendance/score"),
      ),
      { attendance: {} },
    ),
    emptyIfSoftMiss(
      studentAuthenticatedRequest<{ streak?: { currentStreak?: number } }>(
        session,
        studentContentPath(session, "/api/attendance/streaks"),
      ),
      { streak: { currentStreak: 0 } },
    ),
    studentAuthenticatedRequest<{ quizzes?: { available_until?: string }[]; rollover_policy?: QuizListRolloverPolicy }>(
      session,
      studentContentPath(session, "/api/student/quizzes", { assessmentType: "quiz" }),
    ),
    studentAuthenticatedRequest<{ finals?: { status?: string }[] }>(
      session,
      studentContentPath(session, "/api/student/finals", { studentId: homeworkStudentId }),
    ),
    emptyIfSoftMiss(
      studentAuthenticatedRequest<{ summary?: { total_points?: number | string } }>(
        session,
        studentContentPath(session, "/api/classroom-points"),
      ),
      { summary: { total_points: 0 } },
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
    rolloverPolicy: quizzesPayload?.rollover_policy ?? null,
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
