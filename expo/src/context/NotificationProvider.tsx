import { useEffect, useRef, type ReactNode } from "react"
import { AppState, Platform, type AppStateStatus } from "react-native"
import { router } from "expo-router"
import { useSession } from "./SessionProvider"
import { facultyNativeRouteFromLink } from "../constants/faculty-nav"
import { resolveNotificationLink } from "../lib/notification-link"
import { resolveCoraOpenRoute } from "../lib/cora/resolve-open-route"
import {
  emitNotificationSideEffects,
  emitNotificationsRefresh,
} from "../lib/notifications/notification-events"
import {
  clearAppBadge,
  getNotificationsModule,
  initializeNotificationSystem,
  setAppBadgeCount,
} from "../lib/notifications/notification-service"
import { markNotificationReadFromPush } from "../lib/notifications/push-notification-actions"
import {
  registerPushTokenForSession,
  unregisterPushTokenForSession,
} from "../lib/notifications/push-registration"

type Props = {
  children: ReactNode
}

function handleNotificationData(data: Record<string, unknown> | undefined) {
  emitNotificationSideEffects(data)
  const badge = data?.badge
  if (typeof badge === "number") {
    void setAppBadgeCount(badge)
  }
}

function resolveRouteFromNotificationData(
  data: Record<string, unknown> | undefined,
  portal: string | undefined,
): string | null {
  if (!data) return null
  const direct = typeof data.route === "string" ? data.route : null
  if (direct) {
    return resolveCoraOpenRoute(direct) ?? direct
  }
  const link = typeof data.link === "string" ? data.link : null
  // Web links are portal-relative, so resolving an instructor's notification with
  // the student map used to drop them on student screens.
  if (portal === "faculty") return link ? facultyNativeRouteFromLink(link) : null
  return resolveNotificationLink(link)
}

function handleNotificationResponse(
  data: Record<string, unknown> | undefined,
  action: string,
  session: ReturnType<typeof useSession>["session"],
  pendingRouteRef: { current: string | null },
) {
  if (action === "DISMISS") return

  handleNotificationData(data)

  if (action === "MARK_READ" && session) {
    void markNotificationReadFromPush(session, data)
  }

  const route = resolveRouteFromNotificationData(data, session?.portal)
  if (!route) return
  if (!session) {
    pendingRouteRef.current = route
    return
  }
  router.push(route as never)
}

export function NotificationProvider({ children }: Props) {
  const { session } = useSession()
  const lastRegisteredSession = useRef<string | null>(null)
  const pendingRouteRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      void initializeNotificationSystem()
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!session) {
      void clearAppBadge()
      if (lastRegisteredSession.current) {
        void unregisterPushTokenForSession(lastRegisteredSession.current)
      }
      lastRegisteredSession.current = null
      return
    }

    const sessionKey = `${session.portal}:${"databaseId" in session ? session.databaseId : session.id}`
    if (lastRegisteredSession.current === sessionKey) return
    lastRegisteredSession.current = sessionKey

    void registerPushTokenForSession(session)
  }, [session])

  useEffect(() => {
    if (!session || Platform.OS === "web") return

    const onAppStateChange = (state: AppStateStatus) => {
      if (state !== "active") return
      void registerPushTokenForSession(session)
      emitNotificationsRefresh()
    }

    const sub = AppState.addEventListener("change", onAppStateChange)
    return () => sub.remove()
  }, [session])

  useEffect(() => {
    if (!session || !pendingRouteRef.current) return
    const route = pendingRouteRef.current
    pendingRouteRef.current = null
    router.push(route as never)
  }, [session])

  useEffect(() => {
    if (Platform.OS === "web") return

    const Notifications = getNotificationsModule()
    if (!Notifications?.addNotificationReceivedListener) return

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>
      const badge = notification.request.content.badge
      if (typeof badge === "number") {
        void setAppBadgeCount(badge)
      }
      handleNotificationData(data)
    })

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>
      handleNotificationResponse(data, response.actionIdentifier, session, pendingRouteRef)
    })

    return () => {
      receivedSub.remove()
      responseSub.remove()
    }
  }, [session])

  useEffect(() => {
    if (Platform.OS === "web") return

    const Notifications = getNotificationsModule()
    if (!Notifications?.getLastNotificationResponseAsync) return

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      const data = response.notification.request.content.data as Record<string, unknown>
      handleNotificationResponse(data, response.actionIdentifier, session, pendingRouteRef)
    })
  }, [session])

  return children
}
