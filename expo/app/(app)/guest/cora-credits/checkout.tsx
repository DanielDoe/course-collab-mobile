import { Platform } from "react-native"
import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../../src/context/SessionProvider"
import { GuestCoraCreditsCheckoutScreen } from "../../../../src/components/guest/checkout/GuestCoraCreditsCheckoutScreen"

export default function GuestCoraCreditsCheckoutRoute() {
  const { session } = useSession()
  const { packId } = useLocalSearchParams<{ packId?: string }>()

  if (Platform.OS === "ios") {
    return <Redirect href="/module/cora-credits" />
  }

  if (session?.portal !== "guest") return <Redirect href="/dashboard" />
  if (typeof packId !== "string" || !packId.trim()) {
    return <Redirect href="/module/cora-credits" />
  }

  return <GuestCoraCreditsCheckoutScreen packId={packId} />
}
