import { studentAuthenticatedRequest } from "./student-api"
import type { StudentSession } from "./session"
import { filterScheduleAdjustmentsToSection } from "./schedule-adjustment/section-scope"
import type { AvailabilitySlotState } from "./schedule-adjustment/time-slots"

export type ScheduleAdjustmentRequest = {
  id: number
  status: string
  meeting_type: string
  reason: string
  section_code?: string | null
  adjustment_mode?: string | null
  availability_ends_at?: string
  proposed_day?: string | null
  proposed_start_time?: string | null
  proposed_end_time?: string | null
  effective_date?: string | null
  location?: string | null
  building?: string | null
  room?: string | null
  department_approval_status?: string
  original_schedules?: Record<string, unknown>
  poll_kind?: "recurring" | "one_off"
  missed_class_date?: string | null
  proposed_date?: string | null
  instructor_led_day?: string | null
  instructor_led_start_time?: string | null
  instructor_led_end_time?: string | null
  structured_session_day?: string | null
  structured_session_start_time?: string | null
  structured_session_end_time?: string | null
  attendance_late_threshold_minutes?: number | null
  created_at?: string
}

export type ScheduleAdjustmentDetail = {
  success?: boolean
  request: ScheduleAdjustmentRequest
  myAvailability?: { availability_data?: { slots?: Record<string, AvailabilitySlotState> }; submitted_at?: string | null } | null
  myConsent?: { status?: string; signature_name?: string | null } | null
  pollStats?: { responded: number; enrolled: number }
  consentStats?: {
    agreed: number
    declined: number
    pending: number
    total: number
    thresholdPercent: number
    required: number
    remaining: number
    percentOfClass: number
    percentTowardThreshold: number
    thresholdMet: boolean
  }
  consentStatement?: string
  consentIntro?: string
  consentAffirmations?: string[]
  safeguardNotice?: string
  conflictDisclaimer?: string
  instructorName?: string
  studentName?: string
}

export type SlotHeatmapCell = {
  available: number
  preferred: number
}

export type TopMeetingWindow = {
  dayOfWeek: string
  startTime: string
  endTime: string
  availableCount: number
  agreementPercentage: number
  consensusCategory: string
}

export type AvailabilityGridConfig = {
  pollKind?: "recurring" | "one_off"
  missedClassDate?: string | null
  candidateDays: string[]
  candidateDates?: string[]
  columnLabels?: Record<string, string>
  timeSlots: string[]
  slotIncrementMinutes: number
  availabilityMode: "binary" | "ternary"
  allowMultipleSelections: boolean
  deadline?: string
  meetingDurationMinutes?: number
  pollStats?: { responded: number; enrolled: number; responseRate?: number } | null
  slotHeatmap?: Record<string, SlotHeatmapCell> | null
  topWindows?: TopMeetingWindow[] | null
}

function qs(session: StudentSession) {
  return `studentId=${encodeURIComponent(session.databaseId)}`
}

export const scheduleAdjustmentApi = {
  list: async (session: StudentSession) => {
    const data = await studentAuthenticatedRequest<{ success?: boolean; requests: ScheduleAdjustmentRequest[] }>(
      session,
      `/api/student/schedule-adjustments?${qs(session)}`,
    )
    return {
      ...data,
      requests: filterScheduleAdjustmentsToSection(data.requests ?? [], session.section),
    }
  },

  getDetail: (session: StudentSession, requestId: number) =>
    studentAuthenticatedRequest<ScheduleAdjustmentDetail>(
      session,
      `/api/student/schedule-adjustments/${requestId}?${qs(session)}`,
    ),

  getAvailabilityGrid: (session: StudentSession, requestId: number) =>
    studentAuthenticatedRequest<AvailabilityGridConfig>(
      session,
      `/api/student/schedule-adjustments/${requestId}/availability?${qs(session)}`,
    ),

  submitAvailability: (
    session: StudentSession,
    requestId: number,
    slots: Record<string, AvailabilitySlotState>,
  ) =>
    studentAuthenticatedRequest<{ success?: boolean }>(
      session,
      `/api/student/schedule-adjustments/${requestId}/availability?${qs(session)}`,
      {
        method: "POST",
        body: JSON.stringify({ availability: { slots } }),
      },
    ),

  submitConsent: (
    session: StudentSession,
    requestId: number,
    payload: {
      agreed: boolean
      acknowledged?: boolean
      signatureName?: string
      declineReason?: string
      declineCategory?: string
    },
  ) =>
    studentAuthenticatedRequest<{ success?: boolean }>(
      session,
      `/api/student/schedule-adjustments/${requestId}/consent?${qs(session)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
}
