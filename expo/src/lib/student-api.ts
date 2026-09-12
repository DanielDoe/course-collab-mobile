import type {
  RecommendationAttachment,
  RecommendationDraft,
  RecommendationProfile,
} from "./instructor-api"
import type { StudentSession } from "./session"
import { mfaTrustRequestHeadersForStudent } from "./mfa-device-trust"
import {
  flattenRequestHeaders,
  headersHaveStudentSessionProof,
  type StudentAuthSession,
} from "./student-session-proof"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { API_BASE_URL } from "../constants"
import { extractApiErrorMessage } from "./api-error-message"
import { reportMobileApiError } from "./system-log-client"
import { assertProductionHttpsUrl, createApiAbortSignal, noteApiFailure, sanitizeLogValue } from "./http"
import { isNonSessionExpiryUnauthorized } from "./session-expiry"
import { getStoredRefreshToken, REFRESH_TOKEN_HEADER } from "./refresh-token-store"

import { observeHttpResponse } from "./perf/http"
import { studentContentPath, studentProjectsListPath, normalizedStudentDatabaseId } from "./student-content-context"
import { enrichStudentContentSession, studentEnrichedContentPath } from "./student-content-session"
import { parseLectureWorkspaceStudentApiResponse } from "./lecture-workspace-utils"
import { dedupeStudentLectureList } from "./lecture-list-dedupe"
import { formatElegLectureDisplayTitle } from "./lecture-index-label"

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

function refreshTokenFromCookieHeader(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)cc_refresh=([^;]+)/i)
  const token = match?.[1]?.trim()
  return token || undefined
}

async function studentHeaders(session: StudentAuthSession): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }
  const databaseId = normalizedStudentDatabaseId(session)
  if (databaseId) {
    headers["x-student-id"] = databaseId
  }
  if (session.section) {
    headers["x-student-session"] = session.section
  }
  if (session.courseId != null && Number.isFinite(session.courseId)) {
    headers["x-course-id"] = String(session.courseId)
  }
  if (session.academicTermId != null && Number.isFinite(session.academicTermId) && session.academicTermId > 0) {
    headers["x-academic-term-id"] = String(session.academicTermId)
  }
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  const refresh =
    refreshTokenFromCookieHeader(jarCookie) ??
    refreshTokenFromCookieHeader(trust.Cookie) ??
    (await getStoredRefreshToken()) ??
    undefined
  if (refresh) headers[REFRESH_TOKEN_HEADER] = refresh
  if (headersHaveStudentSessionProof(headers)) {
    delete headers["x-student-id"]
  }
  return headers
}

function requireStudentSessionProof(headers: Record<string, string>): void {
  if (headersHaveStudentSessionProof(headers)) return
  throw new ApiError("Student authentication required", 401)
}

/** Cookies + MFA trust + refresh header. Refuses to build header-only identity. */
export async function studentAuthenticatedHeaders(
  session: StudentAuthSession,
): Promise<Record<string, string>> {
  const headers = await studentHeaders(session)
  requireStudentSessionProof(headers)
  return headers
}

/** Web lecture workspace GET — roster id in query, session cookies, no x-student-id. */
async function studentWorkspaceHeaders(session: StudentAuthSession): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  const refresh =
    refreshTokenFromCookieHeader(jarCookie) ??
    refreshTokenFromCookieHeader(trust.Cookie) ??
    (await getStoredRefreshToken()) ??
    undefined
  if (refresh) headers[REFRESH_TOKEN_HEADER] = refresh
  requireStudentSessionProof(headers)
  return headers
}

async function studentWorkspaceRequest<T>(
  session: StudentSession,
  path: string,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  assertProductionHttpsUrl(url)
  const startedAt = Date.now()
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: await studentWorkspaceHeaders(session),
    signal: createApiAbortSignal(),
  })

  let body: unknown = null
  const text = await response.text()
  observeHttpResponse({
    method: "GET",
    path,
    status: response.status,
    startedAt,
    payloadBytes: text.length,
  })
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }

  if (!response.ok) {
    const message = extractApiErrorMessage(body, response.status, path)
    noteApiFailure(path, response.status, message)
    throw new ApiError(message, response.status, body)
  }

  await persistHttpCookiesFromResponse(url, response.headers)

  return body as T
}

async function studentRequest<T>(
  session: StudentAuthSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  assertProductionHttpsUrl(url)
  const headers = {
    ...(await studentHeaders(session)),
    ...flattenRequestHeaders(init?.headers),
  }
  requireStudentSessionProof(headers)
  const startedAt = Date.now()
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    signal: createApiAbortSignal(undefined, init?.signal ?? undefined),
    headers,
  })

  let body: unknown = null
  const text = await response.text()
  observeHttpResponse({
    method: init?.method ?? "GET",
    path,
    status: response.status,
    startedAt,
    payloadBytes: text.length,
  })
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }

  if (!response.ok) {
    const message = extractApiErrorMessage(body, response.status, path)
    // Known soft misses — don't dump LogBox overlays in __DEV__.
    const isExpectedClientMiss =
      ((response.status === 404 || response.status === 503) && path.includes("mobile-payment")) ||
      (response.status === 404 &&
        (/^\/api\/announcements\/\d+/.test(path) || path.includes("/api/announcements/"))) ||
      (response.status === 404 && path.includes("/api/practice/generate")) ||
      (response.status === 401 && isNonSessionExpiryUnauthorized(path)) ||
      ((response.status === 404 || response.status === 500) &&
        (/\/api\/attendance\/(score|streaks|leaderboard|student-sessions)(\?|$)/.test(path) ||
          path.includes("/api/attendance/score") ||
          path.includes("/api/attendance/streaks") ||
          path.includes("/api/attendance/leaderboard") ||
          path.includes("/api/attendance/student-sessions") ||
          path.includes("/api/student/attendance/structured-today"))) ||
      (path.includes("/api/classroom-points") &&
        (response.status === 401 ||
          response.status === 403 ||
          response.status === 404 ||
          response.status === 500 ||
          response.status === 503)) ||
      ((response.status === 404 || response.status === 500) &&
        (path.includes("/api/grades/student") || path.includes("/api/student/quiz-history"))) ||
      (response.status === 403 && path.includes("/api/practice/")) ||
      (response.status === 404 &&
        /\/api\/student\/lectures\/\d+(\/(?:viewer|content|workspace|sample-practice(?:\/evaluate)?))?(\?|$)/.test(
          path.split("?")[0] ?? path,
        )) ||
      ((response.status === 404 || response.status === 500) &&
        /\/api\/student\/(enrollments|active-enrollment)(\?|$)/.test(path.split("?")[0] ?? path)) ||
      (response.status === 403 &&
        (path.includes("/api/grades/student") ||
          path.includes("/api/student/quiz-history") ||
          path.includes("/api/student/homework-history") ||
          path.includes("/api/student/quizzes") ||
          path.includes("/api/student/finals") ||
          path.includes("/api/attendance/score") ||
          path.includes("/api/attendance/streaks") ||
          path.includes("/api/student/flashcards/") ||
          path.includes("/api/student/lectures") ||
          path.includes("/api/student/notifications") ||
          path.includes("/api/student/digital-notes") ||
          path.includes("/api/student/course-notes") ||
          path.includes("/api/student/office-hours") ||
          path.includes("/api/announcements") ||
          path.includes("/api/groups"))) ||
      (response.status === 400 &&
        (path.includes("/api/student/homework-history") ||
          path.includes("/api/student/finals") ||
          path.includes("/api/student/assessment-history") ||
          path.includes("/api/groups/requests/discover") ||
          path.includes("/api/groups?") ||
          path.includes("/api/attendance/leaderboard")))
    if (!isExpectedClientMiss) {
      noteApiFailure(path, response.status, message)
    }
    if (__DEV__ && !isExpectedClientMiss) {
      console.error("[CourseCollab API]", {
        status: response.status,
        path,
        message,
        body: sanitizeLogValue(body),
      })
    }
    if ((!__DEV__ || response.status >= 500) && !isExpectedClientMiss) {
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
  session: StudentAuthSession,
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
  platform_access?: import("./assessment-platform-access").AssessmentPlatformFlags | null
}

/** Observed on GET /api/student/quizzes (production 2026-08-18). */
export type QuizListRolloverPolicy = {
  show_closed_notice: boolean
  academic_term_label: string
  semester_end_iso: string
  self_service_open?: boolean
  apply_deadline_iso?: string
  cutoff_days_before_semester_end?: number
  assessment_perks_grace_days_after_deadline?: number
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
  course_id?: number | null
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
  event_date?: string | null
  event_time?: string | null
  event_end?: string | null
  event_location?: string | null
  calendar_event_id?: number | null
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
  scheduled_date?: string | null
  meeting_venue?: string | null
  meeting_link?: string | null
}

export const studentApi = {
  getQuizzes: (session: StudentSession, type: string) =>
    studentRequest<{ quizzes: QuizItem[]; rollover_policy?: QuizListRolloverPolicy }>(
      session,
      studentContentPath(session, "/api/student/quizzes", { type }),
    ),

  getAssessmentHistory: async (session: StudentSession) => {
    const contentSession = await enrichStudentContentSession(session)
    return studentRequest<{ history?: AssessmentHistoryItem[]; assessmentHistory?: AssessmentHistoryItem[] }>(
      session,
      studentContentPath(contentSession, "/api/student/assessment-history"),
    )
  },

  getQuizHistory: (session: StudentSession) =>
    studentAuthenticatedRequest<{
      quizHistory?: {
        quiz_id?: number
        quiz_title?: string
        attempts?: { attempt_id?: number; percentage?: number; completed_at?: string | null }[]
      }[]
    }>(
      session,
      `/api/student/quiz-history?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  // Production GET /api/student/mid-semesters is unauth-200; list callers must use getQuizzes(..., "mid_semester").
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

  getEnrollments: (session: StudentSession) =>
    studentRequest<unknown>(session, "/api/student/enrollments"),

  setActiveEnrollment: (
    session: StudentSession,
    enrollment: { courseId: number; section?: string; academicTermId?: number; studentRowId?: number | null },
  ) =>
    studentRequest<unknown>(session, "/api/student/active-enrollment", {
      method: "POST",
      body: JSON.stringify({
        courseId: enrollment.courseId,
        section: enrollment.section,
        academicTermId: enrollment.academicTermId,
        studentRowId: enrollment.studentRowId,
      }),
    }),

  getLectures: async (session: StudentSession) => {
    const data = await studentRequest<{ lectures: LectureItem[] }>(
      session,
      studentContentPath(session, "/api/student/lectures"),
    )
    const lectures = dedupeStudentLectureList(data.lectures ?? [], {
      courseId: session.courseId ?? 0,
      courseCode: session.courseCode,
      section: session.section,
    }).map((lecture) => ({
      ...lecture,
      title: formatElegLectureDisplayTitle(lecture.title, session.courseCode),
    }))
    return { lectures }
  },

  getLectureById: (session: StudentSession, lectureId: number) =>
    studentRequest<{ lecture: StudentLectureDetail }>(
      session,
      studentContentPath(session, `/api/student/lectures/${lectureId}`),
    ),

  getLectureViewer: (session: StudentSession, lectureId: number) =>
    studentRequest<{
      lecture: StudentLectureDetail
      samplePractice?: unknown
      workspace?: unknown
      deckUrl?: string | null
    }>(
      session,
      studentContentPath(session, `/api/student/lectures/${lectureId}/viewer`),
    ),

  getLectureContent: (session: StudentSession, lectureId: number) =>
    studentRequest<{ lecture?: StudentLectureDetail } & Record<string, unknown>>(
      session,
      studentContentPath(session, `/api/student/lectures/${lectureId}/content`),
    ),

  getLectureSamplePractice: (session: StudentSession, lectureId: number) =>
    studentRequestWithStudentIdFallback<{ config?: unknown; sample_practice?: unknown; questions?: unknown[] }>(
      session,
      (params) => `/api/student/lectures/${lectureId}/sample-practice?${params.toString()}`,
    ),

  evaluateLectureSamplePractice: async (
    session: StudentSession,
    lectureId: number,
    questionId: string,
    answer: string | string[],
    options?: { mcqEarnedFraction?: number },
  ) => {
    type EvaluateResponse = {
      result?: import("./lecture-types").LectureSamplePracticeEvaluateResult
      engagement?: import("./lecture-types").LectureSamplePracticeEngagementResult
      error?: string
    }
    const studentIds = [...new Set([session.id, session.databaseId].filter(Boolean))]
    let lastError: unknown
    for (const studentId of studentIds) {
      try {
        const body: Record<string, unknown> = { studentId, questionId, answer }
        if (
          options?.mcqEarnedFraction != null &&
          Number.isFinite(options.mcqEarnedFraction)
        ) {
          body.mcqEarnedFraction = Math.max(0, Math.min(1, options.mcqEarnedFraction))
        }
        const data = await studentRequest<EvaluateResponse>(
          session,
          studentContentPath(session, `/api/student/lectures/${lectureId}/sample-practice/evaluate`),
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        )
        if (!data.result) {
          throw new ApiError("Could not evaluate your answer.", 500, data)
        }
        return data
      } catch (err) {
        lastError = err
      }
    }
    if (lastError instanceof ApiError) throw lastError
    throw new ApiError("Could not evaluate your answer.", 0, lastError)
  },

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
        const count = parseLectureWorkspaceStudentApiResponse(result).questions.length
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

  saveLectureWorkspaceDraft: (
    session: StudentSession,
    lectureId: number,
    questionId: string,
    studentAnswer: unknown,
  ) =>
    studentRequest<{ message?: string }>(
      session,
      `/api/student/lectures/${lectureId}/workspace`,
      {
        method: "PATCH",
        body: JSON.stringify({
          studentId: session.databaseId,
          questionId,
          studentAnswer,
        }),
      },
    ),

  uploadLectureWorkspaceFile: async (
    session: StudentSession,
    lectureId: number,
    file: { uri: string; name: string; mimeType: string; workspaceQuestionId: string; partId: string },
  ) => {
    const path = `/api/student/lectures/${lectureId}/workspace/upload`
    const url = `${API_BASE_URL}${path}`
    assertProductionHttpsUrl(url)
    const form = new FormData()
    form.append("studentId", session.databaseId)
    form.append("workspaceQuestionId", file.workspaceQuestionId)
    form.append("partId", file.partId)
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob)
    const headers = await studentAuthenticatedHeaders(session)
    delete headers["Content-Type"]
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: form,
      signal: createApiAbortSignal(),
    })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = { error: text }
      }
    }
    if (!response.ok) {
      throw new ApiError(extractApiErrorMessage(body, response.status, path), response.status, body)
    }
    await persistHttpCookiesFromResponse(url, response.headers)
    return body as { url: string; name?: string; mime?: string; uploaded_at?: string }
  },

  updateLectureProgress: (
    session: StudentSession,
    lectureId: number,
    progressPercentage: number,
  ) =>
    studentRequest<{ progress_percentage?: number; status?: string }>(
      session,
      `/api/student/lectures/${lectureId}/progress`,
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          student_id: session.databaseId,
          current_slide: Math.max(1, Math.round(progressPercentage)),
          total_slides: 100,
          completed_slides: [],
          time_spent_seconds: 30,
        }),
      },
    ),

  getLectureProgress: (session: StudentSession, lectureId: number) =>
    studentRequest<{
      progress: {
        last_viewed_slide_order?: number
        completed_slides?: number[] | string
        progress_percentage?: number
        status?: string
      } | null
      status?: string
    }>(
      session,
      `/api/student/lectures/${lectureId}/progress?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  saveLectureSlideProgress: (
    session: StudentSession,
    lectureId: number,
    payload: {
      currentSlide: number
      totalSlides: number
      completedSlides: number[]
      timeSpentSeconds?: number
    },
  ) =>
    studentRequest<{
      progress_percentage?: number
      status?: string
      completed_slides?: number[]
      total_slides?: number
    }>(
      session,
      `/api/student/lectures/${lectureId}/progress`,
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          student_id: session.databaseId,
          current_slide: payload.currentSlide,
          total_slides: payload.totalSlides,
          completed_slides: payload.completedSlides,
          bookmarked: false,
          confused: false,
          time_spent_seconds: payload.timeSpentSeconds ?? 30,
          notes: "",
        }),
      },
    ),

  /** Explicitly mark a lecture done (or undo it) regardless of slide tracking. */
  setLectureCompleted: (session: StudentSession, lectureId: number, completed: boolean) =>
    studentRequest<{ status?: string; progress_percentage?: number }>(
      session,
      `/api/student/lectures/${lectureId}/progress`,
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          mark_completed: completed,
        }),
      },
    ),

  getAnnouncements: (session: StudentSession) => {
    const studentId = normalizedStudentDatabaseId(session)
    if (!studentId) {
      return Promise.resolve({ announcements: [] as Announcement[] })
    }
    return studentRequest<{ announcements: Announcement[] }>(
      session,
      `/api/announcements?studentId=${encodeURIComponent(studentId)}`,
    )
  },

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
      studentContentPath(session, "/api/student/syllabus"),
    ),

  getCoursePolicies: (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      studentContentPath(session, "/api/student/course-assessment-governance"),
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

  getNotificationPreferences: (session: StudentSession) =>
    studentRequest<import("./notification-preferences-sync").ServerNotificationPreferences>(
      session,
      `/api/student/notifications/preferences?studentId=${encodeURIComponent(session.databaseId)}`,
    ),

  updateNotificationPreferences: (
    session: StudentSession,
    preferences: import("./notification-preferences-sync").ServerNotificationPreferences,
  ) =>
    studentRequest<import("./notification-preferences-sync").ServerNotificationPreferences>(
      session,
      `/api/student/notifications/preferences?studentId=${encodeURIComponent(session.databaseId)}`,
      {
        method: "PUT",
        body: JSON.stringify(preferences),
      },
    ),

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

  cancelOfficeHours: (session: StudentSession, requestId: number) =>
    studentRequest<{ success?: boolean; request?: OfficeHoursRequest }>(
      session,
      `/api/student/office-hours/${requestId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          studentId: session.databaseId,
          status: "cancelled",
        }),
      },
    ),

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

  getAttendanceRecords: async (session: StudentSession) => {
    try {
      return await studentRequest<Record<string, unknown>>(
        session,
        await studentEnrichedContentPath(session, "/api/attendance/records"),
      )
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return { records: [] }
      }
      throw err
    }
  },

  getAttendanceScore: async (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      await studentEnrichedContentPath(session, "/api/attendance/score"),
    ),

  getAttendanceStreaks: async (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      await studentEnrichedContentPath(session, "/api/attendance/streaks"),
    ),

  getClassroomPoints: async (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      await studentEnrichedContentPath(session, "/api/classroom-points"),
    ),

  getClassroomPointsLeaderboard: async (session: StudentSession) =>
    studentRequest<Record<string, unknown>>(
      session,
      await studentEnrichedContentPath(session, "/api/classroom-points/leaderboard"),
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

  getGroups: async (session: StudentSession) =>
    studentRequest<{ groups?: Record<string, unknown>[] }>(
      session,
      await studentEnrichedContentPath(session, "/api/groups"),
    ),

  getProjects: (session: StudentSession) =>
    studentRequest<{ projects?: Record<string, unknown>[] }>(
      session,
      studentProjectsListPath(session),
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

  createCalendarEvent: (
    session: StudentSession,
    payload: {
      title: string
      startTime: string
      endTime?: string | null
      location?: string | null
      description?: string | null
      eventType?: string
      announcementId?: number
    },
  ) =>
    studentRequest<{ event?: Record<string, unknown>; success?: boolean }>(
      session,
      "/api/calendar/events",
      {
        method: "POST",
        body: JSON.stringify({
          studentId: session.databaseId,
          title: payload.title,
          start_time: payload.startTime,
          end_time: payload.endTime ?? null,
          location: payload.location ?? null,
          description: payload.description ?? null,
          event_type: payload.eventType ?? "announcement",
          announcement_id: payload.announcementId,
        }),
      },
    ),

  getCalendarFeed: (session: StudentSession) =>
    studentRequest<{
      success?: boolean
      token: string
      httpsUrl: string
      webcalUrl: string
      beforeMinutes: number
      atStart: boolean
    }>(session, "/api/student/calendar/feed"),

  updateCalendarFeed: (session: StudentSession, prefs: { beforeMinutes?: number; atStart?: boolean }) =>
    studentRequest<{
      success?: boolean
      token: string
      httpsUrl: string
      webcalUrl: string
      beforeMinutes: number
      atStart: boolean
    }>(session, "/api/student/calendar/feed", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),

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

  saveRecommendationQuestionnaire: (
    session: StudentSession,
    requestId: number,
    fields: Record<string, unknown> = {},
  ) => {
    const profile =
      typeof fields.profile === "object" && fields.profile != null
        ? (fields.profile as Record<string, unknown>)
        : fields
    return studentAuthenticatedRequest<{ ok?: boolean; status?: string }>(
      session,
      `/api/student/recommendations/${requestId}?studentId=${encodeURIComponent(session.databaseId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          studentId: session.databaseId,
          contentSource: fields.contentSource ?? fields.content_source ?? profile.content_mode ?? "own_details",
          studentStrengths: profile.studentStrengths ?? profile.student_strengths,
          achievements: profile.achievements,
          projects: profile.projects,
          skills: profile.skills,
          leadershipExamples: profile.leadershipExamples ?? profile.leadership_examples,
          goals: profile.goals,
          specialInstructions: profile.specialInstructions ?? profile.special_instructions,
          letterFor: profile.letterFor ?? profile.letter_for,
          classExperience: profile.classExperience ?? profile.class_experience,
          personalQualities: profile.personalQualities ?? profile.personal_qualities,
          tone: profile.tone,
        }),
      },
    )
  },

  generateRecommendationDrafts: (session: StudentSession, requestId: number) =>
    studentAuthenticatedRequest<{ drafts?: Record<string, unknown>[] }>(
      session,
      `/api/student/recommendations/${requestId}/generate`,
      {
        method: "POST",
        body: JSON.stringify({ studentDatabaseId: session.databaseId }),
      },
    ),

  selectRecommendationDraft: (session: StudentSession, requestId: number, draftId: number) =>
    studentAuthenticatedRequest(
      session,
      `/api/student/recommendations/${requestId}/select-draft`,
      {
        method: "POST",
        body: JSON.stringify({ studentDatabaseId: session.databaseId, draftId }),
      },
    ),

  submitRecommendationLetter: (session: StudentSession, requestId: number, letterText: string) =>
    studentAuthenticatedRequest<{ ok?: boolean; status?: string }>(
      session,
      `/api/student/recommendations/${requestId}/submit-letter`,
      {
        method: "POST",
        body: JSON.stringify({ studentDatabaseId: session.databaseId, letterText }),
      },
    ),

  markRecommendationDownloaded: (session: StudentSession, requestId: number) =>
    studentAuthenticatedRequest<{ ok?: boolean }>(
      session,
      `/api/student/recommendations/${requestId}/mark-downloaded`,
      {
        method: "POST",
        body: JSON.stringify({ studentDatabaseId: session.databaseId }),
      },
    ),

  patchRecommendationRequestDetails: (
    session: StudentSession,
    requestId: number,
    body: Record<string, unknown> = {},
  ) =>
    studentAuthenticatedRequest<{ ok?: boolean; request?: Record<string, unknown> }>(
      session,
      `/api/student/recommendations/${requestId}/request-details`,
      {
        method: "PATCH",
        body: JSON.stringify({ studentDatabaseId: session.databaseId, ...body }),
      },
    ),

  patchRecommendation: (
    session: StudentSession,
    requestId: number,
    action: StudentRecommendationPatchAction,
    body: Record<string, unknown> = {},
  ) => {
    if (action === "save_profile" || action === "submit_questionnaire" || action === "update_profile") {
      return studentApi.saveRecommendationQuestionnaire(session, requestId, body)
    }
    if (action === "generate_ai_drafts") {
      return studentApi.generateRecommendationDrafts(session, requestId)
    }
    if (action === "pick_ai_draft" || action === "select_draft") {
      const draftId = Number(body.draftId ?? body.draft_id)
      if (!Number.isFinite(draftId)) {
        return Promise.reject(new ApiError("Draft id required", 400))
      }
      return studentApi.selectRecommendationDraft(session, requestId, draftId)
    }
    if (action === "submit_letter" || action === "submit_for_review") {
      const letterText = String(body.letterText ?? body.finalLetterText ?? body.letter_text ?? "").trim()
      if (!letterText) {
        return Promise.reject(new ApiError("Letter text is required", 400))
      }
      return studentApi.submitRecommendationLetter(session, requestId, letterText)
    }
    if (action === "download_letter" || action === "mark_downloaded") {
      return studentApi.markRecommendationDownloaded(session, requestId)
    }
    if (action === "cancel_request") {
      return studentApi.withdrawRecommendation(session, requestId)
    }
    if (action === "respond_to_info_request") {
      const note = String(body.response ?? body.studentRequestDescription ?? "").trim()
      if (!note) {
        return Promise.reject(new ApiError("A response is required", 400))
      }
      return studentApi.patchRecommendationRequestDetails(session, requestId, {
        studentRequestDescription: note,
      })
    }
    if (
      action === "save_letter" ||
      action === "save_bring_own_draft" ||
      action === "save_own_draft" ||
      action === "save_draft" ||
      action === "save_final_letter"
    ) {
      return Promise.reject(
        new ApiError("Letter text is kept on this screen until you submit it for instructor review.", 400),
      )
    }
    if (action === "approve_request") {
      return Promise.reject(
        new ApiError("Your instructor approves this request. Wait for approval, or withdraw if you no longer need it.", 400),
      )
    }
    return Promise.reject(new ApiError("This recommendation action is not available.", 400))
  },

  withdrawRecommendation: (session: StudentSession, requestId: number) =>
    studentAuthenticatedRequest<{ ok?: boolean }>(
      session,
      `/api/student/recommendations/${requestId}?studentId=${encodeURIComponent(session.databaseId)}`,
      { method: "DELETE" },
    ),

  getRecommendationBrief: (session: StudentSession, requestId: number) =>
    studentAuthenticatedRequest<{ brief?: Record<string, unknown> | null }>(
      session,
      `/api/student/recommendations/${requestId}/brief?studentDatabaseId=${encodeURIComponent(session.databaseId)}`,
    ),

  saveRecommendationBrief: (
    session: StudentSession,
    requestId: number,
    fields: Record<string, unknown>,
  ) =>
    studentAuthenticatedRequest<{ brief?: Record<string, unknown>; creditFree?: boolean }>(
      session,
      `/api/student/recommendations/${requestId}/brief?studentDatabaseId=${encodeURIComponent(session.databaseId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ studentDatabaseId: session.databaseId, ...fields }),
      },
    ),

  generateRecommendationBrief: (session: StudentSession, requestId: number) =>
    studentAuthenticatedRequest<{ brief?: Record<string, unknown>; creditFree?: boolean }>(
      session,
      `/api/student/recommendations/${requestId}/brief?studentDatabaseId=${encodeURIComponent(session.databaseId)}`,
      {
        method: "POST",
        body: JSON.stringify({ studentDatabaseId: session.databaseId }),
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
      attachments?: Array<{ url: string; name: string; mime?: string; size?: number }>
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
        attachments: payload.attachments ?? [],
      }),
    }),

  uploadSupportTicketAttachment: async (
    session: StudentSession,
    file: { uri: string; name: string; mimeType: string },
  ) => {
    const path = "/api/student/support-tickets/attachments"
    const url = `${API_BASE_URL}${path}`
    assertProductionHttpsUrl(url)
    const form = new FormData()
    form.append("studentId", session.databaseId)
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob)
    const headers = await studentAuthenticatedHeaders(session)
    delete headers["Content-Type"]
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: form,
      signal: createApiAbortSignal(),
    })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = { error: text }
      }
    }
    if (!response.ok) {
      throw new ApiError(extractApiErrorMessage(body, response.status, path), response.status, body)
    }
    await persistHttpCookiesFromResponse(url, response.headers)
    return body as { url: string; name?: string; mime?: string; size?: number }
  },
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
