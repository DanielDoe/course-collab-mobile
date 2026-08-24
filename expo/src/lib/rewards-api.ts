import type { StudentSession } from "./session"
import { API_BASE_URL } from "../constants"
import { assertProductionHttpsUrl, createApiAbortSignal } from "./http"
import { persistHttpCookiesFromResponse } from "./student-http-cookies"
import { ApiError, studentAuthenticatedHeaders, studentAuthenticatedRequest } from "./student-api"
import { studentContentPath } from "./student-content-context"
import { attendanceLeaderboardForCurrentOffering } from "./attendance-leaderboard-scope"
import { classroomPointsLeaderboardForCurrentOffering } from "./classroom-points-leaderboard-scope"

function request<T>(session: StudentSession, path: string, init?: RequestInit): Promise<T> {
  return studentAuthenticatedRequest<T>(session, path, init)
}

export type ClassroomPointRecord = {
  id: number
  points: number | string
  reason: string
  category?: string
  status?: string
  awarded_at?: string
  created_at?: string
  instructor_name?: string
  submission_id?: number
  submission_title?: string | null
  submission_code?: string | null
  code?: string | null
  plot_image?: string | null
  solution_answer_json?: unknown
  assignment_question_config?: unknown
  point_booster?: number | null
  ai_feedback?: unknown
}

export type ClassroomPointsSummary = {
  total_points?: number | string
  award_count?: number
  last_awarded?: string | null
}

export type ClassroomSubmission = {
  id: number
  title: string
  description?: string | null
  due_at?: string | null
  created_at?: string
  expires_at?: string | null
  duration_hours?: number | null
  submission_kind?: "code" | "solution" | string
  session?: string
  question_config?: import("./classroom-submission").ClassroomQuestionConfig | null
  is_active?: boolean
  attempted?: boolean
  pending?: boolean
  classroomPoint?: {
    classroomPointId?: number
    status?: string
    points?: number | string
    pointBooster?: number
    instructorFeedback?: string | null
  }
}

export type ClassroomSubmissionsResponse = {
  submissions?: ClassroomSubmission[]
  missingSubmissions?: ClassroomSubmission[]
  pendingSubmissions?: ClassroomSubmission[]
}

export type ClassroomLeaderboardEntry = {
  rank: number
  student_id?: number
  full_name?: string
  total_points?: number | string
  award_count?: number
  is_current_user?: boolean
  session?: string
  section?: string
  course_id?: number
  academic_term_id?: number
}

export type AttendanceScore = {
  classes_attended?: number
  total_classes?: number
  sessions_scheduled_total?: number
  sessions_scored_so_far?: number
  attendance_percentage?: number
  attendance_score_10?: number
  total_points_earned?: number
}

export type AttendanceRecord = {
  id: number
  status?: string
  timestamp?: string
  pointsEarned?: number | string
  classTitle?: string
  startTime?: string
  sessionId?: number
}

export type AttendanceStreak = {
  currentStreak?: number
  longestStreak?: number
  totalPoints?: number | string
  nextMilestone?: number
  daysToMilestone?: number
}

export type AttendanceLeaderboardEntry = {
  rank: number
  full_name?: string
  attendance_percentage?: number
  total_points?: number
  current_streak?: number
  is_current_user?: boolean
  section?: string
  session?: string
  course_id?: number
  academic_term_id?: number
  classes_attended?: number
}

export type TradeCenterPoints = {
  practice_points?: number
  playground_points?: number
  reading_points?: number
  total_points?: number
  tradable_points?: number
  carried_over_points?: number
  engagement_credits?: number
}

export type TradeCenterConfig = {
  weekly_practice_cap?: number
  weekly_playground_cap?: number
  weekly_reading_cap?: number
  min_donation_points?: number
  ec_conversion_multiplier?: number
  max_engagement_credits?: number
}

export type TradeHistoryItem = {
  id: number
  transaction_type?: string
  points_used?: number
  credits_gained?: number
  created_at?: string
  summary?: string
  role?: string
}

export type TradePeer = {
  id: number
  student_id?: string
  display_label?: string
  full_name?: string
}

export type PointRequest = {
  id: number
  status?: string
  points?: number
  source?: string
  message?: string
  requester_name?: string
  requestee_name?: string
  created_at?: string
}

export const rewardsApi = {
  getClassroomPoints: (session: StudentSession) =>
    request<{
      points?: ClassroomPointRecord[]
      summary?: ClassroomPointsSummary
      rewardsPolicy?: { points_for_full_grade?: number }
    }>(
      session,
      studentContentPath(session, "/api/classroom-points"),
    ),

  getClassroomLeaderboard: async (session: StudentSession) => {
    const res = await request<{ leaderboard?: ClassroomLeaderboardEntry[] }>(
      session,
      studentContentPath(session, "/api/classroom-points/leaderboard"),
    )
    return {
      ...res,
      leaderboard: classroomPointsLeaderboardForCurrentOffering(res.leaderboard ?? [], session),
    }
  },

  getClassroomSubmissions: (session: StudentSession) =>
    request<ClassroomSubmissionsResponse>(
      session,
      studentContentPath(session, "/api/classroom-points/submissions"),
    ),

  submitClassroomCode: (
    session: StudentSession,
    payload: { submissionId: number; code: string; description?: string; plotImage?: string },
  ) =>
    request<{ success?: boolean; message?: string; pointsAwarded?: number; autoApproved?: boolean }>(
      session,
      "/api/classroom-points/submit-code",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          submissionId: payload.submissionId,
          code: payload.code,
          description: payload.description,
          plotImage: payload.plotImage})},
    ),

  submitClassroomSolution: (
    session: StudentSession,
    payload: { submissionId: number; studentAnswer: string },
  ) =>
    request<{ success?: boolean; message?: string; pointsAwarded?: number; autoApproved?: boolean; instructorFeedback?: string }>(
      session,
      "/api/classroom-points/submit-solution",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          submissionId: payload.submissionId,
          studentAnswer: payload.studentAnswer})},
    ),

  uploadClassroomSolutionFile: async (
    session: StudentSession,
    payload: {
      assignmentId: number
      partId: string
      uri: string
      name: string
      mime: string
    },
  ) => {
    const form = new FormData()
    form.append("file", { uri: payload.uri, name: payload.name, type: payload.mime } as unknown as Blob)
    form.append("studentId", session.databaseId)
    form.append("assignmentId", String(payload.assignmentId))
    form.append("partId", payload.partId)

    const url = `${API_BASE_URL}/api/student/classroom-points/solution-upload`
    assertProductionHttpsUrl(url)
    const headers = await studentAuthenticatedHeaders(session)
    delete headers["Content-Type"]
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      signal: createApiAbortSignal(),
      headers: {
        ...headers,
        Accept: "application/json",
      },
      body: form})
    let body: unknown = null
    const text = await response.text()
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = { error: text }
      }
    }
    if (!response.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : `Upload failed (${response.status})`
      throw new ApiError(message, response.status, body)
    }
    await persistHttpCookiesFromResponse(url, response.headers)
    return body as { url: string; name: string; mime: string; uploaded_at?: string }
  },

  getAttendanceScore: (session: StudentSession) =>
    request<{ attendance?: AttendanceScore }>(
      session,
      studentContentPath(session, "/api/attendance/score"),
    ),

  getAttendanceStreaks: (session: StudentSession) =>
    request<{ streak?: AttendanceStreak }>(
      session,
      studentContentPath(session, "/api/attendance/streaks"),
    ),

  getAttendanceRecords: async (session: StudentSession) => {
    try {
      return await request<{ records?: AttendanceRecord[] }>(
        session,
        studentContentPath(session, "/api/attendance/records"),
      )
    } catch (err) {
      // Production treats the shared records route as instructor-first when
      // student proof is missing. Term start also has no rows yet — don't crash.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return { records: [] }
      }
      throw err
    }
  },

  getAttendanceLeaderboard: async (session: StudentSession, limit = 50) => {
    try {
      const res = await request<{
        leaderboard?: AttendanceLeaderboardEntry[]
        currentStudent?: AttendanceLeaderboardEntry
      }>(
        session,
        studentContentPath(session, "/api/attendance/leaderboard", {
          section: session.section,
          limit,
        }),
      )
      const leaderboard = attendanceLeaderboardForCurrentOffering(res.leaderboard ?? [], session)
      const currentStudent = res.currentStudent
        ? attendanceLeaderboardForCurrentOffering([res.currentStudent], session)[0]
        : undefined
      return { ...res, leaderboard, currentStudent }
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403 || err.status === 404 || err.status === 500)
      ) {
        return { leaderboard: [] as AttendanceLeaderboardEntry[] }
      }
      throw err
    }
  },

  markAttendance: (
    session: StudentSession,
    payload: { sessionId: number; code: string },
  ) =>
    request<{ success?: boolean; message?: string }>(session, "/api/attendance/mark", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        sessionId: payload.sessionId,
        code: payload.code.toUpperCase(),
        checkInMethod: "code"})}),

  getTradeCenterPoints: (session: StudentSession) =>
    request<{
      points?: TradeCenterPoints
      config?: TradeCenterConfig
      canTrade?: boolean
      tradingEnabled?: boolean
      donationsEnabled?: boolean
      ecAvailable?: number
      lifetimeEngagementCredits?: number
      pointsPerEc?: number
    }>(
      session,
      `/api/trade-center/points?studentId=${encodeURIComponent(session.databaseId)}&session=${encodeURIComponent(session.section)}`,
    ),

  getTradeHistory: (session: StudentSession) =>
    request<{
      transactions?: TradeHistoryItem[]
      donationRequests?: PointRequest[]
      pointRequests?: PointRequest[]
    }>(session, `/api/trade-center/my-history?studentId=${encodeURIComponent(session.databaseId)}`),

  getTradePeers: (session: StudentSession) =>
    request<{ peers?: TradePeer[] }>(
      session,
      `/api/trade-center/peers?session=${encodeURIComponent(session.section)}&excludeId=${encodeURIComponent(session.databaseId)}`,
    ),

  getDonationRequests: (session: StudentSession) =>
    request<{ requests?: PointRequest[] }>(
      session,
      `/api/trade-center/donation-requests?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getPointRequests: (session: StudentSession) =>
    request<{ requests?: PointRequest[] }>(
      session,
      `/api/trade-center/point-requests?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  tradePoints: (session: StudentSession, pointsToTrade: number) =>
    request<{ success?: boolean; creditsGained?: number; message?: string }>(
      session,
      "/api/trade-center/trade",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          session: session.section,
          pointsToTrade})},
    ),

  donateToCommunity: (session: StudentSession, pointsToDonate: number) =>
    request<{ success?: boolean; message?: string }>(session, "/api/trade-center/donate", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        session: session.section,
        pointsToDonate,
        poolType: "COMMUNITY"})}),

  createDonationRequest: (
    session: StudentSession,
    payload: { recipientId: number; points: number; source: string },
  ) =>
    request<{ success?: boolean; message?: string }>(session, "/api/trade-center/donation-requests", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        session: session.section,
        recipientId: payload.recipientId,
        points: payload.points,
        source: payload.source})}),

  createPointRequest: (
    session: StudentSession,
    payload: { requesteeId: number; points: number; source: string; message?: string },
  ) =>
    request<{ success?: boolean; message?: string }>(session, "/api/trade-center/point-requests", {
      method: "POST",
      body: JSON.stringify({
        requesterId: session.databaseId,
        session: session.section,
        requesteeId: payload.requesteeId,
        points: payload.points,
        source: payload.source,
        message: payload.message})}),

  approvePointRequest: (session: StudentSession, requestId: number) =>
    request<{ success?: boolean; message?: string }>(
      session,
      `/api/trade-center/point-requests/${requestId}/approve-peer`,
      {
        method: "POST",
        // API requires requesteeId (the peer approving), not studentId — matches web trade-center-content.
        body: JSON.stringify({ requesteeId: session.databaseId }),
      },
    ),

  rejectPointRequest: (session: StudentSession, requestId: number) =>
    request<{ success?: boolean; message?: string }>(
      session,
      `/api/trade-center/point-requests/${requestId}/reject-peer`,
      {
        method: "POST",
        body: JSON.stringify({ requesteeId: session.databaseId }),
      },
    ),

  syncTradePoints: (session: StudentSession) =>
    request<{ success?: boolean }>(session, "/api/trade-center/sync", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        session: session.section})})}

export function formatRelativeTime(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function categoryLabel(category?: string): string {
  const map: Record<string, string> = {
    code_submission: "Code",
    solution_submission: "Solution",
    presentation: "Presentation",
    participation: "Participation",
    quiz_bonus: "Quiz bonus",
    extra_credit: "Extra credit",
    other: "Other"}
  return map[category ?? ""] ?? category?.replace(/_/g, " ") ?? "Award"
}
