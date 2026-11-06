import type { ReactNode } from "react"
import { useEffect } from "react"
import { useLocalSearchParams, usePathname, useRouter } from "expo-router"
import { resolveGuestNativeRouteFromWebPath } from "../../constants/guest-nav"
import { GuestEntitlementsProvider } from "../../context/GuestEntitlementsProvider"
import { PortalShellProvider } from "../../context/PortalShellContext"
import { GuestShellProvider } from "../../context/GuestShellContext"
import { useThemedNative } from "../../context/AppearanceProvider"
import type { GuestSession } from "../../lib/session"
import { AppShellFrame } from "../shell/AppShellFrame"
import { PortalProfileMenu } from "../shell/PortalProfileMenu"
import { PortalNotificationShellSync } from "../shell/PortalNotificationShellSync"
import { PortalNotificationsSheet } from "../shell/NotificationsSheetHost"
import { useGuestCheckoutReturnRefresh } from "../../lib/use-guest-checkout-return"
import { GuestDrawer } from "./GuestDrawer"
import { GuestTopBar } from "./GuestTopBar"
import { ShellDrawerMotionProvider } from "../navigation/ShellDrawerMotionProvider"
import { useGuestShell } from "../../context/GuestShellContext"

type Props = {
  session: GuestSession
  children: ReactNode
}

function GuestAppShellInner({ session, children }: Props) {
  const native = useThemedNative()
  const pathname = usePathname()
  const router = useRouter()
  const { path: webPathParam } = useLocalSearchParams<{ path?: string }>()
  useGuestCheckoutReturnRefresh(session)
  const { drawerOpen, openDrawer, closeDrawer } = useGuestShell()
  const immersive =
    /^\/messages\//.test(pathname) ||
    /^\/recommendation\//.test(pathname) ||
    /^\/module\/cora-/.test(pathname) ||
    /^\/membership/.test(pathname) ||
    /^\/guest\/cora-career/.test(pathname) ||
    /^\/guest\/cora-credits/.test(pathname) ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")

  useEffect(() => {
    if (pathname !== "/web") return
    const webPath = typeof webPathParam === "string" ? webPathParam : "/student/dashboard-v2"
    router.replace(resolveGuestNativeRouteFromWebPath(webPath) as never)
  }, [pathname, webPathParam, router])

  return (
    <ShellDrawerMotionProvider
      drawerOpen={drawerOpen}
      openDrawer={openDrawer}
      closeDrawer={closeDrawer}
    >
      <AppShellFrame
        backgroundColor={native.groupedBackground}
        immersive={immersive}
        topBar={<GuestTopBar session={session} />}
        drawerEdge={{ portal: "guest", immersive, drawerOpen }}
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
    </ShellDrawerMotionProvider>
  )
}

export function GuestAppShell({ session, children }: Props) {
  return (
    <PortalShellProvider>
      <GuestShellProvider>
        <GuestEntitlementsProvider session={session}>
          <GuestAppShellInner session={session}>{children}</GuestAppShellInner>
        </GuestEntitlementsProvider>
      </GuestShellProvider>
    </PortalShellProvider>
  )
}
