import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipWebFlowScreen } from "../../../src/components/support/MembershipWebFlowScreen"
import { FacultyMembershipWebFlowScreen } from "../../../src/components/support/FacultyMembershipWebFlowScreen"
import type { MembershipTier } from "../../../src/types/dashboard"
import type { FacultyMembershipTier } from "../../../src/types/dashboard"

const STUDENT_PLANS = new Set<MembershipTier>(["Explorer", "Trailblazer"])
const FACULTY_PLANS = new Set<FacultyMembershipTier>(["Pro", "Enterprise"])

export default function MembershipCheckoutScreen() {
  const { session } = useSession()
  const { plan, cadence } = useLocalSearchParams<{ plan?: string; cadence?: string }>()

  if (session?.portal === "faculty") {
    const tier =
      typeof plan === "string" && FACULTY_PLANS.has(plan as FacultyMembershipTier)
        ? (plan as FacultyMembershipTier)
        : null
    const billingCadence =
      cadence === "annual" || cadence === "semester" ? cadence : ("semester" as const)
    if (!tier) return <Redirect href="/membership" />
    return <FacultyMembershipWebFlowScreen flow="checkout" plan={tier} cadence={billingCadence} />
  }

  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }

  const tier =
    typeof plan === "string" && STUDENT_PLANS.has(plan as MembershipTier)
      ? (plan as MembershipTier)
      : null
  if (!tier) return <Redirect href="/membership" />
  return <MembershipWebFlowScreen flow="checkout" plan={tier} />
}
