import type { ReactNode } from "react"
import { useEffect } from "react"
import { useLocalSearchParams, usePathname, useRouter } from "expo-router"
import { resolveGuestNativeRouteFromWebPath } from "../../constants/guest-nav"
import { PortalShellProvider } from "../../context/PortalShellContext"
import { GuestShellProvider } from "../../context/GuestShellContext"
import { useThemedNative } from "../../context/AppearanceProvider"
import type { GuestSession } from "../../lib/session"
import { AppShellFrame } from "../shell/AppShellFrame"
import { PortalProfileMenu } from "../shell/PortalProfileMenu"
import { PortalNotificationShellSync } from "../shell/PortalNotificationShellSync"
import { PortalNotificationsSheet } from "../shell/NotificationsSheetHost"
import { GuestDrawer } from "./GuestDrawer"
import { GuestTopBar } from "./GuestTopBar"

type Props = {
  session: GuestSession
  children: ReactNode
}

function GuestAppShellInner({ session, children }: Props) {
  const native = useThemedNative()
  const pathname = usePathname()
  const router = useRouter()
  const { path: webPathParam } = useLocalSearchParams<{ path?: string }>()
  const immersive = /^\/messages\//.test(pathname)

  useEffect(() => {
    if (pathname !== "/web") return
    const webPath = typeof webPathParam === "string" ? webPathParam : "/student/dashboard-v2"
    router.replace(resolveGuestNativeRouteFromWebPath(webPath) as never)
  }, [pathname, webPathParam, router])

  return (
    <AppShellFrame
      backgroundColor={native.groupedBackground}
      immersive={immersive}
      topBar={<GuestTopBar session={session} />}
      overlays={
        <>
          <GuestDrawer session={session} />
          <PortalProfileMenu session={session} />
          <PortalNotificationsSheet session={session} />
          <PortalNotificationShellSync session={session} />
        </>
      }
    >
      {children}
    </AppShellFrame>
  )
}

export function GuestAppShell({ session, children }: Props) {
  return (
    <PortalShellProvider>
      <GuestShellProvider>
        <GuestAppShellInner session={session}>{children}</GuestAppShellInner>
      </GuestShellProvider>
    </PortalShellProvider>
  )
}
