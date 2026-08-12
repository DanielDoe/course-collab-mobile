export type CalendarEventType =
  | "class_meeting"
  | "study_session"
  | "quiz"
  | "exam"
  | "assignment"
  | "office_hours"
  | "group_study"
  | "ai_reminder"
  | string

export type CalendarEvent = {
  id: number
  title: string
  description?: string | null
  event_type?: CalendarEventType
  start_time?: string
  end_time?: string | null
  all_day?: boolean
  location?: string | null
  color?: string | null
  is_completed?: boolean
  reminder_minutes?: number
  isClassMeeting?: boolean
}

export type ParsedClassSchedule = {
  dayCodes: string[]
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  raw: string
}

export type ClassScheduleContext = {
  courseTitle: string
  term: string
  location?: string
}

export type ClassReminderPrefs = {
  enabled: boolean
  minutesBefore: 15 | 30 | 60
}

export type ClassSchedulePayload = {
  success?: boolean
  hasSchedule: boolean
  scheduleText?: string | null
  location?: string | null
  schedule?: ParsedClassSchedule | null
  context?: ClassScheduleContext | null
  events?: CalendarEvent[]
  message?: string
}

export type CalendarMonthDay = {
  date: Date
  inMonth: boolean
  key: string
}
