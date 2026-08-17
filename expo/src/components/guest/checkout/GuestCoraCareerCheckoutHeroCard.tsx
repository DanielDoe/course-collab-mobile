import { StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import type { AppThemeTokens } from "../../../constants/app-themes"
import type { GuestCoraCareerCheckoutHeroCopy } from "../../../lib/guest-cora-career-checkout-hero-copy"
import {
  guestCareerCheckoutHeroColors,
  type GuestCareerCheckoutTheme,
} from "../../../lib/guest-cora-career-checkout-theme"

type Props = {
  theme: GuestCareerCheckoutTheme
  copy: GuestCoraCareerCheckoutHeroCopy
  tierLabel: string
  priceLabel: string
  tokens: AppThemeTokens
}

export function GuestCoraCareerCheckoutHeroCard({
  theme,
  copy,
  tierLabel,
  priceLabel,
  tokens,
}: Props) {
  const colors = guestCareerCheckoutHeroColors(theme, tokens)

  return (
    <View style={[styles.card, tokens.cardShadow, { borderColor: colors.border }]}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={[styles.glowPrimary, { backgroundColor: theme.glowPrimary }]} />
      <View pointerEvents="none" style={[styles.glowSecondary, { backgroundColor: theme.glowSecondary }]} />
      <View pointerEvents="none" style={[styles.ringOuter, { borderColor: theme.ringOuter }]} />
      <View pointerEvents="none" style={[styles.ringInner, { borderColor: theme.ringInner }]} />

      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <View style={[styles.iconChip, { backgroundColor: colors.iconChipBg }]}>
            <Ionicons name={copy.badgeIcon} size={14} color={colors.iconChipColor} />
          </View>
          <Text style={[styles.tierLabel, { color: colors.tierLabel }]}>{tierLabel}</Text>
          <Ionicons name="sparkles-outline" size={12} color={colors.sparkleColor} style={styles.sparkle} />
        </View>

        <Text style={[styles.headline, { color: colors.headline }]}>
          {copy.headlineLine1}
          {"\n"}
          <Text style={{ color: colors.headlineAccent }}>{copy.headlineAccent}</Text>
        </Text>

        <Text style={[styles.description, { color: colors.body }]}>{copy.description}</Text>

        <View style={styles.priceRow}>
          <Text style={[styles.priceAmount, { color: colors.price }]}>{priceLabel}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.checkColor} />
          <Text style={[styles.metaText, { color: colors.meta }]}>{copy.paymentNote}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  glowPrimary: {
    position: "absolute",
    top: -56,
    right: -48,
    width: 148,
    height: 148,
    borderRadius: 74,
    opacity: 0.85,
  },
  glowSecondary: {
    position: "absolute",
    bottom: -36,
    left: -28,
    width: 112,
    height: 112,
    borderRadius: 56,
    opacity: 0.75,
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
