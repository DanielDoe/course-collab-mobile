import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { formatCoraCreditsLabel } from "../../lib/cora/credits/economy"
import type { CoraBalance } from "../../lib/cora/credits/types"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  balance: CoraBalance | null
  /** Default: /membership (usage + packs live on Plans). */
  href?: string
  onPress?: () => void
}

export function CoraCreditBalanceBadge({ balance, href = "/membership", onPress }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  if (!balance) return null

  const isLite = balance.coraMode === "lite"
  const isLow = balance.isLow && !isLite
  const label = formatCoraCreditsLabel(balance.credits, balance.coraMode)

  const tone = isLite
    ? { bg: hexToRgba("#F59E0B", 0.12), border: hexToRgba("#F59E0B", 0.35), text: "#B45309" }
    : isLow
      ? { bg: hexToRgba("#F97316", 0.12), border: hexToRgba("#F97316", 0.35), text: "#C2410C" }
      : { bg: hexToRgba(SN.accent, 0.1), border: native.separator, text: native.secondaryLabel }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cora credits: ${label}`}
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
