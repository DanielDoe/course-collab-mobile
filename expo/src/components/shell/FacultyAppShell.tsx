import type { ReactNode } from "react"
import { usePathname } from "expo-router"
import { FacultyShellProvider } from "../../context/FacultyShellContext"
import { FacultyModuleHeaderProvider } from "../../context/FacultyModuleHeaderContext"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyShellRefresh } from "../../hooks/useFacultyShellRefresh"
import { useFacultyShell } from "../../context/FacultyShellContext"
import type { FacultySession } from "../../lib/session"
import { NotificationShellSync } from "./NotificationShellSync"
import { AppShellFrame } from "./AppShellFrame"
import { FacultyCoursePicker } from "./FacultyCoursePicker"
import { FacultyDrawer } from "./FacultyDrawer"
import { FacultyNotificationsSheet } from "./FacultyNotificationsSheet"
import { FacultyProfileMenu } from "./FacultyProfileMenu"
import { FacultyTopBar } from "./FacultyTopBar"
import { FACULTY_CORA_ROUTE } from "../../constants/faculty-nav"

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
  const { refreshFacultyData } = useFacultyShell()
  const immersive =
    pathname === FACULTY_CORA_ROUTE ||
    pathname.startsWith(`${FACULTY_CORA_ROUTE}/`) ||
    pathname.includes("/faculty/lecture/") ||
    /^\/messages\//.test(pathname) ||
    /^\/membership/.test(pathname)
  const native = useThemedNative()
  useFacultyShellRefresh(session)

  return (
    <AppShellFrame
      backgroundColor={native.groupedBackground}
      immersive={immersive}
      topBar={<FacultyTopBar session={session} />}
      overlays={
        <>
          <FacultyDrawer session={session} />
          <FacultyProfileMenu session={session} />
          <FacultyNotificationsSheet session={session} />
          <FacultyCoursePicker session={session} />
          <NotificationShellSync
            onRefresh={() => refreshFacultyData?.(undefined, { force: true }) ?? Promise.resolve()}
          />
        </>
      }
    >
      {children}
    </AppShellFrame>
  )
}

export function FacultyAppShell({ session, children }: Props) {
  return (
    <FacultyShellScope>
      <FacultyAppShellChrome session={session}>{children}</FacultyAppShellChrome>
    </FacultyShellScope>
  )
}
