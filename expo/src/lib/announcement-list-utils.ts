import type { Announcement } from "./student-api"
import { announcementPlainText } from "./announcement-content"

export type AnnouncementFilter = "all" | "unread" | "pinned" | "files"

export type AnnouncementSort = "smart" | "newest" | "oldest" | "active"

export function isAnnouncementUnread(item: Announcement): boolean {
  return !item.viewed_by_me && !item.is_read
}

export function announcementAttachmentCount(item: Announcement): number {
  return item.attachments?.length ?? Number(item.attachment_count ?? 0)
}

export function announcementSearchHaystack(item: Announcement): string {
  return [
    item.title,
    item.ai_summary,
    item.author_name,
    item.category,
    announcementPlainText(item.content ?? "", 2000),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function announcementEngagementScore(item: Announcement): number {
  return (
    Number(item.comments_count ?? 0) * 3 +
    Number(item.reactions_count ?? 0) * 2 +
    Number(item.views_count ?? 0)
  )
}

export function filterAnnouncements(
  items: Announcement[],
  filter: AnnouncementFilter,
): Announcement[] {
  switch (filter) {
    case "unread":
      return items.filter(isAnnouncementUnread)
    case "pinned":
      return items.filter((item) => Boolean(item.pinned))
    case "files":
      return items.filter((item) => announcementAttachmentCount(item) > 0)
    default:
      return items
  }
}

export function searchAnnouncements(items: Announcement[], query: string): Announcement[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => announcementSearchHaystack(item).includes(q))
}

export function sortAnnouncements(items: Announcement[], sort: AnnouncementSort): Announcement[] {
  const list = [...items]
  switch (sort) {
    case "oldest":
      return list.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    case "newest":
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    case "active":
      return list.sort((a, b) => {
        const scoreDiff = announcementEngagementScore(b) - announcementEngagementScore(a)
        if (scoreDiff !== 0) return scoreDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    case "smart":
    default:
      return list.sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
        if (isAnnouncementUnread(a) !== isAnnouncementUnread(b)) {
          return isAnnouncementUnread(a) ? -1 : 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }
}

export function applyAnnouncementListQuery(
  items: Announcement[],
  options: {
    search: string
    filter: AnnouncementFilter
    sort: AnnouncementSort
  },
): Announcement[] {
  const searched = searchAnnouncements(items, options.search)
  const filtered = filterAnnouncements(searched, options.filter)
  return sortAnnouncements(filtered, options.sort)
}

export function countAnnouncementsByFilter(items: Announcement[]): Record<AnnouncementFilter, number> {
  return {
    all: items.length,
    unread: items.filter(isAnnouncementUnread).length,
    pinned: items.filter((item) => Boolean(item.pinned)).length,
    files: items.filter((item) => announcementAttachmentCount(item) > 0).length}
}
