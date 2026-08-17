import { GlassMenuRow } from "../theme/GlassActionSheetMenu"
import { useGuestEntitlements } from "../../context/GuestEntitlementsProvider"
import { guestCoraCommerceEnabled } from "../../constants/guest-nav"
import { GUEST_CORA_CAREER_CHECKOUT_ROUTE } from "../../lib/guest-checkout-paths"

type Props = {
  onNavigate: (route: string) => void
}

export function GuestProfileMenuRows({ onNavigate }: Props) {
  const { entitlements } = useGuestEntitlements()
  const credits = entitlements.coraCredits.available
  const creditsDetail = entitlements.coraCredits.isLow
    ? `${credits.toLocaleString()} · Low balance`
    : `${credits.toLocaleString()} available`

  return (
    <>
      <GlassMenuRow
        icon="mail-outline"
        label="Messages"
        onPress={() => onNavigate("/module/messages")}
        showSeparator
      />
      {guestCoraCommerceEnabled(entitlements) ? (
        <>
          <GlassMenuRow
            icon="wallet-outline"
            label="Cora Credits"
            detail={creditsDetail}
            onPress={() => onNavigate("/module/cora-credits")}
            showSeparator
          />
          {entitlements.nav.career !== false || entitlements.plan === "cora_career" ? (
            <GlassMenuRow
              icon="chatbubbles-outline"
              label="Cora Career Assistant"
              onPress={() => onNavigate("/module/cora-assistant")}
              showSeparator
            />
          ) : null}
          {entitlements.plan === "guest_free" ? (
            <GlassMenuRow
              icon="ribbon-outline"
              label="Get Cora Career"
              detail="Lifetime unlock"
              onPress={() => onNavigate(GUEST_CORA_CAREER_CHECKOUT_ROUTE)}
              showSeparator
            />
          ) : null}
        </>
      ) : null}
    </>
  )
}
