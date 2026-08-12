import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  onPress: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  /** When true, lines animate to a compact close hint (optional). */
  active?: boolean
}

/** ChatGPT-style circular menu control — two left-aligned bars, top longer than bottom. */
export function CoraChatMenuButton({
  onPress,
  accessibilityLabel = "Open chat menu",
  style,
  active = false,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  const circleBg = tokens.isDark ? hexToRgba("#FFFFFF", 0.1) : hexToRgba("#3C3C43", 0.08)
  const lineColor = native.label

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.hit, pressed && { opacity: NATIVE.pressedOpacity }, style]}
    >
      <View style={[styles.circle, { backgroundColor: circleBg }]}>
        <View style={styles.lines}>
          <View
            style={[
              styles.line,
              {
                width: active ? 12 : 15,
                backgroundColor: lineColor,
              },
            ]}
          />
          <View
            style={[
              styles.line,
              {
                width: active ? 12 : 9,
                backgroundColor: lineColor,
              },
            ]}
          />
        </View>
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
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 10,
  },
  lines: {
    gap: 5,
    alignItems: "flex-start",
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
})
