import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import {
  AddressCollectionMode,
  CollectionMode,
  LinkDisplay,
  useEmbeddedPaymentElement,
  type EmbeddedPaymentElementConfiguration,
  type IntentConfiguration,
  type IntentCreationCallbackParams,
} from "@stripe/stripe-react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { STRIPE_RETURN_URL } from "../../context/StripeAppProvider"
import { buildStripeCheckoutAppearance } from "../../lib/stripe-checkout-appearance"
import { membershipPaymentMethodTypesForAmount } from "../../lib/membership-payment-methods"
import type { MobilePaymentSheetResponse } from "../../lib/membership-payment-api"
import { formatPriceFromCents, formatSemesterPrice } from "../../lib/membership-plans"

/** PlatformPay.ButtonType.Buy — use literal; enum export is undefined in some RN builds. */
const APPLE_GOOGLE_PAY_BUTTON_BUY = 1

export type ConfirmIntentRequest = {
  paymentMethodId: string
  shouldSavePaymentMethod: boolean
}

export type MembershipEmbeddedPaymentProps = {
  sheet: MobilePaymentSheetResponse
  payLabel?: string
  /** Compact sheet layout (default). Page keeps a denser full-screen chrome. */
  presentation?: "sheet" | "page"
  onConfirmIntent: (request: ConfirmIntentRequest) => Promise<{ clientSecret: string }>
  onPaymentComplete: () => void
  onPaymentError: (message: string) => void
}

export function MembershipEmbeddedPaymentNative({
  sheet,
  payLabel,
  presentation = "sheet",
  onConfirmIntent,
  onPaymentComplete,
  onPaymentError,
}: MembershipEmbeddedPaymentProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { session } = useSession()
  const sessionEmail = session && "email" in session ? (session.email as string | undefined) : undefined
  const [processing, setProcessing] = useState(false)
  const isSheet = presentation === "sheet"

  const confirmHandler = useCallback(
    async (
      paymentMethod: { id: string },
      shouldSavePaymentMethod: boolean,
      intentCreationCallback: (result: IntentCreationCallbackParams) => void,
    ) => {
      try {
        const { clientSecret } = await onConfirmIntent({
          paymentMethodId: paymentMethod.id,
          shouldSavePaymentMethod,
        })
        intentCreationCallback({ clientSecret })
      } catch (error) {
        intentCreationCallback({
          error: {
            code: "Failed",
            message: error instanceof Error ? error.message : "Payment setup failed.",
          },
        })
      }
    },
    [onConfirmIntent],
  )

  const paymentMethodTypes = useMemo(
    () => membershipPaymentMethodTypesForAmount(sheet.amountCents),
    [sheet.amountCents],
  )

  const intentConfig = useMemo<IntentConfiguration>(
    () => ({
      mode: {
        amount: sheet.amountCents,
        currencyCode: sheet.currency.toUpperCase(),
        // Do not force OffSession here — Klarna/Amazon Pay won't show if we do.
        // Save-for-future is applied per method on the PaymentIntent when supported.
      },
      paymentMethodTypes,
      confirmHandler,
    }),
    [confirmHandler, paymentMethodTypes, sheet.amountCents, sheet.currency],
  )

  const elementConfig = useMemo<EmbeddedPaymentElementConfiguration>(() => {
    const merchant = sheet.merchantDisplayName || "CourseCollab"
    const amountDollars = (sheet.amountCents / 100).toFixed(2)
    const tierLabel = sheet.tier ? `${sheet.tier} membership` : "Membership"
    const cadenceLabel =
      sheet.billingCadence === "annual"
        ? "Annual access"
        : sheet.billingCadence === "monthly"
          ? "Monthly access"
          : "Semester access"

    return {
      merchantDisplayName: merchant,
      customerId: sheet.customerId,
      customerSessionClientSecret: sheet.customerSessionClientSecret,
      returnURL: STRIPE_RETURN_URL,
      // Digital membership — don't force a full billing address in Apple Pay
      // (that was causing the "Update Billing Address" dead-end).
      billingDetailsCollectionConfiguration: {
        name: CollectionMode.AUTOMATIC,
        email: CollectionMode.NEVER,
        phone: CollectionMode.NEVER,
        address: AddressCollectionMode.NEVER,
        attachDefaultsToPaymentMethod: true,
      },
      defaultBillingDetails: {
        name: session?.name || undefined,
        email: sessionEmail,
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
      // Required for US bank account (ACH).
      allowsDelayedPaymentMethods: true,
      allowsRemovalOfLastSavedPaymentMethod: true,
      removeSavedPaymentMethodMessage: "Remove this card from CourseCollab?",
      appearance: buildStripeCheckoutAppearance(tokens),
      style: tokens.isDark ? "alwaysDark" : "alwaysLight",
    }
  }, [paymentMethodTypes, sessionEmail, session?.name, sheet, tokens])

  const {
    embeddedPaymentElementView,
    paymentOption,
    confirm,
    loadingError,
  } = useEmbeddedPaymentElement(intentConfig, elementConfig)

  useEffect(() => {
    if (!loadingError) return
    console.warn("[membership-checkout] Embedded Payment Element failed:", loadingError.message)
    onPaymentError(loadingError.message)
  }, [loadingError, onPaymentError])

  const amountLabel = formatPriceFromCents(sheet.amountCents)
  const displayAmount = formatSemesterPrice(sheet.amountCents)
  const ctaLabel =
    payLabel ??
    (paymentOption
      ? `Pay ${displayAmount}`
      : "Choose a payment method")

  async function handlePay() {
    if (!paymentOption || processing) return
    setProcessing(true)
    try {
      const result = await confirm()
      if (result.status === "completed") {
        onPaymentComplete()
        return
      }
      if (result.status === "failed") {
        onPaymentError(result.error.message)
      }
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : "Payment failed.")
    } finally {
      setProcessing(false)
    }
  }

  const walletHint = (() => {
    const methods =
      Platform.OS === "ios"
        ? "Apple Pay, Link, Cash App, a card, or a bank account"
        : Platform.OS === "android"
          ? "Google Pay, Link, Cash App, a card, or a bank account"
          : "Link, Cash App, a card, or a bank account"
    return `Pay with ${methods}.`
  })()

  const methodLine = paymentOption
    ? `Semester · ${paymentOption.label}`
    : "Semester billing · choose a method below"

  return (
    <View style={[styles.wrap, isSheet && styles.wrapSheet]}>
      <View
        style={[
          styles.summary,
          {
            backgroundColor: tokens.surface,
            borderColor: native.separator,
          },
        ]}
      >
        <View style={styles.summaryMain}>
          <View style={styles.summaryCopy}>
            <Text style={[styles.summaryLabel, { color: native.secondaryLabel }]}>
              Total due today
            </Text>
            <Text style={[styles.summaryMeta, { color: native.tertiaryLabel }]} numberOfLines={1}>
              {methodLine}
            </Text>
          </View>
          <Text style={[styles.summaryAmount, { color: tokens.text }]}>{amountLabel}</Text>
        </View>
      </View>

      <Text style={[styles.sectionHint, { color: native.secondaryLabel }]}>
        {walletHint} Saved cards can be reused anytime.
      </Text>

      <View
        style={[
          styles.elementHost,
          isSheet && styles.elementHostSheet,
          { opacity: embeddedPaymentElementView ? 1 : 0.35 },
        ]}
      >
        {embeddedPaymentElementView}
        {!embeddedPaymentElementView && !loadingError ? (
          <View style={styles.elementLoading}>
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : null}
      </View>

      <Text style={[styles.footerNote, { color: native.secondaryLabel }]}>
        Saved cards stay on your account for faster checkout. Remove them anytime from the list above.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        disabled={!paymentOption || processing || !!loadingError}
        onPress={() => void handlePay()}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: tokens.accent,
            opacity: !paymentOption || processing || loadingError ? 0.5 : pressed ? 0.86 : 1,
          },
        ]}
      >
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="lock-closed-outline" size={18} color="#fff" />
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  wrapSheet: { gap: 12, paddingBottom: 4, flexShrink: 1 },
  summary: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  summaryMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryMeta: {
    fontSize: 13,
    fontWeight: "400",
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  elementHost: {
    width: "100%",
    minHeight: Platform.OS === "android" ? 320 : 280,
    overflow: "hidden",
  },
  elementHostSheet: {
    minHeight: Platform.OS === "android" ? 360 : 320,
  },
  elementLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 2,
  },
  cta: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600" },
})
