export type ScheduleAdjustmentFormState = {
  pollKind: "recurring" | "one_off"
  meetingType: string
  reason: string
  deadlineDate: string
  deadlineTime: string
  candidateStartTime: string
  candidateEndTime: string
  meetingDurationMinutes: string
  slotIncrementMinutes: string
  instructorNotes: string
  candidateDays: string[]
  missedClassDate: string
  makeupDates: string[]
  pendingMakeupDate: string
}

export function defaultDeadlineDate() {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const initialScheduleAdjustmentForm: ScheduleAdjustmentFormState = {
  pollKind: "recurring",
  meetingType: "lecture",
  reason: "",
  deadlineDate: defaultDeadlineDate(),
  deadlineTime: "17:00",
  candidateStartTime: "08:00",
  candidateEndTime: "17:00",
  meetingDurationMinutes: "110",
  slotIncrementMinutes: "30",
  instructorNotes: "",
  candidateDays: ["MO", "TU", "WE", "TH", "FR"],
  missedClassDate: "",
  makeupDates: [],
  pendingMakeupDate: "",
}

export function timeInputValue(value: unknown) {
  return String(value ?? "").slice(0, 5)
}

export function deadlineFromIso(iso: unknown) {
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) {
    return { deadlineDate: defaultDeadlineDate(), deadlineTime: "17:00" }
  }
  return {
    deadlineDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    deadlineTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  }
}

export function draftPayloadFromForm(form: ScheduleAdjustmentFormState) {
  return {
    pollKind: form.pollKind,
    meetingType: form.meetingType,
    reason: form.reason,
    availabilityEndsAt: `${form.deadlineDate}T${form.deadlineTime}:00`,
    candidateStartTime: `${form.candidateStartTime}:00`,
    candidateEndTime: `${form.candidateEndTime}:00`,
    meetingDurationMinutes: Number(form.meetingDurationMinutes) || 110,
    slotIncrementMinutes: Number(form.slotIncrementMinutes) || 30,
    instructorNotes: form.instructorNotes.trim() || undefined,
    candidateDays: form.pollKind === "recurring" ? form.candidateDays : [],
    candidateDates: form.pollKind === "one_off" ? form.makeupDates : [],
    missedClassDate: form.pollKind === "one_off" ? form.missedClassDate || null : null,
  }
}

export function formFromRequest(request: Record<string, unknown>): ScheduleAdjustmentFormState {
  const deadline = deadlineFromIso(request.availability_ends_at)
  return {
    pollKind: request.poll_kind === "one_off" ? "one_off" : "recurring",
    meetingType: String(request.meeting_type ?? "lecture"),
    reason: String(request.reason ?? ""),
    ...deadline,
    candidateStartTime: timeInputValue(request.candidate_start_time),
    candidateEndTime: timeInputValue(request.candidate_end_time),
    meetingDurationMinutes: String(request.meeting_duration_minutes ?? 110),
    slotIncrementMinutes: String(request.slot_increment_minutes ?? 30),
    instructorNotes: String(request.instructor_notes ?? ""),
    candidateDays: Array.isArray(request.candidate_days)
      ? (request.candidate_days as string[])
      : ["MO", "TU", "WE", "TH", "FR"],
    missedClassDate: String(request.missed_class_date ?? "").slice(0, 10),
    makeupDates: Array.isArray(request.candidate_dates) ? (request.candidate_dates as string[]) : [],
    pendingMakeupDate: "",
  }
}
