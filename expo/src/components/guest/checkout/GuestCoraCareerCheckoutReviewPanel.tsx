import { useMemo } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AppThemeTokens } from "../../../constants/app-themes"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { ModuleSection } from "../../modules/ModuleScreen"
import { GUEST_CORA_CAREER_CHECKOUT_HERO_COPY } from "../../../lib/guest-cora-career-checkout-hero-copy"
import { resolveGuestCareerCheckoutTheme } from "../../../lib/guest-cora-career-checkout-theme"
import { GuestCoraCareerCheckoutHeroCard } from "./GuestCoraCareerCheckoutHeroCard"

type Props = {
  tierLabel: string
  priceLabel: string
  perks: string[]
  tokens: AppThemeTokens
  onNotNow: () => void
  onContinue: () => void
  continueLoading?: boolean
}

export function GuestCoraCareerCheckoutReviewPanel({
  tierLabel,
  priceLabel,
  perks,
  tokens,
  onNotNow,
  onContinue,
  continueLoading = false,
}: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  const copy = GUEST_CORA_CAREER_CHECKOUT_HERO_COPY
  const careerTheme = useMemo(() => resolveGuestCareerCheckoutTheme(tokens), [tokens])

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.duration(380).springify().damping(18)}>
        <GuestCoraCareerCheckoutHeroCard
          theme={careerTheme}
          copy={copy}
          tierLabel={tierLabel.toUpperCase()}
          priceLabel={priceLabel}
          tokens={tokens}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(340)}>
        <ModuleSection title="What you get">
          {perks.map((perk) => (
            <View key={perk} style={[styles.perkRow, { borderBottomColor: native.separator }]}>
              <View style={[styles.perkIcon, { backgroundColor: careerTheme.perkIconBg }]}>
                <Ionicons name="checkmark" size={14} color={careerTheme.perkIconColor} />
              </View>
              <Text style={[type.body, styles.perkText, { color: tokens.text }]}>{perk}</Text>
            </View>
          ))}
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
              backgroundColor: careerTheme.cta,
              opacity: continueLoading ? 0.7 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {continueLoading ? (
            <ActivityIndicator color={careerTheme.ctaText} />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color={careerTheme.ctaText} />
              <Text style={[styles.primaryBtnText, { color: careerTheme.ctaText }]}>
                Continue to secure checkout
              </Text>
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
              borderColor: careerTheme.secondaryBorder,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: careerTheme.secondaryText }]}>Not now</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 4, paddingBottom: 32 },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: NATIVE.pagePadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  perkIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  perkText: { flex: 1, lineHeight: 21 },
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
  primaryBtnText: { fontSize: 16, fontWeight: "600" },
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
