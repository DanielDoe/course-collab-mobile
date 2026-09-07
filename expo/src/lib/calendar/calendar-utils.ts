import { resolveThemeTokens, type AppThemeTokens } from "../../constants/app-themes"
import { DEFAULT_APPEARANCE_PREFS } from "../appearance-preferences"
import { calendarColorHuntEventColors } from "./calendar-color-theme"
import type { CalendarEvent, CalendarMonthDay } from "./types"

export type CalendarEventTypeConfig = {
  color: string
  label: string
  icon:
    | "school-outline"
    | "book-outline"
    | "document-text-outline"
    | "alarm-outline"
    | "people-outline"
    | "location-outline"
    | "sparkles-outline"
    | "calendar-outline"
}

export function calendarEventColors(_tokens?: AppThemeTokens): Record<string, CalendarEventTypeConfig> {
  return calendarColorHuntEventColors()
}

const DEFAULT_EVENT_COLORS = calendarEventColors(
  resolveThemeTokens(DEFAULT_APPEARANCE_PREFS.themeId, DEFAULT_APPEARANCE_PREFS.appearanceMode, null),
)

/** @deprecated Prefer calendarEventColors(tokens) */
export const EVENT_TYPE_CONFIG = DEFAULT_EVENT_COLORS

export function eventTypeConfig(
  event: CalendarEvent,
  colors: Record<string, CalendarEventTypeConfig> = DEFAULT_EVENT_COLORS,
) {
  const type = event.event_type ?? "event"
  const fallbackAccent = colors.class_meeting?.color ?? DEFAULT_EVENT_COLORS.class_meeting.color
  return (
    colors[type] ?? {
      color: event.color ?? fallbackAccent,
      label: type.replace(/_/g, " "),
      icon: "calendar-outline" as const,
    }
  )
}

export function isClassMeetingEvent(event: CalendarEvent): boolean {
  return event.isClassMeeting === true || event.event_type === "class_meeting"
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function buildMonthGrid(month: Date): CalendarMonthDay[] {
  const first = startOfMonth(month)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  const days: CalendarMonthDay[] = []
  const cursor = new Date(start)

  for (let i = 0; i < 42; i++) {
    days.push({
      date: new Date(cursor),
      inMonth: cursor.getMonth() === month.getMonth(),
      key: dateKey(cursor),
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events
    .filter((event) => {
      if (!event.start_time) return false
      const start = new Date(event.start_time)
      return !Number.isNaN(start.getTime()) && sameDay(start, date)
    })
    .sort((a, b) => new Date(a.start_time ?? 0).getTime() - new Date(b.start_time ?? 0).getTime())
}

export function parseCalendarWallClock(iso: string): Date {
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

export function formatEventTimeRange(event: CalendarEvent): string {
  if (event.all_day) return "All day"
  const start = event.start_time ? new Date(event.start_time) : null
  const end = event.end_time ? new Date(event.end_time) : null
  if (!start || Number.isNaN(start.getTime())) return "Time TBD"

  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (!end || Number.isNaN(end.getTime())) return startLabel
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return `${startLabel} – ${endLabel}`
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

export function mergeCalendarEvents(
  personalEvents: CalendarEvent[],
  classMeetings: CalendarEvent[],
): CalendarEvent[] {
  const merged = [...personalEvents, ...classMeetings.map((e) => ({ ...e, isClassMeeting: true }))]
  return merged.sort(
    (a, b) => new Date(a.start_time ?? 0).getTime() - new Date(b.start_time ?? 0).getTime(),
  )
}

export function countUpcomingEvents(events: CalendarEvent[], from = Date.now()): number {
  return events.filter((e) => {
    const t = e.start_time ? new Date(e.start_time).getTime() : 0
    return t >= from
  }).length
}

export function countTodayEvents(events: CalendarEvent[], today = new Date()): number {
  return getEventsForDate(events, today).length
}
