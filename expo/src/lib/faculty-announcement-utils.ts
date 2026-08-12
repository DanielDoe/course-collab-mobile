import type { InstructorAnnouncement } from "./instructor-api"
import { announcementPlainText } from "./announcement-content"

export type FacultyAnnouncementFilter = "all" | "high" | "active"

export function facultyAnnouncementHaystack(item: InstructorAnnouncement): string {
  return [
    item.title,
    item.ai_summary,
    item.type,
    item.target_session,
    announcementPlainText(item.content ?? "", 2000),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function filterFacultyAnnouncements(
  items: InstructorAnnouncement[],
  filter: FacultyAnnouncementFilter,
): InstructorAnnouncement[] {
  switch (filter) {
    case "high":
      return items.filter((item) => item.priority === "high" || item.pinned === true)
    case "active":
      return items.filter((item) => item.is_active !== false)
    default:
      return items
  }
}

export function searchFacultyAnnouncements(
  items: InstructorAnnouncement[],
  query: string,
): InstructorAnnouncement[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => facultyAnnouncementHaystack(item).includes(q))
}

export function applyFacultyAnnouncementQuery(
  items: InstructorAnnouncement[],
  options: { search: string; filter: FacultyAnnouncementFilter },
): InstructorAnnouncement[] {
  const searched = searchFacultyAnnouncements(items, options.search)
  return filterFacultyAnnouncements(searched, options.filter)
}

export function countFacultyAnnouncementsByFilter(
  items: InstructorAnnouncement[],
): Record<FacultyAnnouncementFilter, number> {
  return {
    all: items.length,
    high: items.filter((item) => item.priority === "high" || item.pinned === true).length,
    active: items.filter((item) => item.is_active !== false).length}
}

export function formatAnnouncementRelativeDate(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function priorityTone(priority?: string): "danger" | "warning" | "neutral" {
  if (priority === "high") return "danger"
  if (priority === "medium") return "warning"
  return "neutral"
}

export const ANNOUNCEMENT_TYPE_OPTIONS = [
  { id: "info", label: "Info" },
  { id: "exam", label: "Exam" },
  { id: "warning", label: "Warning" },
  { id: "alert", label: "Alert" },
] as const

export const ANNOUNCEMENT_PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
] as const
