import { useCallback, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { WebModuleScreen } from "../modules/WebModuleScreen"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import {
  buildMembershipCancelWebPath,
  buildMembershipCheckoutWebPath,
  buildMembershipManageWebPath,
  buildMembershipSuccessWebPath,
} from "../../lib/membership-web-paths"
import {
  membershipFlowTitle,
  parseMembershipWebPath,
  tryHandleMembershipFlowExitNavigation,
  type MembershipWebFlow,
} from "../../lib/membership-navigation"
import type { MembershipTier } from "../../types/dashboard"

type Props = {
  flow: MembershipWebFlow
  plan?: MembershipTier
  sessionId?: string
}

export function MembershipWebFlowScreen({ flow, plan, sessionId }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const { refreshStudentData } = useStudentShell()

  const webPath = useMemo(() => {
    switch (flow) {
      case "checkout":
        return buildMembershipCheckoutWebPath(plan ?? "Explorer")
      case "success":
        return buildMembershipSuccessWebPath({
          sessionId,
          plan,
        })
      case "manage":
        return buildMembershipManageWebPath()
      case "cancel":
        return buildMembershipCancelWebPath(plan)
      default:
        return buildMembershipManageWebPath()
    }
  }, [flow, plan, sessionId])

  const onMembershipNavigation = useCallback(
    (url: string) => {
      const parsed = parseMembershipWebPath(url)
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
      tryHandleMembershipFlowExitNavigation(router, url, refreshStudentData)
    },
    [flow, refreshStudentData, router],
  )

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={membershipFlowTitle(flow)} fallbackHref="/membership" />
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
