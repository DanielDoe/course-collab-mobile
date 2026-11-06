import {
  announcementCanAddToCalendar,
  announcementEventEndIso,
  announcementEventStartIso,
  type AnnouncementEventFields,
} from "./announcement-calendar"
import { FACULTY_ANNOUNCEMENT_COLOR } from "./faculty-announcement-theme"

export type InstructorCalendarEventType =
  | "class_meeting"
  | "regular_office_hours"
  | "booked_office_hours"
  | "announcement"

export type InstructorCalendarView = "all" | "selected"

export type InstructorCalendarEvent = {
  id: string
  title: string
  description: string
  eventType: InstructorCalendarEventType
  startTime: string
  endTime: string
  location: string
  color: string
  pendingScheduleChange: boolean
  meetingType?: string
  scheduleAdjustmentId?: number | null
  studentName?: string
  topic?: string
  officeHoursRequestId?: number
  href?: string
  courseId?: number
  sessionId?: number | null
  courseCode?: string
  courseTitle?: string
  sessionCode?: string | null
}

export type InstructorCalendarAdjustment = {
  id: number
  status: string
  meetingType: string
  reason: string
  courseId?: number
  courseCode?: string
  sessionCode?: string | null
}

export type InstructorCalendarScheduleSummary = {
  courseId: number
  sessionId: number | null
  courseCode: string
  courseTitle: string
  sessionCode: string | null
  scheduleText: string | null
  location: string | null
}

export type InstructorCalendarPayload = {
  events: InstructorCalendarEvent[]
  scheduleText: string | null
  location: string | null
  openAdjustments: InstructorCalendarAdjustment[]
  calendarScope?: InstructorCalendarView
  scheduleSummaries?: InstructorCalendarScheduleSummary[]
}

export function parseInstructorWallClock(iso: string): Date {
  if (/Z$/i.test(iso) || /[+-]\d{2}:\d{2}$/.test(iso)) return new Date(iso)
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return new Date(iso)
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  )
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

export function toLocalWallClockIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`
}

export function instructorEventNumericId(id: string): number {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (Math.imul(31, hash) + id.charCodeAt(index)) | 0
  }
  return Math.abs(hash) || 1
}

export function formatInstructorEventTime(iso: string): string {
  return parseInstructorWallClock(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatInstructorEventRange(startIso: string, endIso: string): string {
  return `${formatInstructorEventTime(startIso)} – ${formatInstructorEventTime(endIso)}`
}

export function instructorEventShortLabel(event: InstructorCalendarEvent): string {
  if (event.eventType === "announcement") return event.title.trim() || "Announcement"
  if (event.eventType === "regular_office_hours") return "Hours"
  if (event.eventType === "booked_office_hours") return "Booked"
  if (event.meetingType === "laboratory") return "Lab"
  if (event.meetingType === "structured") return "Session"
  if (event.meetingType === "instructor_led") return "Led"
  return "Lecture"
}

export function instructorEventKindLabel(event: InstructorCalendarEvent): string {
  if (event.eventType === "announcement") {
    if (event.meetingType === "exam") return "Exam announcement"
    if (event.meetingType === "alert") return "Alert announcement"
    return "Announcement"
  }
  if (event.eventType === "regular_office_hours") return "Office hours"
  if (event.eventType === "booked_office_hours") return "Booked office hours"
  if (event.meetingType === "laboratory") return "Laboratory"
  if (event.meetingType === "structured") return "Structured session"
  if (event.meetingType === "instructor_led") return "Instructor-led"
  return "Lecture"
}

export function instructorCalendarEventFromAnnouncement(
  item: AnnouncementEventFields & { id: number; title: string },
): InstructorCalendarEvent | null {
  if (!announcementCanAddToCalendar(item)) return null
  const startTime = announcementEventStartIso(item)
  if (!startTime) return null
  const explicitEnd = announcementEventEndIso(item)
  const endTime =
    explicitEnd ??
    toLocalWallClockIso(new Date(parseInstructorWallClock(startTime).getTime() + 60 * 60 * 1000))
  const kind = (item.category ?? item.type ?? "").toLowerCase()
  return {
    id: `announcement:${item.id}`,
    title: item.title,
    description: "",
    eventType: "announcement",
    startTime,
    endTime,
    location: item.event_location?.trim() ?? "",
    color: FACULTY_ANNOUNCEMENT_COLOR.link,
    pendingScheduleChange: false,
    meetingType: kind || undefined,
    href: "/module/announcements",
  }
}

export function mergeInstructorCalendarAnnouncements(
  events: InstructorCalendarEvent[],
  announcements: Array<AnnouncementEventFields & { id: number; title: string }>,
): InstructorCalendarEvent[] {
  const extra = announcements
    .map(instructorCalendarEventFromAnnouncement)
    .filter((event): event is InstructorCalendarEvent => event != null)
  if (extra.length === 0) return events
  return [...events, ...extra].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function instructorCalendarEventMatchesQuery(
  event: InstructorCalendarEvent,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    event.title,
    event.description,
    event.location,
    event.eventType.replace(/_/g, " "),
    event.meetingType?.replace(/_/g, " ") ?? "",
    event.studentName ?? "",
    event.topic ?? "",
    event.courseCode ?? "",
    event.courseTitle ?? "",
    event.sessionCode ?? "",
    instructorEventKindLabel(event),
    instructorEventCourseLabel(event) ?? "",
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

export function filterInstructorCalendarEvents(
  events: InstructorCalendarEvent[],
  query: string,
): InstructorCalendarEvent[] {
  const q = query.trim()
  if (!q) return events
  return events.filter((event) => instructorCalendarEventMatchesQuery(event, q))
}

export function instructorEventCourseLabel(event: InstructorCalendarEvent): string | null {
  const label = event.sessionCode?.trim() || event.courseCode?.trim()
  return label || null
}
