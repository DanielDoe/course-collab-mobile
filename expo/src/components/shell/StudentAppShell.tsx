import type { ReactNode } from "react"
import { useEffect } from "react"
import { useLocalSearchParams, usePathname, useRouter } from "expo-router"
import { isImmersiveStudentWebPath, resolveStudentNativeRouteFromWebPath } from "../../constants/student-nav"
import { StudentShellProvider } from "../../context/StudentShellContext"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useStudentShellRefresh } from "../../hooks/useStudentShellRefresh"
import { useStudentShell } from "../../context/StudentShellContext"
import type { StudentSession } from "../../lib/session"
import { CoraProvider } from "../cora/CoraProvider"
import { NotificationShellSync } from "./NotificationShellSync"
import { AppShellFrame } from "./AppShellFrame"
import { StudentDrawer } from "./StudentDrawer"
import { ProfileMenu } from "./ProfileMenu"
import { StudentNotificationsSheet } from "./NotificationsSheetHost"
import { StudentTopBar } from "./StudentTopBar"

type Props = {
  session: StudentSession
  children: ReactNode
}

function isImmersiveRoute(pathname: string, webPath?: string) {
  if (pathname.includes("/codebench/ide")) return true
  if (/^\/lecture\//.test(pathname)) return true
  if (/^\/assessment\/take\//.test(pathname)) return true
  if (/^\/assessment\/report\//.test(pathname)) return true
  if (/^\/assessment\/[^/]+$/.test(pathname)) return true
  if (/^\/messages\//.test(pathname)) return true
  if (/^\/notes\//.test(pathname)) return true
  if (/^\/notetaker\//.test(pathname)) return true
  if (/^\/collaboration\/playground\//.test(pathname)) return true
  if (/^\/collaboration\/groups\//.test(pathname)) return true
  if (/^\/rewards\/classroom-point\//.test(pathname)) return true
  if (/^\/rewards\/classroom-task\//.test(pathname)) return true
  if (/^\/flashcards\//.test(pathname)) return true
  // Immersive announcement detail — match with or without trailing slash / group prefixes.
  if (/\/announcements\/[^/]+\/?$/.test(pathname)) return true
  if (/^\/practice\//.test(pathname)) return true
  if (/^\/membership/.test(pathname)) return true
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true
  if (pathname === "/module/ai-tutor") return true
  if (pathname.includes("/web") && webPath) return isImmersiveStudentWebPath(webPath)
  return false
}

function StudentAppShellInner({ session, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { path: webPathParam } = useLocalSearchParams<{ path?: string }>()
  const { refreshStudentData } = useStudentShell()
  const webPath =
    typeof webPathParam === "string"
      ? decodeURIComponent(webPathParam)
      : "/student/dashboard-v2"
  const immersive = isImmersiveRoute(pathname, webPath)
  const native = useThemedNative()
  useStudentShellRefresh(session)

  useEffect(() => {
    if (pathname !== "/web") return
    const nativeRoute = resolveStudentNativeRouteFromWebPath(webPath)
    if (nativeRoute) router.replace(nativeRoute as never)
  }, [pathname, webPath, router])

  return (
    <AppShellFrame
      backgroundColor={native.groupedBackground}
      immersive={immersive}
      topBar={<StudentTopBar session={session} />}
      overlays={
        <>
          <StudentDrawer session={session} />
          <ProfileMenu session={session} />
          <StudentNotificationsSheet session={session} />
          <NotificationShellSync
            onRefresh={() => refreshStudentData?.({ force: true }) ?? Promise.resolve()}
          />
        </>
      }
    >
      {children}
    </AppShellFrame>
  )
}

export function StudentAppShell({ session, children }: Props) {
  return (
    <StudentShellProvider>
      <CoraProvider>
        <StudentAppShellInner session={session}>{children}</StudentAppShellInner>
      </CoraProvider>
    </StudentShellProvider>
  )
}
