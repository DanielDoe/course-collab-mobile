import { useCallback, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { WebModuleScreen } from "../modules/WebModuleScreen"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyShell } from "../../context/FacultyShellContext"
import {
  buildFacultyMembershipCancelWebPath,
  buildFacultyMembershipCheckoutWebPath,
  buildFacultyMembershipManageWebPath,
  buildFacultyMembershipSuccessWebPath,
} from "../../lib/faculty-membership-web-paths"
import {
  facultyMembershipFlowTitle,
  parseFacultyMembershipWebPath,
  tryHandleFacultyMembershipFlowExitNavigation,
  type FacultyMembershipWebFlow,
} from "../../lib/faculty-membership-navigation"
import type { FacultyMembershipTier } from "../../types/dashboard"
import type { FacultyBillingCadence } from "../../lib/faculty-membership-plans"

type Props = {
  flow: FacultyMembershipWebFlow
  plan?: FacultyMembershipTier
  cadence?: FacultyBillingCadence
  sessionId?: string
}

export function FacultyMembershipWebFlowScreen({ flow, plan, cadence, sessionId }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const { refreshFacultyData } = useFacultyShell()

  const webPath = useMemo(() => {
    switch (flow) {
      case "checkout":
        return buildFacultyMembershipCheckoutWebPath(plan ?? "Pro", cadence ?? "semester")
      case "success":
        return buildFacultyMembershipSuccessWebPath({ sessionId, plan })
      case "manage":
        return buildFacultyMembershipManageWebPath()
      case "cancel":
        return buildFacultyMembershipCancelWebPath(plan)
      default:
        return buildFacultyMembershipManageWebPath()
    }
  }, [flow, plan, cadence, sessionId])

  const onMembershipNavigation = useCallback(
    (url: string) => {
      const parsed = parseFacultyMembershipWebPath(url)
      if (flow === "checkout" && parsed?.flow === "success") {
        router.replace({
          pathname: "/membership/success",
          params: {
            ...(parsed.sessionId ? { session_id: parsed.sessionId } : {}),
            ...(parsed.plan ? { plan: parsed.plan } : {}),
          },
        } as never)
        return
      }
      tryHandleFacultyMembershipFlowExitNavigation(router, url, refreshFacultyData)
    },
    [flow, refreshFacultyData, router],
  )

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={facultyMembershipFlowTitle(flow)} fallbackHref="/membership" />
      <View style={styles.web}>
        <WebModuleScreen
          webPath={webPath}
          immersive
          insetTop={false}
          membershipFlow
          onMembershipNavigation={onMembershipNavigation}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  web: { flex: 1 },
})
