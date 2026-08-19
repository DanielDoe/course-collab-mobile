import { ActivityIndicator, View } from "react-native"
import { CoraPrivacySettingsScreen } from "../../../src/components/settings/CoraPrivacySettingsScreen"
import { useSession } from "../../../src/context/SessionProvider"
import { isLearnerPortal, type GuestSession, type StudentSession, type SummerSession } from "../../../src/lib/session"
import { Redirect } from "expo-router"

export default function CoraPrivacyRoute() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (session && isLearnerPortal(session.portal)) {
    return (
      <CoraPrivacySettingsScreen
        session={session as StudentSession | GuestSession | SummerSession}
      />
    )
  }

  return <Redirect href="/settings/privacy-security" />
}
