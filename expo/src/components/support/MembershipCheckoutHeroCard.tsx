import { StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AppThemeTokens } from "../../constants/app-themes"
import type { MembershipCheckoutHeroCopy } from "../../lib/membership-checkout-hero-copy"
import {
  membershipCheckoutHeroTheme,
  type CheckoutHeroPalette,
} from "../../lib/membership-checkout-hero-theme"

type Props = {
  plan: CheckoutHeroPalette
  copy: MembershipCheckoutHeroCopy
  tierLabel: string
  priceLabel: string
  priceSuffix?: string
  tokens: AppThemeTokens
}

export function MembershipCheckoutHeroCard({
  plan,
  copy,
  tierLabel,
  priceLabel,
  priceSuffix = "/ semester",
  tokens,
}: Props) {
  const theme = membershipCheckoutHeroTheme(plan, tokens)

  return (
    <View style={[styles.card, tokens.cardShadow, { borderColor: theme.border }]}>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={[styles.glow, { backgroundColor: theme.glow }]} />
      <View pointerEvents="none" style={[styles.ringOuter, { borderColor: theme.ringOuter }]} />
      <View pointerEvents="none" style={[styles.ringInner, { borderColor: theme.ringInner }]} />

      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <View style={[styles.iconChip, { backgroundColor: theme.iconChipBg }]}>
            <Ionicons name={copy.badgeIcon} size={14} color={theme.iconChipColor} />
          </View>
          <Text style={[styles.tierLabel, { color: theme.tierLabel }]}>{tierLabel}</Text>
          <Ionicons
            name="sparkles-outline"
            size={12}
            color={theme.sparkleColor}
            style={styles.sparkle}
          />
        </View>

        <Text style={[styles.headline, { color: theme.headline }]}>
          {copy.headlineLine1}
          {"\n"}
          <Text style={{ color: theme.headlineAccent }}>{copy.headlineAccent}</Text>
        </Text>

        <Text style={[styles.description, { color: theme.body }]}>{copy.description}</Text>

        <View style={styles.priceRow}>
          <Text style={[styles.priceAmount, { color: theme.price }]}>{priceLabel}</Text>
          {priceSuffix ? (
            <Text style={[styles.priceSuffix, { color: theme.priceSuffix }]}>{priceSuffix}</Text>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="checkmark-circle" size={14} color={theme.checkColor} />
          <Text style={[styles.metaText, { color: theme.meta }]}>{copy.paymentNote}</Text>
        </View>
      </View>
    </View>
  )
}

export { membershipCheckoutHeroTheme } from "../../lib/membership-checkout-hero-theme"

const CARD_RADIUS = 22

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  glow: {
    position: "absolute",
    top: -56,
    right: -56,
    width: 148,
    height: 148,
    borderRadius: 74,
    opacity: 0.8,
  },
  ringOuter: {
    position: "absolute",
    top: 22,
    right: 18,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
  },
  ringInner: {
    position: "absolute",
    top: 34,
    right: 30,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    zIndex: 1,
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  sparkle: {
    marginLeft: "auto",
    opacity: 0.85,
  },
  headline: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 28,
    letterSpacing: -0.4,
    maxWidth: 260,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 280,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    marginTop: 4,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  priceSuffix: {
    fontSize: 13,
    fontWeight: "500",
    paddingBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
})
