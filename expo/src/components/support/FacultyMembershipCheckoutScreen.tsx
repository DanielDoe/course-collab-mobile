import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/api"
import type { FacultySession } from "../../lib/session"
import type { FacultyMembershipTier } from "../../types/dashboard"
import {
  formatFacultyPlanPriceLabel,
  type FacultyBillingCadence,
} from "../../lib/faculty-membership-plans"
import {
  annualPriceCentsForFacultyTier,
  fetchFacultyMembershipPlanPricing,
  semesterPriceCentsForFacultyTier,
} from "../../lib/faculty-membership-pricing-api"
import { getThemedFacultyMembershipPlan } from "../../lib/faculty-membership-plan-theme"
import {
  createFacultyMembershipPaymentIntent,
  prepareFacultyMembershipPaymentSheet,
  type MobilePaymentSheetResponse,
} from "../../lib/membership-payment-api"
import { syncFacultyMembershipFromStripe } from "../../lib/membership-checkout-api"
import { MembershipNativePaymentPresenterGate } from "./MembershipNativePaymentPresenterGate"
import { FacultyMembershipCheckoutReviewPanel } from "./FacultyMembershipCheckoutReviewPanel"
import { AppAlert } from "../../lib/app-alert"
import { isStripeNativeAvailable } from "../../lib/stripe-native"
import { requiresExternalWebPurchase } from "../../lib/purchase-navigation"

type Props = {
  plan: FacultyMembershipTier
  cadence?: FacultyBillingCadence
}

export function FacultyMembershipCheckoutScreen({ plan: tier, cadence = "semester" }: Props) {
  const { session } = useSession()
  const facultySession = session?.portal === "faculty" ? (session as FacultySession) : null
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { refreshFacultyData } = useFacultyShell()
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [presentKey, setPresentKey] = useState(0)
  const [error, setError] = useState("")
  const [pricing, setPricing] = useState<Awaited<ReturnType<typeof fetchFacultyMembershipPlanPricing>> | null>(null)
  const [paymentSheet, setPaymentSheet] = useState<MobilePaymentSheetResponse | null>(null)

  const plan = useMemo(() => getThemedFacultyMembershipPlan(tier, tokens), [tier, tokens])
  const displayCents =
    cadence === "annual"
      ? annualPriceCentsForFacultyTier(pricing, tier)
      : semesterPriceCentsForFacultyTier(pricing, tier)

  const loadPricing = useCallback(async () => {
    if (!facultySession) return
    setError("")
    try {
      const pricingPayload = await fetchFacultyMembershipPlanPricing(facultySession.id).catch(() => null)
      setPricing(pricingPayload)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load plan details.")
    }
  }, [facultySession])

  const goToSuccess = useCallback(() => {
    router.replace({
      pathname: "/membership/success",
      params: { plan: tier },
    } as never)
  }, [router, tier])

  const loadPayment = useCallback(async () => {
    if (!facultySession) return
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
      const sheetPayload = await prepareFacultyMembershipPaymentSheet(facultySession.id, tier, cadence)
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
  }, [cadence, facultySession, tier])

  useEffect(() => {
    setLoading(true)
    loadPricing().finally(() => setLoading(false))
  }, [loadPricing])

  const handlePaymentComplete = useCallback(async () => {
    if (!facultySession) return
    try {
      await syncFacultyMembershipFromStripe(facultySession.id)
      await refreshFacultyData?.(undefined, { force: true })
      goToSuccess()
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Payment succeeded but sync failed. Check Billing."
      AppAlert.alert("Membership syncing", message)
      goToSuccess()
    }
  }, [facultySession, goToSuccess, refreshFacultyData])

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
      if (!facultySession) throw new Error("Session expired.")
      return createFacultyMembershipPaymentIntent(facultySession.id, {
        tier,
        billingCadence: cadence,
        paymentMethodId,
        shouldSavePaymentMethod,
      })
    },
    [cadence, facultySession, tier],
  )

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={`Upgrade to ${plan.name}`} fallbackHref="/membership" />
      <ModuleScreen
        loading={loading}
        error={error}
        disableTopInsetAdjustment
        onRetryError={loadPricing}
      >
        <FacultyMembershipCheckoutReviewPanel
          plan={plan}
          priceCents={displayCents}
          cadence={cadence}
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
          primaryButtonLabel={`Pay ${formatFacultyPlanPriceLabel(paymentSheet.amountCents, cadence)}`}
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
})
