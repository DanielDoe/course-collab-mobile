import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AppThemeTokens } from "../../../constants/app-themes"
import { hexToRgba } from "../../../constants/app-themes"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { ModuleSection } from "../../modules/ModuleScreen"
import type { GuestDisplayCreditPack } from "../../../lib/guest-cora-credits-utils"
import { MembershipCheckoutHeroCard } from "../../support/MembershipCheckoutHeroCard"

type Props = {
  pack: GuestDisplayCreditPack
  tokens: AppThemeTokens
  onNotNow: () => void
  onContinue: () => void
  continueLoading?: boolean
}

export function GuestCoraCreditsCheckoutReviewPanel({
  pack,
  tokens,
  onNotNow,
  onContinue,
  continueLoading = false,
}: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  const palette = {
    name: pack.label,
    accent: tokens.accent,
    accentDark: tokens.accentDark,
  }

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.duration(380).springify().damping(18)}>
        <MembershipCheckoutHeroCard
          plan={palette}
          copy={{
            badgeIcon: "flash-outline",
            headlineLine1: "Top up your",
            headlineAccent: "Cora balance.",
            description: pack.description,
            paymentNote: "Credits never expire on lifetime guest plans",
          }}
          tierLabel="CORA CREDITS"
          priceLabel={pack.priceLabel}
          priceSuffix=""
          tokens={tokens}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(340)}>
        <ModuleSection title="Pack details">
          <View style={[styles.detailRow, { borderBottomColor: native.separator }]}>
            <View
              style={[
                styles.detailIcon,
                { backgroundColor: hexToRgba(tokens.accent, tokens.isDark ? 0.2 : 0.12) },
              ]}
            >
              <Ionicons name="flash" size={14} color={tokens.accent} />
            </View>
            <Text style={[type.body, styles.detailText, { color: tokens.text }]}>
              {pack.credits.toLocaleString()} Cora credits
            </Text>
          </View>
          {pack.perThousandLabel ? (
            <View style={[styles.detailRow, { borderBottomColor: native.separator }]}>
              <View
                style={[
                  styles.detailIcon,
                  { backgroundColor: hexToRgba(tokens.accent, tokens.isDark ? 0.2 : 0.12) },
                ]}
              >
                <Ionicons name="pricetag-outline" size={14} color={tokens.accent} />
              </View>
              <Text style={[type.body, styles.detailText, { color: tokens.text }]}>
                {pack.perThousandLabel}
              </Text>
            </View>
          ) : null}
          <View style={[styles.detailRow, { borderBottomColor: native.separator }]}>
            <View
              style={[
                styles.detailIcon,
                { backgroundColor: hexToRgba(tokens.accent, tokens.isDark ? 0.2 : 0.12) },
              ]}
            >
              <Ionicons name="checkmark" size={14} color={tokens.accent} />
            </View>
            <Text style={[type.body, styles.detailText, { color: tokens.text }]}>
              Works across eligible Cora Career tools after purchase
            </Text>
          </View>
        </ModuleSection>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(140).duration(340).springify()} style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          disabled={continueLoading}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: tokens.accent,
              opacity: continueLoading ? 0.7 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {continueLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Continue to secure checkout</Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onNotNow}
          disabled={continueLoading}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              backgroundColor: native.secondaryGrouped,
              borderColor: native.separator,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: tokens.accentDark }]}>Not now</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 4, paddingBottom: 32 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  detailText: { flex: 1, lineHeight: 21 },
  actions: { gap: 10, marginTop: 8 },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
})
