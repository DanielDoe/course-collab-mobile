import { useStudentShell } from "../../context/StudentShellContext"
import { usePortalShell } from "../../context/PortalShellContext"
import type { GuestSession, StudentSession, SummerSession } from "../../lib/session"
import { NotificationsSheet } from "./NotificationsSheet"

export function StudentNotificationsSheet({ session }: { session: StudentSession }) {
  const { notificationsOpen, closeNotifications, setNotificationCount } = useStudentShell()
  return (
    <NotificationsSheet
      session={session}
      notificationsOpen={notificationsOpen}
      closeNotifications={closeNotifications}
      setNotificationCount={setNotificationCount}
    />
  )
}

export function PortalNotificationsSheet({ session }: { session: GuestSession | SummerSession }) {
  const { notificationsOpen, closeNotifications, setNotificationCount } = usePortalShell()
  return (
    <NotificationsSheet
      session={session}
      notificationsOpen={notificationsOpen}
      closeNotifications={closeNotifications}
      setNotificationCount={setNotificationCount}
    />
  )
}
