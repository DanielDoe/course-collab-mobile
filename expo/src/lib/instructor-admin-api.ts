import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { assertProductionHttpsUrl, createApiAbortSignal } from "./http"
import {
  instructorAuthenticatedHeaders,
  instructorAuthenticatedRequest,
} from "./instructor-api"
import { persistHttpCookiesFromResponse } from "./student-http-cookies"
import type { AssessmentPolicy } from "./assessment-policy-settings"
import type { AssessmentPrivilegeSource } from "./assessment-governance"
import type { AssessmentPlatformAccess } from "./assessment-platform-access"
import type {
  AttendancePolicy,
  ProjectPolicy,
  RewardsPolicy,
} from "./course-policy-settings"
import {
  mergeCourseModuleSettings,
  type CourseModuleSettings,
} from "./course-module-settings"
import type { PlaygroundPolicy } from "./playground-policy-settings"
import type { InstructorCourse, InstructorSession } from "./instructor-api"

type AdminScope = {
  instructorId: number
  courseId: number
}

export type CoursePoliciesResponse = {
  attendance_policy: AttendancePolicy
  rewards_policy: RewardsPolicy
  project_policy: ProjectPolicy
  playground_policy: PlaygroundPolicy
  assessment_policy: AssessmentPolicy
  updated_at: string | null
}

export type CoursePoliciesPatch = {
  attendance_policy?: Partial<AttendancePolicy>
  rewards_policy?: Partial<RewardsPolicy>
  project_policy?: Partial<ProjectPolicy>
  playground_policy?: Partial<PlaygroundPolicy>
  assessment_policy?: Partial<{
    timer: Partial<AssessmentPolicy["timer"]>
    sections: Partial<AssessmentPolicy["sections"]>
    retakes: Partial<AssessmentPolicy["retakes"]>
    anti_cheat: Partial<AssessmentPolicy["anti_cheat"]>
    ai: Partial<AssessmentPolicy["ai"]>
    access: Partial<AssessmentPolicy["access"]> & {
      platform_access?: AssessmentPolicy["access"]["platform_access"]
    }
    superpowers: Partial<AssessmentPolicy["superpowers"]>
  }>
}

export type AssessmentGovernanceResponse = {
  assessment_privilege_source: AssessmentPrivilegeSource
  show_course_policy_notice: boolean
  platform_access?: AssessmentPlatformAccess
  course_label?: string
  students_impacted?: number
}

export type AssessmentGovernancePatch = {
  assessment_privilege_source?: AssessmentPrivilegeSource
  show_course_policy_notice?: boolean
  platform_access?: AssessmentPlatformAccess
}

export type GradingPolicyResponse = {
  multi_part_upload_multiplier: number
  assessment_perks_grace_days_after_deadline: number
  auto_finalize_perfect_scores: boolean
  platform_default_assessment_perks_grace_days?: number
  grading_policy: Record<string, unknown>
  auto_finalize_backfilled_count?: number
}

export type GradingPolicyPatch = {
  multi_part_upload_multiplier?: number
  assessment_perks_grace_days_after_deadline?: number
  auto_finalize_perfect_scores?: boolean
}

export type GradeWeightsView = {
  quiz: number
  homework: number
  midterm: number
  final: number
  attendance: number
  project: number
  classroom: number
  engagement: number
  total: number
}

export type GradeWeightsRecord = {
  id?: number
  session: string
  quiz_weight: number
  homework_weight: number
  midterm_weight: number
  final_weight: number
  attendance_weight: number
  project_weight: number
  classroom_weight: number
  engagement_weight: number
  total_weight?: number
}

export type SaveGradeWeightsPayload = {
  session: string
  quizWeight: number
  homeworkWeight: number
  midtermWeight: number
  finalWeight: number
  attendanceWeight: number
  projectWeight: number
  classroomWeight: number
  engagementWeight: number
  recalculateAll?: boolean
}

export type BulkClassroomAiEvaluateResult = {
  success: boolean
  message?: string
  summary?: {
    evaluated?: number
    skipped?: number
    errors?: number
  }
}

export type AiTutorSettings = {
  enableAITutor?: boolean
  allowCodeDebugging?: boolean
  allowPracticeGeneration?: boolean
  maxResponseLength?: number
  responseStyle?: string
  aiModel?: string
  enableHints?: boolean
  enableStepByStep?: boolean
  enableCodeExamples?: boolean
}

export type TeachingAssistant = {
  id: number
  username: string
  email: string
  name: string
  is_active: boolean
  created_at?: string
  last_login?: string | null
  course_codes?: string[]
  assigned_course_ids?: number[]
}

export type CreateTeachingAssistantPayload = {
  username: string
  email: string
  name: string
  password?: string
  course_ids?: number[]
  is_active?: boolean
}

export type UpdateTeachingAssistantPayload = {
  username?: string
  email?: string
  name?: string
  password?: string
  is_active?: boolean
  course_ids?: number[]
}

export type TaPermissionKey = string

export type TaPermissionsResponse = {
  ta: { id: number; name: string; username: string }
  courseId: number
  defaults: Record<string, boolean>
  effective: Record<string, boolean>
  rbacCodes?: string[]
  navAccess?: Record<string, boolean>
  moduleGrants?: Record<string, unknown>
  keys: TaPermissionKey[]
}

export type TaPermissionsPatch = {
  taId: number
  courseId: number
  permissions?: Partial<Record<TaPermissionKey, boolean>>
  navModule?: string
  enabled?: boolean
  level?: "crud" | "publish"
}

export type SubmissionDiagnosticsItem = {
  answerId: number
  attemptId: number
  questionId: number
  answeredAt: string
  studentId: number
  studentName: string
  studentIdDisplay: string
  quizTitle: string
  assessmentType: string
  quizId: number
  requiresReview: boolean
  errorType: string
  issueKind: "submission_failed" | "requires_review"
  retryCount: number | null
}

export type SubmissionDiagnosticsResponse = {
  summary: {
    totalIssues: number
    days: number
    courseId: number
    courseCode?: string
  }
  byErrorType: Array<{ errorType: string; count: number }>
  byAssessment: Array<{ assessmentType: string; count: number }>
  byStudent: Array<{
    studentId: number
    studentName: string
    studentIdDisplay: string
    issueCount: number
  }>
  recentItems: SubmissionDiagnosticsItem[]
}

export type CreateCoursePayload = {
  course_code: string
  course_title: string
  description?: string | null
  university?: string | null
  academic_term_id?: number | null
}

function instructorRequest<T>(
  path: string,
  scope: AdminScope,
  init?: RequestInit,
): Promise<T> {
  return instructorAuthenticatedRequest<T>(path, scope, init)
}

function instructorRequestWithoutCourse<T>(
  path: string,
  instructorId: number,
  init?: RequestInit,
): Promise<T> {
  return instructorAuthenticatedRequest<T>(path, { instructorId }, init)
}

export const instructorAdminApi = {
  getCoursePolicies: (scope: AdminScope) =>
    instructorRequest<CoursePoliciesResponse>("/api/instructor/courses/policies", scope),

  patchCoursePolicies: (scope: AdminScope, patch: CoursePoliciesPatch) =>
    instructorRequest<CoursePoliciesResponse & { success?: boolean }>(
      "/api/instructor/courses/policies",
      scope,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),

  getModuleSettings: async (scope: AdminScope) => {
    const response = await instructorRequestWithoutCourse<{
      courses: Array<InstructorCourse & { module_settings?: unknown }>
    }>("/api/instructor/courses", scope.instructorId)

    const course = (response.courses ?? []).find(
      (item) => Number(item.id) === scope.courseId,
    )
    if (!course) {
      throw new ApiError("Course not found", 404)
    }
    return mergeCourseModuleSettings(course.module_settings)
  },

  patchModuleSettings: (scope: AdminScope, moduleSettings: Partial<CourseModuleSettings>) =>
    instructorRequest<{ success: boolean; module_settings: CourseModuleSettings }>(
      "/api/instructor/courses/module-settings",
      scope,
      { method: "PATCH", body: JSON.stringify({ module_settings: moduleSettings }) },
    ),

  getAssessmentGovernance: (scope: AdminScope) =>
    instructorRequest<AssessmentGovernanceResponse>(
      "/api/instructor/courses/assessment-governance",
      scope,
    ),

  patchAssessmentGovernance: (scope: AdminScope, patch: AssessmentGovernancePatch) =>
    instructorRequest<AssessmentGovernanceResponse & { success?: boolean }>(
      "/api/instructor/courses/assessment-governance",
      scope,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),

  getGradingPolicy: (scope: AdminScope) =>
    instructorRequest<GradingPolicyResponse>("/api/instructor/courses/grading-policy", scope),

  patchGradingPolicy: (scope: AdminScope, patch: GradingPolicyPatch) =>
    instructorRequest<GradingPolicyResponse & { success?: boolean }>(
      "/api/instructor/courses/grading-policy",
      scope,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),

  getGradeWeights: async (scope: AdminScope, session: string) => {
    const q = new URLSearchParams({ session })
    const response = await instructorRequest<{
      session: string
      weights: GradeWeightsView
    }>(`/api/grades/weights?${q.toString()}`, scope)
    return response.weights
  },

  saveGradeWeights: (scope: AdminScope, weights: SaveGradeWeightsPayload) =>
    instructorRequest<{ weights: GradeWeightsRecord }>("/api/grades/adjust-weight", scope, {
      method: "POST",
      body: JSON.stringify(weights),
    }).then((response) => response.weights),

  bulkClassroomAiEvaluate: (scope: AdminScope, limit = 25) =>
    instructorRequest<BulkClassroomAiEvaluateResult>(
      "/api/instructor/classroom-points/bulk-ai-evaluate",
      scope,
      { method: "POST", body: JSON.stringify({ limit }) },
    ),

  getPlaygroundSections: (scope: AdminScope) =>
    instructorRequest<{ sessions: InstructorSession[]; course?: InstructorCourse }>(
      "/api/instructor/sessions",
      scope,
    ).then((response) => response.sessions ?? []),

  getAiTutorSettings: async (scope: AdminScope) => {
    try {
      const response = await instructorRequest<{ settings?: AiTutorSettings }>(
        "/api/instructor/ai-tutor/settings",
        scope,
      )
      return response.settings ?? {}
    } catch (error) {
      if (error instanceof ApiError && (error.status === 500 || error.status === 404)) {
        return {}
      }
      throw error
    }
  },

  saveAiTutorSettings: (scope: AdminScope, settings: AiTutorSettings) =>
    instructorRequest<{ success: boolean; message?: string }>(
      "/api/instructor/ai-tutor/settings",
      scope,
      { method: "POST", body: JSON.stringify(settings) },
    ),

  getTeachingAssistants: (instructorId: number) =>
    instructorRequestWithoutCourse<{ tas: TeachingAssistant[] }>(
      "/api/instructor/teaching-assistants",
      instructorId,
    ).then((response) => response.tas ?? []),

  createTeachingAssistant: (instructorId: number, payload: CreateTeachingAssistantPayload) =>
    instructorRequestWithoutCourse<{ success: boolean; ta: TeachingAssistant }>(
      "/api/instructor/teaching-assistants",
      instructorId,
      { method: "POST", body: JSON.stringify(payload) },
    ).then((response) => response.ta),

  updateTeachingAssistant: (
    instructorId: number,
    taId: number,
    payload: UpdateTeachingAssistantPayload,
  ) =>
    instructorRequestWithoutCourse<{ success: boolean; ta: TeachingAssistant }>(
      `/api/instructor/teaching-assistants/${taId}`,
      instructorId,
      { method: "PATCH", body: JSON.stringify(payload) },
    ).then((response) => response.ta),

  deleteTeachingAssistant: (instructorId: number, taId: number) =>
    instructorRequestWithoutCourse<{ success: boolean }>(
      `/api/instructor/teaching-assistants/${taId}`,
      instructorId,
      { method: "DELETE" },
    ),

  getTaPermissions: (instructorId: number, taId: number, courseId: number) => {
    const q = new URLSearchParams({
      taId: String(taId),
      courseId: String(courseId),
    })
    return instructorRequestWithoutCourse<TaPermissionsResponse>(
      `/api/instructor/ta-permissions?${q.toString()}`,
      instructorId,
    )
  },

  patchTaPermissions: (instructorId: number, patch: TaPermissionsPatch) =>
    instructorRequestWithoutCourse<{
      success: boolean
      effective: Record<string, boolean>
      rbacCodes?: string[]
      navAccess?: Record<string, boolean>
      moduleGrants?: Record<string, unknown>
    }>("/api/instructor/ta-permissions", instructorId, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getSubmissionDiagnostics: (scope: AdminScope, days = 7) => {
    const q = new URLSearchParams({ days: String(days) })
    return instructorRequest<SubmissionDiagnosticsResponse>(
      `/api/instructor/submission-diagnostics?${q.toString()}`,
      scope,
    )
  },

  createCourse: (instructorId: number, payload: CreateCoursePayload) =>
    instructorRequestWithoutCourse<{ course: InstructorCourse & Record<string, unknown> }>(
      "/api/instructor/courses",
      instructorId,
      { method: "POST", body: JSON.stringify(payload) },
    ).then((response) => response.course),

  submitSupportTicket: async (
    instructorId: number,
    payload: {
      category: string
      subject: string
      message: string
      courseId?: number
      priority?: string
      moduleId?: string
      moduleName?: string
      attachments?: Array<{ url: string; name: string; mime?: string; size?: number }>
    },
  ) => {
    const body = {
      category: payload.category,
      subject: payload.subject,
      description: payload.message,
      courseId: payload.courseId,
      priority: payload.priority ?? "medium",
      moduleId: payload.moduleId,
      moduleName: payload.moduleName,
      attachments: payload.attachments ?? [],
    }
    try {
      return await instructorRequestWithoutCourse<{ success: boolean; message?: string }>(
        "/api/instructor/support-tickets",
        instructorId,
        { method: "POST", body: JSON.stringify(body) },
      )
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) throw err
      const courseLine = payload.courseId ? `\nCourse id: ${payload.courseId}` : ""
      return instructorRequestWithoutCourse<{ success: boolean; message?: string }>(
        "/api/student/support-tickets",
        instructorId,
        {
          method: "POST",
          body: JSON.stringify({
            subject: payload.subject,
            description: `${payload.message}\n\n— Submitted from faculty mobile (instructor ${instructorId})${courseLine}`,
            category: payload.category,
            priority: payload.priority ?? "medium",
            moduleId: payload.moduleId,
            moduleName: payload.moduleName,
            attachments: payload.attachments ?? [],
            instructorId,
            audience: "instructor",
          }),
        },
      ).then((response) => ({
        success: true,
        message:
          typeof response === "object" &&
          response !== null &&
          "ticket" in response
            ? "Submitted — we'll review your message and respond soon."
            : "Submitted — we'll review your message and respond soon.",
      }))
    }
  },

  listSupportTickets: async (instructorId: number, category?: string) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : ""
    try {
      return await instructorRequestWithoutCourse<{ tickets: import("./support-tickets").SupportTicket[] }>(
        `/api/instructor/support-tickets${query}`,
        instructorId,
      )
    } catch (err) {
      if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 405)) throw err
      return { tickets: [] as import("./support-tickets").SupportTicket[] }
    }
  },

  uploadSupportTicketAttachment: async (
    instructorId: number,
    file: { uri: string; name: string; mimeType: string },
  ) => {
    const path = "/api/instructor/support-tickets/attachments"
    const url = `${API_BASE_URL}${path}`
    assertProductionHttpsUrl(url)
    const form = new FormData()
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob)
    const headers = await instructorAuthenticatedHeaders({ instructorId }, { omitCourseId: true })
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
      throw new ApiError(
        typeof body === "object" && body !== null && "error" in body && typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : `Upload failed (${response.status})`,
        response.status,
        body,
      )
    }
    await persistHttpCookiesFromResponse(url, response.headers)
    return body as { url: string; name?: string; mime?: string; size?: number }
  },
}
