import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipCancelScreen } from "../../../src/components/support/MembershipCancelScreen"
import { FacultyMembershipCancelScreen } from "../../../src/components/support/FacultyMembershipCancelScreen"
import type { FacultyMembershipTier, MembershipTier } from "../../../src/types/dashboard"

export default function MembershipCancelRoute() {
  const { session } = useSession()
  const { plan } = useLocalSearchParams<{ plan?: string }>()

  if (session?.portal === "faculty") {
    const facultyPlan =
      plan === "Free" || plan === "Pro" || plan === "Enterprise"
        ? (plan as FacultyMembershipTier)
        : undefined
    return <FacultyMembershipCancelScreen plan={facultyPlan} />
  }

  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }

  return (
    <MembershipCancelScreen
      plan={
        plan === "Explorer" || plan === "Trailblazer"
          ? (plan as MembershipTier)
          : undefined
      }
    />
  )
}
