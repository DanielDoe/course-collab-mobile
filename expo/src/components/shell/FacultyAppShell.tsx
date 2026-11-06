import type { ReactNode } from "react"
import { usePathname } from "expo-router"
import { FacultyShellProvider } from "../../context/FacultyShellContext"
import { FacultyModuleHeaderProvider } from "../../context/FacultyModuleHeaderContext"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyShellRefresh } from "../../hooks/useFacultyShellRefresh"
import { usePurchaseReturnRefresh } from "../../hooks/usePurchaseReturnRefresh"
import { useFacultyShell } from "../../context/FacultyShellContext"
import type { FacultySession } from "../../lib/session"
import { NotificationShellSync } from "./NotificationShellSync"
import { AppShellFrame } from "./AppShellFrame"
import { FacultyCoursePicker } from "./FacultyCoursePicker"
import { FacultyDrawer } from "./FacultyDrawer"
import { FacultyNotificationsSheet } from "./FacultyNotificationsSheet"
import { FacultyProfileMenu } from "./FacultyProfileMenu"
import { FacultyTopBar } from "./FacultyTopBar"
import { FacultyClassReminderSync } from "../faculty/FacultyClassReminderSync"
import { FACULTY_CORA_ROUTE } from "../../constants/faculty-nav"
import { ShellDrawerMotionProvider } from "../navigation/ShellDrawerMotionProvider"

type Props = {
  session: FacultySession
  children: ReactNode
}

/** Shared faculty shell state — always mounted for faculty routes in `(app)`. */
export function FacultyShellScope({ children }: { children: ReactNode }) {
  return (
    <FacultyShellProvider>
      <FacultyModuleHeaderProvider>{children}</FacultyModuleHeaderProvider>
    </FacultyShellProvider>
  )
}

/** Drawer, top bar, course picker, and data refresh — not shown on post-login setup screens. */
export function FacultyAppShellChrome({ session, children }: Props) {
  const pathname = usePathname()
  const { refreshFacultyData, drawerOpen, openDrawer, closeDrawer } = useFacultyShell()
  const immersive =
    pathname === FACULTY_CORA_ROUTE ||
    pathname.startsWith(`${FACULTY_CORA_ROUTE}/`) ||
    pathname.includes("/faculty/lecture/") ||
    /^\/messages\//.test(pathname) ||
    /^\/membership/.test(pathname) ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  const native = useThemedNative()
  useFacultyShellRefresh(session)
  usePurchaseReturnRefresh()

  return (
    <ShellDrawerMotionProvider
      drawerOpen={drawerOpen}
      openDrawer={openDrawer}
      closeDrawer={closeDrawer}
    >
      <AppShellFrame
        backgroundColor={native.groupedBackground}
        immersive={immersive}
        topBar={<FacultyTopBar session={session} />}
        drawerEdge={{ portal: "faculty", immersive, drawerOpen }}
        overlays={
          <>
            <FacultyDrawer session={session} />
            <FacultyProfileMenu session={session} />
            <FacultyNotificationsSheet session={session} />
            <FacultyCoursePicker session={session} />
            <FacultyClassReminderSync />
            <NotificationShellSync
              onRefresh={() => refreshFacultyData?.(undefined, { force: true }) ?? Promise.resolve()}
            />
          </>
        }
      >
        {children}
      </AppShellFrame>
    </ShellDrawerMotionProvider>
  )
}

export function FacultyAppShell({ session, children }: Props) {
  return (
    <FacultyShellScope>
      <FacultyAppShellChrome session={session}>{children}</FacultyAppShellChrome>
    </FacultyShellScope>
  )
}
