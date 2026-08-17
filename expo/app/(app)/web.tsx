import { useContext } from "react"
import { Redirect, useLocalSearchParams } from "expo-router"
import { WebModuleScreen } from "../../src/components/modules/WebModuleScreen"
import { resolveGuestNativeRouteFromWebPath } from "../../src/constants/guest-nav"
import {
  resolveStudentNativeRouteFromWebPath,
  isImmersiveStudentWebPath,
} from "../../src/constants/student-nav"
import { parseMembershipWebPath } from "../../src/lib/membership-navigation"
import { getFacultyNavLabel } from "../../src/constants/faculty-nav"
import { resolveFacultyNativeRouteFromWebPath } from "../../src/lib/faculty-web-native-routes"
import { getNavLabel } from "../../src/constants/student-nav"
import { parseAssessmentResultsWebPath } from "../../src/components/assessments/assessment-navigation"
import { FacultyShellContext } from "../../src/context/FacultyShellContext"
import { useSession } from "../../src/context/SessionProvider"
import { isWebChangePasswordUrl } from "../../src/lib/navigation-reset"

export default function WebScreen() {
  const { session } = useSession()
  const facultyShell = useContext(FacultyShellContext)
  const { path } = useLocalSearchParams<{ path: string }>()
  const defaultWebPath =
    session?.portal === "faculty"
      ? "/faculty/dashboard"
      : session?.portal === "summer"
        ? "/summer/dashboard-v2"
        : "/student/dashboard-v2"
  const webPath = typeof path === "string" ? decodeURIComponent(path) : defaultWebPath
  const title =
    session?.portal === "faculty"
      ? getFacultyNavLabel(webPath.replace("/faculty/dashboard", "") || "/dashboard")
      : getNavLabel(webPath.replace("/student/dashboard-v2", "") || "/dashboard")

  if (isWebChangePasswordUrl(webPath)) {
    return <Redirect href="/(auth)/change-password" />
  }

  if (session?.portal === "guest") {
    return <Redirect href={resolveGuestNativeRouteFromWebPath(webPath) as never} />
  }

  if (session?.portal === "faculty") {
    const facultyNative = resolveFacultyNativeRouteFromWebPath(webPath)
    if (facultyNative) {
      return <Redirect href={facultyNative as never} />
    }
  }

  if (session?.portal === "student") {
    const results = parseAssessmentResultsWebPath(webPath)
    if (results) {
      return (
        <Redirect
          href={{
            pathname: "/assessment/report/[attemptId]",
            params: {
              attemptId: String(results.attemptId),
              ...(results.assessmentType ? { type: results.assessmentType } : {}),
            },
          } as never}
        />
      )
    }

    const nativeRoute = resolveStudentNativeRouteFromWebPath(webPath)
    if (nativeRoute) {
      return <Redirect href={nativeRoute as never} />
    }

    const membershipPath = parseMembershipWebPath(webPath)
    if (membershipPath) {
      if (membershipPath.flow === "checkout" && membershipPath.plan) {
        return (
          <Redirect
            href={{
              pathname: "/membership/checkout",
              params: { plan: membershipPath.plan },
            } as never}
          />
        )
      }
      if (membershipPath.flow === "success") {
        return (
          <Redirect
            href={{
              pathname: "/membership/success",
              params: {
                ...(membershipPath.sessionId ? { session_id: membershipPath.sessionId } : {}),
                ...(membershipPath.plan ? { plan: membershipPath.plan } : {}),
              },
            } as never}
          />
        )
      }
      if (membershipPath.flow === "manage") {
        return <Redirect href={"/membership/manage" as never} />
      }
      if (membershipPath.flow === "cancel") {
        return (
          <Redirect
            href={{
              pathname: "/membership/cancel",
              params: membershipPath.plan ? { plan: membershipPath.plan } : {},
            } as never}
          />
        )
      }
    }

    const immersiveWeb = isImmersiveStudentWebPath(webPath)
    return (
      <WebModuleScreen
        webPath={webPath}
        title={title}
        facultyCourse={facultyShell?.selectedCourse ?? null}
        immersive={immersiveWeb}
        insetTop={!immersiveWeb}
        immersiveLecture={immersiveWeb}
        membershipFlow={Boolean(membershipPath)}
      />
    )
  }

  if (session?.portal === "summer") {
    return <WebModuleScreen webPath={webPath} summerPortal immersive />
  }

  return (
    <WebModuleScreen
      webPath={webPath}
      title={title}
      facultyCourse={facultyShell?.selectedCourse ?? null}
    />
  )
}
