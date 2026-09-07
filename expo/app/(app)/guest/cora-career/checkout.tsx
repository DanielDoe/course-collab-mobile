import { Platform } from "react-native"
import { Redirect } from "expo-router"
import { useSession } from "../../../../src/context/SessionProvider"
import { GuestCoraCareerCheckoutScreen } from "../../../../src/components/guest/checkout/GuestCoraCareerCheckoutScreen"

export default function GuestCoraCareerCheckoutRoute() {
  const { session } = useSession()

  if (Platform.OS === "ios") {
    return <Redirect href="/module/cora-career" />
  }

  if (session?.portal !== "guest") return <Redirect href="/dashboard" />
  return <GuestCoraCareerCheckoutScreen />
}
