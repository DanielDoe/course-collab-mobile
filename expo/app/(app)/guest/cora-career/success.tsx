import { Redirect } from "expo-router"
import { useSession } from "../../../../src/context/SessionProvider"
import { GuestCoraCareerSuccessScreen } from "../../../../src/components/guest/checkout/GuestCoraCareerSuccessScreen"

export default function GuestCoraCareerSuccessRoute() {
  const { session } = useSession()
  if (session?.portal !== "guest") return <Redirect href="/dashboard" />
  return <GuestCoraCareerSuccessScreen />
}
