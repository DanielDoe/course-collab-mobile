import type {
  RecommendationAttachment,
  RecommendationDraft,
  RecommendationProfile,
} from "./instructor-api"
import type { StudentSession } from "./session"
import { mfaTrustRequestHeadersForStudent } from "./mfa-device-trust"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { API_BASE_URL } from "../constants"
import { extractApiErrorMessage } from "./api-error-message"
import { reportMobileApiError } from "./system-log-client"
import { assertProductionHttpsUrl, createApiAbortSignal, noteApiFailure, sanitizeLogValue } from "./http"

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function studentHeaders(session: StudentSession): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-student-id": session.databaseId,
  }
  if (session.section) {
    headers["x-student-session"] = session.section
  }
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  return headers
}

/** Web lecture workspace GET — roster id in query, session cookies, no x-student-id. */
async function studentWorkspaceHeaders(session: StudentSession): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  return headers
}

async function studentWorkspaceRequest<T>(
  session: StudentSession,
  path: string,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  assertProductionHttpsUrl(url)
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: await studentWorkspaceHeaders(session),
    signal: createApiAbortSignal(),
  })

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
    noteApiFailure(path, response.status)
    const message = extractApiErrorMessage(body, response.status, path)
    throw new ApiError(message, response.status, body)
  }

  await persistHttpCookiesFromResponse(url, response.headers)

  return body as T
}

async function studentRequest<T>(
  session: StudentSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  assertProductionHttpsUrl(url)
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    signal: createApiAbortSignal(undefined, init?.signal ?? undefined),
    headers: {
      ...(await studentHeaders(session)),
      ...init?.headers,
    },
  })

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
    noteApiFailure(path, response.status)
    const message = extractApiErrorMessage(body, response.status, path)
    const isExpectedMobilePaymentGap =
      (response.status === 404 || response.status === 503) &&
      path.includes("mobile-payment")
    if (__DEV__ && !isExpectedMobilePaymentGap) {
      console.error("[CourseCollab API]", {
        status: response.status,
        path,
        message,
        body: sanitizeLogValue(body),
      })
    }
    if (!__DEV__ || response.status >= 500) {
      reportMobileApiError({
        path,
        method: init?.method ?? "GET",
        status: response.status,
        message,
        body: sanitizeLogValue(body),
      })
    }
    throw new ApiError(message, response.status, body)
  }

  await persistHttpCookiesFromResponse(url, response.headers)

  return body as T
}

/** Authenticated student API fetch — cookies, MFA trust, and x-student-id. */
export function studentAuthenticatedRequest<T>(
  session: StudentSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  return studentRequest<T>(session, path, init)
}

/** User-visible module error text from failed module loads. */
export function formatStudentModuleError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.message
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message
  }
  return fallback
}

async function studentRequestWithStudentIdFallback<T>(
  session: StudentSession,
  pathBuilder: (params: URLSearchParams) => string,
  init?: RequestInit,
): Promise<T> {
  const studentIds = [...new Set([session.id, session.databaseId].filter(Boolean))]
  let lastError: unknown
  for (const studentId of studentIds) {
    const params = new URLSearchParams({ studentId })
    if (session.courseId != null && Number.isFinite(session.courseId)) {
      params.set("courseId", String(session.courseId))
    }
    try {
      return await studentRequest<T>(session, pathBuilder(params), init)
    } catch (err) {
      lastError = err
    }
  }
  if (lastError instanceof ApiError) throw lastError
  throw new ApiError("Request failed.", 0, lastError)
}

export type QuizItem = {
  id: number
  title: string
  description?: string
  assessment_type?: string
  available_from?: string
  available_until?: string
  status?: string
  best_score?: number
  attempts_used?: number
  retake_limit?: number
  is_active?: boolean
  time_per_question?: number
  question_count?: number
  attempted?: boolean
  completed?: boolean
  attempt_id?: number
  can_take?: boolean
  can_retake?: boolean
  saved_for_later?: boolean
  in_progress_attempt_id?: number | null
  score?: number
  display_percentage?: number
  total_questions?: number
  calendar_open?: boolean
  session_access_active?: boolean
  semester_assessments_closed?: boolean
  final_access_pending_allowlist?: boolean
  can_apply_rollover?: boolean
  rollover_requires_upgrade?: boolean
  rollover_active?: boolean
  rollover_hours?: number
  rollover_membership_applies_max?: number
  rollover_membership_applies_used?: number
  calendar_retake_perks_expired?: boolean
  expired_retake_slots?: number | null
  attempts_remaining?: number | null
  quiz_type?: string
}

export type AssessmentHistoryAttempt = {
  id: number
  completed_at?: string | null
  is_completed?: boolean
  percentage?: number
  score?: number
}

export type AssessmentHistoryItem = {
  id: number
  title: string
  assessment_type: string
  best_score?: number
  completed_at?: string
  status?: string
  attempts?: AssessmentHistoryAttempt[]
}

export type LectureItem = {
  id: number
  week: number
  title: string
  description?: string
  status?: string
  progress_percentage?: number
  session?: string
  pdf_url?: string | null
  document_url?: string | null
  original_file_url?: string | null
  allow_download?: boolean
  sample_practice?: unknown
  lecture_workspace?: unknown
}

export type StudentLectureDetail = LectureItem

export type AnnouncementAttachment = {
  name: string
  url: string
  type: string
}

export type Announcement = {
  id: number
  title: string
  content?: string
  created_at: string
  updated_at?: string
  pinned?: boolean
  author_name?: string
  author_email?: string
  category?: string
  priority?: string
  views_count?: number
  reactions_count?: number
  comments_count?: number
  reactions_breakdown?: Record<string, number>
  attachments?: AnnouncementAttachment[]
  attachment_count?: number
  is_read?: boolean
  viewed_by_me?: boolean
  my_reaction?: string | null
  allow_reactions?: boolean
  allow_comments?: boolean
  student_content_locked?: boolean
  content_summary?: string | null
  ai_summary?: string | null
}

export type AnnouncementComment = {
  id: number
  content: string
  student_id: number
  student_name: string
  created_at: string
  updated_at?: string
}

export type StudentProfile = {
  full_name?: string
  email?: string
  student_id?: string
  section?: string
}

export type OfficeHoursRequest = {
  id: number
  topic: string
  status?: string
  priority?: string
  preferred_times?: string
  area_of_concern?: string
  description?: string
  preferredDates?: string[]
  created_at?: string
}

export const studentApi = {
  getQuizzes: (session: StudentSession, type: string) =>
    studentRequest<{ quizzes: QuizItem[] }>(
      session,
      `/api/student/quizzes?studentDatabaseId=${encodeURIComponent(session.databaseId)}&type=${encodeURIComponent(type)}`,
    ),

  getAssessmentHistory: (session: StudentSession) =>
    studentRequest<{ history?: AssessmentHistoryItem[]; assessmentHistory?: AssessmentHistoryItem[] }>(
      session,
      `/api/student/assessment-history?studentDatabaseId=${encodeURIComponent(session.databaseId)}&session=${encodeURIComponent(session.section)}`,
    ),

  getMidSemesters: (session: StudentSession) =>
    studentRequest<{ midSemesters?: QuizItem[]; exams?: QuizItem[] }>(
      session,
      `/api/student/mid-semesters?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getFinals: (session: StudentSession) =>
    studentRequest<{ finals?: QuizItem[]; exams?: QuizItem[] }>(
      session,
      `/api/student/finals?session=${encodeURIComponent(session.section)}&studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  applyRollover: (session: StudentSession, quizId: number) =>
    studentRequest<{ success?: boolean; message?: string; error?: string; upgradeRequired?: boolean }>(
      session,
      "/api/student/rollover/apply",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: Number(session.databaseId),
          quizId,
          acknowledgedRules: true})},
    ),

  getGrades: (session: StudentSession) =>
    studentRequest<import("./grades-api").StudentGradesResponse>(
      session,
      `/api/grades/student?studentId=${encodeURIComponent(session.databaseId)}&session=${encodeURIComponent(session.section)}&recalculate=true`,
    ),

  getEngagementCredits: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/engagement-credits?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getLectures: (session: StudentSession) =>
    studentRequest<{ lectures: LectureItem[] }>(
      session,
      `/api/student/lectures?studentId=${encodeURIComponent(session.id)}`,
    ),

  getLectureById: (session: StudentSession, lectureId: number) =>
    studentRequest<{ lecture: StudentLectureDetail }>(
      session,
      `/api/student/lectures/${lectureId}?studentId=${encodeURIComponent(session.id)}`,
    ),

  getLectureContent: (session: StudentSession, lectureId: number) =>
    studentRequest<{ lecture?: StudentLectureDetail } & Record<string, unknown>>(
      session,
      `/api/student/lectures/${lectureId}/content?studentId=${encodeURIComponent(session.id)}`,
    ),

  getLectureSamplePractice: (session: StudentSession, lectureId: number) =>
    studentRequestWithStudentIdFallback<{ config?: unknown; sample_practice?: unknown; questions?: unknown[] }>(
      session,
      (params) => `/api/student/lectures/${lectureId}/sample-practice?${params.toString()}`,
    ),

  getLectureWorkspace: async (session: StudentSession, lectureId: number) => {
    type WorkspaceResponse = {
      config?: unknown
      workspace?: unknown
      questions?: unknown[]
      enabled?: boolean
      title?: string
      button_label?: string
    }
    const studentIds = [...new Set([session.id, session.databaseId].filter(Boolean))]
    let best: WorkspaceResponse | null = null
    let bestCount = -1
    let lastError: unknown

    for (const studentId of studentIds) {
      const params = new URLSearchParams({ studentId })
      if (session.courseId != null && Number.isFinite(session.courseId)) {
        params.set("courseId", String(session.courseId))
      }
      try {
        const result = await studentWorkspaceRequest<WorkspaceResponse>(
          session,
          `/api/student/lectures/${lectureId}/workspace?${params.toString()}`,
        )
        const count = Array.isArray(result.questions) ? result.questions.length : 0
        if (count > bestCount) {
          best = result
          bestCount = count
        }
        if (count > 0) return result
      } catch (err) {
        lastError = err
      }
    }

    if (best) return best
    if (lastError instanceof ApiError) throw lastError
    throw new ApiError("Request failed.", 0, lastError)
  },

  updateLectureProgress: (
    session: StudentSession,
    lectureId: number,
    progressPercentage: number,
  ) =>
    studentRequest<{ progress_percentage?: number }>(
      session,
      `/api/student/lectures/${lectureId}/progress`,
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.id,
          progress_percentage: progressPercentage,
        }),
      },
    ),

  getAnnouncements: (session: StudentSession) =>
    studentRequest<{ announcements: Announcement[] }>(
      session,
      `/api/announcements?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getAnnouncementById: (session: StudentSession, id: number) =>
    studentRequest<{ announcement: Announcement }>(
      session,
      `/api/announcements/${id}?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  markAnnouncementViewed: (session: StudentSession, id: number) =>
    studentRequest<{ totalViews?: number; isNewView?: boolean }>(
      session,
      `/api/announcements/${id}/view`,
      {
        method: "POST",
        body: JSON.stringify({ studentId: session.databaseId })},
    ),

  reactToAnnouncement: (session: StudentSession, id: number, reactionType: string) =>
    studentRequest<{ reactionType: string | null }>(
      session,
      `/api/announcements/${id}/react`,
      {
        method: "POST",
        body: JSON.stringify({ studentId: session.databaseId, reactionType })},
    ),

  getAnnouncementComments: (session: StudentSession, id: number) =>
    studentRequest<{ comments: AnnouncementComment[] }>(
      session,
      `/api/announcements/${id}/comments`,
    ),

  postAnnouncementComment: (session: StudentSession, id: number, content: string) =>
    studentRequest<{ comment: AnnouncementComment }>(
      session,
      `/api/announcements/${id}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ studentId: session.databaseId, content })},
    ),

  getProgressReview: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/student/progress-review?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getSyllabus: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/student/syllabus?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getCoursePolicies: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/student/course-assessment-governance?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getProfile: (session: StudentSession) =>
    studentRequest<{ student?: StudentProfile; profile?: StudentProfile }>(
      session,
      `/api/student/profile?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  updateProfile: (session: StudentSession, payload: { fullName: string; email: string }) =>
    studentRequest(session, "/api/student/profile", {
      method: "PUT",
      body: JSON.stringify({
        studentId: session.databaseId,
        fullName: payload.fullName,
        email: payload.email})}),

  changePassword: (session: StudentSession, currentPassword: string, newPassword: string) =>
    studentRequest(session, "/api/student/change-password", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        currentPassword,
        newPassword})}),

  getMembership: (session: StudentSession) =>
    studentRequest<{
      membership?: {
        tier?: string
        displayName?: string
        expiresAt?: string | null
        status?: string
      }
      billing?: {
        semesterOnly?: boolean
        availableCadences?: Array<"semester" | "monthly">
        defaultCadence?: "semester" | "monthly"
      }
    }>(
      session,
      `/api/student/membership?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getMembershipDetails: (session: StudentSession) =>
    studentRequest<import("./membership-details-api").MembershipDetailsResponse>(
      session,
      `/api/student/membership/details?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  cancelMembership: (session: StudentSession) =>
    studentRequest<{ message?: string }>(session, "/api/membership/cancel", {
      method: "POST",
      body: JSON.stringify({ studentId: session.databaseId }),
    }),

  reactivateMembership: (session: StudentSession) =>
    studentRequest<{ message?: string; plan?: string }>(session, "/api/membership/reactivate", {
      method: "POST",
      body: JSON.stringify({ studentId: session.databaseId }),
    }),

  getMembershipPurchases: (session: StudentSession) =>
    studentRequest<import("./membership-billing-api").MembershipPurchasesResponse>(
      session,
      `/api/student/purchases?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  upgradeMembership: (
    session: StudentSession,
    options: {
      tier: import("../types/dashboard").MembershipTier
      billingCadence?: "semester" | "monthly"
      mobileReturn?: boolean
    },
  ) =>
    studentRequest<import("./membership-checkout-api").MembershipUpgradeResponse>(
      session,
      "/api/student/membership/upgrade",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: parseInt(session.databaseId, 10),
          tier: options.tier,
          billingCadence: options.billingCadence ?? "semester",
          redirectCheckout: true,
          mobileReturn: options.mobileReturn ?? true,
        }),
      },
    ),

  syncMembershipStripe: (session: StudentSession) =>
    studentRequest<import("./membership-checkout-api").MembershipSyncResponse>(
      session,
      "/api/membership/sync-stripe",
      {
        method: "POST",
        body: JSON.stringify({ studentId: parseInt(session.databaseId, 10) }),
      },
    ),

  prepareMembershipPaymentSheet: (
    session: StudentSession,
    options: {
      tier: import("../types/dashboard").MembershipTier
      billingCadence?: "semester" | "monthly"
    },
  ) =>
    studentRequest<import("./membership-payment-api").MobilePaymentSheetResponse>(
      session,
      "/api/student/membership/mobile-payment-sheet",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: parseInt(session.databaseId, 10),
          tier: options.tier,
          billingCadence: options.billingCadence ?? "semester",
        }),
      },
    ),

  createMembershipPaymentIntent: (
    session: StudentSession,
    options: {
      tier: import("../types/dashboard").MembershipTier
      billingCadence?: "semester" | "monthly"
      paymentMethodId: string
      shouldSavePaymentMethod: boolean
    },
  ) =>
    studentRequest<import("./membership-payment-api").MobilePaymentIntentResponse>(
      session,
      "/api/student/membership/mobile-payment-intent",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: parseInt(session.databaseId, 10),
          tier: options.tier,
          billingCadence: options.billingCadence ?? "semester",
          paymentMethodId: options.paymentMethodId,
          shouldSavePaymentMethod: options.shouldSavePaymentMethod,
        }),
      },
    ),

  getOfficeHours: (session: StudentSession) =>
    studentRequest<{ requests?: OfficeHoursRequest[] }>(
      session,
      `/api/student/office-hours?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  createOfficeHours: (
    session: StudentSession,
    payload: {
      topic: string
      priority?: string
      preferredTimes?: string
      areaOfConcern?: string
      description?: string
      preferredDates?: string[]
    },
  ) =>
    studentRequest(session, "/api/student/office-hours", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        topic: payload.topic,
        priority: payload.priority ?? "medium",
        areaOfConcern: payload.areaOfConcern,
        description: payload.description,
        preferredDates: payload.preferredDates,
        preferredTimes: payload.preferredTimes})}),

  getRecommendationMeta: (session: StudentSession) =>
    studentRequest<{
      student?: Record<string, unknown>
      instructors?: Array<{ id: number; name?: string; email?: string; username?: string }>
      sessions?: Array<{ id: number; code?: string; description?: string }>
    }>(
      session,
      `/api/student/recommendations/meta?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  createRecommendation: (
    session: StudentSession,
    payload: {
      courseId: number
      instructorId: number
      purpose: string
      deadline?: string
      studentRequestDescription?: string
      purposeOtherDetail?: string
      recipientName?: string
      recipientOrganization?: string
      recipientAddress?: string
      letterIsSpecific?: boolean
    },
  ) =>
    studentRequest(session, "/api/student/recommendations", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        courseId: payload.courseId,
        instructorId: payload.instructorId,
        purpose: payload.purpose,
        deadline: payload.deadline,
        studentRequestDescription: payload.studentRequestDescription,
        purposeOtherDetail: payload.purposeOtherDetail,
        recipientName: payload.recipientName,
        recipientOrganization: payload.recipientOrganization,
        recipientAddress: payload.recipientAddress,
        letterIsSpecific: payload.letterIsSpecific,
      }),
    }),

  getAttendanceRecords: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/attendance/records?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getAttendanceScore: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/attendance/score?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getAttendanceStreaks: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/attendance/streaks?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getClassroomPoints: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/classroom-points?studentId=${encodeURIComponent(session.databaseId)}&session=${encodeURIComponent(session.section)}`,
    ),

  getClassroomPointsLeaderboard: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/classroom-points/leaderboard?studentId=${encodeURIComponent(session.databaseId)}&session=${encodeURIComponent(session.section)}`,
    ),

  getTradeCenterPoints: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/trade-center/points?studentId=${encodeURIComponent(session.databaseId)}&session=${encodeURIComponent(session.section)}`,
    ),

  getForumThreads: (session: StudentSession) =>
    studentRequest<{ threads?: Record<string, unknown>[] }>(
      session,
      `/api/forum/threads?studentId=${encodeURIComponent(session.databaseId)}&section=${encodeURIComponent(session.section)}`,
    ),

  getGroups: (session: StudentSession) =>
    studentRequest<{ groups?: Record<string, unknown>[] }>(
      session,
      `/api/groups?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getProjects: (session: StudentSession) =>
    studentRequest<{ projects?: Record<string, unknown>[] }>(
      session,
      `/api/projects/list?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getCalendarEvents: (
    session: StudentSession,
    range?: { startDate: Date; endDate: Date },
  ) => {
    const params = new URLSearchParams({ studentId: session.databaseId })
    if (range) {
      params.set("startDate", range.startDate.toISOString())
      params.set("endDate", range.endDate.toISOString())
    }
    return studentRequest<{ events?: Record<string, unknown>[]; success?: boolean }>(
      session,
      `/api/calendar/events?${params.toString()}`,
    )
  },

  getClassSchedule: (
    session: StudentSession,
    range: { startDate: Date; endDate: Date },
  ) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/calendar/class-schedule?studentId=${encodeURIComponent(session.databaseId)}&startDate=${encodeURIComponent(range.startDate.toISOString())}&endDate=${encodeURIComponent(range.endDate.toISOString())}`,
    ),

  getPracticeProgress: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      `/api/practice/topics-progress?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getRecommendations: (session: StudentSession) =>
    studentRequest<{ requests?: Record<string, unknown>[] }>(
      session,
      `/api/student/recommendations?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  getRecommendationDetail: (session: StudentSession, requestId: number) =>
    studentRequest<StudentRecommendationDetail>(
      session,
      `/api/student/recommendations/${requestId}?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  patchRecommendation: (
    session: StudentSession,
    requestId: number,
    action: StudentRecommendationPatchAction,
    body: Record<string, unknown> = {},
  ) =>
    studentRequest<{ request?: Record<string, unknown> }>(
      session,
      `/api/student/recommendations/${requestId}?studentId=${encodeURIComponent(session.databaseId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ studentId: session.databaseId, action, ...body }),
      },
    ),

  listSupportTickets: (session: StudentSession, category?: string) => {
    const query = new URLSearchParams({ studentId: session.databaseId })
    if (category) query.set("category", category)
    return studentRequest<{ tickets: import("./support-tickets").SupportTicket[] }>(
      session,
      `/api/student/support-tickets?${query.toString()}`,
    )
  },

  submitSupportTicket: (
    session: StudentSession,
    payload: {
      category: string
      subject: string
      message: string
      moduleId?: string
      moduleName?: string
    },
  ) =>
    studentRequest(session, "/api/student/support-tickets", {
      method: "POST",
      body: JSON.stringify({
        studentId: session.databaseId,
        category: payload.category,
        subject: payload.subject,
        description: payload.message,
        moduleId: payload.moduleId,
        moduleName: payload.moduleName,
      }),
    }),
}

export type StudentRecommendationRequest = {
  id: number
  status: string
  purpose: string
  purpose_other_detail?: string | null
  recipient_name?: string | null
  recipient_organization?: string | null
  recipient_address?: string | null
  deadline?: string | null
  letter_is_specific?: boolean
  rejection_reason?: string | null
  info_request_note?: string | null
  final_letter_text?: string | null
  instructor_locked?: boolean
  letter_intake_mode?: string | null
  content_source?: string | null
  selected_draft_id?: number | null
  student_request_description?: string | null
  delivery_mode?: string | null
  course_code?: string
  course_description?: string | null
  instructor_name?: string
  student_full_name?: string
  draft_count?: number
  created_at?: string
  updated_at?: string
}

export type StudentRecommendationDetail = {
  request: StudentRecommendationRequest
  settings?: Record<string, unknown> | null
  profile: RecommendationProfile | null
  drafts: RecommendationDraft[]
  files?: Array<{
    id?: number
    pdf_url?: string
    file_url?: string
    finalized_at?: string | null
    downloaded_at?: string | null
    created_at?: string
  }>
  attachments?: RecommendationAttachment[]
}

export type StudentRecommendationPatchAction =
  | "save_profile"
  | "save_letter"
  | "submit_questionnaire"
  | "download_letter"
  | "select_draft"
  | "save_draft"
  | "submit_letter"
  | "submit_for_review"
  | "save_bring_own_draft"
  | "save_own_draft"
  | "approve_request"
  | "cancel_request"
  | "respond_to_info_request"
  | "save_final_letter"
  | "update_profile"
  | "generate_ai_drafts"
  | "pick_ai_draft"
  | "request_revision_ack"
  | "mark_downloaded"
