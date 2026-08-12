import { useEffect } from "react"
import { onNotificationsRefresh } from "../../lib/notifications/notification-events"

type Props = {
  onRefresh: () => void | Promise<void>
}

/** Bridges push notification events to shell/inbox refresh handlers. */
export function NotificationShellSync({ onRefresh }: Props) {
  useEffect(() => onNotificationsRefresh(() => void onRefresh()), [onRefresh])
  return null
}
