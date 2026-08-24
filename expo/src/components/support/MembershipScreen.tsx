import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { ApiError, studentApi } from "../../lib/student-api"
import { fetchEffectiveMembershipTier } from "../../lib/student-shell-refresh"
import type { StudentSession } from "../../lib/session"
import type { MembershipTier } from "../../types/dashboard"
import {
  formatSemesterPrice,
  isTierAtLeast,
  MEMBERSHIP_FEATURE_MATRIX,
  MEMBERSHIP_PLANS,
  mergePlanPricing,
  type MembershipFeatureRow,
  type MembershipPlan,
} from "../../lib/membership-plans"
import {
  fetchMembershipPlanPricing,
  semesterPriceCentsForTier,
  type MembershipPlansResponse,
} from "../../lib/membership-pricing-api"
import { openMembershipCheckout } from "../../lib/membership-web-paths"
import {
  fetchMembershipDetailsSafe,
  formatMembershipDate,
  membershipStatusLabel,
  type MembershipDetailsResponse,
} from "../../lib/membership-details-api"
import { MembershipPlanDetailSheet } from "./MembershipPlanDetailSheet"
import { SupportTip } from "./support-shared"
import { useRouter } from "expo-router"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"
import { hexToRgba, type AppThemeTokens } from "../../constants/app-themes"
import { REPORT_SOLID } from "../../lib/assessment-report-theme"
import {
  getThemedMembershipPlan,
  membershipTierHeroCardStyle,
  resolveThemedMembershipPlans,
} from "../../lib/membership-plan-theme"
import { useCoraBalance } from "../../hooks/useCoraBalance"
import { CoraUsagePanel } from "../cora/CoraUsagePanel"
import { CoraCreditPacksPanel } from "../cora/CoraCreditPacksPanel"
import { CoraCreditBalanceBadge } from "../cora/CoraCreditBalanceBadge"

const TIER_ORDER: MembershipTier[] = ["Trailblazer", "Explorer", "Scholar"]
const CARD_RADIUS = 20

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function planSubtitle(
  plan: MembershipPlan,
  isCurrent: boolean,
  currentTier: MembershipTier,
  expiresAt: string | null,
): string {
  if (isCurrent) {
    if (plan.id === "Scholar") return "Included with enrollment"
    const through = formatMembershipDate(expiresAt)
    if (through) return `Valid through ${through}`
    return "Active this semester"
  }
  if (isTierAtLeast(currentTier, plan.id)) {
    return `Included in ${currentTier}`
  }
  return plan.tagline
}

function planPriceLabel(semesterCents: number): string {
  if (semesterCents <= 0) return "Free"
  return formatSemesterPrice(semesterCents)
}

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
    <Animated.View
      style={[style, { backgroundColor: color }, motion]}
      pointerEvents="none"
    />
  )
}

function heroStatusBadgeColors(
  tone: ReturnType<typeof membershipStatusLabel>["tone"],
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

function CurrentMembershipSummary({
  plan,
  semesterCents,
  expiresAt,
  details,
  onExplore,
  onBilling,
  tokens,
}: {
  plan: MembershipPlan
  semesterCents: number
  expiresAt: string | null
  details: MembershipDetailsResponse | null
  onExplore: () => void
  onBilling: () => void
  tokens: AppThemeTokens
}) {
  const hero = useMemo(
    () => membershipTierHeroCardStyle(plan.id, tokens),
    [plan.id, tokens],
  )
  const subscription = details?.subscription ?? null
  const status = membershipStatusLabel(plan.id, plan.id, subscription)
  const isFreeTier = plan.id === "Scholar" || subscription?.isFreeTier
  const statusColors = heroStatusBadgeColors(status.tone, plan.id === "Trailblazer")

  return (
    <Animated.View entering={FadeInDown.delay(40).duration(420).springify().damping(18)}>
      <View
        style={[
          styles.currentCard,
          tokens.cardShadow,
          {
            backgroundColor: hero.background,
            borderColor: hero.border,
            borderWidth: 1.5,
          },
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
            <Animated.View
              entering={ZoomIn.delay(100).duration(400).springify().damping(14)}
              style={[styles.currentIcon, { backgroundColor: hero.iconFill }]}
            >
              <Ionicons name={plan.icon} size={24} color={hero.iconColor} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.currentCopy}>
              <Text style={[styles.currentEyebrow, { color: hero.eyebrow }]}>Your membership</Text>
              <Text style={[styles.currentTitle, { color: hero.title }]}>{plan.name}</Text>
              <Text style={[styles.currentSubtitle, { color: hero.subtitle }]}>
                {isFreeTier
                  ? "Included with enrollment"
                  : formatMembershipDate(expiresAt)
                    ? `Valid through ${formatMembershipDate(expiresAt)}`
                    : "Active this semester"}
              </Text>
              {!isFreeTier && semesterCents > 0 ? (
                <Text style={[styles.currentPrice, { color: hero.subtitle }]}>
                  {formatSemesterPrice(semesterCents)} · semester access
                </Text>
              ) : null}
            </Animated.View>
            <Animated.View
              entering={FadeIn.delay(220).duration(300)}
              style={[styles.currentStatusBadge, { backgroundColor: statusColors.bg }]}
            >
              <Text style={[styles.currentStatusText, { color: statusColors.text }]}>{status.label}</Text>
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(260).duration(340).springify()} style={styles.currentActions}>
            <Pressable
              style={[
                styles.currentActionBtn,
                {
                  backgroundColor: hero.exploreBtnBg,
                  borderColor: hero.exploreBtnBorder,
                  borderWidth: 1,
                },
              ]}
              onPress={onExplore}
            >
              <Text style={[styles.currentActionText, { color: hero.exploreBtnText }]}>Explore plan</Text>
            </Pressable>
            {!isFreeTier ? (
              <Pressable
                style={[styles.currentActionBtn, { backgroundColor: hero.billingBtnBg, borderWidth: 0 }]}
                onPress={onBilling}
              >
                <Text style={[styles.currentActionText, { color: hero.billingBtnText }]}>Billing</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  )
}

function SubtlePlanCard({
  plan,
  semesterCents,
  currentTier,
  expiresAt,
  onExplore,
  onUpgrade,
  tokens,
  index,
}: {
  plan: MembershipPlan
  semesterCents: number
  currentTier: MembershipTier
  expiresAt: string | null
  onExplore: (plan: MembershipPlan) => void
  onUpgrade: (plan: MembershipPlan) => void
  tokens: AppThemeTokens
  index: number
}) {
  const native = useThemedNative()
  const isCurrent = plan.id === currentTier
  const isOwned = isTierAtLeast(currentTier, plan.id) && !isCurrent
  const canUpgrade = !isCurrent && !isOwned && plan.id !== "Scholar"

  return (
    <Animated.View entering={FadeInDown.delay(160 + index * 80).duration(380).springify().damping(20)}>
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
        <View style={styles.planCardHeader}>
          <View style={styles.planCardTitleBlock}>
            <Text style={[styles.planName, { color: tokens.text }]}>{plan.name}</Text>
            <Text style={[styles.planSubtitle, { color: native.secondaryLabel }]}>
              {planSubtitle(plan, isCurrent, currentTier, expiresAt)}
            </Text>
          </View>
          <View style={styles.planPriceBlock}>
            <Text style={[styles.planPrice, { color: native.secondaryLabel }]}>
              {planPriceLabel(semesterCents)}
            </Text>
            {semesterCents > 0 ? (
              <Text style={[styles.planPriceCadence, { color: native.tertiaryLabel }]}>/ semester</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.perkList}>
          {plan.perks.map((perk) => (
            <View key={perk} style={styles.perkRow}>
              <Ionicons name="checkmark" size={14} color={hexToRgba(plan.accent, 0.85)} />
              <Text style={[styles.perkText, { color: tokens.textSecondary }]}>{perk}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[
            styles.exploreBtn,
            {
              backgroundColor: isCurrent ? plan.softBg : hexToRgba(plan.accent, 0.1),
            },
          ]}
          onPress={() => onExplore(plan)}
        >
          <Text style={[styles.exploreBtnText, { color: plan.accentDark }]}>
            {isCurrent ? "Explore plan" : isOwned ? "Explore plan" : "Explore plan"}
          </Text>
        </Pressable>

        {canUpgrade ? (
          <Pressable style={styles.upgradeLink} onPress={() => onUpgrade(plan)}>
            <Text style={[styles.upgradeLinkText, { color: plan.accent }]}>
              Upgrade to {plan.name}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  )
}

function FeatureCell({
  value,
  active,
  accent,
  muted,
}: {
  value: string | false
  active: boolean
  accent: string
  muted: string
}) {
  if (value === false) {
    return <Ionicons name="remove-outline" size={16} color={muted} />
  }

  if (value === "Included") {
    return <Ionicons name="checkmark" size={16} color={active ? accent : muted} />
  }

  return (
    <Text
      style={[
        styles.featureCellText,
        { color: active ? accent : muted },
        active && styles.featureCellTextActive,
      ]}
      numberOfLines={2}
    >
      {value}
    </Text>
  )
}

function FeatureComparisonTable({
  currentTier,
  tokens,
}: {
  currentTier: MembershipTier
  tokens: AppThemeTokens
}) {
  const native = useThemedNative()
  const tiers: MembershipTier[] = ["Scholar", "Explorer", "Trailblazer"]

  function cellValue(row: MembershipFeatureRow, tier: MembershipTier): string | false {
    if (tier === "Scholar") return row.scholar
    if (tier === "Explorer") return row.explorer
    return row.trailblazer
  }

  return (
    <Animated.View entering={FadeInDown.delay(380).duration(400).springify().damping(20)}>
      <View
        style={[
          styles.compareCard,
          { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        <View style={[styles.compareHeader, { borderBottomColor: tokens.border }]}>
          <Text style={[styles.compareTitle, { color: tokens.text }]}>Compare tiers</Text>
          <Text style={[styles.compareSub, { color: native.secondaryLabel }]}>
            Side-by-side feature access
          </Text>
        </View>

        <View style={[styles.compareTierHead, { borderBottomColor: tokens.border }]}>
          <View style={styles.featureLabelCol} />
          {tiers.map((tier) => {
            const plan = getThemedMembershipPlan(tier, tokens)
            const active = tier === currentTier
            return (
              <View key={tier} style={styles.tierCol}>
                <Text
                  style={[
                    styles.tierHeadName,
                    { color: active ? plan.accent : native.secondaryLabel },
                    active && styles.tierHeadNameActive,
                  ]}
                >
                  {tier}
                </Text>
              </View>
            )
          })}
        </View>

        {MEMBERSHIP_FEATURE_MATRIX.map((row, index) => (
          <View
            key={row.id}
            style={[
              styles.compareRow,
              index < MEMBERSHIP_FEATURE_MATRIX.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: tokens.border,
              },
            ]}
          >
            <Text style={[styles.featureLabel, { color: tokens.text }]} numberOfLines={2}>
              {row.label}
            </Text>
            {tiers.map((tier) => {
              const plan = getThemedMembershipPlan(tier, tokens)
              const active = tier === currentTier
              return (
                <View key={`${row.id}-${tier}`} style={styles.tierCol}>
                  <FeatureCell
                    value={cellValue(row, tier)}
                    active={active}
                    accent={plan.accent}
                    muted={native.tertiaryLabel}
                  />
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </Animated.View>
  )
}

export function MembershipScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { membershipTier, membershipTierLoaded, setMembershipTier, setMembershipTierLoaded } = useStudentShell()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [pricing, setPricing] = useState<MembershipPlansResponse | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [membershipDetails, setMembershipDetails] = useState<MembershipDetailsResponse | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [explorePlan, setExplorePlan] = useState<MembershipPlan | null>(null)

  const pricedPlans = useMemo(() => {
    const priceMap = {
      Scholar: semesterPriceCentsForTier(pricing, "Scholar"),
      Explorer: semesterPriceCentsForTier(pricing, "Explorer"),
      Trailblazer: semesterPriceCentsForTier(pricing, "Trailblazer"),
    } satisfies Record<MembershipTier, number>
    return mergePlanPricing(MEMBERSHIP_PLANS, priceMap)
  }, [pricing])

  const sortedPlans = useMemo(() => {
    return [...pricedPlans].sort(
      (a, b) => TIER_ORDER.indexOf(a.id) - TIER_ORDER.indexOf(b.id),
    )
  }, [pricedPlans])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [tier, planPricing, membershipPayload] = await Promise.all([
        fetchEffectiveMembershipTier(session, { syncStripe: true }),
        fetchMembershipPlanPricing(session.databaseId),
        studentApi.getMembership(session).catch(() => null),
      ])
      if (tier) {
        setMembershipTier(tier)
        setMembershipTierLoaded(true)
      }
      setPricing(planPricing)
      setExpiresAt(membershipPayload?.membership?.expiresAt ?? null)
      const details = await fetchMembershipDetailsSafe(
        session,
        tier ?? membershipTier,
        membershipPayload?.membership?.expiresAt ?? null,
      )
      setMembershipDetails(details)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load membership.")
    }
  }, [membershipTier, session, setMembershipTier, setMembershipTierLoaded])

  useNotificationModuleRefresh("membership", load)

  const refreshDetails = useCallback(async () => {
    if (!session) return
    setDetailsLoading(true)
    try {
      const details = await fetchMembershipDetailsSafe(session, membershipTier, expiresAt)
      setMembershipDetails(details)
      setExpiresAt(details.subscription.validThrough ?? expiresAt)
    } finally {
      setDetailsLoading(false)
    }
  }, [session, membershipTier, expiresAt])

  function openPlanExplorer(plan: MembershipPlan) {
    setExplorePlan(plan)
    void refreshDetails()
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  function handlePlanSelect(plan: MembershipPlan) {
    if (plan.id === membershipTier) return

    if (isTierAtLeast(membershipTier, plan.id)) {
      AppAlert.alert("Already included", `${plan.name} perks are already part of your ${membershipTier} plan.`)
      return
    }

    openMembershipCheckout(router, plan.id)
  }

  const hasPaidMembership = membershipTier === "Explorer" || membershipTier === "Trailblazer"
  const currentPlan = useMemo(
    () => getThemedMembershipPlan(membershipTier, tokens),
    [membershipTier, tokens],
  )
  const themedSortedPlans = useMemo(
    () => resolveThemedMembershipPlans(sortedPlans, tokens),
    [sortedPlans, tokens],
  )
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
  } = useCoraBalance({ role: "student", session, enabled: Boolean(session) })

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader
        title="Membership & Plans"
        fallbackHref="/dashboard"
        rightSlot={
          <CoraCreditBalanceBadge
            balance={coraBalance}
            onPress={() => {
              /* stay on membership — usage panel is below */
            }}
          />
        }
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
        <CurrentMembershipSummary
          plan={currentPlan}
          semesterCents={semesterPriceCentsForTier(pricing, membershipTier)}
          expiresAt={expiresAt}
          details={membershipDetails}
          onExplore={() => openPlanExplorer(currentPlan)}
          onBilling={() => router.push("/membership/manage" as never)}
          tokens={tokens}
        />

        <Animated.View entering={FadeInDown.delay(120).duration(340)} style={{ marginBottom: 16 }}>
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
            audience="student"
            session={session}
            onPurchased={() => void refreshCora({ force: true, includeActivity: true })}
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(180).duration(340)}
          style={[styles.allPlansLabel, { color: native.secondaryLabel }]}
        >
          All plans
        </Animated.Text>

        <View style={styles.planStack}>
        {themedSortedPlans.map((plan, index) => (
          <SubtlePlanCard
            key={plan.id}
            plan={plan}
            semesterCents={semesterPriceCentsForTier(pricing, plan.id)}
            currentTier={membershipTier}
            expiresAt={expiresAt}
            onExplore={openPlanExplorer}
            onUpgrade={handlePlanSelect}
            tokens={tokens}
            index={index}
          />
        ))}
      </View>

      {hasPaidMembership ? (
        <Animated.View entering={FadeInDown.delay(300).duration(340).springify()}>
          <Pressable
            style={[styles.manageRow, { borderColor: tokens.border }]}
            onPress={() => router.push("/membership/manage" as never)}
          >
            <Ionicons name="card-outline" size={18} color={native.secondaryLabel} />
            <Text style={[styles.manageRowText, { color: tokens.text }]}>Billing & subscription</Text>
            <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
          </Pressable>
        </Animated.View>
      ) : null}

      <MembershipPlanDetailSheet
        visible={explorePlan != null}
        plan={explorePlan}
        session={session}
        currentTier={membershipTier}
        details={membershipDetails}
        detailsLoading={detailsLoading}
        pricing={pricing}
        onClose={() => setExplorePlan(null)}
        onRefresh={load}
      />

      <FeatureComparisonTable currentTier={membershipTier} tokens={tokens} />

      <Animated.View entering={FadeInUp.delay(480).duration(360).springify()}>
        <SupportTip>
          Membership unlocks learning tools and platform perks. Course assessment rules are always set by your
          instructor — see Course Info → Policies for grading details.
        </SupportTip>
      </Animated.View>
    </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  currentCard: {
    borderRadius: CARD_RADIUS,
    padding: 22,
    gap: 18,
    marginBottom: 20,
    overflow: "hidden",
  },
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
  currentContent: {
    gap: 20,
    zIndex: 1,
  },
  currentTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  currentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  currentCopy: { flex: 1, minWidth: 0, gap: 6 },
  currentEyebrow: {
    ...nativeType.caption,
    fontWeight: "600",
    fontSize: 12,
  },
  currentTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  currentSubtitle: {
    ...nativeType.caption,
    fontSize: 14,
    lineHeight: 20,
  },
  currentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  currentStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  currentPrice: {
    ...nativeType.caption,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  currentActions: {
    flexDirection: "row",
    gap: 12,
  },
  currentActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  currentActionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  allPlansLabel: {
    ...nativeType.sectionHeader,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  planStack: { gap: 14 },
  planCard: {
    borderRadius: CARD_RADIUS,
    padding: 20,
    gap: 16,
  },
  planCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  planCardTitleBlock: { flex: 1, gap: 4 },
  planName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  planSubtitle: {
    ...nativeType.caption,
    lineHeight: 18,
  },
  planPriceBlock: { alignItems: "flex-end", gap: 1 },
  planPrice: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  planPriceCadence: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
  },
  perkList: { gap: 10 },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  perkText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
  },
  exploreBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 999,
    minHeight: 48,
  },
  exploreBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  upgradeLink: {
    alignItems: "center",
    paddingTop: 2,
  },
  upgradeLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  manageRowText: {
    flex: 1,
    ...nativeType.body,
  },
  compareCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginTop: 20,
  },
  compareHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  compareTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  compareSub: {
    ...nativeType.caption,
    lineHeight: 18,
  },
  compareTierHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
  },
  featureLabelCol: { flex: 1.35 },
  featureLabel: {
    flex: 1.35,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
    paddingRight: 8,
  },
  tierCol: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  tierHeadName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  tierHeadNameActive: { fontWeight: "700" },
  featureCellText: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 13,
  },
  featureCellTextActive: { fontWeight: "700" },
})
