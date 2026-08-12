import { FacultySettingsHubScreen } from "../../../src/components/faculty/FacultySettingsHubScreen"
import { GuestSettingsScreen } from "../../../src/components/guest/GuestSettingsScreen"
import { useSession } from "../../../src/context/SessionProvider"
import { SettingsModuleScreen } from "../../../src/modules/native-screens"

export default function SettingsScreen() {
  const { session } = useSession()
  if (session?.portal === "faculty") return <FacultySettingsHubScreen />
  if (session?.portal === "guest") return <GuestSettingsScreen />
  return <SettingsModuleScreen />
}
