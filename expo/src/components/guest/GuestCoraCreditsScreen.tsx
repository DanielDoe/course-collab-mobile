import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
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
import { openGuestCoraCareerCheckout, openGuestCoraCreditsCheckout } from "../../lib/guest-checkout-paths"
import {
  resolveGuestCareerTheme,
  type GuestCareerTheme,
} from "../../lib/guest-cora-career-checkout-theme"
import {
  normalizeGuestDisplayCreditPacks,
  type GuestDisplayCreditPack,
} from "../../lib/guest-cora-credits-utils"
import type { GuestSession } from "../../lib/session"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { GUEST_FREE_STARTER_CORA_CREDITS } from "../../lib/guest-membership-config"
import { shouldShowPurchaseCta } from "../../lib/purchase-navigation"

export function GuestCoraCreditsScreen() {
  const router = useRouter()
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const { entitlements, refresh: refreshEntitlements } = useGuestEntitlements()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const creditsTheme = useMemo(() => resolveGuestCareerTheme(tokens), [tokens])

  const [packs, setPacks] = useState<GuestDisplayCreditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setError("")
    try {
      const plansPayload = await guestApi.getPlans()
      setPacks(normalizeGuestDisplayCreditPacks(plansPayload.creditPacks))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load credit packs.")
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const planLabel = entitlements.plan === "cora_career" ? "Cora Career" : "Career Member Free"
  const creditsCap =
    entitlements.planConfig?.coraCreditsIncluded ??
    (entitlements.plan === "cora_career" ? entitlements.coraCredits.available : GUEST_FREE_STARTER_CORA_CREDITS)

  const buyPack = useCallback(
    (packId: string) => {
      if (!guestSession) return
      openGuestCoraCreditsCheckout(router, packId, guestSession)
    },
    [guestSession, router],
  )

  if (!guestSession) return null
  const showPurchaseActions = shouldShowPurchaseCta()

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Cora Credits" fallbackHref="/dashboard" />
      <View style={styles.body}>
        <ModuleScreen
          loading={loading}
          error={error}
          disableTopInsetAdjustment
          stackedHeader
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            Promise.all([load(), refreshEntitlements()]).finally(() => setRefreshing(false))
          }}
        >
          <BalanceHeroCard
            creditsTheme={creditsTheme}
            available={entitlements.coraCredits.available}
            planLabel={planLabel}
            creditsCap={creditsCap}
            isLow={entitlements.coraCredits.isLow}
          />

          {showPurchaseActions && entitlements.plan !== "cora_career" ? (
            <Pressable
              style={[
                styles.upgradeBanner,
                {
                  backgroundColor: creditsTheme.offerSoft,
                  borderColor: creditsTheme.secondaryBorder,
                },
              ]}
              onPress={() => openGuestCoraCareerCheckout(router, guestSession)}
            >
              <View
                style={[
                  styles.upgradeIcon,
                  { backgroundColor: hexToRgba(creditsTheme.chipAccents[3], tokens.isDark ? 0.22 : 0.14) },
                ]}
              >
                <Ionicons name="ribbon-outline" size={18} color={creditsTheme.chipAccents[3]} />
              </View>
              <View style={styles.upgradeCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Unlock Cora Career</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  Lifetime coaching tools plus a larger starter credit balance
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={creditsTheme.highlight} />
            </Pressable>
          ) : null}

          {showPurchaseActions ? (
            <>
              <View style={styles.packHeader}>
                <View
                  style={[
                    styles.packHeaderIcon,
                    { backgroundColor: hexToRgba(creditsTheme.creditsAccent, tokens.isDark ? 0.18 : 0.12) },
                  ]}
                >
                  <Ionicons name="flash" size={18} color={creditsTheme.creditsAccent} />
                </View>
                <View style={styles.packHeaderCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>Cora Credit Packs</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
                    Purchased credits stack on your balance and work across eligible Cora tools.
                  </Text>
                </View>
              </View>

              <View style={styles.packList}>
                {packs.map((pack, index) => (
                  <CreditPackCard
                    key={pack.id}
                    creditsTheme={creditsTheme}
                    pack={pack}
                    packIndex={index}
                    highlight={pack.highlight}
                    onBuy={() => buyPack(pack.id)}
                  />
                ))}
              </View>
            </>
          ) : entitlements.coraCredits.available <= 0 ? (
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20, marginTop: 8 }]}>
              Your available Cora credits have been used.
            </Text>
          ) : null}
        </ModuleScreen>
      </View>
    </View>
  )
}

function BalanceHeroCard({
  creditsTheme,
  available,
  planLabel,
  creditsCap,
  isLow,
}: {
  creditsTheme: GuestCareerTheme
  available: number
  planLabel: string
  creditsCap: number
  isLow: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const usedFraction = creditsCap > 0 ? Math.min(1, Math.max(0, 1 - available / creditsCap)) : 0

  const gradientColors = tokens.isDark ? creditsTheme.heroGradientDark : creditsTheme.heroGradientLight
  const fillAccent = isLow ? tokens.warning : creditsTheme.creditsAccent

  return (
    <View style={[styles.heroShell, tokens.cardShadow]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { borderColor: hexToRgba(creditsTheme.palette.accent, 0.28) }]}
      >
        <View style={[styles.heroOrbPrimary, { backgroundColor: creditsTheme.glowPrimary }]} />
        <View style={[styles.heroOrbSecondary, { backgroundColor: creditsTheme.glowSecondary }]} />
        <View style={styles.heroTop}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: hexToRgba(creditsTheme.highlight, tokens.isDark ? 0.2 : 0.12) },
            ]}
          >
            <Ionicons name="wallet-outline" size={22} color={creditsTheme.highlight} />
          </View>
          <View style={[styles.planPill, { backgroundColor: creditsTheme.offerSoft }]}>
            <Text style={[type.footnote, { color: creditsTheme.highlightDark, fontWeight: "700" }]}>
              {planLabel}
            </Text>
          </View>
        </View>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Available credits</Text>
        <Text style={[styles.heroBalance, { color: native.label }]}>{available.toLocaleString()}</Text>
        <View style={[styles.track, { backgroundColor: native.fill }]}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${Math.max(6, Math.round((1 - usedFraction) * 100))}%`,
                backgroundColor: fillAccent,
              },
            ]}
          />
        </View>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          {isLow ? "Running low · " : ""}
          {creditsCap.toLocaleString()} included on your plan · briefs stay credit-free
        </Text>
      </LinearGradient>
    </View>
  )
}

function CreditPackCard({
  creditsTheme,
  pack,
  packIndex,
  highlight,
  onBuy,
}: {
  creditsTheme: GuestCareerTheme
  pack: GuestDisplayCreditPack
  packIndex: number
  highlight?: boolean
  onBuy: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const packAccent =
    creditsTheme.chipAccents[packIndex % creditsTheme.chipAccents.length] ?? creditsTheme.highlight
  const buyAccent = highlight ? creditsTheme.cta : packAccent

  return (
    <View
      style={[
        styles.packCard,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: highlight ? creditsTheme.secondaryBorder : native.separator,
        },
      ]}
    >
      <View style={styles.packHead}>
        <View style={styles.packTitleRow}>
          <View
            style={[
              styles.packFlashIcon,
              { backgroundColor: hexToRgba(packAccent, tokens.isDark ? 0.18 : 0.12) },
            ]}
          >
            <Ionicons name="flash-outline" size={16} color={packAccent} />
          </View>
          <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 18 }]}>
            {pack.credits.toLocaleString()} credits
          </Text>
        </View>
        {highlight ? (
          <View style={[styles.bestChip, { backgroundColor: hexToRgba(creditsTheme.creditsAccent, 0.22) }]}>
            <Text style={[type.footnote, { color: creditsTheme.creditsAccent, fontWeight: "700" }]}>
              Best value
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.priceAmount, { color: native.label }]}>{pack.priceLabel}</Text>
        {pack.perThousandLabel ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{pack.perThousandLabel}</Text>
        ) : null}
      </View>

      <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>{pack.description}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.buyBtn,
          { backgroundColor: buyAccent },
          pressed && { opacity: NATIVE.pressedOpacity },
        ]}
        onPress={onBuy}
      >
        <Text style={[styles.buyBtnText, { color: highlight ? creditsTheme.ctaText : "#FFFFFF" }]}>
          Buy pack
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  heroShell: { borderRadius: NATIVE.sectionRadius + 4, overflow: "hidden", marginBottom: 8 },
  heroCard: {
    borderRadius: NATIVE.sectionRadius + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 8,
    overflow: "hidden",
    minHeight: 156,
  },
  heroOrbPrimary: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 999,
    top: -40,
    right: -24,
    opacity: 0.14,
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
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  heroBalance: { fontSize: 36, fontWeight: "800", letterSpacing: -1, lineHeight: 40 },
  track: { height: 8, borderRadius: 999, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 999 },
  upgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 4,
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeCopy: { flex: 1, gap: 2 },
  packHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 4, marginBottom: 8 },
  packHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  packHeaderCopy: { flex: 1, gap: 2 },
  packList: { gap: 10 },
  packCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  packHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  packTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  packFlashIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  bestChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  priceRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  priceAmount: { fontSize: 24, fontWeight: "700", letterSpacing: -0.4 },
  buyBtn: {
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 12,
    minHeight: 44,
  },
  buyBtnText: { fontWeight: "600", fontSize: 15 },
})
