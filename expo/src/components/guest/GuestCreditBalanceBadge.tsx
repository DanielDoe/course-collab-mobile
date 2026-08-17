import { Pressable, StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useGuestEntitlements } from "../../context/GuestEntitlementsProvider"
import { guestCoraCommerceEnabled } from "../../constants/guest-nav"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  href?: string
  onPress?: () => void
}

export function GuestCreditBalanceBadge({ href = "/module/cora-credits", onPress }: Props) {
  const router = useRouter()
  const { entitlements } = useGuestEntitlements()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  if (!guestCoraCommerceEnabled(entitlements)) {
    return null
  }

  const credits = entitlements.coraCredits.available
  const isLow = entitlements.coraCredits.isLow
  const label = `${credits.toLocaleString()} credits`

  const tone = isLow
    ? { bg: hexToRgba("#F97316", 0.12), border: hexToRgba("#F97316", 0.35), text: "#C2410C" }
    : { bg: hexToRgba(tokens.accent, 0.1), border: native.separator, text: native.secondaryLabel }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cora credits: ${credits.toLocaleString()}`}
      onPress={() => {
        if (onPress) onPress()
        else router.push(href as never)
      }}
      style={({ pressed }) => [
        styles.badge,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
    >
      <Ionicons name="flash-outline" size={14} color={tone.text} />
      <Text style={[type.caption, styles.label, { color: tone.text }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontWeight: "600", fontSize: 12 },
})
