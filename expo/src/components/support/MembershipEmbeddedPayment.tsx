import { useMemo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { isStripeNativeAvailable } from "../../lib/stripe-native"
import type { MembershipEmbeddedPaymentProps } from "./MembershipEmbeddedPaymentNative"
import { MembershipEmbeddedPaymentNative } from "./MembershipEmbeddedPaymentNative"

export type {
  ConfirmIntentRequest,
  MembershipEmbeddedPaymentProps,
} from "./MembershipEmbeddedPaymentNative"

export function MembershipEmbeddedPayment(props: MembershipEmbeddedPaymentProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const nativeReady = useMemo(() => isStripeNativeAvailable(), [])

  if (!nativeReady) {
    return (
      <View style={[styles.notice, { backgroundColor: tokens.surface, borderColor: native.separator }]}>
        <Ionicons name="build-outline" size={22} color={tokens.accent} />
        <View style={styles.noticeCopy}>
          <Text style={[styles.noticeTitle, { color: tokens.text }]}>Native rebuild required</Text>
          <Text style={[styles.noticeBody, { color: native.secondaryLabel }]}>
            Stripe checkout needs a dev build with native modules linked. From the expo folder run pod install, then
            rebuild: npm run ios:sim
          </Text>
        </View>
      </View>
    )
  }

  return <MembershipEmbeddedPaymentNative {...props} />
}

const styles = StyleSheet.create({
  notice: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  noticeCopy: { flex: 1, minWidth: 0, gap: 4 },
  noticeTitle: { fontSize: 15, fontWeight: "600" },
  noticeBody: { fontSize: 13, lineHeight: 18 },
})
