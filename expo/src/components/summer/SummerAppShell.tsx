import type { ReactNode } from "react"
import { usePathname } from "expo-router"
import { PortalShellProvider } from "../../context/PortalShellContext"
import { SummerShellProvider } from "../../context/SummerShellContext"
import { isSummerImmersiveRoute } from "../../constants/summer-nav"
import { useThemedNative } from "../../context/AppearanceProvider"
import type { SummerSession } from "../../lib/session"
import { AppShellFrame } from "../shell/AppShellFrame"
import { PortalProfileMenu } from "../shell/PortalProfileMenu"
import { PortalNotificationShellSync } from "../shell/PortalNotificationShellSync"
import { PortalNotificationsSheet } from "../shell/NotificationsSheetHost"
import { SummerDrawer } from "./SummerDrawer"
import { SummerTopBar } from "./SummerTopBar"

type Props = {
  session: SummerSession
  children: ReactNode
}

function SummerAppShellInner({ session, children }: Props) {
  const pathname = usePathname()
  const native = useThemedNative()
  const immersive = isSummerImmersiveRoute(pathname)

  return (
    <AppShellFrame
      backgroundColor={native.groupedBackground}
      immersive={immersive}
      topBar={<SummerTopBar session={session} />}
      overlays={
        <>
          <SummerDrawer session={session} />
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

export function SummerAppShell({ session, children }: Props) {
  return (
    <PortalShellProvider>
      <SummerShellProvider>
        <SummerAppShellInner session={session}>{children}</SummerAppShellInner>
      </SummerShellProvider>
    </PortalShellProvider>
  )
}
