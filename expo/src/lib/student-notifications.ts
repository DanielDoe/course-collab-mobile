import { studentAuthenticatedRequest } from "./student-api"
import type { StudentAuthSession } from "./student-session-proof"

export type StudentNotification = {
  id: number
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

type NotificationsPayload = {
  notifications?: StudentNotification[]
  unread_count?: number
  unreadCount?: number
  throttled?: boolean
}

export async function fetchStudentNotifications(session: StudentAuthSession): Promise<{
  notifications: StudentNotification[]
  unreadCount: number
  throttled?: boolean
}> {
  try {
    const payload = await studentAuthenticatedRequest<NotificationsPayload>(
      session,
      `/api/student/notifications?studentId=${encodeURIComponent(session.databaseId)}&limit=50`,
    )
    const notifications = payload.notifications ?? []
    const apiUnread = Number(payload.unread_count ?? payload.unreadCount ?? 0)
    const derivedUnread = notifications.filter((n) => !n.is_read).length
    return {
      notifications,
      unreadCount: Math.max(apiUnread, derivedUnread),
      throttled: payload.throttled,
    }
  } catch {
    return { notifications: [], unreadCount: 0 }
  }
}

export async function markNotificationRead(
  session: StudentAuthSession,
  notificationId: number,
): Promise<boolean> {
  try {
    await studentAuthenticatedRequest(session, "/api/student/notifications", {
      method: "PATCH",
      body: JSON.stringify({ notification_id: notificationId }),
    })
    return true
  } catch {
    return false
  }
}

export async function markAllNotificationsRead(session: StudentAuthSession): Promise<boolean> {
  try {
    await studentAuthenticatedRequest(session, "/api/student/notifications", {
      method: "PATCH",
      body: JSON.stringify({ mark_all_read: true }),
    })
    return true
  } catch {
    return false
  }
}

export async function dismissNotification(
  session: StudentAuthSession,
  notificationId: number,
): Promise<boolean> {
  try {
    await studentAuthenticatedRequest(session, "/api/student/notifications", {
      method: "PATCH",
      body: JSON.stringify({ notification_id: notificationId, dismiss: true }),
    })
    return true
  } catch {
    return false
  }
}

export function formatNotificationTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
