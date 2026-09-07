import type { ReactNode } from "react"
import { useEffect } from "react"
import { useLocalSearchParams, usePathname, useRouter } from "expo-router"
import { isImmersiveStudentWebPath, resolveStudentNativeRouteFromWebPath } from "../../constants/student-nav"
import { StudentShellProvider } from "../../context/StudentShellContext"
import { StudentActiveCourseProvider } from "../../context/StudentActiveCourseContext"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useStudentShellRefresh } from "../../hooks/useStudentShellRefresh"
import { usePurchaseReturnRefresh } from "../../hooks/usePurchaseReturnRefresh"
import { useStudentShell } from "../../context/StudentShellContext"
import type { StudentSession } from "../../lib/session"
import { studentEnrollmentPickerKey } from "../../lib/student-enrollment"
import { CoraProvider } from "../cora/CoraProvider"
import { StudentCoursePicker } from "./StudentCoursePicker"
import { NotificationShellSync } from "./NotificationShellSync"
import { AppShellFrame } from "./AppShellFrame"
import { StudentDrawer } from "./StudentDrawer"
import { ProfileMenu } from "./ProfileMenu"
import { StudentNotificationsSheet } from "./NotificationsSheetHost"
import { StudentTopBar } from "./StudentTopBar"
import { ShellDrawerMotionProvider } from "../navigation/ShellDrawerMotionProvider"

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
  const { refreshStudentData, drawerOpen, openDrawer, closeDrawer } = useStudentShell()
  const webPath =
    typeof webPathParam === "string"
      ? decodeURIComponent(webPathParam)
      : "/student/dashboard-v2"
  const immersive = isImmersiveRoute(pathname, webPath)
  const native = useThemedNative()
  useStudentShellRefresh(session)
  usePurchaseReturnRefresh()

  useEffect(() => {
    if (pathname !== "/web") return
    const nativeRoute = resolveStudentNativeRouteFromWebPath(webPath)
    if (nativeRoute) router.replace(nativeRoute as never)
  }, [pathname, webPath, router])

  return (
    <ShellDrawerMotionProvider
      drawerOpen={drawerOpen}
      openDrawer={openDrawer}
      closeDrawer={closeDrawer}
    >
      <AppShellFrame
        backgroundColor={native.groupedBackground}
        immersive={immersive}
        topBar={<StudentTopBar session={session} />}
        drawerEdge={{ portal: "student", immersive, drawerOpen }}
        overlays={
          <>
            <StudentDrawer session={session} />
            <ProfileMenu session={session} />
            <StudentNotificationsSheet session={session} />
            <StudentCoursePicker />
            <NotificationShellSync
              onRefresh={() => refreshStudentData?.({ force: true }) ?? Promise.resolve()}
            />
          </>
        }
      >
        {children}
      </AppShellFrame>
    </ShellDrawerMotionProvider>
  )
}

export function StudentAppShell({ session, children }: Props) {
  const coraKey = studentEnrollmentPickerKey(session.courseId ?? 0, session.section)
  return (
    <StudentShellProvider>
      <StudentActiveCourseProvider>
        <CoraProvider key={coraKey}>
          <StudentAppShellInner session={session}>{children}</StudentAppShellInner>
        </CoraProvider>
      </StudentActiveCourseProvider>
    </StudentShellProvider>
  )
}
