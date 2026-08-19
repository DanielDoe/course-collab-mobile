import { ActivityIndicator, View } from "react-native"
import { Redirect } from "expo-router"
import { CoraPrivacySettingsScreen } from "../../../src/components/settings/CoraPrivacySettingsScreen"
import { useSession } from "../../../src/context/SessionProvider"
import type { CoraPrivacySession } from "../../../src/lib/cora-privacy-api"

function supportsCoraPrivacy(session: NonNullable<ReturnType<typeof useSession>["session"]>): session is CoraPrivacySession {
  return (
    session.portal === "student" ||
    session.portal === "guest" ||
    session.portal === "summer" ||
    session.portal === "faculty" ||
    session.portal === "admin"
  )
}

export default function CoraPrivacyRoute() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (session && supportsCoraPrivacy(session)) {
    return <CoraPrivacySettingsScreen session={session} />
  }

  return <Redirect href="/settings/privacy-security" />
}
