import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleListRow, ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { ApiError } from "../../lib/api"
import type { FacultySession } from "../../lib/session"
import {
  cancelFacultyMembershipSubscription,
  fetchFacultyMembershipDetailsSafe,
  formatFacultyMembershipDate,
  facultyMembershipStatusLabel,
  reactivateFacultyMembershipSubscription,
  type FacultyMembershipDetailsResponse,
} from "../../lib/faculty-membership-details-api"
import {
  fetchFacultyMembershipPurchases,
  formatFacultyPurchaseAmount,
  type FacultyMembershipPurchasesResponse,
} from "../../lib/faculty-membership-billing-api"
import {
  formatFacultyPlanPriceLabel,
  type FacultyBillingCadence,
} from "../../lib/faculty-membership-plans"
import { getThemedFacultyMembershipPlan } from "../../lib/faculty-membership-plan-theme"
import {
  fetchFacultyMembershipPlanPricing,
  priceCentsForFacultyTier,
  type FacultyMembershipPlansResponse,
} from "../../lib/faculty-membership-pricing-api"
import { openFacultyMembershipCheckout } from "../../lib/faculty-membership-web-paths"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"

function useFacultySession(): FacultySession | null {
  const { session } = useSession()
  return session?.portal === "faculty" ? session : null
}

function statusBadgeColors(tone: ReturnType<typeof facultyMembershipStatusLabel>["tone"]) {
  switch (tone) {
    case "active":
      return { bg: "rgba(52, 199, 89, 0.16)", text: "#248A3D" }
    case "warning":
      return { bg: "rgba(255, 149, 0, 0.14)", text: "#C93400" }
    case "expired":
      return { bg: "rgba(255, 59, 48, 0.12)", text: "#D70015" }
    default:
      return { bg: "rgba(120, 120, 128, 0.12)", text: "#636366" }
  }
}

export function FacultyMembershipBillingScreen() {
  const session = useFacultySession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { membershipTier, refreshFacultyData } = useFacultyShell()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [details, setDetails] = useState<FacultyMembershipDetailsResponse | null>(null)
  const [purchases, setPurchases] = useState<FacultyMembershipPurchasesResponse | null>(null)
  const [pricing, setPricing] = useState<FacultyMembershipPlansResponse | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const plan = useMemo(() => getThemedFacultyMembershipPlan(membershipTier, tokens), [membershipTier, tokens])
  const subscription = details?.subscription ?? null
  const status = facultyMembershipStatusLabel(membershipTier, membershipTier, subscription)
  const statusColors = statusBadgeColors(status.tone)
  const billingCadence: FacultyBillingCadence =
    subscription?.billingCadence === "annual" ? "annual" : "semester"
  const planPriceCents = priceCentsForFacultyTier(pricing, membershipTier, billingCadence)

  const billingCadenceLabel = useMemo(() => {
    if (!subscription?.billingCadence) return null
    return subscription.billingCadence === "semester" ? "Per semester · one-time" : "Annual · one-time"
  }, [subscription?.billingCadence])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [detailsPayload, purchasesPayload, pricingPayload] = await Promise.all([
        fetchFacultyMembershipDetailsSafe(session, membershipTier, null),
        fetchFacultyMembershipPurchases(session).catch(() => ({ purchases: [], subscriptions: [] })),
        fetchFacultyMembershipPlanPricing(session.id).catch(() => null),
      ])
      setDetails(detailsPayload)
      setPurchases(purchasesPayload)
      setPricing(pricingPayload)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load billing details.")
    }
  }, [session, membershipTier])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  async function runAction(label: string, fn: () => Promise<void>) {
    setActionLoading(true)
    try {
      await fn()
      await refreshFacultyData?.(undefined, { force: true })
      await load()
    } catch (err) {
      AppAlert.alert(label, err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      setActionLoading(false)
    }
  }

  function confirmCancel() {
    if (!session) return
    AppAlert.alert(
      "Cancel membership?",
      "Your premium access stays active until the end of your current billing period, then returns to Instructor Free.",
      [
        { text: "Keep membership", style: "cancel" },
        {
          text: "Cancel membership",
          style: "destructive",
          onPress: () => {
            void runAction("Cancel membership", async () => {
              await cancelFacultyMembershipSubscription(session)
              AppAlert.alert("Membership updated", "Your plan will end at the close of the current period.")
            })
          },
        },
      ],
    )
  }

  const purchaseRows = purchases?.purchases ?? []
  const isFreeTier = subscription?.isFreeTier ?? membershipTier === "Free"
  const isExpiredStatus =
    subscription?.status === "expired" ||
    subscription?.status === "cancelled" ||
    subscription?.status === "canceled"
  const repurchaseTier =
    subscription?.tier === "Pro" || subscription?.tier === "Enterprise"
      ? subscription.tier
      : membershipTier === "Pro" || membershipTier === "Enterprise"
        ? membershipTier
        : null
  const repurchaseCadence: FacultyBillingCadence =
    subscription?.billingCadence === "annual" ? "annual" : "semester"
  const repurchasePriceCents =
    repurchaseTier != null
      ? priceCentsForFacultyTier(pricing, repurchaseTier, repurchaseCadence)
      : 0
  const canRepurchaseOneTime =
    !subscription?.hasStripeSubscription &&
    isExpiredStatus &&
    repurchaseTier != null
  const canExtendOneTime =
    !subscription?.hasStripeSubscription &&
    !subscription?.isFreeTier &&
    !isExpiredStatus &&
    Boolean(subscription?.isActive) &&
    repurchaseTier != null
  const repurchaseTitle =
    repurchaseCadence === "annual" ? "Renew for next year" : "Renew for next term"
  const showRenewCancelled = Boolean(subscription?.cancelAtPeriodEnd)
  const showCancel = Boolean(subscription?.hasStripeSubscription && !subscription.cancelAtPeriodEnd)
  const hasRepurchaseAction = canRepurchaseOneTime || canExtendOneTime

  function handleRepurchase() {
    if (!repurchaseTier) return
    openFacultyMembershipCheckout(router, repurchaseTier, repurchaseCadence)
  }

  if (!session) return null

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Billing & subscription" fallbackHref="/membership" />
      <ModuleScreen
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true)
          load().finally(() => setRefreshing(false))
        }}
        disableTopInsetAdjustment
      >
        <View style={[styles.summaryCard, { backgroundColor: plan.softBg, borderColor: plan.softBorder }]}>
          <View style={styles.summaryTop}>
            <View style={[styles.summaryIcon, { backgroundColor: plan.softBorder }]}>
              <Ionicons name={plan.icon} size={22} color={plan.accentDark} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.summaryTitle, { color: tokens.text }]}>{plan.name}</Text>
              <Text style={[styles.summaryTagline, { color: native.secondaryLabel }]}>{plan.tagline}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>{status.label}</Text>
            </View>
          </View>
          {!isFreeTier ? (
            <View style={styles.summaryMeta}>
              {subscription?.validThrough ? (
                <Text style={[styles.summaryMetaLine, { color: native.secondaryLabel }]}>
                  Valid through {formatFacultyMembershipDate(subscription.validThrough)}
                </Text>
              ) : null}
              {planPriceCents > 0 ? (
                <Text style={[styles.summaryMetaLine, { color: native.secondaryLabel }]}>
                  {formatFacultyPlanPriceLabel(planPriceCents, billingCadence)}
                  {billingCadenceLabel ? ` · ${billingCadenceLabel}` : ""}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.summaryMetaLine, { color: native.secondaryLabel }]}>
              Instructor Free is included at no extra cost.
            </Text>
          )}
        </View>

        {!isFreeTier ? (
          <>
            <ModuleSection title="Subscription">
              <ModuleListRow
                icon="calendar-outline"
                title="Purchased"
                subtitle={formatFacultyMembershipDate(subscription?.purchasedAt) ?? "Not available"}
              />
              <ModuleListRow
                icon="time-outline"
                title="Valid through"
                subtitle={formatFacultyMembershipDate(subscription?.validThrough) ?? "Through end of term"}
                last={!billingCadenceLabel}
              />
              {billingCadenceLabel ? (
                <ModuleListRow icon="receipt-outline" title="Billing" subtitle={billingCadenceLabel} last />
              ) : null}
            </ModuleSection>

            <ModuleSection title="Billing History">
              {purchaseRows.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Text style={[nativeType.caption, { color: native.secondaryLabel }]}>No payments yet</Text>
                </View>
              ) : (
                purchaseRows.map((purchase, index) => (
                  <ModuleListRow
                    key={purchase.id}
                    icon="document-text-outline"
                    title={purchase.description}
                    subtitle={formatFacultyMembershipDate(purchase.paidAt) ?? purchase.paidAt}
                    meta={formatFacultyPurchaseAmount(purchase.amount, purchase.currency)}
                    onPress={
                      purchase.hostedInvoiceUrl
                        ? () => {
                            void Linking.openURL(purchase.hostedInvoiceUrl!)
                          }
                        : undefined
                    }
                    last={index === purchaseRows.length - 1}
                  />
                ))
              )}
            </ModuleSection>

            <ModuleSection title="Actions">
              {showRenewCancelled ? (
                <ModuleListRow
                  icon="refresh-outline"
                  title="Renew membership"
                  subtitle="Keep premium access"
                  onPress={() => {
                    void runAction("Renew membership", async () => {
                      await reactivateFacultyMembershipSubscription(session)
                      AppAlert.alert("Membership renewed", "Your premium access will continue.")
                    })
                  }}
                  last={!showCancel && !hasRepurchaseAction}
                />
              ) : null}
              {showCancel ? (
                <ModuleListRow
                  icon="close-circle-outline"
                  title="Cancel membership"
                  subtitle="End at period close · returns to Instructor Free"
                  onPress={confirmCancel}
                  last={!hasRepurchaseAction}
                />
              ) : null}
              {canExtendOneTime ? (
                <ModuleListRow
                  icon="cart-outline"
                  title="Purchase again"
                  subtitle={`${formatFacultyPlanPriceLabel(repurchasePriceCents, repurchaseCadence)} · extend access`}
                  onPress={handleRepurchase}
                  last={!canRepurchaseOneTime}
                />
              ) : null}
              {canRepurchaseOneTime ? (
                <ModuleListRow
                  icon="rocket-outline"
                  title={repurchaseTitle}
                  subtitle={formatFacultyPlanPriceLabel(repurchasePriceCents, repurchaseCadence)}
                  onPress={handleRepurchase}
                  last
                />
              ) : null}
            </ModuleSection>
          </>
        ) : (
          <ModuleSection title="Upgrade">
            {canRepurchaseOneTime || canExtendOneTime ? (
              <ModuleListRow
                icon="rocket-outline"
                title={canRepurchaseOneTime ? repurchaseTitle : "Purchase again"}
                subtitle={formatFacultyPlanPriceLabel(repurchasePriceCents, repurchaseCadence)}
                onPress={handleRepurchase}
              />
            ) : null}
            <ModuleListRow
              icon="sparkles-outline"
              title="View paid plans"
              subtitle="Compare Pro and Enterprise"
              onPress={() => router.push("/membership" as never)}
              last
            />
          </ModuleSection>
        )}

        {actionLoading ? (
          <View style={styles.actionLoading}>
            <ActivityIndicator size="small" color={native.tint} />
          </View>
        ) : null}
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  summaryCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 12, marginBottom: 8 },
  summaryTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 18, fontWeight: "700" },
  summaryTagline: { ...nativeType.caption },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "700" },
  summaryMeta: { gap: 4 },
  summaryMetaLine: { ...nativeType.caption },
  emptyHistory: { paddingVertical: 16, alignItems: "center" },
  actionLoading: { paddingVertical: 12, alignItems: "center" },
})
