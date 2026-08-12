import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipWebFlowScreen } from "../../../src/components/support/MembershipWebFlowScreen"
import { FacultyMembershipWebFlowScreen } from "../../../src/components/support/FacultyMembershipWebFlowScreen"
import type { FacultyMembershipTier, MembershipTier } from "../../../src/types/dashboard"

export default function MembershipSuccessScreen() {
  const { session } = useSession()
  const { session_id, plan } = useLocalSearchParams<{
    session_id?: string
    plan?: string
  }>()

  if (session?.portal === "faculty") {
    const facultyPlan =
      plan === "Free" || plan === "Pro" || plan === "Enterprise"
        ? (plan as FacultyMembershipTier)
        : undefined
    return (
      <FacultyMembershipWebFlowScreen
        flow="success"
        sessionId={typeof session_id === "string" ? session_id : undefined}
        plan={facultyPlan}
      />
    )
  }

  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }

  return (
    <MembershipWebFlowScreen
      flow="success"
      sessionId={typeof session_id === "string" ? session_id : undefined}
      plan={
        plan === "Explorer" || plan === "Trailblazer" || plan === "Scholar"
          ? (plan as MembershipTier)
          : undefined
      }
    />
  )
}
