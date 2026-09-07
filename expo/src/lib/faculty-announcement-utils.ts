export type FacultyAnnouncementFilter = "all" | "high" | "active"

function searchPreviewText(content: string): string {
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** List-row fields used by faculty search, filters, and audience chips. */
export type FacultyAnnouncementListItem = {
  title: string
  content?: string
  type?: string
  priority?: string
  target_session?: string
  ai_summary?: string | null
  pinned?: boolean
  is_active?: boolean
}

export function facultyAnnouncementHaystack(item: FacultyAnnouncementListItem): string {
  return [
    item.title,
    item.ai_summary,
    item.type,
    item.target_session,
    searchPreviewText(item.content ?? "").slice(0, 2000),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function filterFacultyAnnouncements<T extends FacultyAnnouncementListItem>(
  items: T[],
  filter: FacultyAnnouncementFilter,
): T[] {
  switch (filter) {
    case "high":
      return items.filter((item) => item.priority === "high" || item.pinned === true)
    case "active":
      return items.filter((item) => item.is_active !== false)
    default:
      return items
  }
}

export function searchFacultyAnnouncements<T extends FacultyAnnouncementListItem>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => facultyAnnouncementHaystack(item).includes(q))
}

export function applyFacultyAnnouncementQuery<T extends FacultyAnnouncementListItem>(
  items: T[],
  options: { search: string; filter: FacultyAnnouncementFilter },
): T[] {
  const searched = searchFacultyAnnouncements(items, options.search)
  return filterFacultyAnnouncements(searched, options.filter)
}

export function countFacultyAnnouncementsByFilter(
  items: FacultyAnnouncementListItem[],
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

export const ANNOUNCEMENT_EVENT_TYPES = new Set(["exam", "alert"])

export function announcementTypeHasEventFields(type?: string | null): boolean {
  return ANNOUNCEMENT_EVENT_TYPES.has((type ?? "").toLowerCase())
}

export const ANNOUNCEMENT_PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
] as const

/** Audience chip for faculty detail — section target when set, otherwise course-wide. */
export function facultyAnnouncementAudienceLabel(targetSession?: string): string {
  const session = targetSession?.trim()
  if (!session || session.toLowerCase() === "all") return "Course-wide"
  return session
}
