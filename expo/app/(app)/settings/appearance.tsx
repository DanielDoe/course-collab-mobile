import { Redirect } from "expo-router"
import { AppearanceSettingsScreen } from "../../../src/components/settings/AppearanceSettingsScreen"
import { useSession } from "../../../src/context/SessionProvider"

export default function AppearanceSettingsRoute() {
  const { session } = useSession()
  if (session?.portal === "guest") {
    return <Redirect href="/settings" />
  }
  return <AppearanceSettingsScreen />
}
