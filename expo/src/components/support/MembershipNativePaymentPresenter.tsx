import { useCallback, useEffect, useRef } from "react"
import { AppState, InteractionManager, Platform, View, type AppStateStatus } from "react-native"
import { AddressCollectionMode, CollectionMode, LinkDisplay, usePaymentSheet } from "@stripe/stripe-react-native"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { STRIPE_RETURN_URL } from "../../context/StripeAppProvider"
import { buildStripeCheckoutAppearance } from "../../lib/stripe-checkout-appearance"
import {
  coraPackPaymentMethodTypes,
  membershipPaymentMethodTypesForAmount,
} from "../../lib/membership-payment-methods"
import type { MobilePaymentSheetResponse } from "../../lib/membership-payment-api"
import type { ConfirmIntentRequest } from "./MembershipEmbeddedPaymentNative"

/** PlatformPay.ButtonType.Buy — enum export is undefined in some RN builds. */
const APPLE_GOOGLE_PAY_BUTTON_BUY = 1

/** Never leave Stripe waiting forever on confirmHandler. */
const CONFIRM_HANDLER_TIMEOUT_MS = 25_000

export type MembershipNativePaymentPresenterProps = {
  /** Bumps to open Stripe’s native PaymentSheet (after sheet payload is ready). */
  presentKey: number
  sheet: MobilePaymentSheetResponse
  primaryButtonLabel?: string
  /** Restrict methods for small one-time packs (default: membership list). */
  methodProfile?: "membership" | "cora_pack"
  onConfirmIntent: (request: ConfirmIntentRequest) => Promise<{ clientSecret: string }>
  onPaymentComplete: () => void
  onPaymentError: (message: string) => void
  onCanceled?: () => void
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out. Close the sheet and try again.`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * Presents Stripe’s native PaymentSheet.
 */
export function MembershipNativePaymentPresenter({
  presentKey,
  sheet,
  primaryButtonLabel,
  methodProfile = "membership",
  onConfirmIntent,
  onPaymentComplete,
  onPaymentError,
  onCanceled,
}: MembershipNativePaymentPresenterProps) {
  const tokens = useAppThemeTokens()
  const { session } = useSession()
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet()
  const busyRef = useRef(false)
  const lastPresentKey = useRef(0)
  const presentingRef = useRef(false)
  const confirmRef = useRef(onConfirmIntent)
  confirmRef.current = onConfirmIntent

  const runCheckout = useCallback(async () => {
    if (presentKey <= 0 || presentKey === lastPresentKey.current) return
    if (busyRef.current) return
    lastPresentKey.current = presentKey
    busyRef.current = true

    const merchant = sheet.merchantDisplayName || "CourseCollab"
    const amountDollars = (sheet.amountCents / 100).toFixed(2)
    const tierLabel = sheet.tier ? `${sheet.tier}` : "CourseCollab"
    const cadenceLabel =
      sheet.billingCadence === "annual"
        ? "Annual access"
        : sheet.billingCadence === "monthly"
          ? "Monthly access"
          : sheet.billingCadence === "one_time"
            ? "One-time purchase"
            : "Semester access"
    const paymentMethodTypes =
      methodProfile === "cora_pack"
        ? coraPackPaymentMethodTypes()
        : membershipPaymentMethodTypesForAmount(sheet.amountCents)

    try {
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve())
      })
      await new Promise((r) => setTimeout(r, Platform.OS === "ios" ? 200 : 80))

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: merchant,
        customerId: sheet.customerId,
        customerSessionClientSecret: sheet.customerSessionClientSecret,
        returnURL: STRIPE_RETURN_URL,
        allowsDelayedPaymentMethods: methodProfile === "membership",
        allowsRemovalOfLastSavedPaymentMethod: true,
        removeSavedPaymentMethodMessage: "Remove this card from CourseCollab?",
        primaryButtonLabel,
        appearance: buildStripeCheckoutAppearance(tokens),
        style: tokens.isDark ? "alwaysDark" : "alwaysLight",
        billingDetailsCollectionConfiguration: {
          name: CollectionMode.AUTOMATIC,
          email: CollectionMode.NEVER,
          phone: CollectionMode.NEVER,
          address: AddressCollectionMode.NEVER,
          attachDefaultsToPaymentMethod: true,
        },
        defaultBillingDetails: {
          name: session?.name || undefined,
          email: (session as { email?: string } | null)?.email || undefined,
        },
        applePay: {
          merchantCountryCode: sheet.merchantCountryCode || "US",
          buttonType: APPLE_GOOGLE_PAY_BUTTON_BUY,
          cartItems: [
            {
              paymentType: "Immediate",
              label: `${tierLabel} · ${cadenceLabel}`,
              amount: amountDollars,
            },
            {
              paymentType: "Immediate",
              label: merchant,
              amount: amountDollars,
            },
          ],
        },
        googlePay: {
          merchantCountryCode: sheet.merchantCountryCode || "US",
          currencyCode: (sheet.currency || "usd").toUpperCase(),
          testEnv: __DEV__,
          label: `${tierLabel} · ${cadenceLabel}`,
          amount: amountDollars,
          buttonType: APPLE_GOOGLE_PAY_BUTTON_BUY,
        },
        link: {
          display: LinkDisplay.AUTOMATIC,
        },
        paymentMethodOrder: paymentMethodTypes,
        intentConfiguration: {
          mode: {
            amount: sheet.amountCents,
            currencyCode: sheet.currency.toUpperCase(),
          },
          paymentMethodTypes,
          confirmHandler: (paymentMethod, shouldSavePaymentMethod, intentCreationCallback) => {
            void (async () => {
              let settled = false
              const finish = (result: Parameters<typeof intentCreationCallback>[0]) => {
                if (settled) return
                settled = true
                intentCreationCallback(result)
              }
              try {
                const { clientSecret } = await withTimeout(
                  confirmRef.current({
                    paymentMethodId: paymentMethod.id,
                    shouldSavePaymentMethod,
                  }),
                  CONFIRM_HANDLER_TIMEOUT_MS,
                  "Payment setup",
                )
                finish({ clientSecret })
              } catch (error) {
                finish({
                  error: {
                    code: "Failed",
                    message:
                      error instanceof Error ? error.message : "Payment setup failed.",
                  },
                })
              }
            })()
          },
        },
      })

      if (initError) {
        onPaymentError(initError.message)
        return
      }

      presentingRef.current = true
      const { error: presentError } = await presentPaymentSheet()
      presentingRef.current = false

      if (presentError) {
        if (presentError.code === "Canceled") {
          onCanceled?.()
          return
        }
        onPaymentError(presentError.message)
        return
      }

      onPaymentComplete()
    } catch (error) {
      presentingRef.current = false
      console.warn("[membership-checkout] PaymentSheet failed:", error)
      onPaymentError(error instanceof Error ? error.message : "Could not open payment sheet.")
    } finally {
      busyRef.current = false
      presentingRef.current = false
    }
  }, [
    initPaymentSheet,
    methodProfile,
    onCanceled,
    onPaymentComplete,
    onPaymentError,
    presentKey,
    presentPaymentSheet,
    primaryButtonLabel,
    session,
    sheet,
    tokens,
  ])

  useEffect(() => {
    void runCheckout()
  }, [runCheckout])

  useEffect(() => {
    let softCancelTimer: ReturnType<typeof setTimeout> | null = null
    const onChange = (state: AppStateStatus) => {
      if (state !== "active" || !presentingRef.current) return
      if (softCancelTimer) clearTimeout(softCancelTimer)
      softCancelTimer = setTimeout(() => {
        if (presentingRef.current) {
          console.warn(
            "[membership-checkout] Returned to app while PaymentSheet still open — use Close (X) if Processing is stuck.",
          )
        }
      }, 1500)
    }
    const sub = AppState.addEventListener("change", onChange)
    return () => {
      sub.remove()
      if (softCancelTimer) clearTimeout(softCancelTimer)
    }
  }, [])

  return <View collapsable={false} style={{ width: 0, height: 0 }} />
}
