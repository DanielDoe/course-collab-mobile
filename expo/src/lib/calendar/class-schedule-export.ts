import type { ClassScheduleContext, ParsedClassSchedule } from "./types"

const DAY_CODE_TO_JS: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function inferTermBounds(term: string): { start: Date; end: Date } {
  const match = term.match(/(spring|summer|fall|winter)\s*(\d{4})/i)
  const season = match?.[1]?.toLowerCase() ?? "fall"
  const year = Number.parseInt(match?.[2] ?? String(new Date().getFullYear()), 10)

  switch (season) {
    case "spring":
      return { start: new Date(year, 0, 15), end: new Date(year, 4, 15) }
    case "summer":
      return { start: new Date(year, 5, 1), end: new Date(year, 7, 4) }
    case "winter":
      return { start: new Date(year, 0, 2), end: new Date(year, 0, 31) }
    default:
      return { start: new Date(year, 7, 20), end: new Date(year, 11, 15) }
  }
}

function firstOccurrenceOnOrAfter(dayCode: string, onOrAfter: Date): Date {
  const target = DAY_CODE_TO_JS[dayCode] ?? 1
  const date = new Date(onOrAfter)
  date.setHours(0, 0, 0, 0)
  for (let i = 0; i < 14; i++) {
    if (date.getDay() === target) return date
    date.setDate(date.getDate() + 1)
  }
  return onOrAfter
}

function earliestClassStart(schedule: ParsedClassSchedule, termStart: Date): Date {
  const candidates = schedule.dayCodes.map((code) => firstOccurrenceOnOrAfter(code, termStart))
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0]
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function formatGoogleDate(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}00`
}

export function buildClassScheduleEvent(schedule: ParsedClassSchedule, context: ClassScheduleContext) {
  const { start: termStart, end: termEnd } = inferTermBounds(context.term)
  const firstDay = earliestClassStart(schedule, termStart)

  const start = new Date(firstDay)
  start.setHours(schedule.startHour, schedule.startMinute, 0, 0)

  const end = new Date(firstDay)
  end.setHours(schedule.endHour, schedule.endMinute, 0, 0)

  const until = new Date(termEnd)
  until.setHours(23, 59, 59, 0)

  return {
    title: context.courseTitle || "Course class meeting",
    location: context.location?.trim() || "",
    description: `Recurring class schedule: ${schedule.raw}`,
    start,
    end,
    until,
    rrule: `FREQ=WEEKLY;BYDAY=${schedule.dayCodes.join(",")};UNTIL=${formatIcsUtc(until)}`}
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

export function buildClassScheduleIcs(
  schedule: ParsedClassSchedule,
  context: ClassScheduleContext,
): string | null {
  const event = buildClassScheduleEvent(schedule, context)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago"

  const dtStart = `DTSTART;TZID=${tz}:${event.start.getFullYear()}${pad2(event.start.getMonth() + 1)}${pad2(event.start.getDate())}T${pad2(event.start.getHours())}${pad2(event.start.getMinutes())}00`
  const dtEnd = `DTEND;TZID=${tz}:${event.end.getFullYear()}${pad2(event.end.getMonth() + 1)}${pad2(event.end.getDate())}T${pad2(event.end.getHours())}${pad2(event.end.getMinutes())}00`

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CourseCollab//Syllabus//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:class-${Date.now()}@coursecollab`,
    dtStart,
    dtEnd,
    `RRULE:${event.rrule}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : "",
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")
}

export function googleCalendarUrlForClass(
  schedule: ParsedClassSchedule,
  context: ClassScheduleContext,
): string | null {
  const event = buildClassScheduleEvent(schedule, context)

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end)}`,
    recur: `RRULE:${event.rrule}`,
    details: event.description})
  if (event.location) params.set("location", event.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarUrlForClass(
  schedule: ParsedClassSchedule,
  context: ClassScheduleContext,
): string | null {
  const event = buildClassScheduleEvent(schedule, context)

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: `${event.description}\n\n(Recurring weekly on ${schedule.dayCodes.join(", ")} through ${context.term}.)`})
  if (event.location) params.set("location", event.location)
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
