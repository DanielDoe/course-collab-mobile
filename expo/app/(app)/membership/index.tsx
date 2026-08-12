import { Redirect } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { MembershipModuleScreen } from "../../../src/modules/native-screens"
import { FacultyMembershipScreen } from "../../../src/components/support/FacultyMembershipScreen"

export default function MembershipScreenRoute() {
  const { session } = useSession()
  if (session?.portal === "faculty") {
    return <FacultyMembershipScreen />
  }
  if (session?.portal !== "student") {
    return <Redirect href="/dashboard" />
  }
  return <MembershipModuleScreen />
}
