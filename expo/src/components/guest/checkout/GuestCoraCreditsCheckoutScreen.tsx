import { useCallback, useEffect, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { NotetakerScreenHeader } from "../../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../../modules/ModuleScreen"
import { MembershipNativePaymentPresenterGate } from "../../support/MembershipNativePaymentPresenterGate"
import { GuestCoraCreditsCheckoutReviewPanel } from "./GuestCoraCreditsCheckoutReviewPanel"
import { useSession } from "../../../context/SessionProvider"
import { useGuestEntitlements } from "../../../context/GuestEntitlementsProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { ApiError } from "../../../lib/api"
import { coraCreditsApi } from "../../../lib/cora/credits/api"
import { guestApi } from "../../../lib/guest-api"
import {
  normalizeGuestDisplayCreditPacks,
  type GuestDisplayCreditPack,
} from "../../../lib/guest-cora-credits-utils"
import {
  createGuestCreditPackMobilePaymentIntent,
  isGuestNativePaymentUnavailable,
  prepareGuestCreditPackMobilePayment,
} from "../../../lib/guest-mobile-payment-api"
import { openGuestCoraCreditsSuccess } from "../../../lib/guest-checkout-paths"
import { openGuestCreditPackHostedCheckout } from "../../../lib/guest-stripe-hosted-checkout"
import {
  openGuestCreditPurchase,
  requiresExternalWebPurchase,
} from "../../../lib/purchase-navigation"
import type { GuestSession } from "../../../lib/session"
import type { MobilePaymentSheetResponse } from "../../../lib/membership-payment-api"
import { AppAlert } from "../../../lib/app-alert"
import { isStripeNativeAvailable } from "../../../lib/stripe-native"

type PackPaymentSheet = MobilePaymentSheetResponse & { packId: string; credits: number }

type Props = {
  packId: string
}

function useGuestSession(): GuestSession | null {
  const { session } = useSession()
  return session?.portal === "guest" ? session : null
}

export function GuestCoraCreditsCheckoutScreen({ packId }: Props) {
  const guestSession = useGuestSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { refresh: refreshEntitlements } = useGuestEntitlements()

  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [presentKey, setPresentKey] = useState(0)
  const [loadError, setLoadError] = useState("")
  const [paymentNotice, setPaymentNotice] = useState("")
  const [pack, setPack] = useState<GuestDisplayCreditPack | null>(null)
  const [paymentSheet, setPaymentSheet] = useState<PackPaymentSheet | null>(null)
  const lastPaymentIntentId = useRef<string | null>(null)

  const loadPack = useCallback(async () => {
    setLoadError("")
    try {
      const plansPayload = await guestApi.getPlans()
      const packs = normalizeGuestDisplayCreditPacks(plansPayload.creditPacks)
      const match = packs.find((item) => item.id === packId) ?? null
      if (!match) throw new ApiError("Credit pack not found.", 404)
      setPack(match)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load credit pack.")
    }
  }, [packId])

  const openHostedCheckout = useCallback(async () => {
    if (!guestSession || !pack) return
    setPaymentNotice("")
    await openGuestCreditPackHostedCheckout(guestSession, pack.id)
    setPaymentNotice("Complete payment in Safari. When you return, your balance will refresh automatically.")
  }, [guestSession, pack])

  const loadPayment = useCallback(async () => {
    if (!guestSession || !pack) return
    setPaymentNotice("")

    if (requiresExternalWebPurchase()) {
      try {
        setPaymentLoading(true)
        await openGuestCreditPurchase(guestSession, pack.id)
        setPaymentNotice("Complete payment in Safari. When you return, your balance will refresh automatically.")
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
      const sheet = await prepareGuestCreditPackMobilePayment(guestSession, pack.id)
      setPaymentSheet(sheet)
      setPresentKey((key) => key + 1)
    } catch (err) {
      setPaymentSheet(null)
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
      setPaymentNotice(err instanceof ApiError ? err.message : "Could not load in-app checkout.")
    } finally {
      setPaymentLoading(false)
    }
  }, [guestSession, openHostedCheckout, pack])

  useEffect(() => {
    setLoading(true)
    loadPack().finally(() => setLoading(false))
  }, [loadPack])

  const handlePaymentComplete = useCallback(async () => {
    try {
      if (lastPaymentIntentId.current) {
        await coraCreditsApi.confirmPurchase({ paymentIntentId: lastPaymentIntentId.current })
      }
      await refreshEntitlements()
      openGuestCoraCreditsSuccess(router, packId)
    } catch (err) {
      AppAlert.alert(
        "Purchase received",
        err instanceof Error ? err.message : "If credits don’t appear yet, pull to refresh in a moment.",
      )
      await refreshEntitlements()
      openGuestCoraCreditsSuccess(router, packId)
    } finally {
      setPaymentSheet(null)
      lastPaymentIntentId.current = null
    }
  }, [packId, refreshEntitlements, router])

  const handleConfirmIntent = useCallback(
    async ({
      paymentMethodId,
      shouldSavePaymentMethod,
    }: {
      paymentMethodId: string
      shouldSavePaymentMethod: boolean
    }) => {
      if (!guestSession || !paymentSheet) throw new Error("Session expired.")
      const result = await createGuestCreditPackMobilePaymentIntent(guestSession, {
        packId: paymentSheet.packId,
        paymentMethodId,
        shouldSavePaymentMethod,
      })
      lastPaymentIntentId.current = result.paymentIntentId
      return result
    },
    [guestSession, paymentSheet],
  )

  if (!pack && !loading && loadError) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Buy credits" fallbackHref="/module/cora-credits" />
        <ModuleScreen error={loadError} disableTopInsetAdjustment onRetryError={loadPack}>{null}</ModuleScreen>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Buy Cora Credits" fallbackHref="/module/cora-credits" />
      <ModuleScreen loading={loading} error={loadError} disableTopInsetAdjustment onRetryError={loadPack}>
        {pack ? (
          <>
            <GuestCoraCreditsCheckoutReviewPanel
              pack={pack}
              tokens={tokens}
              onNotNow={() => router.back()}
              onContinue={() => void loadPayment()}
              continueLoading={paymentLoading}
            />
            {paymentNotice ? (
              <Text style={[styles.notice, { color: native.secondaryLabel }]}>{paymentNotice}</Text>
            ) : null}
          </>
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
  notice: { marginTop: 8, paddingHorizontal: 4, fontSize: 14, lineHeight: 20 },
})
