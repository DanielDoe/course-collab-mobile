import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  facultyCoraExitDockShadow,
  facultyCoraMaterialCardStyle,
} from "../../lib/faculty-cora-theme"

type Props = {
  label: string
  onExit: () => void
  backgroundColor?: string
  textColor?: string
}

/** Bottom exit control — leaves immersive Cora (no top header). */
export function CoraExitDock({ label, onExit, backgroundColor, textColor }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const appTokens = useAppThemeTokens()
  const cardShadow = facultyCoraMaterialCardStyle(appTokens.isDark, native.separator)
  const dockShadow = facultyCoraExitDockShadow()
  const solid = Boolean(backgroundColor)

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <Pressable
        onPress={onExit}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
        style={({ pressed }) => [
          styles.btn,
          solid ? dockShadow : cardShadow,
          {
            backgroundColor: backgroundColor ?? native.secondaryGrouped,
            opacity: pressed ? NATIVE.pressedOpacity : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[type.bodyEmphasis, { color: textColor ?? native.label }]}>{label}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 8,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 20,
  },
})
