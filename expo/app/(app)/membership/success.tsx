import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipSuccessScreen } from "../../../src/components/support/MembershipSuccessScreen"
import { FacultyMembershipSuccessScreen } from "../../../src/components/support/FacultyMembershipSuccessScreen"
import type { FacultyMembershipTier, MembershipTier } from "../../../src/types/dashboard"

export default function MembershipSuccessRoute() {
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
      <FacultyMembershipSuccessScreen
        sessionId={typeof session_id === "string" ? session_id : undefined}
        plan={facultyPlan}
      />
    )
  }

  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }

  return (
    <MembershipSuccessScreen
      sessionId={typeof session_id === "string" ? session_id : undefined}
      plan={
        plan === "Explorer" || plan === "Trailblazer" || plan === "Scholar"
          ? (plan as MembershipTier)
          : undefined
      }
    />
  )
}
