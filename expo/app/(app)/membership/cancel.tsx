import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipWebFlowScreen } from "../../../src/components/support/MembershipWebFlowScreen"
import { FacultyMembershipWebFlowScreen } from "../../../src/components/support/FacultyMembershipWebFlowScreen"
import type { FacultyMembershipTier, MembershipTier } from "../../../src/types/dashboard"

export default function MembershipCancelScreen() {
  const { session } = useSession()
  const { plan } = useLocalSearchParams<{ plan?: string }>()

  if (session?.portal === "faculty") {
    const facultyPlan =
      plan === "Free" || plan === "Pro" || plan === "Enterprise"
        ? (plan as FacultyMembershipTier)
        : undefined
    return <FacultyMembershipWebFlowScreen flow="cancel" plan={facultyPlan} />
  }

  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }

  return (
    <MembershipWebFlowScreen
      flow="cancel"
      plan={
        plan === "Explorer" || plan === "Trailblazer"
          ? (plan as MembershipTier)
          : undefined
      }
    />
  )
}
