import { Redirect, useLocalSearchParams } from "expo-router"
import { useSession } from "../../../../src/context/SessionProvider"
import { GuestCoraCreditsSuccessScreen } from "../../../../src/components/guest/checkout/GuestCoraCreditsSuccessScreen"

export default function GuestCoraCreditsSuccessRoute() {
  const { session } = useSession()
  const { packId } = useLocalSearchParams<{ packId?: string }>()

  if (session?.portal !== "guest") return <Redirect href="/dashboard" />
  return (
    <GuestCoraCreditsSuccessScreen
      packId={typeof packId === "string" ? packId : undefined}
    />
  )
}
