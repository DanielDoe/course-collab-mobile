import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"

export type AdminScope = { instructorId: number; courseId: number }

export type InstructorScheduleRequest = {
  id: number
  status: string
  meeting_type: string
  reason: string
  section_code?: string | null
  availability_ends_at?: string
  proposed_day?: string | null
  proposed_start_time?: string | null
  proposed_end_time?: string | null
  effective_date?: string | null
  department_approval_status?: string
  created_at?: string
}

export type InstructorScheduleCandidate = {
  id: number
  day_of_week: string
  start_time: string
  end_time: string
  available_count: number
  agreement_percentage: number
  consensus_category: string
  selected?: boolean
}

export type InstructorScheduleDashboard = {
  request: InstructorScheduleRequest
  enrollmentTotal?: number
  responseRate?: number
  consent?: { total: number; agreed: number; pending: number; declined: number }
  candidateTotal?: number
  enrollmentDelta?: { changed: boolean; added: unknown[]; dropped: unknown[] }
  safeguardNotice?: string
}

async function instructorRequest<T>(path: string, scope: AdminScope, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
    "x-course-id": String(scope.courseId),
    ...(init?.headers as Record<string, string> | undefined),
  }
  const response = await fetch(url, { ...init, headers })
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
      typeof body === "object" && body !== null && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }
  return body as T
}

export const instructorScheduleAdjustmentApi = {
  list: (scope: AdminScope) =>
    instructorRequest<{ success?: boolean; requests: InstructorScheduleRequest[] }>(
      "/api/instructor/schedule-adjustments",
      scope,
    ),

  getDashboard: (scope: AdminScope, requestId: number) =>
    instructorRequest<InstructorScheduleDashboard>(`/api/instructor/schedule-adjustments/${requestId}`, scope),

  getCandidates: (scope: AdminScope, requestId: number) =>
    instructorRequest<{ success?: boolean; candidates: InstructorScheduleCandidate[] }>(
      `/api/instructor/schedule-adjustments/${requestId}/actions?view=candidates`,
      scope,
    ),

  create: (
    scope: AdminScope,
    payload: {
      pollKind?: "recurring" | "one_off"
      meetingType: string
      reason: string
      availabilityEndsAt: string
      candidateStartTime?: string
      candidateEndTime?: string
      candidateDays?: string[]
      candidateDates?: string[]
      missedClassDate?: string | null
      meetingDurationMinutes?: number
      slotIncrementMinutes?: number
      instructorNotes?: string
    },
  ) =>
    instructorRequest<{ success?: boolean; request: InstructorScheduleRequest }>(
      "/api/instructor/schedule-adjustments",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  action: (scope: AdminScope, requestId: number, body: Record<string, unknown>) =>
    instructorRequest<{ success?: boolean; request?: InstructorScheduleRequest }>(
      `/api/instructor/schedule-adjustments/${requestId}/actions`,
      scope,
      { method: "POST", body: JSON.stringify(body) },
    ),
}
