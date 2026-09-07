import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useGuestEntitlements } from "../../context/GuestEntitlementsProvider"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { ApiError } from "../../lib/api"
import { guestApi } from "../../lib/guest-api"
import { openGuestCoraCareerCheckout } from "../../lib/guest-checkout-paths"
import { buildGuestPlanTiers, type GuestPlanPerk, type GuestPlanPerkTier } from "../../lib/guest-cora-career-perks"
import {
  resolveGuestCareerTheme,
  type GuestCareerTheme,
} from "../../lib/guest-cora-career-checkout-theme"
import type { GuestCareerPlan } from "../../lib/guest-types"
import type { GuestSession } from "../../lib/session"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { GUEST_CORA_CAREER_LIFETIME_CREDITS } from "../../lib/guest-membership-config"
import { GuestSettingsSectionHeader } from "./guest-shared"

export function GuestCoraCareerScreen() {
  const router = useRouter()
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const { entitlements } = useGuestEntitlements()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const careerTheme = useMemo(() => resolveGuestCareerTheme(tokens), [tokens])

  const [careerPlan, setCareerPlan] = useState<GuestCareerPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const load = useCallback(async () => {
    setLoadError("")
    try {
      const payload = await guestApi.getPlans()
      const plan = payload.plans?.find((item) => item.id === "cora_career") ?? null
      setCareerPlan(plan)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load plans.")
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const tiers = useMemo(
    () =>
      buildGuestPlanTiers({
        freePriceLabel: entitlements.planConfig?.priceLabel,
        careerPriceLabel: careerPlan?.priceLabel ?? entitlements.planConfig?.upgradePriceLabel,
        careerCreditsIncluded: careerPlan?.coraCreditsIncluded ?? GUEST_CORA_CAREER_LIFETIME_CREDITS,
      }),
    [careerPlan, entitlements.planConfig],
  )

  const freeTier = tiers.find((tier) => tier.id === "guest_free")!
  const careerTier = tiers.find((tier) => tier.id === "cora_career")!
  const hasCareer = entitlements.plan === "cora_career"

  if (!guestSession) return null

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Get Cora Career" fallbackHref="/dashboard" />
      <View style={styles.body}>
        <ModuleScreen loading={loading} error={loadError} disableTopInsetAdjustment stackedHeader>
          <HeroCard
            careerTheme={careerTheme}
            unlocked={hasCareer}
            creditsIncluded={careerTier.creditsIncluded}
            creditsAvailable={hasCareer ? entitlements.coraCredits.available : undefined}
          />

          {hasCareer ? (
            <>
              <View style={styles.actionRow}>
                <QuickLink
                  careerTheme={careerTheme}
                  accentIndex={0}
                  icon="chatbubbles-outline"
                  label="Open assistant"
                  onPress={() => router.push("/module/cora-assistant" as never)}
                />
                <QuickLink
                  careerTheme={careerTheme}
                  accentIndex={2}
                  icon="wallet-outline"
                  label="View credits"
                  onPress={() => router.push("/module/cora-credits" as never)}
                />
              </View>
              <PlanPerksSection careerTheme={careerTheme} tier={careerTier} highlight current />
            </>
          ) : (
            <>
              <OfferCard
                careerTheme={careerTheme}
                tier={careerTier}
                description={careerPlan?.description}
                onCheckout={() => openGuestCoraCareerCheckout(router, guestSession)}
              />
              <PlanPerksSection careerTheme={careerTheme} tier={careerTier} highlight />
              <PlanPerksSection careerTheme={careerTheme} tier={freeTier} current={entitlements.plan === "guest_free"} />
            </>
          )}

          <Text style={[type.footnote, styles.footerNote, { color: native.tertiaryLabel }]}>
            Cora Career is a one-time purchase with lifetime access. Credits are shared across eligible Cora tools.
          </Text>
        </ModuleScreen>
      </View>
    </View>
  )
}

const HERO_HIGHLIGHTS: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { icon: "reader-outline", label: "Résumé" },
  { icon: "mic-outline", label: "Interview" },
  { icon: "calendar-outline", label: "Planning" },
  { icon: "flash-outline", label: "Credits" },
]

function HeroCard({
  careerTheme,
  unlocked,
  creditsIncluded,
  creditsAvailable,
}: {
  careerTheme: GuestCareerTheme
  unlocked?: boolean
  creditsIncluded: number
  creditsAvailable?: number
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const gradientColors = unlocked
    ? tokens.isDark
      ? (["#0f2a22", "#122820", native.secondaryGrouped] as const)
      : (["#ecfdf5", "#f0fdf9", native.secondaryGrouped] as const)
    : tokens.isDark
      ? careerTheme.heroGradientDark
      : careerTheme.heroGradientLight

  const glowColor = unlocked ? tokens.success : careerTheme.highlight
  const eyebrow = unlocked ? "Lifetime access active" : "One-time · Lifetime unlock"
  const title = unlocked ? "Cora Career is yours" : "Coach your next chapter"
  const subtitle = unlocked
    ? `${(creditsAvailable ?? creditsIncluded).toLocaleString()} Cora credits ready — assistant, résumé, interview, and application tools unlocked.`
    : `Pay once, keep forever. ${creditsIncluded.toLocaleString()} credits plus coaching for applications, interviews, and career planning.`

  return (
    <View style={[styles.heroShell, tokens.cardShadow]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.heroCard,
          { borderColor: unlocked ? `${tokens.success}44` : hexToRgba(careerTheme.palette.accent, 0.28) },
        ]}
      >
        <View style={[styles.heroOrbPrimary, { backgroundColor: unlocked ? glowColor : careerTheme.glowPrimary }]} />
        <View style={[styles.heroOrbSecondary, { backgroundColor: careerTheme.glowSecondary }]} />
        <View pointerEvents="none" style={[styles.heroRingOuter, { borderColor: careerTheme.ringOuter }]} />
        <View pointerEvents="none" style={[styles.heroRingInner, { borderColor: careerTheme.ringInner }]} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroIconCluster}>
            <View style={[styles.heroIconRing, { borderColor: `${glowColor}55` }]} />
            <View style={[styles.heroIconWrap, { backgroundColor: semanticSoft(glowColor, tokens.isDark, 0.22) }]}>
              <Ionicons name={unlocked ? "checkmark-circle" : "sparkles"} size={26} color={glowColor} />
            </View>
          </View>
          <View style={[styles.heroEyebrow, { backgroundColor: semanticSoft(glowColor, tokens.isDark, 0.18) }]}>
            <Ionicons name={unlocked ? "infinite-outline" : "ribbon-outline"} size={12} color={glowColor} />
            <Text style={[type.footnote, styles.heroEyebrowText, { color: glowColor }]}>{eyebrow}</Text>
          </View>
        </View>

        <Text style={[type.bodyEmphasis, styles.heroTitle, { color: native.label }]}>{title}</Text>
        <Text style={[type.secondary, styles.heroSubtitle, { color: native.secondaryLabel }]}>{subtitle}</Text>

        {!unlocked ? (
          <View style={styles.heroChipRow}>
            {HERO_HIGHLIGHTS.map((item, index) => {
              const chipAccent = careerTheme.chipAccents[index] ?? careerTheme.highlight
              return (
                <View
                  key={item.label}
                  style={[
                    styles.heroChip,
                    {
                      backgroundColor: hexToRgba(chipAccent, tokens.isDark ? 0.16 : 0.1),
                      borderColor: hexToRgba(chipAccent, tokens.isDark ? 0.34 : 0.22),
                    },
                  ]}
                >
                  <Ionicons name={item.icon} size={13} color={chipAccent} />
                  <Text style={[type.footnote, styles.heroChipText, { color: chipAccent }]}>{item.label}</Text>
                </View>
              )
            })}
          </View>
        ) : (
          <View style={[styles.heroStatRow, { backgroundColor: semanticSoft(tokens.success, tokens.isDark, 0.14), borderColor: `${tokens.success}33` }]}>
            <View style={styles.heroStat}>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Credits</Text>
              <Text style={[styles.heroStatValue, { color: native.label }]}>
                {(creditsAvailable ?? creditsIncluded).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: native.separator }]} />
            <View style={styles.heroStat}>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Plan</Text>
              <Text style={[styles.heroStatValue, { color: native.label }]}>Lifetime</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  )
}

function OfferCard({
  careerTheme,
  tier,
  description,
  onCheckout,
}: {
  careerTheme: GuestCareerTheme
  tier: GuestPlanPerkTier
  description?: string
  onCheckout: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View
      style={[
        styles.offerCard,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: careerTheme.secondaryBorder,
        },
      ]}
    >
      <View style={styles.offerHead}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[type.caption, { color: careerTheme.highlight, fontWeight: "700" }]}>Recommended</Text>
          <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 22 }]}>{tier.label}</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{tier.tagline}</Text>
        </View>
        <View style={[styles.pricePill, { backgroundColor: careerTheme.offerSoft }]}>
          <Text style={[type.bodyEmphasis, { color: careerTheme.highlightDark }]}>{tier.priceLabel}</Text>
        </View>
      </View>

      <View
        style={[
          styles.creditsRow,
          { backgroundColor: hexToRgba(careerTheme.creditsAccent, tokens.isDark ? 0.14 : 0.1) },
        ]}
      >
        <Ionicons name="flash-outline" size={18} color={careerTheme.creditsAccent} />
        <Text style={[type.body, { color: native.label, flex: 1 }]}>
          Includes {tier.creditsIncluded.toLocaleString()} lifetime Cora credits
        </Text>
      </View>

      {description ? (
        <Text style={[type.secondary, { color: native.secondaryLabel, lineHeight: 21 }]}>{description}</Text>
      ) : null}

      <Pressable
        style={[styles.cta, { backgroundColor: careerTheme.cta }]}
        onPress={onCheckout}
        accessibilityRole="button"
        accessibilityLabel="Unlock Cora Career"
      >
        <Text style={[styles.ctaText, { color: careerTheme.ctaText }]}>Continue to secure checkout</Text>
      </Pressable>
    </View>
  )
}

function PlanPerksSection({
  careerTheme,
  tier,
  highlight,
  current,
}: {
  careerTheme: GuestCareerTheme
  tier: GuestPlanPerkTier
  highlight?: boolean
  current?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={styles.section}>
      <GuestSettingsSectionHeader
        title={
          current
            ? `${tier.label} · Your plan`
            : highlight
              ? `${tier.label} includes`
              : `${tier.label} includes`
        }
      />
      <View
        style={[
          styles.perkGroup,
          tokens.cardShadow,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: highlight ? careerTheme.secondaryBorder : native.separator,
          },
        ]}
      >
        <View style={[styles.tierMeta, { borderBottomColor: native.separator }]}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>{tier.priceLabel}</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {tier.creditsIncluded.toLocaleString()} credits included
          </Text>
        </View>
        {tier.perks.map((perk, index) => (
          <PerkRow
            key={perk.id}
            careerTheme={careerTheme}
            perk={perk}
            index={index}
            isLast={index === tier.perks.length - 1}
            highlight={highlight}
          />
        ))}
      </View>
    </View>
  )
}

function PerkRow({
  careerTheme,
  perk,
  index,
  isLast,
  highlight,
}: {
  careerTheme: GuestCareerTheme
  perk: GuestPlanPerk
  index: number
  isLast?: boolean
  highlight?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const thumbAccent =
    careerTheme.perkThumbAccents[index % careerTheme.perkThumbAccents.length] ?? careerTheme.highlight
  const iconBg = hexToRgba(thumbAccent, tokens.isDark ? 0.18 : 0.12)

  return (
    <View
      style={[
        styles.perkRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
      ]}
    >
      <View style={[styles.perkIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={perk.icon} size={18} color={thumbAccent} />
      </View>
      <View style={styles.perkCopy}>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>{perk.label}</Text>
        {perk.detail ? (
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>{perk.detail}</Text>
        ) : null}
      </View>
      <Ionicons
        name="checkmark-circle"
        size={18}
        color={highlight ? thumbAccent : native.tertiaryLabel}
      />
    </View>
  )
}

function QuickLink({
  careerTheme,
  accentIndex,
  icon,
  label,
  onPress,
}: {
  careerTheme: GuestCareerTheme
  accentIndex: number
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const accent = careerTheme.chipAccents[accentIndex] ?? careerTheme.highlight

  return (
    <Pressable
      style={[
        styles.quickLink,
        {
          backgroundColor: native.fill,
          borderColor: hexToRgba(accent, tokens.isDark ? 0.32 : 0.22),
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={accent} />
      <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  heroShell: {
    borderRadius: NATIVE.sectionRadius + 4,
    marginBottom: 4,
    overflow: "hidden",
  },
  heroCard: {
    borderRadius: NATIVE.sectionRadius + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
    overflow: "hidden",
    minHeight: 168,
  },
  heroOrbPrimary: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    top: -48,
    right: -36,
    opacity: 0.16,
  },
  heroOrbSecondary: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 999,
    bottom: -28,
    left: -18,
    opacity: 0.1,
  },
  heroRingOuter: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
  },
  heroRingInner: {
    position: "absolute",
    top: 28,
    right: 28,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroIconCluster: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "58%",
  },
  heroEyebrowText: { fontWeight: "700" },
  heroTitle: { fontSize: 24, letterSpacing: -0.5, lineHeight: 28 },
  heroSubtitle: { lineHeight: 22 },
  heroChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroChipText: { fontWeight: "700" },
  heroStatRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  heroStat: { flex: 1, gap: 2 },
  heroStatValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  heroStatDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginHorizontal: 12 },
  offerCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    marginBottom: 4,
  },
  offerHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pricePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
    minHeight: NATIVE.buttonMinHeight,
  },
  ctaDisabled: { opacity: 0.65 },
  ctaText: { fontWeight: "700", fontSize: 15 },
  section: { marginTop: 4 },
  perkGroup: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tierMeta: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  perkCopy: { flex: 1, gap: 3, paddingTop: 1 },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  quickLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  footerNote: { textAlign: "center", lineHeight: 18, marginTop: 8, paddingHorizontal: 8 },
})
