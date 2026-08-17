import { Platform, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import {
  MembershipEmbeddedPayment,
  type MembershipEmbeddedPaymentProps,
} from "./MembershipEmbeddedPayment"

type Props = Omit<MembershipEmbeddedPaymentProps, "presentation"> & {
  visible: boolean
  onClose: () => void
  title?: string
}

export function MembershipCheckoutPaymentSheet({
  visible,
  onClose,
  title = "Choose a payment method",
  ...paymentProps
}: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Close payment sheet"
      maxHeight="92%"
      keyboardAvoiding
      // Stripe Embedded Payment Element is a native UIView — nesting it in the
      // sheet ScrollView collapses its height to a tiny strip.
      scrollable={false}
    >
      <GlassSheetBackground
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}
      >
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: native.label }]}>{title}</Text>
        <View style={styles.body}>
          <MembershipEmbeddedPayment {...paymentProps} presentation="sheet" />
        </View>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
    }),
  },
  title: {
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  body: {
    paddingHorizontal: 0,
  },
})
