import type { ReactNode } from "react"
import { useEffect, useMemo } from "react"
import { useLocalSearchParams, usePathname, useRouter, useSegments } from "expo-router"
import { isImmersiveStudentAppPath, resolveStudentNativeRouteFromWebPath } from "../../constants/student-nav"
import { normalizeRoutePathname } from "../../lib/navigation-reset"
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

function isImmersiveRoute(pathname: string, webPath?: string, segments: string[] = []) {
  if (segments.includes("assessment") || segments.includes("results") || segments.includes("take")) {
    return true
  }
  return isImmersiveStudentAppPath(pathname, webPath)
}

function StudentAppShellInner({ session, children }: Props) {
  const pathname = usePathname()
  const segments = useSegments()
  const routePath = useMemo(() => normalizeRoutePathname(pathname), [pathname])
  const router = useRouter()
  const { path: webPathParam } = useLocalSearchParams<{ path?: string }>()
  const { refreshStudentData, drawerOpen, openDrawer, closeDrawer } = useStudentShell()
  const webPath =
    typeof webPathParam === "string"
      ? decodeURIComponent(webPathParam)
      : "/student/dashboard-v2"
  const immersive = isImmersiveRoute(routePath, webPath, [...segments])
  const native = useThemedNative()
  useStudentShellRefresh(session)
  usePurchaseReturnRefresh()

  useEffect(() => {
    if (routePath !== "/web") return
    const nativeRoute = resolveStudentNativeRouteFromWebPath(webPath)
    if (nativeRoute) router.replace(nativeRoute as never)
  }, [routePath, webPath, router])

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
