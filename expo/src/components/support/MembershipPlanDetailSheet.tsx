import { useCallback, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useShellChrome, useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { MembershipTier } from "../../types/dashboard"
import type { StudentSession } from "../../lib/session"
import {
  formatMembershipDate,
  membershipStatusLabel,
  cancelMembershipSubscription,
  reactivateMembershipSubscription,
  type MembershipDetailsResponse,
} from "../../lib/membership-details-api"
import {
  formatPriceFromCents,
  formatSemesterPrice,
  getMembershipPlan,
  isTierAtLeast,
  type MembershipPlan,
} from "../../lib/membership-plans"
import { listPriceCentsForTier, semesterPriceCentsForTier, type MembershipPlansResponse } from "../../lib/membership-pricing-api"
import { resolveThemedMembershipPlan } from "../../lib/membership-plan-theme"
import { openMembershipCheckout } from "../../lib/membership-web-paths"
import { shouldShowPurchaseCta } from "../../lib/purchase-navigation"
import { GlassSheetBackground } from "../theme/GlassSurface"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassMenuSectionGap,
  GlassSheetHandle,
} from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"

type Props = {
  visible: boolean
  plan: MembershipPlan | null
  session: StudentSession | null
  currentTier: MembershipTier
  details: MembershipDetailsResponse | null
  detailsLoading: boolean
  pricing: MembershipPlansResponse | null
  onClose: () => void
  onRefresh: () => Promise<void>
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  const chrome = useShellChrome()
  const type = useNativeType()

  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: NATIVE.fill }]}>
        <Ionicons name={icon} size={16} color={chrome.secondaryLabel} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[type.caption, { color: chrome.secondaryLabel }]}>{label}</Text>
        <Text style={[type.body, { color: chrome.label }]}>{value}</Text>
      </View>
    </View>
  )
}

function statusColors(tone: ReturnType<typeof membershipStatusLabel>["tone"], accent: string) {
  switch (tone) {
    case "active":
      return { bg: "rgba(52, 199, 89, 0.16)", text: "#248A3D", border: "rgba(52, 199, 89, 0.28)" }
    case "included":
      return { bg: "rgba(0, 122, 255, 0.12)", text: "#007AFF", border: "rgba(0, 122, 255, 0.24)" }
    case "warning":
      return { bg: "rgba(255, 149, 0, 0.14)", text: "#C93400", border: "rgba(255, 149, 0, 0.28)" }
    case "expired":
      return { bg: "rgba(255, 59, 48, 0.12)", text: "#D70015", border: "rgba(255, 59, 48, 0.24)" }
    default:
      return { bg: "rgba(120, 120, 128, 0.12)", text: accent, border: "rgba(120, 120, 128, 0.2)" }
  }
}

export function MembershipPlanDetailSheet({
  visible,
  plan,
  session,
  currentTier,
  details,
  detailsLoading,
  pricing,
  onClose,
  onRefresh,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const showPurchaseActions = shouldShowPurchaseCta()
  const [actionLoading, setActionLoading] = useState(false)

  const themedPlan = useMemo(
    () => (plan ? resolveThemedMembershipPlan(plan, tokens) : null),
    [plan, tokens],
  )

  const subscription = details?.subscription ?? null
  const isCurrentPlan = plan?.id === currentTier
  const isOwnedLowerTier = plan ? isTierAtLeast(currentTier, plan.id) && !isCurrentPlan : false
  const semesterCents = plan ? semesterPriceCentsForTier(pricing, plan.id) : 0
  const listCents = plan ? listPriceCentsForTier(pricing, plan.id) : 0

  const status = useMemo(() => {
    if (!plan) return { label: "", tone: "inactive" as const }
    return membershipStatusLabel(plan.id, currentTier, subscription)
  }, [plan, currentTier, subscription])

  const statusStyle = themedPlan
    ? statusColors(status.tone, themedPlan.accent)
    : statusColors("inactive", native.tint)

  const showBillingDetails = isCurrentPlan && subscription && !subscription.isFreeTier

  const pick = useCallback(
    (action: () => void) => {
      onClose()
      requestAnimationFrame(action)
    },
    [onClose],
  )

  async function runMembershipAction(label: string, fn: () => Promise<void>) {
    setActionLoading(true)
    try {
      await fn()
      await onRefresh()
    } catch (err) {
      AppAlert.alert(label, err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      setActionLoading(false)
    }
  }

  function confirmCancelMembership() {
    if (!session) return
    AppAlert.alert(
      "Cancel membership?",
      "Your premium access stays active until the end of your current billing period, then returns to Scholar.",
      [
        { text: "Keep membership", style: "cancel" },
        {
          text: "Cancel membership",
          style: "destructive",
          onPress: () => {
            void runMembershipAction("Cancel membership", async () => {
              await cancelMembershipSubscription(session)
              AppAlert.alert("Membership updated", "Your plan will end at the close of the current period.")
            })
          },
        },
      ],
    )
  }

  if (!plan || !themedPlan) return null

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable
      accessibilityLabel="Close plan details"
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground menuSheet style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <GlassSheetHandle />

        <View
          style={[
            styles.hero,
            {
              backgroundColor: themedPlan.softBg,
              borderColor: statusStyle.border,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={[styles.heroIconWrap, { backgroundColor: themedPlan.softBorder }]}>
              <Ionicons name={themedPlan.icon} size={22} color={themedPlan.accentDark} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: chrome.label }]}>{themedPlan.name}</Text>
              <Text style={[styles.heroTagline, { color: chrome.secondaryLabel }]}>{themedPlan.tagline}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={[type.caption, styles.priceLine, { color: chrome.secondaryLabel }]}>
          {semesterCents <= 0
            ? "Free with enrollment"
            : listCents > semesterCents
              ? `${formatSemesterPrice(semesterCents)}  ·  was ${formatPriceFromCents(listCents)}`
              : formatSemesterPrice(semesterCents)}
        </Text>

        {detailsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={native.tint} />
            <Text style={[type.caption, { color: chrome.secondaryLabel }]}>Loading plan details…</Text>
          </View>
        ) : showBillingDetails ? (
          <View style={[styles.detailsCard, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
            <DetailRow
              label="Purchased"
              value={formatMembershipDate(subscription?.purchasedAt) ?? "Not available"}
              icon="calendar-outline"
            />
            <View style={[styles.detailDivider, { backgroundColor: native.separator }]} />
            <DetailRow
              label="Valid through"
              value={formatMembershipDate(subscription?.validThrough) ?? "Through end of term"}
              icon="time-outline"
            />
            <View style={[styles.detailDivider, { backgroundColor: native.separator }]} />
            <DetailRow
              label="Payment method"
              value={subscription?.paymentMethod?.label ?? "Not on file"}
              icon="card-outline"
            />
            {subscription?.billingCadence ? (
              <>
                <View style={[styles.detailDivider, { backgroundColor: native.separator }]} />
                <DetailRow
                  label="Billing"
                  value={
                    subscription.billingCadence === "semester"
                      ? "Semester · one-time"
                      : "Monthly subscription"
                  }
                  icon="receipt-outline"
                />
              </>
            ) : null}
          </View>
        ) : isOwnedLowerTier ? (
          <Text style={[type.caption, styles.helperCopy, { color: chrome.secondaryLabel }]}>
            These perks are already included with your {currentTier} membership.
          </Text>
        ) : !isCurrentPlan ? (
          <Text style={[type.caption, styles.helperCopy, { color: chrome.secondaryLabel }]}>
            Upgrade to unlock {plan.name} tools for the rest of the semester.
          </Text>
        ) : (
          <Text style={[type.caption, styles.helperCopy, { color: chrome.secondaryLabel }]}>
            Scholar is included with your course enrollment at no extra cost.
          </Text>
        )}

        <Text style={[type.sectionHeader, styles.perksTitle, { color: chrome.secondaryLabel }]}>
          What you get
        </Text>
        <View style={styles.perkList}>
          {plan.perks.slice(0, 5).map((perk) => (
            <View key={perk} style={styles.perkRow}>
              <Ionicons name="checkmark-circle" size={16} color={themedPlan.accent} />
              <Text style={[type.caption, styles.perkText, { color: chrome.label }]}>{perk}</Text>
            </View>
          ))}
        </View>

        <GlassMenuSectionGap />

        {actionLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={native.tint} />
          </View>
        ) : (
          <GlassMenuList>
            {showPurchaseActions && !isCurrentPlan && !isOwnedLowerTier && plan.id !== "Scholar" ? (
              <GlassMenuRow
                icon="rocket-outline"
                label={`Upgrade to ${plan.name}`}
                detail={formatSemesterPrice(semesterCents)}
                onPress={() =>
                  pick(() => openMembershipCheckout(router, plan.id))
                }
                showSeparator
              />
            ) : null}

            {showPurchaseActions && isCurrentPlan && !subscription?.isFreeTier ? (
              <GlassMenuRow
                icon="card-outline"
                label="Manage billing"
                detail="Payment methods & invoices"
                onPress={() => pick(() => router.push("/membership/manage" as never))}
                showSeparator
              />
            ) : null}

            {showPurchaseActions && isCurrentPlan && subscription?.cancelAtPeriodEnd ? (
              <GlassMenuRow
                icon="refresh-outline"
                label="Renew membership"
                detail="Keep premium access"
                onPress={() => {
                  if (!session) return
                  void runMembershipAction("Renew membership", async () => {
                    await reactivateMembershipSubscription(session)
                    AppAlert.alert("Membership renewed", "Your premium access will continue.")
                  })
                }}
                showSeparator
              />
            ) : null}

            {showPurchaseActions &&
            isCurrentPlan &&
            subscription &&
            !subscription.isFreeTier &&
            !subscription.hasStripeSubscription &&
            (subscription.status === "expired" ||
              subscription.status === "cancelled" ||
              subscription.status === "canceled") ? (
              <GlassMenuRow
                icon="refresh-outline"
                label="Renew for next semester"
                detail={formatSemesterPrice(semesterCents)}
                onPress={() => pick(() => openMembershipCheckout(router, plan.id))}
                showSeparator
              />
            ) : null}

            {showPurchaseActions &&
            isCurrentPlan &&
            subscription?.hasStripeSubscription &&
            !subscription.cancelAtPeriodEnd &&
            !subscription.isFreeTier ? (
              <GlassMenuRow
                icon="close-circle-outline"
                label="Cancel membership"
                detail="End at period close"
                onPress={confirmCancelMembership}
                showSeparator
              />
            ) : null}

            {isCurrentPlan && subscription?.isFreeTier ? (
              <GlassMenuRow
                icon="sparkles-outline"
                label="Explore paid plans"
                detail="Compare Explorer & Trailblazer"
                onPress={() => pick(onClose)}
              />
            ) : null}

            {!isCurrentPlan && isOwnedLowerTier ? (
              <GlassMenuRow
                icon="information-circle-outline"
                label="View your plan"
                detail={getMembershipPlan(currentTier).name}
                onPress={() => pick(onClose)}
              />
            ) : null}
          </GlassMenuList>
        )}
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheetHost: { alignSelf: "stretch" },
  sheet: { paddingHorizontal: 16, paddingTop: 4 },
  hero: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  heroTagline: { fontSize: 14, lineHeight: 20 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  priceLine: { marginTop: 12, marginBottom: 8 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  detailsCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 0,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCopy: { flex: 1, gap: 2 },
  detailDivider: { height: StyleSheet.hairlineWidth },
  helperCopy: { lineHeight: 18, marginBottom: 8, paddingHorizontal: 2 },
  perksTitle: { marginTop: 4, marginBottom: 8, paddingHorizontal: 2 },
  perkList: { gap: 8, marginBottom: 8 },
  perkRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  perkText: { flex: 1, lineHeight: 18 },
})
