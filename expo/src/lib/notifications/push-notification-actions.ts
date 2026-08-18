import type { AppSession } from "../session"
import { instructorApi } from "../instructor-api"
import { markNotificationRead } from "../student-notifications"
import { emitNotificationsRefresh } from "./notification-events"

export function parseNotificationIdFromPushData(
  data: Record<string, unknown> | undefined,
): number | undefined {
  if (!data) return undefined
  const raw = data.notificationId ?? data.notification_id ?? data.id
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw)
  return undefined
}

/** iOS/Android notification action — mark a single inbox item read when possible. */
export async function markNotificationReadFromPush(
  session: AppSession,
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  const notificationId = parseNotificationIdFromPushData(data)
  if (!notificationId) return false

  if (session.portal === "student" || session.portal === "guest" || session.portal === "summer") {
    const ok = await markNotificationRead(session, notificationId)
    if (ok) emitNotificationsRefresh()
    return ok
  }

  if (session.portal === "faculty") {
    try {
      await instructorApi.markNotificationRead(session.id, notificationId)
      emitNotificationsRefresh()
      return true
    } catch {
      return false
    }
  }

  return false
}
