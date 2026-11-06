import type { CalendarEvent } from "./types"
import type { OfficeHoursRequest } from "../student-api"

const BOOKED_STATUSES = new Set(["approved", "scheduled", "completed"])
const BOOKED_DURATION_MS = 30 * 60 * 1000

function parseScheduledDate(value: string): Date | null {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Booked student office hours → calendar events (same 30-minute slots as faculty calendar). */
export function bookedOfficeHoursToCalendarEvents(requests: OfficeHoursRequest[]): CalendarEvent[] {
  return requests.flatMap((request) => {
    const status = String(request.status ?? "").toLowerCase()
    if (!BOOKED_STATUSES.has(status)) return []
    const scheduled = request.scheduled_date?.trim()
    if (!scheduled) return []
    const start = parseScheduledDate(scheduled)
    if (!start) return []
    const end = new Date(start.getTime() + BOOKED_DURATION_MS)
    const location = (request.meeting_venue || request.meeting_link || "").trim()
    const topic = request.topic?.trim() || "Office hours"
    return [
      {
        id: request.id,
        title: topic.startsWith("Office hours") ? topic : `Office hours · ${topic}`,
        description: request.description ?? topic,
        event_type: "office_hours" as const,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: location || null,
        color: "#7c3aed",
      },
    ]
  })
}
