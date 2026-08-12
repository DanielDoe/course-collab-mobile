import { Redirect } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipBillingScreen } from "../../../src/components/support/MembershipBillingScreen"
import { FacultyMembershipBillingScreen } from "../../../src/components/support/FacultyMembershipBillingScreen"

export default function MembershipManageScreen() {
  const { session } = useSession()
  if (session?.portal === "faculty") {
    return <FacultyMembershipBillingScreen />
  }
  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }
  return <MembershipBillingScreen />
}
