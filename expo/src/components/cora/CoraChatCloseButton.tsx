import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  onPress: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}

/** Circular exit control — pairs with CoraChatMenuButton in immersive chat chrome. */
export function CoraChatCloseButton({
  onPress,
  accessibilityLabel = "Exit to Cora",
  style,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const circleBg = tokens.isDark ? hexToRgba("#FFFFFF", 0.1) : hexToRgba("#3C3C43", 0.08)

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.hit, pressed && { opacity: NATIVE.pressedOpacity }, style]}
    >
      <View style={[styles.circle, { backgroundColor: circleBg }]}>
        <Ionicons name="close" size={17} color={native.label} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
})
