import { Platform } from "react-native"
import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipCheckoutScreen } from "../../../src/components/support/MembershipCheckoutScreen"
import { FacultyMembershipCheckoutScreen } from "../../../src/components/support/FacultyMembershipCheckoutScreen"
import type { MembershipTier } from "../../../src/types/dashboard"
import type { FacultyMembershipTier } from "../../../src/types/dashboard"
import type { FacultyBillingCadence } from "../../../src/lib/faculty-membership-plans"

const STUDENT_PLANS = new Set<MembershipTier>(["Explorer", "Trailblazer"])
const FACULTY_PLANS = new Set<FacultyMembershipTier>(["Pro", "Enterprise"])

export default function MembershipCheckoutRoute() {
  const { session } = useSession()
  const { plan, cadence } = useLocalSearchParams<{ plan?: string; cadence?: string }>()

  if (Platform.OS === "ios") {
    return <Redirect href="/membership" />
  }

  if (session?.portal === "faculty") {
    const tier =
      typeof plan === "string" && FACULTY_PLANS.has(plan as FacultyMembershipTier)
        ? (plan as FacultyMembershipTier)
        : null
    const billingCadence: FacultyBillingCadence =
      cadence === "annual" || cadence === "semester" ? cadence : "semester"
    if (!tier) return <Redirect href="/membership" />
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
  return <MembershipCheckoutScreen plan={tier} />
}
