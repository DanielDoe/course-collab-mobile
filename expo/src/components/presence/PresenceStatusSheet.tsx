import { Platform, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { PresenceStatusMenu } from "./PresenceStatusMenu"

type Props = {
  visible: boolean
  onClose: () => void
}

export function PresenceStatusSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Close status menu"
      maxHeight="70%"
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: native.label }]}>Set your status</Text>
        <PresenceStatusMenu onSelect={onClose} />
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
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
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
})
