import type { CalendarEvent } from "./types"

export type CalendarEventKindFilter =
  | "all"
  | "classes"
  | "exams"
  | "office_hours"
  | "study"
  | "projects"
  | "other"

export function calendarEventKind(event: CalendarEvent): Exclude<CalendarEventKindFilter, "all"> {
  const type = (event.event_type ?? "").toLowerCase()
  const title = event.title ?? ""
  if (event.isClassMeeting === true || type === "class_meeting") return "classes"
  if (type === "exam" || type === "quiz" || type === "alert") return "exams"
  if (type === "office_hours" || type.includes("office")) return "office_hours"
  if (
    type === "study_session" ||
    type === "ai_reminder" ||
    type === "group_study" ||
    /study session/i.test(title)
  ) {
    return "study"
  }
  if (type.includes("project") || /project/i.test(title)) return "projects"
  return "other"
}

export function filterCalendarEventsByKind(
  events: CalendarEvent[],
  kind: CalendarEventKindFilter,
): CalendarEvent[] {
  if (kind === "all") return events
  return events.filter((event) => calendarEventKind(event) === kind)
}

export function calendarEventMatchesQuery(event: CalendarEvent, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const typeLabel = (event.event_type ?? "").replace(/_/g, " ")
  const haystack = [event.title, event.description ?? "", event.location ?? "", typeLabel]
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

export function filterCalendarEvents(events: CalendarEvent[], query: string): CalendarEvent[] {
  const q = query.trim()
  if (!q) return events
  return events.filter((event) => calendarEventMatchesQuery(event, q))
}
