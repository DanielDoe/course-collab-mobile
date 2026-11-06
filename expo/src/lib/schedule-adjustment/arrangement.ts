import { DAY_CODE_LABELS, formatTime12h, type DayCode } from "./time-slots"

type OriginalSchedulesPayload = {
  lecture?: { scheduleText?: string } | null
  laboratory?: { scheduleText?: string } | null
}

export function formatMeetingWindow(params: {
  day?: string | null
  startTime?: string | null
  endTime?: string | null
}): string {
  const { day, startTime, endTime } = params
  if (!day || !startTime || !endTime) return "Not set"
  const dayLabel = DAY_CODE_LABELS[day as DayCode] ?? day
  return `${dayLabel} ${formatTime12h(String(startTime))} to ${formatTime12h(String(endTime))}`
}

export function formatOriginalSchedules(original: OriginalSchedulesPayload | null | undefined): string {
  const lecture = original?.lecture?.scheduleText?.trim()
  const lab = original?.laboratory?.scheduleText?.trim()
  const parts: string[] = []
  if (lecture) parts.push(`Lecture: ${lecture}`)
  if (lab) parts.push(`Laboratory: ${lab}`)
  return parts.join("\n") || "See course syllabus"
}

export function isDirectProposal(mode: unknown): boolean {
  return String(mode ?? "").toUpperCase() === "DIRECT_PROPOSAL"
}

export const DIRECT_PROPOSAL_CONSENT_INTRO = [
  "You are being asked to review the revised instructional meeting arrangement for this course.",
  "The revised schedule maintains scheduled instructional activity while organizing one weekly meeting as an instructor led session and the other as a structured CourseCollab session.",
  "Students are expected to participate during the listed structured session period and complete the assigned attendance check in and required activities.",
].join(" ")
