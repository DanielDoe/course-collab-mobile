import type { ReactNode } from "react"
import { PortalShellProvider } from "../../context/PortalShellContext"
import type { PortalSession } from "../../lib/portal-shell-utils"
import { AppShellFrame } from "./AppShellFrame"
import { PortalProfileMenu } from "./PortalProfileMenu"
import { PortalTopBar } from "./PortalTopBar"
import { BRAND } from "../../constants"

type Props = {
  session: PortalSession
  children: ReactNode
}

function PortalAppShellInner({ session, children }: Props) {
  return (
    <AppShellFrame
      backgroundColor={BRAND.bg}
      immersive={false}
      topBar={<PortalTopBar session={session} />}
      overlays={<PortalProfileMenu session={session} />}
    >
      {children}
    </AppShellFrame>
  )
}

export function PortalAppShell({ session, children }: Props) {
  return (
    <PortalShellProvider>
      <PortalAppShellInner session={session}>{children}</PortalAppShellInner>
    </PortalShellProvider>
  )
}
