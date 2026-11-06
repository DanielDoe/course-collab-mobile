import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../../lib/themed-module-theme"
import type { GuestEntitlements } from "../../../lib/guest-types"
import { guestCreditsCap, guestCreditsUsedFraction } from "../../../lib/guest-dashboard-utils"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { shouldShowPurchaseCta } from "../../../lib/purchase-navigation"

type Props = {
  entitlements: GuestEntitlements
}

export function GuestDashboardCreditsPanel({ entitlements }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const cap = guestCreditsCap(entitlements)
  const available = entitlements.coraCredits.available
  const usedFraction = guestCreditsUsedFraction(entitlements)
  const planLabel = entitlements.plan === "cora_career" ? "Cora Career" : "Career Member Free"
  const isLow = entitlements.coraCredits.isLow
  const showPurchaseActions = shouldShowPurchaseCta()

  return (
    <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name="flash-outline" size={20} color={tokens.accent} />
        </View>
        <View style={styles.headCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Cora Credits</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{planLabel} · lifetime balance</Text>
        </View>
        {isLow ? (
          <View style={[styles.lowChip, { backgroundColor: semanticSoft(tokens.warning, tokens.isDark, 0.16) }]}>
            <Text style={[type.footnote, { color: tokens.warning, fontWeight: "700" }]}>Low</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.balance, { color: native.label }]}>{available.toLocaleString()}</Text>
      <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 8 }]}>
        of {cap.toLocaleString()} included · briefs are credit-free
      </Text>

      <View style={[styles.track, { backgroundColor: native.fill }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(4, Math.round((1 - usedFraction) * 100))}%`,
              backgroundColor: isLow ? tokens.warning : tokens.accent,
            },
          ]}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}
          onPress={() => router.push("/module/cora-assistant" as never)}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={tokens.accent} />
          <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "700" }]}>Assistant</Text>
        </Pressable>
        {showPurchaseActions ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: native.fill, borderColor: native.separator }]}
            onPress={() => router.push("/module/cora-credits" as never)}
          >
            <Ionicons name="wallet-outline" size={16} color={native.label} />
            <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>Buy credits</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 4,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headCopy: { flex: 1, gap: 2 },
  lowChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  balance: { fontSize: 34, fontWeight: "800", letterSpacing: -0.8, lineHeight: 38 },
  track: { height: 10, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
})
