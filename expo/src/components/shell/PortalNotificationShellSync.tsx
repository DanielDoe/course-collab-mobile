import { useCallback, useEffect } from "react"
import { fetchStudentNotifications } from "../../lib/student-notifications"
import { setAppBadgeCount } from "../../lib/notifications/notification-service"
import { NotificationShellSync } from "./NotificationShellSync"
import type { GuestSession, SummerSession } from "../../lib/session"
import { usePortalShell } from "../../context/PortalShellContext"

type Props = {
  session: GuestSession | SummerSession
}

/** Keeps guest/summer inbox badge in sync with push events. */
export function PortalNotificationShellSync({ session }: Props) {
  const { setNotificationCount } = usePortalShell()

  const refreshCount = useCallback(async () => {
    const result = await fetchStudentNotifications(session.databaseId)
    setNotificationCount(result.unreadCount)
    void setAppBadgeCount(result.unreadCount)
  }, [session.databaseId, setNotificationCount])

  useEffect(() => {
    void refreshCount()
  }, [refreshCount])

  return <NotificationShellSync onRefresh={refreshCount} />
}
