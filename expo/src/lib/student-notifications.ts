import { API_BASE_URL } from "../constants"

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

async function notificationRequest<T>(
  databaseId: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/notifications${init?.method ? "" : "?limit=50"}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "x-student-id": databaseId,
        ...(init?.headers ?? {})},
      signal: init?.signal ?? AbortSignal.timeout(12_000)})
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function fetchStudentNotifications(databaseId: string): Promise<{
  notifications: StudentNotification[]
  unreadCount: number
  throttled?: boolean
}> {
  const payload = await notificationRequest<NotificationsPayload>(databaseId)
  const notifications = payload?.notifications ?? []
  const apiUnread = Number(payload?.unread_count ?? payload?.unreadCount ?? 0)
  const derivedUnread = notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount: Math.max(apiUnread, derivedUnread),
    throttled: payload?.throttled}
}

export async function markNotificationRead(databaseId: string, notificationId: number): Promise<boolean> {
  const payload = await notificationRequest<{ ok?: boolean }>(databaseId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notification_id: notificationId })})
  return payload != null
}

export async function markAllNotificationsRead(databaseId: string): Promise<boolean> {
  const payload = await notificationRequest<{ ok?: boolean }>(databaseId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mark_all_read: true })})
  return payload != null
}

export async function dismissNotification(databaseId: string, notificationId: number): Promise<boolean> {
  const payload = await notificationRequest<{ ok?: boolean }>(databaseId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notification_id: notificationId, dismiss: true })})
  return payload != null
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
