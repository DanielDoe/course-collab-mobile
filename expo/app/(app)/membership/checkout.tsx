import { Platform } from "react-native"
import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipCheckoutScreen } from "../../../src/components/support/MembershipCheckoutScreen"
import { FacultyMembershipCheckoutScreen } from "../../../src/components/support/FacultyMembershipCheckoutScreen"
import { IosExternalPurchaseScreen } from "../../../src/components/support/IosExternalPurchaseScreen"
import type { MembershipTier } from "../../../src/types/dashboard"
import type { FacultyMembershipTier } from "../../../src/types/dashboard"
import type { FacultyBillingCadence } from "../../../src/lib/faculty-membership-plans"
import { buildFacultyMembershipCheckoutWebPath } from "../../../src/lib/faculty-membership-web-paths"
import { buildMembershipCheckoutWebPath } from "../../../src/lib/membership-web-paths"

const STUDENT_PLANS = new Set<MembershipTier>(["Explorer", "Trailblazer"])
const FACULTY_PLANS = new Set<FacultyMembershipTier>(["Pro", "Enterprise"])

export default function MembershipCheckoutRoute() {
  const { session } = useSession()
  const { plan, cadence } = useLocalSearchParams<{ plan?: string; cadence?: string }>()

  if (session?.portal === "faculty") {
    const tier =
      typeof plan === "string" && FACULTY_PLANS.has(plan as FacultyMembershipTier)
        ? (plan as FacultyMembershipTier)
        : null
    const billingCadence: FacultyBillingCadence =
      cadence === "annual" || cadence === "semester" ? cadence : "semester"
    if (!tier) return <Redirect href="/membership" />
    if (Platform.OS === "ios") {
      return (
        <IosExternalPurchaseScreen
          title={`Upgrade to ${tier}`}
          webPath={buildFacultyMembershipCheckoutWebPath(tier, billingCadence)}
          fallbackHref="/membership"
        />
      )
    }
    return <FacultyMembershipCheckoutScreen plan={tier} cadence={billingCadence} />
  }

  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }

  const tier =
    typeof plan === "string" && STUDENT_PLANS.has(plan as MembershipTier)
      ? (plan as MembershipTier)
      : null
  if (!tier) return <Redirect href="/membership" />
  if (Platform.OS === "ios") {
    return (
      <IosExternalPurchaseScreen
        title={`Upgrade to ${tier}`}
        webPath={buildMembershipCheckoutWebPath(tier)}
        fallbackHref="/membership"
      />
    )
  }
  return <MembershipCheckoutScreen plan={tier} />
}
