import { ApiError } from "./api"
import { instructorAuthenticatedRequest } from "./instructor-api"

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
  archived_at?: string | null
  poll_kind?: "recurring" | "one_off"
  candidate_days?: string[]
  candidate_dates?: string[]
  missed_class_date?: string | null
  candidate_start_time?: string
  candidate_end_time?: string
  meeting_duration_minutes?: number
  slot_increment_minutes?: number
  instructor_notes?: string | null
  original_schedules?: Record<string, unknown>
  location?: string | null
  building?: string | null
  room?: string | null
}

export type TopMeetingWindow = {
  dayOfWeek: string
  startTime: string
  endTime: string
  availableCount: number
  agreementPercentage: number
  consensusCategory: string
}

export type LiveAvailabilityAggregate = {
  totalEnrolled: number
  responded: number
  responseRate: number
  slotHeatmap: Record<string, { available: number; preferred: number }>
  topWindows: TopMeetingWindow[]
  meetingDurationMinutes: number
  candidateDays: string[]
  timeSlots: string[]
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

export const instructorScheduleAdjustmentApi = {
  list: async (scope: AdminScope, options?: { includeArchived?: boolean }) => {
    try {
      const qs = options?.includeArchived ? "?includeArchived=1" : ""
      return await instructorAuthenticatedRequest<{
        success?: boolean
        requests: InstructorScheduleRequest[]
      }>(`/api/instructor/schedule-adjustments${qs}`, scope)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 500 || error.status === 404)) {
        return { success: false, requests: [] as InstructorScheduleRequest[] }
      }
      throw error
    }
  },

  getDashboard: (scope: AdminScope, requestId: number) =>
    instructorAuthenticatedRequest<InstructorScheduleDashboard>(
      `/api/instructor/schedule-adjustments/${requestId}`,
      scope,
    ),

  getCandidates: (scope: AdminScope, requestId: number) =>
    instructorAuthenticatedRequest<{ success?: boolean; candidates: InstructorScheduleCandidate[] }>(
      `/api/instructor/schedule-adjustments/${requestId}/actions?view=candidates`,
      scope,
    ),

  getAggregate: (scope: AdminScope, requestId: number) =>
    instructorAuthenticatedRequest<{ success?: boolean; aggregate: LiveAvailabilityAggregate | null }>(
      `/api/instructor/schedule-adjustments/${requestId}/actions?view=aggregate`,
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
    instructorAuthenticatedRequest<{ success?: boolean; request: InstructorScheduleRequest }>(
      "/api/instructor/schedule-adjustments",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  action: (scope: AdminScope, requestId: number, body: Record<string, unknown>) =>
    instructorAuthenticatedRequest<{ success?: boolean; request?: InstructorScheduleRequest }>(
      `/api/instructor/schedule-adjustments/${requestId}/actions`,
      scope,
      { method: "POST", body: JSON.stringify(body) },
    ),
}
