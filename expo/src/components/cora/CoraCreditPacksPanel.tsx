import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { AppAlert } from "../../lib/app-alert"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { coraCreditsApi } from "../../lib/cora/credits/api"
import type { CoraCreditPack } from "../../lib/cora/credits/types"
import type { FacultySession, StudentSession } from "../../lib/session"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import { isStripeNativeAvailable } from "../../lib/stripe-native"
import type { MobilePaymentSheetResponse } from "../../lib/membership-payment-api"
import { MembershipNativePaymentPresenterGate } from "../support/MembershipNativePaymentPresenterGate"

type Props = {
  audience: "student" | "instructor"
  session: StudentSession | FacultySession | null
  onPurchased?: () => void
}

type PackPaymentSheet = MobilePaymentSheetResponse & { packId: string; credits: number }

/**
 * Cora Credit Packs — same native Stripe PaymentSheet path as membership upgrades.
 */
export function CoraCreditPacksPanel({ audience, session, onPurchased }: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  const [packs, setPacks] = useState<CoraCreditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentSheet, setPaymentSheet] = useState<PackPaymentSheet | null>(null)
  const [presentKey, setPresentKey] = useState(0)
  const lastPaymentIntentId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const next = await coraCreditsApi.listPacks(audience)
        if (!cancelled) setPacks(next)
      } catch {
        if (!cancelled) setError("Could not load credit packs.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [audience])

  const buy = useCallback(
    async (packId: string) => {
      if (!session) {
        setError("Sign in to purchase Cora Credits.")
        return
      }
      if (!isStripeNativeAvailable()) {
        setError(
          "Stripe checkout needs a native rebuild. From the expo folder run pod install, then npm run ios:sim.",
        )
        return
      }

      setBuyingId(packId)
      setError(null)
      lastPaymentIntentId.current = null
      try {
        const sheet =
          audience === "student"
            ? await coraCreditsApi.prepareStudentMobilePayment(session as StudentSession, packId)
            : await coraCreditsApi.prepareInstructorMobilePayment(session as FacultySession, packId)
        setPaymentSheet(sheet)
        setPresentKey((k) => k + 1)
      } catch (e) {
        setPaymentSheet(null)
        setError(e instanceof Error ? e.message : "Could not start checkout.")
      } finally {
        setBuyingId(null)
      }
    },
    [audience, session],
  )

  const handleConfirmIntent = useCallback(
    async ({
      paymentMethodId,
      shouldSavePaymentMethod,
    }: {
      paymentMethodId: string
      shouldSavePaymentMethod: boolean
    }) => {
      if (!session || !paymentSheet) throw new Error("Session expired.")
      const result =
        audience === "student"
          ? await coraCreditsApi.createStudentMobilePaymentIntent(session as StudentSession, {
              packId: paymentSheet.packId,
              paymentMethodId,
              shouldSavePaymentMethod,
            })
          : await coraCreditsApi.createInstructorMobilePaymentIntent(session as FacultySession, {
              packId: paymentSheet.packId,
              paymentMethodId,
              shouldSavePaymentMethod,
            })
      lastPaymentIntentId.current = result.paymentIntentId
      return result
    },
    [audience, paymentSheet, session],
  )

  const handlePaymentComplete = useCallback(async () => {
    try {
      if (lastPaymentIntentId.current) {
        await coraCreditsApi.confirmPurchase({ paymentIntentId: lastPaymentIntentId.current })
      }
      AppAlert.alert("Credits added", "Your Cora Credit pack is ready to use.")
      onPurchased?.()
    } catch (e) {
      AppAlert.alert(
        "Purchase received",
        e instanceof Error
          ? e.message
          : "If credits don’t appear yet, pull to refresh in a moment.",
      )
      onPurchased?.()
    } finally {
      setPaymentSheet(null)
      lastPaymentIntentId.current = null
    }
  }, [onPurchased])

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: hexToRgba(SN.accent, 0.12) }]}>
          <Ionicons name="flash" size={18} color={SN.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Cora Credit Packs</Text>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 18 }]}>
            Purchased credits are used after your membership allowance and expire after 12 months.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={SN.accent} />
        </View>
      ) : (
        <View style={styles.packList}>
          {packs.map((pack) => (
            <View
              key={pack.id}
              style={[
                styles.packCard,
                { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
              ]}
            >
              <View style={styles.packTop}>
                <Ionicons name="flash-outline" size={16} color={SN.accent} />
                <Text style={[type.bodyEmphasis, { color: native.label }]}>
                  {pack.credits.toLocaleString()} credits
                </Text>
              </View>
              <Text style={[type.sheetTitle, styles.price, { color: native.label }]}>
                {pack.priceDisplay}
              </Text>
              <Text style={[type.caption, { color: SN.tertiaryLabel }]}>{pack.perThousandDisplay}</Text>
              <Text style={[type.caption, styles.desc, { color: SN.secondaryLabel }]}>
                {pack.description}
              </Text>
              <Pressable
                disabled={!session || buyingId === pack.id}
                onPress={() => void buy(pack.id)}
                style={({ pressed }) => [
                  styles.buyBtn,
                  {
                    backgroundColor: SN.accent,
                    opacity: !session || buyingId === pack.id ? 0.55 : pressed ? NATIVE.pressedOpacity : 1,
                  },
                ]}
              >
                <Text style={styles.buyText}>
                  {buyingId === pack.id ? "Starting checkout…" : "Buy pack"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {error ? <Text style={[type.caption, { color: "#DC2626" }]}>{error}</Text> : null}

      {/* Same native PaymentSheet host used by membership upgrades */}
      {paymentSheet ? (
        <MembershipNativePaymentPresenterGate
          presentKey={presentKey}
          sheet={paymentSheet}
          methodProfile="cora_pack"
          primaryButtonLabel={`Pay $${(paymentSheet.amountCents / 100).toFixed(2)}`}
          onConfirmIntent={handleConfirmIntent}
          onPaymentComplete={() => void handlePaymentComplete()}
          onPaymentError={(message) => {
            setError(message)
            setPaymentSheet(null)
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
  root: { gap: 12, marginTop: 8, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 2 },
  packList: { gap: 10 },
  packCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  packTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  price: { fontSize: 22, marginTop: 4 },
  desc: { lineHeight: 18, marginTop: 2, marginBottom: 8 },
  buyBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 999,
    minHeight: 44,
  },
  buyText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  center: { alignItems: "center", gap: 8, paddingVertical: 24 },
})
