import { useEffect } from "react"
import { Modal, StyleSheet, Text, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

type Props = {
  visible: boolean
}

export function NotetakerSaveFlash({ visible }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const scale = useSharedValue(0.6)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (!visible) {
      scale.value = 0.6
      opacity.value = 0
      return
    }
    opacity.value = withTiming(1, { duration: 180 })
    scale.value = withSequence(
      withTiming(1.08, { duration: 220, easing: Easing.out(Easing.back(1.4)) }),
      withTiming(1, { duration: 120 }),
    )
  }, [visible, opacity, scale])

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.backdrop} pointerEvents="none">
        <Animated.View
          style={[styles.card, cardStyle, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${tokens.success}18` }]}>
            <Ionicons name="checkmark-circle" size={36} color={tokens.success} />
          </View>
          <Text style={[type.bodyEmphasis, styles.label]}>Note saved</Text>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 17,
  },
})
