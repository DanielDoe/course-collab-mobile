import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import type { MembershipTier } from "../../types/dashboard"
import { getMembershipPlan } from "../../lib/membership-plans"
import {
  fetchMembershipPlanPricing,
  semesterPriceCentsForTier,
  type MembershipPlansResponse,
} from "../../lib/membership-pricing-api"
import { getThemedMembershipPlan } from "../../lib/membership-plan-theme"
import {
  createStudentMembershipPaymentIntent,
  prepareStudentMembershipPaymentSheet,
  type MobilePaymentSheetResponse,
} from "../../lib/membership-payment-api"
import { syncStudentMembershipFromStripe } from "../../lib/membership-checkout-api"
import { MembershipNativePaymentPresenterGate } from "./MembershipNativePaymentPresenterGate"
import { MembershipCheckoutReviewPanel } from "./MembershipCheckoutReviewPanel"
import { AppAlert } from "../../lib/app-alert"
import { isStripeNativeAvailable } from "../../lib/stripe-native"
import { requiresExternalWebPurchase } from "../../lib/purchase-navigation"

type Props = {
  plan: MembershipTier
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function MembershipCheckoutScreen({ plan: tier }: Props) {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { refreshStudentData } = useStudentShell()
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [presentKey, setPresentKey] = useState(0)
  const [error, setError] = useState("")
  const [pricing, setPricing] = useState<MembershipPlansResponse | null>(null)
  const [paymentSheet, setPaymentSheet] = useState<MobilePaymentSheetResponse | null>(null)

  const basePlan = useMemo(() => getMembershipPlan(tier), [tier])
  const plan = useMemo(
    () => (basePlan ? getThemedMembershipPlan(tier, tokens) : null),
    [basePlan, tier, tokens],
  )
  const semesterCents = semesterPriceCentsForTier(pricing, tier)

  const loadPricing = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const pricingPayload = await fetchMembershipPlanPricing(session.databaseId).catch(() => null)
      setPricing(pricingPayload)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load plan details.")
    }
  }, [session])

  const goToSuccess = useCallback(() => {
    router.replace({
      pathname: "/membership/success",
      params: { plan: tier },
    } as never)
  }, [router, tier])

  const loadPayment = useCallback(async () => {
    if (!session) return
    if (requiresExternalWebPurchase()) return
    if (!isStripeNativeAvailable()) {
      setError(
        "Stripe checkout needs a native rebuild. From the expo folder run pod install, then npm run ios:sim.",
      )
      return
    }
    setError("")
    setPaymentLoading(true)
    try {
      const sheetPayload = await prepareStudentMembershipPaymentSheet(session, tier, "semester")
      setPaymentSheet(sheetPayload)
      setPresentKey((k) => k + 1)
    } catch (err) {
      setPaymentSheet(null)
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load in-app checkout. Pull to retry.",
      )
    } finally {
      setPaymentLoading(false)
    }
  }, [session, tier])

  useEffect(() => {
    setLoading(true)
    loadPricing().finally(() => setLoading(false))
  }, [loadPricing])

  const handlePaymentComplete = useCallback(async () => {
    if (!session) return
    try {
      await syncStudentMembershipFromStripe(session)
      await refreshStudentData?.({ force: true })
      goToSuccess()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Payment succeeded but sync failed. Check Billing."
      AppAlert.alert("Membership syncing", message)
      goToSuccess()
    }
  }, [goToSuccess, refreshStudentData, session])

  const handlePaymentError = useCallback((message: string) => {
    AppAlert.alert("Payment", message)
  }, [])

  const handleConfirmIntent = useCallback(
    async ({
      paymentMethodId,
      shouldSavePaymentMethod,
    }: {
      paymentMethodId: string
      shouldSavePaymentMethod: boolean
    }) => {
      if (!session) throw new Error("Session expired.")
      return createStudentMembershipPaymentIntent(session, {
        tier,
        billingCadence: "semester",
        paymentMethodId,
        shouldSavePaymentMethod,
      })
    },
    [session, tier],
  )

  if (!plan) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Checkout" fallbackHref="/membership" />
        <View style={styles.center}>
          <Text style={{ color: native.secondaryLabel }}>Unknown plan.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={`Upgrade to ${plan.name}`} fallbackHref="/membership" />
      <ModuleScreen
        loading={loading}
        error={error}
        disableTopInsetAdjustment
        onRetryError={loadPricing}
      >
        <MembershipCheckoutReviewPanel
          plan={plan}
          semesterCents={semesterCents}
          tokens={tokens}
          onNotNow={() => router.back()}
          onContinue={() => void loadPayment()}
          continueLoading={paymentLoading}
        />
      </ModuleScreen>

      {paymentSheet ? (
        <MembershipNativePaymentPresenterGate
          presentKey={presentKey}
          sheet={paymentSheet}
          onConfirmIntent={handleConfirmIntent}
          onPaymentComplete={() => void handlePaymentComplete()}
          onPaymentError={handlePaymentError}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
})
