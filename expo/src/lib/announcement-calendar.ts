import { announcementTypeHasEventFields } from "./faculty-announcement-utils"

export type AnnouncementEventFields = {
  category?: string | null
  type?: string | null
  event_date?: string | null
  event_time?: string | null
  event_end?: string | null
  event_location?: string | null
  calendar_event_id?: number | null
}

export function announcementCanAddToCalendar(item: AnnouncementEventFields): boolean {
  const type = item.category ?? item.type
  return announcementTypeHasEventFields(type) && Boolean(item.event_date)
}

export function announcementEventStartIso(item: AnnouncementEventFields): string | null {
  const date = item.event_date?.slice(0, 10)
  if (!date) return null
  const time = (item.event_time ?? "09:00").trim() || "09:00"
  return `${date}T${time.length === 5 ? `${time}:00` : time}`
}

export function announcementEventEndIso(item: AnnouncementEventFields): string | null {
  const date = item.event_date?.slice(0, 10)
  if (!date || !item.event_end?.trim()) return null
  const time = item.event_end.trim()
  return `${date}T${time.length === 5 ? `${time}:00` : time}`
}

export function announcementEventWhenLabel(item: AnnouncementEventFields): string | null {
  const date = item.event_date?.slice(0, 10)
  if (!date) return null
  const start = item.event_time?.trim()
  const end = item.event_end?.trim()
  if (start && end) return `${date} · ${start}–${end}`
  if (start) return `${date} · ${start}`
  return date
}
