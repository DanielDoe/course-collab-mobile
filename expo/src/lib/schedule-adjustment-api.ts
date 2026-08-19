import { studentAuthenticatedRequest } from "./student-api"
import type { StudentSession } from "./session"
import type { AvailabilitySlotState } from "./schedule-adjustment/time-slots"

export type ScheduleAdjustmentRequest = {
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
  location?: string | null
  building?: string | null
  room?: string | null
  department_approval_status?: string
  original_schedules?: Record<string, unknown>
  poll_kind?: "recurring" | "one_off"
  missed_class_date?: string | null
  proposed_date?: string | null
  created_at?: string
}

export type ScheduleAdjustmentDetail = {
  success?: boolean
  request: ScheduleAdjustmentRequest
  myAvailability?: { availability_data?: { slots?: Record<string, AvailabilitySlotState> }; submitted_at?: string | null } | null
  myConsent?: { status?: string; signature_name?: string | null } | null
  pollStats?: { responded: number; enrolled: number }
  consentStatement?: string
  safeguardNotice?: string
  conflictDisclaimer?: string
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
  list: (session: StudentSession) =>
    studentAuthenticatedRequest<{ success?: boolean; requests: ScheduleAdjustmentRequest[] }>(
      session,
      `/api/student/schedule-adjustments?${qs(session)}`,
    ),

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
