import { Redirect } from "expo-router"
import { useSession } from "../../../../src/context/SessionProvider"
import { GuestCoraCareerCheckoutScreen } from "../../../../src/components/guest/checkout/GuestCoraCareerCheckoutScreen"

export default function GuestCoraCareerCheckoutRoute() {
  const { session } = useSession()
  if (session?.portal !== "guest") return <Redirect href="/dashboard" />
  return <GuestCoraCareerCheckoutScreen />
}
