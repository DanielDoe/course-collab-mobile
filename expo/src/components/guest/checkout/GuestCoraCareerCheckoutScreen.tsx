import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../../modules/ModuleScreen"
import { MembershipNativePaymentPresenterGate } from "../../support/MembershipNativePaymentPresenterGate"
import { GuestCoraCareerCheckoutReviewPanel } from "./GuestCoraCareerCheckoutReviewPanel"
import { useSession } from "../../../context/SessionProvider"
import { useGuestEntitlements } from "../../../context/GuestEntitlementsProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { ApiError } from "../../../lib/api"
import { coraCreditsApi } from "../../../lib/cora/credits/api"
import { guestApi } from "../../../lib/guest-api"
import { guestCoraCareerCheckoutPerks } from "../../../lib/guest-cora-career-checkout-hero-copy"
import { openGuestCoraCareerSuccess } from "../../../lib/guest-checkout-paths"
import {
  createGuestCoraCareerMobilePaymentIntent,
  isGuestNativePaymentUnavailable,
  prepareGuestCoraCareerMobilePayment,
} from "../../../lib/guest-mobile-payment-api"
import { openGuestCoraCareerHostedCheckout } from "../../../lib/guest-stripe-hosted-checkout"
import { shouldBlockNativeDigitalCheckout } from "../../../lib/compliance/ios-purchase-policy"
import { GUEST_CORA_CAREER_LIFETIME_CREDITS } from "../../../lib/guest-membership-config"
import type { GuestCareerPlan } from "../../../lib/guest-types"
import type { GuestSession } from "../../../lib/session"
import type { MobilePaymentSheetResponse } from "../../../lib/membership-payment-api"
import { AppAlert } from "../../../lib/app-alert"
import { isStripeNativeAvailable } from "../../../lib/stripe-native"

function useGuestSession(): GuestSession | null {
  const { session } = useSession()
  return session?.portal === "guest" ? session : null
}

export function GuestCoraCareerCheckoutScreen() {
  const guestSession = useGuestSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { entitlements, refresh: refreshEntitlements } = useGuestEntitlements()

  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [presentKey, setPresentKey] = useState(0)
  const [loadError, setLoadError] = useState("")
  const [paymentNotice, setPaymentNotice] = useState("")
  const [careerPlan, setCareerPlan] = useState<GuestCareerPlan | null>(null)
  const [paymentSheet, setPaymentSheet] = useState<MobilePaymentSheetResponse | null>(null)
  const lastPaymentIntentId = useRef<string | null>(null)

  const priceLabel =
    careerPlan?.priceLabel ?? entitlements.planConfig?.upgradePriceLabel ?? "$19.99 one-time"
  const creditsIncluded = careerPlan?.coraCreditsIncluded ?? GUEST_CORA_CAREER_LIFETIME_CREDITS

  const perks = useMemo(() => guestCoraCareerCheckoutPerks(creditsIncluded), [creditsIncluded])

  const loadPricing = useCallback(async () => {
    setLoadError("")
    try {
      const payload = await guestApi.getPlans()
      setCareerPlan(payload.plans?.find((item) => item.id === "cora_career") ?? null)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load plan details.")
    }
  }, [])

  const openHostedCheckout = useCallback(async () => {
    if (!guestSession) return
    setPaymentNotice("")
    await openGuestCoraCareerHostedCheckout(guestSession)
    setPaymentNotice("Complete payment in Safari. When you return, Cora Career will unlock automatically.")
  }, [guestSession])

  const loadPayment = useCallback(async () => {
    if (!guestSession) return
    setPaymentNotice("")

    if (shouldBlockNativeDigitalCheckout()) {
      try {
        setPaymentLoading(true)
        await openHostedCheckout()
      } catch (err) {
        setPaymentNotice(err instanceof ApiError ? err.message : "Could not open web checkout.")
      } finally {
        setPaymentLoading(false)
      }
      return
    }

    if (!isStripeNativeAvailable()) {
      try {
        setPaymentLoading(true)
        await openHostedCheckout()
      } catch (err) {
        setPaymentNotice(
          err instanceof ApiError
            ? err.message
            : "Stripe checkout needs a native rebuild, and browser checkout failed.",
        )
      } finally {
        setPaymentLoading(false)
      }
      return
    }

    setPaymentLoading(true)
    lastPaymentIntentId.current = null
    try {
      const sheet = await prepareGuestCoraCareerMobilePayment(guestSession)
      setPaymentSheet(sheet)
      setPresentKey((key) => key + 1)
    } catch (err) {
      setPaymentSheet(null)
      const message = err instanceof ApiError ? err.message : "Could not load in-app checkout."
      if (/email/i.test(message)) {
        AppAlert.alert("Email required", "Add your email in Settings before purchasing Cora Career.")
        router.push("/settings" as never)
        return
      }
      if (isGuestNativePaymentUnavailable(err)) {
        try {
          await openHostedCheckout()
          return
        } catch (hostedErr) {
          setPaymentNotice(
            hostedErr instanceof ApiError
              ? hostedErr.message
              : "Could not open Stripe checkout. Try again in a moment.",
          )
          return
        }
      }
      setPaymentNotice(message)
    } finally {
      setPaymentLoading(false)
    }
  }, [guestSession, openHostedCheckout, router])

  useEffect(() => {
    setLoading(true)
    loadPricing().finally(() => setLoading(false))
  }, [loadPricing])

  const handlePaymentComplete = useCallback(async () => {
    try {
      if (lastPaymentIntentId.current) {
        await coraCreditsApi.confirmPurchase({ paymentIntentId: lastPaymentIntentId.current })
      }
      await refreshEntitlements()
      openGuestCoraCareerSuccess(router)
    } catch (err) {
      AppAlert.alert(
        "Purchase received",
        err instanceof Error ? err.message : "If access doesn’t appear yet, pull to refresh in a moment.",
      )
      await refreshEntitlements()
      openGuestCoraCareerSuccess(router)
    } finally {
      setPaymentSheet(null)
      lastPaymentIntentId.current = null
    }
  }, [refreshEntitlements, router])

  const handleConfirmIntent = useCallback(
    async ({
      paymentMethodId,
      shouldSavePaymentMethod,
    }: {
      paymentMethodId: string
      shouldSavePaymentMethod: boolean
    }) => {
      if (!guestSession) throw new Error("Session expired.")
      const result = await createGuestCoraCareerMobilePaymentIntent(guestSession, {
        paymentMethodId,
        shouldSavePaymentMethod,
      })
      lastPaymentIntentId.current = result.paymentIntentId
      return result
    },
    [guestSession],
  )

  if (entitlements.plan === "cora_career") {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Cora Career" fallbackHref="/module/cora-career" />
        <View style={styles.center}>
          <Text style={{ color: native.secondaryLabel }}>You already have Cora Career.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Upgrade to Cora Career" fallbackHref="/module/cora-career" />
      <ModuleScreen
        loading={loading}
        error={loadError}
        disableTopInsetAdjustment
        onRetryError={loadPricing}
      >
        <GuestCoraCareerCheckoutReviewPanel
          tierLabel="Cora Career"
          priceLabel={priceLabel}
          perks={perks}
          tokens={tokens}
          onNotNow={() => router.back()}
          onContinue={() => void loadPayment()}
          continueLoading={paymentLoading}
        />
        {paymentNotice ? (
          <Text style={[styles.notice, { color: native.secondaryLabel }]}>{paymentNotice}</Text>
        ) : null}
      </ModuleScreen>

      {paymentSheet ? (
        <MembershipNativePaymentPresenterGate
          presentKey={presentKey}
          sheet={paymentSheet}
          methodProfile="cora_pack"
          primaryButtonLabel={`Pay $${(paymentSheet.amountCents / 100).toFixed(2)}`}
          onConfirmIntent={handleConfirmIntent}
          onPaymentComplete={() => void handlePaymentComplete()}
          onPaymentError={(message) => {
            setPaymentSheet(null)
            setPaymentNotice(message)
            AppAlert.alert("Payment", message)
          }}
          onCanceled={() => {
            setPaymentSheet(null)
            lastPaymentIntentId.current = null
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notice: { marginTop: 8, paddingHorizontal: 4, fontSize: 14, lineHeight: 20 },
})
