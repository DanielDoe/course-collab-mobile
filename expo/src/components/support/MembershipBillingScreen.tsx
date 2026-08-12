import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleListRow, ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  cancelMembershipSubscription,
  fetchMembershipDetailsSafe,
  formatMembershipDate,
  membershipStatusLabel,
  reactivateMembershipSubscription,
  type MembershipDetailsResponse,
} from "../../lib/membership-details-api"
import {
  fetchMembershipPurchases,
  formatPurchaseAmount,
  type MembershipPurchasesResponse,
} from "../../lib/membership-billing-api"
import { formatSemesterPrice } from "../../lib/membership-plans"
import { getThemedMembershipPlan } from "../../lib/membership-plan-theme"
import { semesterPriceCentsForTier, fetchMembershipPlanPricing, type MembershipPlansResponse } from "../../lib/membership-pricing-api"
import { openMembershipCheckout } from "../../lib/membership-web-paths"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function statusBadgeColors(tone: ReturnType<typeof membershipStatusLabel>["tone"]) {
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

export function MembershipBillingScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { membershipTier, refreshStudentData } = useStudentShell()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [details, setDetails] = useState<MembershipDetailsResponse | null>(null)
  const [purchases, setPurchases] = useState<MembershipPurchasesResponse | null>(null)
  const [pricing, setPricing] = useState<MembershipPlansResponse | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const plan = useMemo(
    () => getThemedMembershipPlan(membershipTier, tokens),
    [membershipTier, tokens],
  )
  const subscription = details?.subscription ?? null
  const status = membershipStatusLabel(membershipTier, membershipTier, subscription)
  const statusColors = statusBadgeColors(status.tone)
  const semesterCents = semesterPriceCentsForTier(pricing, membershipTier)

  const billingCadenceLabel = useMemo(() => {
    if (!subscription?.billingCadence) return null
    return subscription.billingCadence === "semester" ? "Semester · one-time" : "Monthly subscription"
  }, [subscription?.billingCadence])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [detailsPayload, purchasesPayload, pricingPayload] = await Promise.all([
        fetchMembershipDetailsSafe(session, membershipTier, null),
        fetchMembershipPurchases(session).catch(() => ({ purchases: [], subscriptions: [] })),
        fetchMembershipPlanPricing(session.databaseId).catch(() => null),
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
      await refreshStudentData?.({ force: true })
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
      "Your premium access stays active until the end of your current billing period, then returns to Scholar.",
      [
        { text: "Keep membership", style: "cancel" },
        {
          text: "Cancel membership",
          style: "destructive",
          onPress: () => {
            void runAction("Cancel membership", async () => {
              await cancelMembershipSubscription(session)
              AppAlert.alert("Membership updated", "Your plan will end at the close of the current period.")
            })
          },
        },
      ],
    )
  }

  const purchaseRows = purchases?.purchases ?? []
  const isFreeTier = subscription?.isFreeTier ?? membershipTier === "Scholar"

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
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: plan.softBg,
              borderColor: plan.softBorder,
            },
          ]}
        >
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
                  Valid through {formatMembershipDate(subscription.validThrough)}
                </Text>
              ) : null}
              {semesterCents > 0 ? (
                <Text style={[styles.summaryMetaLine, { color: native.secondaryLabel }]}>
                  {formatSemesterPrice(semesterCents)}
                  {billingCadenceLabel ? ` · ${billingCadenceLabel}` : ""}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.summaryMetaLine, { color: native.secondaryLabel }]}>
              Scholar is included with your course enrollment at no extra cost.
            </Text>
          )}
        </View>

        {!isFreeTier ? (
          <>
            <ModuleSection title="Subscription">
              <ModuleListRow
                icon="calendar-outline"
                title="Purchased"
                subtitle={formatMembershipDate(subscription?.purchasedAt) ?? "Not available"}
              />
              <ModuleListRow
                icon="time-outline"
                title="Valid through"
                subtitle={formatMembershipDate(subscription?.validThrough) ?? "Through end of term"}
              />
              {billingCadenceLabel ? (
                <ModuleListRow icon="receipt-outline" title="Billing" subtitle={billingCadenceLabel} />
              ) : null}
              {subscription?.cancelAtPeriodEnd ? (
                <ModuleListRow
                  icon="alert-circle-outline"
                  title="Renewal"
                  subtitle="Cancels at period end"
                  last
                />
              ) : (
                <ModuleListRow
                  icon="refresh-outline"
                  title="Renewal"
                  subtitle={subscription?.autoRenew ? "Auto-renews" : "One-time semester access"}
                  last
                />
              )}
            </ModuleSection>

            <ModuleSection title="Payment Method">
              <ModuleListRow
                icon="card-outline"
                title={subscription?.paymentMethod?.label ?? "No payment method on file"}
                subtitle={
                  subscription?.paymentMethod?.last4
                    ? `Card ending in ${subscription.paymentMethod.last4}`
                    : "From your most recent Stripe payment"
                }
                last
              />
            </ModuleSection>

            <ModuleSection
              title="Billing History"
              footer={
                purchaseRows.length === 0
                  ? "Payments appear here after your first membership purchase."
                  : undefined
              }
            >
              {purchaseRows.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Text style={[nativeType.caption, { color: native.secondaryLabel }]}>
                    No payments yet
                  </Text>
                </View>
              ) : (
                purchaseRows.map((purchase, index) => (
                  <ModuleListRow
                    key={purchase.id}
                    icon="document-text-outline"
                    title={purchase.description}
                    subtitle={formatMembershipDate(purchase.paidAt) ?? purchase.paidAt}
                    meta={formatPurchaseAmount(purchase.amount, purchase.currency)}
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
              {subscription?.cancelAtPeriodEnd ? (
                <ModuleListRow
                  icon="refresh-outline"
                  title="Renew membership"
                  subtitle="Keep premium access"
                  onPress={() => {
                    if (!session) return
                    void runAction("Renew membership", async () => {
                      await reactivateMembershipSubscription(session)
                      AppAlert.alert("Membership renewed", "Your premium access will continue.")
                    })
                  }}
                />
              ) : null}

              {subscription?.hasStripeSubscription && !subscription.cancelAtPeriodEnd ? (
                <ModuleListRow
                  icon="close-circle-outline"
                  title="Cancel membership"
                  subtitle="End at period close"
                  onPress={confirmCancel}
                  last={!subscription?.cancelAtPeriodEnd}
                />
              ) : null}

              {!subscription?.hasStripeSubscription &&
              (subscription?.status === "expired" ||
                subscription?.status === "cancelled" ||
                subscription?.status === "canceled") ? (
                <ModuleListRow
                  icon="rocket-outline"
                  title="Renew for next semester"
                  subtitle={formatSemesterPrice(semesterCents)}
                  onPress={() => openMembershipCheckout(router, membershipTier)}
                  last
                />
              ) : null}
            </ModuleSection>
          </>
        ) : (
          <ModuleSection title="Upgrade">
            <ModuleListRow
              icon="sparkles-outline"
              title="View paid plans"
              subtitle="Compare Explorer and Trailblazer"
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
  summaryCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
    marginBottom: 8,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: { flex: 1, gap: 4 },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  summaryTagline: {
    ...nativeType.caption,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  summaryMeta: { gap: 4, paddingLeft: 56 },
  summaryMetaLine: {
    ...nativeType.caption,
    lineHeight: 18,
  },
  emptyHistory: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  actionLoading: {
    alignItems: "center",
    paddingVertical: 12,
  },
})
