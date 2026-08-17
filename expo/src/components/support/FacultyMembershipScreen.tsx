import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useSession } from "../../context/SessionProvider"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import { fetchEffectiveFacultyMembershipTier } from "../../lib/faculty-shell-refresh"
import type { FacultySession } from "../../lib/session"
import type { FacultyMembershipTier } from "../../types/dashboard"
import {
  FACULTY_MEMBERSHIP_FEATURE_MATRIX,
  FACULTY_MEMBERSHIP_PLANS,
  facultyAnnualSavingsCents,
  facultyPlanPriceCents,
  formatFacultyCadenceAccessLabel,
  formatFacultyCadenceShortLabel,
  formatFacultyPlanPriceLabel,
  formatFacultyPriceFromCents,
  getFacultyMembershipPlan,
  isFacultyTierAtLeast,
  mergeFacultyPlanPricing,
  type FacultyBillingCadence,
  type FacultyMembershipPlan,
} from "../../lib/faculty-membership-plans"
import {
  fetchFacultyMembershipPlanPricing,
  semesterPriceCentsForFacultyTier,
  type FacultyMembershipPlansResponse,
} from "../../lib/faculty-membership-pricing-api"
import { openFacultyMembershipCheckout } from "../../lib/faculty-membership-web-paths"
import {
  fetchFacultyMembershipDetailsSafe,
  formatFacultyMembershipDate,
  facultyMembershipStatusLabel,
  type FacultyMembershipDetailsResponse,
} from "../../lib/faculty-membership-details-api"
import { SupportTip } from "./support-shared"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"
import { hexToRgba, type AppThemeTokens } from "../../constants/app-themes"
import { REPORT_SOLID } from "../../lib/assessment-report-theme"
import {
  facultyMembershipTierHeroCardStyle,
  getThemedFacultyMembershipPlan,
} from "../../lib/faculty-membership-plan-theme"
import {
  MobbinPillSegmentControl,
  type MobbinPillSegmentOption,
} from "../theme/MobbinPillSegmentControl"
import { useCoraBalance } from "../../hooks/useCoraBalance"
import { CoraUsagePanel } from "../cora/CoraUsagePanel"
import { CoraCreditPacksPanel } from "../cora/CoraCreditPacksPanel"
import { CoraCreditBalanceBadge } from "../cora/CoraCreditBalanceBadge"

const TIER_ORDER: FacultyMembershipTier[] = ["Enterprise", "Pro", "Free"]
const CARD_RADIUS = 20

const CADENCE_OPTIONS: MobbinPillSegmentOption<FacultyBillingCadence>[] = [
  { id: "semester", label: "Per semester" },
  { id: "annual", label: "Annual" },
]

function MembershipCardBubble({
  style,
  color,
  driftX,
  driftY,
  duration,
}: {
  style: object
  color: string
  driftX: number
  driftY: number
  duration: number
}) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(driftX, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-driftX, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
    ty.value = withRepeat(
      withSequence(
        withTiming(-driftY, { duration: duration * 1.12, easing: Easing.inOut(Easing.sin) }),
        withTiming(driftY, { duration: duration * 1.12, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
  }, [driftX, driftY, duration, tx, ty])

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }))

  return (
    <Animated.View style={[style, { backgroundColor: color }, motion]} pointerEvents="none" />
  )
}

function heroStatusBadgeColors(
  tone: ReturnType<typeof facultyMembershipStatusLabel>["tone"],
  onLightFill: boolean,
) {
  switch (tone) {
    case "active":
    case "included":
      return { bg: REPORT_SOLID.correct, text: REPORT_SOLID.correctInk }
    case "warning":
      return onLightFill
        ? { bg: "rgba(255, 149, 0, 0.18)", text: "#C93400" }
        : { bg: "rgba(255, 255, 255, 0.18)", text: "#FFB340" }
    case "expired":
      return onLightFill
        ? { bg: "rgba(255, 59, 48, 0.14)", text: "#D70015" }
        : { bg: "rgba(255, 255, 255, 0.18)", text: "#FF6961" }
    default:
      return onLightFill
        ? { bg: "rgba(74, 46, 10, 0.1)", text: "rgba(74, 46, 10, 0.72)" }
        : { bg: "rgba(255, 255, 255, 0.16)", text: "rgba(255, 255, 255, 0.82)" }
  }
}

function useFacultySession(): FacultySession | null {
  const { session } = useSession()
  return session?.portal === "faculty" ? session : null
}

function planSubtitle(
  plan: FacultyMembershipPlan,
  isCurrent: boolean,
  currentTier: FacultyMembershipTier,
  expiresAt: string | null,
): string {
  if (isCurrent) {
    if (plan.id === "Free") return "Included for all instructors"
    const through = formatFacultyMembershipDate(expiresAt)
    if (through) return `Valid through ${through}`
    return "Active this term"
  }
  if (isFacultyTierAtLeast(currentTier, plan.id)) {
    return `Included in ${getFacultyMembershipPlan(currentTier).name}`
  }
  return plan.tagline
}

function CurrentPlanCard({
  plan,
  priceCents,
  cadence,
  expiresAt,
  details,
  onBilling,
  tokens,
}: {
  plan: FacultyMembershipPlan
  priceCents: number
  cadence: FacultyBillingCadence
  expiresAt: string | null
  details: FacultyMembershipDetailsResponse | null
  onBilling: () => void
  tokens: AppThemeTokens
}) {
  const hero = useMemo(() => facultyMembershipTierHeroCardStyle(plan.id, tokens), [plan.id, tokens])
  const subscription = details?.subscription ?? null
  const status = facultyMembershipStatusLabel(plan.id, plan.id, subscription)
  const isFreeTier = plan.id === "Free" || subscription?.isFreeTier
  const onLightFill = plan.id === "Enterprise"
  const statusColors = heroStatusBadgeColors(status.tone, onLightFill)

  return (
    <View
      style={[
        styles.currentCard,
        tokens.cardShadow,
        { backgroundColor: hero.background, borderColor: hero.border, borderWidth: 1.5 },
      ]}
    >
      <MembershipCardBubble
        style={styles.currentBubbleA}
        color={hero.bubbles.a}
        driftX={4}
        driftY={6}
        duration={3600}
      />
      <MembershipCardBubble
        style={styles.currentBubbleB}
        color={hero.bubbles.b}
        driftX={-3}
        driftY={4}
        duration={4200}
      />
      <MembershipCardBubble
        style={styles.currentBubbleC}
        color={hero.bubbles.c}
        driftX={2}
        driftY={-3}
        duration={3900}
      />

      <View style={styles.currentContent}>
        <View style={styles.currentTop}>
          <View style={[styles.currentIcon, { backgroundColor: hero.iconFill }]}>
            <Ionicons name={plan.icon} size={24} color={hero.iconColor} />
          </View>
          <View style={styles.currentCopy}>
            <Text style={[styles.currentEyebrow, { color: hero.eyebrow }]}>Your membership</Text>
            <Text style={[styles.currentTitle, { color: hero.title }]}>{plan.name}</Text>
            <Text style={[styles.currentSubtitle, { color: hero.subtitle }]}>
              {isFreeTier
                ? "Included for all instructors"
                : formatFacultyMembershipDate(expiresAt)
                  ? `Valid through ${formatFacultyMembershipDate(expiresAt)}`
                  : "Active this term"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>{status.label}</Text>
          </View>
        </View>

        {!isFreeTier && priceCents > 0 ? (
          <Text style={[styles.currentPrice, { color: hero.subtitle }]}>
            {formatFacultyPlanPriceLabel(priceCents, cadence)} · {formatFacultyCadenceAccessLabel(cadence)}
          </Text>
        ) : null}

        {!isFreeTier ? (
          <Pressable
            style={[styles.billingBtn, { backgroundColor: hero.billingBtnBg }]}
            onPress={onBilling}
          >
            <Text style={[styles.billingBtnText, { color: hero.billingBtnText }]}>Billing & subscription</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function PlanCard({
  plan,
  priceCents,
  cadence,
  currentTier,
  expiresAt,
  onUpgrade,
  tokens,
}: {
  plan: FacultyMembershipPlan
  priceCents: number
  cadence: FacultyBillingCadence
  currentTier: FacultyMembershipTier
  expiresAt: string | null
  onUpgrade: (plan: FacultyMembershipPlan) => void
  tokens: AppThemeTokens
}) {
  const native = useThemedNative()
  const isCurrent = plan.id === currentTier
  const isOwned = isFacultyTierAtLeast(currentTier, plan.id) && !isCurrent
  const canUpgrade = !isCurrent && !isOwned && plan.id !== "Free"
  const annualSavings =
    plan.id !== "Free" ? facultyAnnualSavingsCents(plan.semesterPriceCents, plan.annualPriceCents) : 0

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: tokens.surface,
          borderColor: isCurrent ? hexToRgba(plan.accent, 0.45) : tokens.border,
          borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.planHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planName, { color: tokens.text }]}>{plan.name}</Text>
          <Text style={[styles.planSubtitle, { color: native.secondaryLabel }]}>
            {planSubtitle(plan, isCurrent, currentTier, expiresAt)}
          </Text>
        </View>
        <View style={styles.planPriceBlock}>
          <Text style={[styles.planPrice, { color: tokens.text }]}>
            {priceCents <= 0 ? "Free" : formatFacultyPlanPriceLabel(priceCents, cadence)}
          </Text>
          {priceCents > 0 ? (
            <Text style={[styles.planPriceCadence, { color: native.tertiaryLabel }]}>
              {formatFacultyCadenceShortLabel(cadence)}
            </Text>
          ) : null}
        </View>
      </View>

      {cadence === "annual" && annualSavings > 0 && plan.id !== "Free" ? (
        <View style={[styles.savingsBadge, { backgroundColor: hexToRgba(plan.accent, 0.12) }]}>
          <Ionicons name="sparkles-outline" size={14} color={plan.accentDark} />
          <Text style={[styles.savingsText, { color: plan.accentDark }]}>
            Save {formatFacultyPriceFromCents(annualSavings)} vs three semesters
          </Text>
        </View>
      ) : null}

      {cadence === "semester" && annualSavings > 0 && plan.id !== "Free" ? (
        <Text style={[styles.altCadenceHint, { color: native.secondaryLabel }]}>
          Or {formatFacultyPlanPriceLabel(plan.annualPriceCents, "annual")} — save{" "}
          {formatFacultyPriceFromCents(annualSavings)}
        </Text>
      ) : null}

      <View style={styles.perkList}>
        {plan.perks.slice(0, 5).map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <Ionicons name="checkmark" size={14} color={hexToRgba(plan.accent, 0.85)} />
            <Text style={[styles.perkText, { color: tokens.textSecondary }]}>{perk}</Text>
          </View>
        ))}
      </View>

      {canUpgrade ? (
        <Pressable style={[styles.upgradeBtn, { backgroundColor: hexToRgba(plan.accent, 0.12) }]} onPress={() => onUpgrade(plan)}>
          <Text style={[styles.upgradeBtnText, { color: plan.accentDark }]}>Upgrade to {plan.name}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function FacultyMembershipScreen() {
  const session = useFacultySession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { membershipTier, setMembershipTier, setMembershipTierLoaded } = useFacultyShell()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [pricing, setPricing] = useState<FacultyMembershipPlansResponse | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [membershipDetails, setMembershipDetails] = useState<FacultyMembershipDetailsResponse | null>(null)
  const [billingCadence, setBillingCadence] = useState<FacultyBillingCadence>("semester")

  const pricedPlans = useMemo(() => {
    const semesterMap = {
      Free: semesterPriceCentsForFacultyTier(pricing, "Free"),
      Pro: semesterPriceCentsForFacultyTier(pricing, "Pro"),
      Enterprise: semesterPriceCentsForFacultyTier(pricing, "Enterprise"),
    }
    const annualMap = {
      Free: 0,
      Pro: pricing?.plans.find((p) => p.id === "Pro")?.annualPriceCents ?? 24900,
      Enterprise: pricing?.plans.find((p) => p.id === "Enterprise")?.annualPriceCents ?? 49900,
    }
    return mergeFacultyPlanPricing(FACULTY_MEMBERSHIP_PLANS, semesterMap, annualMap)
  }, [pricing])

  const sortedPlans = useMemo(
    () => [...pricedPlans].sort((a, b) => TIER_ORDER.indexOf(a.id) - TIER_ORDER.indexOf(b.id)),
    [pricedPlans],
  )

  useEffect(() => {
    if (pricing?.billing?.defaultCadence) {
      setBillingCadence(pricing.billing.defaultCadence)
    }
  }, [pricing?.billing?.defaultCadence])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [tier, planPricing, membershipPayload] = await Promise.all([
        fetchEffectiveFacultyMembershipTier(session),
        fetchFacultyMembershipPlanPricing(session.id),
        instructorApi.getMembership(session.id).catch(() => null),
      ])
      if (tier) setMembershipTier(tier)
      setMembershipTierLoaded(true)
      setPricing(planPricing)
      setExpiresAt(membershipPayload?.membership?.expiresAt ?? null)
      const details = await fetchFacultyMembershipDetailsSafe(
        session,
        tier ?? membershipTier,
        membershipPayload?.membership?.expiresAt ?? null,
      )
      setMembershipDetails(details)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load membership.")
    }
  }, [session, setMembershipTier, setMembershipTierLoaded, membershipTier])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  function handlePlanSelect(plan: FacultyMembershipPlan) {
    if (plan.id === membershipTier) return
    if (isFacultyTierAtLeast(membershipTier, plan.id)) {
      AppAlert.alert("Already included", `${plan.name} perks are already part of your current plan.`)
      return
    }
    openFacultyMembershipCheckout(router, plan.id, billingCadence)
  }

  const currentPlan = useMemo(
    () => getThemedFacultyMembershipPlan(membershipTier, tokens),
    [membershipTier, tokens],
  )
  const activeCadence =
    membershipDetails?.subscription?.billingCadence === "annual" ||
    membershipDetails?.subscription?.billingCadence === "semester"
      ? membershipDetails.subscription.billingCadence
      : billingCadence
  const currentPriceCents = facultyPlanPriceCents(currentPlan, activeCadence)
  const hasPaidMembership = membershipTier === "Pro" || membershipTier === "Enterprise"
  const {
    balance: coraBalance,
    activity: coraActivity,
    activityPage: coraActivityPage,
    activityTotalPages: coraActivityTotalPages,
    activityTotal: coraActivityTotal,
    activityLoadingPage: coraActivityLoadingPage,
    goToActivityPage: goToCoraActivityPage,
    loading: coraLoading,
    error: coraError,
    refresh: refreshCora,
  } = useCoraBalance({ role: "instructor", session, enabled: Boolean(session) })

  if (!session) return null

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader
        title="Membership & Plans"
        fallbackHref="/dashboard"
        rightSlot={<CoraCreditBalanceBadge balance={coraBalance} />}
      />
      <ModuleScreen
        loading={loading}
        error={error}
        refreshing={refreshing}
        disableTopInsetAdjustment
        onRefresh={() => {
          setRefreshing(true)
          void Promise.all([load(), refreshCora({ force: true, includeActivity: true })]).finally(() =>
            setRefreshing(false),
          )
        }}
      >
        <CurrentPlanCard
          plan={currentPlan}
          priceCents={currentPriceCents}
          cadence={activeCadence}
          expiresAt={expiresAt}
          details={membershipDetails}
          onBilling={() => router.push("/membership/manage" as never)}
          tokens={tokens}
        />

        <View style={{ marginBottom: 16 }}>
          <CoraUsagePanel
            balance={coraBalance}
            activity={coraActivity}
            loading={coraLoading}
            error={coraError}
            onRefresh={() => void refreshCora({ force: true, includeActivity: true })}
            activityPage={coraActivityPage}
            activityTotalPages={coraActivityTotalPages}
            activityTotal={coraActivityTotal}
            activityLoadingPage={coraActivityLoadingPage}
            onActivityPageChange={(page) => void goToCoraActivityPage(page)}
          />
          <CoraCreditPacksPanel
            audience="instructor"
            session={session}
            onPurchased={() => void refreshCora({ force: true, includeActivity: true })}
          />
        </View>

        <View style={styles.cadenceSection}>
          <Text style={[styles.sectionLabel, { color: native.secondaryLabel, marginBottom: 10 }]}>
            Billing option
          </Text>
          <MobbinPillSegmentControl
            options={CADENCE_OPTIONS}
            value={billingCadence}
            onChange={setBillingCadence}
          />
          {billingCadence === "annual" ? (
            <Text style={[styles.cadenceHint, { color: native.secondaryLabel }]}>
              Annual covers Fall, Spring, and Summer at a discount vs three semester purchases.
            </Text>
          ) : (
            <Text style={[styles.cadenceHint, { color: native.secondaryLabel }]}>
              One-time payment through the end of the current academic term.
            </Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: native.secondaryLabel }]}>All plans</Text>
        <View style={styles.planStack}>
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              priceCents={facultyPlanPriceCents(plan, billingCadence)}
              cadence={billingCadence}
              currentTier={membershipTier}
              expiresAt={expiresAt}
              onUpgrade={handlePlanSelect}
              tokens={tokens}
            />
          ))}
        </View>

        {hasPaidMembership ? (
          <Pressable
            style={[styles.manageRow, { borderColor: tokens.border }]}
            onPress={() => router.push("/membership/manage" as never)}
          >
            <Ionicons name="card-outline" size={18} color={native.secondaryLabel} />
            <Text style={[styles.manageRowText, { color: tokens.text }]}>Billing & subscription</Text>
            <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
          </Pressable>
        ) : null}

        <View style={[styles.compareCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[styles.compareTitle, { color: tokens.text }]}>Compare tiers</Text>
          {FACULTY_MEMBERSHIP_FEATURE_MATRIX.map((row) => (
            <View key={row.id} style={[styles.compareRow, { borderBottomColor: tokens.border }]}>
              <Text style={[styles.featureLabel, { color: tokens.text }]}>{row.label}</Text>
              <Text style={[styles.featureValue, { color: native.secondaryLabel }]}>
                {row.free === false ? "—" : row.free}
              </Text>
              <Text style={[styles.featureValue, { color: native.secondaryLabel }]}>
                {row.pro === false ? "—" : row.pro}
              </Text>
              <Text style={[styles.featureValue, { color: native.secondaryLabel }]}>
                {row.enterprise === false ? "—" : row.enterprise}
              </Text>
            </View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(200).duration(360)}>
          <SupportTip>
            Instructor membership unlocks Cora Teaching Copilot, AI generators, analytics, and department tools.
            Choose per-semester or annual billing — both are one-time Stripe checkout, not subscriptions.
          </SupportTip>
        </Animated.View>
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  currentCard: { borderRadius: CARD_RADIUS, padding: 18, marginBottom: 20, overflow: "hidden" },
  currentBubbleA: {
    position: "absolute",
    top: -24,
    right: -12,
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  currentBubbleB: {
    position: "absolute",
    bottom: -18,
    right: 36,
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  currentBubbleC: {
    position: "absolute",
    top: 20,
    left: -16,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  currentContent: { gap: 14, zIndex: 1 },
  currentTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  currentIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  currentCopy: { flex: 1, gap: 2 },
  currentEyebrow: { ...nativeType.caption, fontWeight: "600", fontSize: 12 },
  currentTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  currentSubtitle: { ...nativeType.caption, lineHeight: 18, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "700" },
  currentPrice: { ...nativeType.caption, paddingLeft: 60 },
  billingBtn: { marginLeft: 60, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  billingBtnText: { fontSize: 15, fontWeight: "600" },
  sectionLabel: { ...nativeType.sectionHeader, marginBottom: 12, paddingHorizontal: 2 },
  cadenceSection: { marginBottom: 18, gap: 10 },
  cadenceHint: { ...nativeType.caption, lineHeight: 18, paddingHorizontal: 2 },
  planStack: { gap: 14 },
  planCard: { borderRadius: CARD_RADIUS, padding: 20, gap: 12 },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  planName: { fontSize: 18, fontWeight: "700" },
  planSubtitle: { ...nativeType.caption, marginTop: 2 },
  planPriceBlock: { alignItems: "flex-end", gap: 2 },
  planPrice: { fontSize: 16, fontWeight: "700" },
  planPriceCadence: { ...nativeType.caption, fontSize: 11 },
  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  savingsText: { ...nativeType.caption, fontWeight: "600" },
  altCadenceHint: { ...nativeType.caption, lineHeight: 18 },
  perkList: { gap: 8 },
  perkRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  perkText: { flex: 1, ...nativeType.caption, lineHeight: 18 },
  upgradeBtn: { alignItems: "center", paddingVertical: 12, borderRadius: 999 },
  upgradeBtnText: { fontSize: 15, fontWeight: "600" },
  manageRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  manageRowText: { flex: 1, fontSize: 16, fontWeight: "600" },
  compareCard: { marginTop: 20, borderRadius: CARD_RADIUS, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  compareTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  compareRow: { flexDirection: "row", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  featureLabel: { flex: 2, fontSize: 13, fontWeight: "600" },
  featureValue: { flex: 1, fontSize: 11, textAlign: "center" },
})
