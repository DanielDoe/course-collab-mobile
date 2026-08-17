import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AppThemeTokens } from "../../constants/app-themes"
import { hexToRgba } from "../../constants/app-themes"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  facultyCheckoutHeroCopy,
  facultyCheckoutPaymentNote,
} from "../../lib/faculty-checkout-hero-copy"
import {
  formatFacultyPriceFromCents,
  type FacultyBillingCadence,
  type FacultyMembershipPlan,
} from "../../lib/faculty-membership-plans"
import { ModuleSection } from "../modules/ModuleScreen"
import {
  MembershipCheckoutHeroCard,
  membershipCheckoutHeroTheme,
} from "./MembershipCheckoutHeroCard"

type Props = {
  plan: FacultyMembershipPlan
  priceCents: number
  cadence: FacultyBillingCadence
  tokens: AppThemeTokens
  onNotNow: () => void
  onContinue: () => void
  continueLoading?: boolean
}

export function FacultyMembershipCheckoutReviewPanel({
  plan,
  priceCents,
  cadence,
  tokens,
  onNotNow,
  onContinue,
  continueLoading = false,
}: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  const heroTheme = membershipCheckoutHeroTheme(plan, tokens)
  const copy = {
    ...facultyCheckoutHeroCopy(plan),
    paymentNote: facultyCheckoutPaymentNote(cadence),
  }
  const priceLabel = priceCents > 0 ? formatFacultyPriceFromCents(priceCents) : "Free"
  const priceSuffix = cadence === "annual" ? "/ year" : "/ semester"

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.duration(380).springify().damping(18)}>
        <MembershipCheckoutHeroCard
          plan={plan}
          copy={copy}
          tierLabel={plan.id === "Pro" ? "PRO" : plan.id === "Enterprise" ? "ENTERPRISE" : plan.name.toUpperCase()}
          priceLabel={priceLabel}
          priceSuffix={priceCents > 0 ? priceSuffix : undefined}
          tokens={tokens}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(340)}>
        <ModuleSection title="What you get">
          {plan.perks.map((perk) => (
            <View key={perk} style={[styles.perkRow, { borderBottomColor: native.separator }]}>
              <View style={[styles.perkIcon, { backgroundColor: hexToRgba(plan.accent, tokens.isDark ? 0.2 : 0.12) }]}>
                <Ionicons name="checkmark" size={14} color={plan.accent} />
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
              backgroundColor: heroTheme.secondaryBtnBg,
              borderColor: heroTheme.secondaryBtnBorder,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: heroTheme.secondaryBtnText }]}>Not now</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 4, paddingBottom: 24 },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  perkIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
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
