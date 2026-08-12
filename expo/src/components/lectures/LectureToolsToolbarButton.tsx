import { Pressable, StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

type Props = {
  onPress: () => void
}

/** Toolbar control for lecture slide tools — icon + label, not an ambiguous dot menu. */
export function LectureToolsToolbarButton({ onPress }: Props) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: tokens.accentSoftStrong,
          borderColor: tokens.accentBorder,
        },
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Open lecture tools"
    >
      <Ionicons name="layers-outline" size={15} color={tokens.accent} />
      <Text style={[type.caption, styles.label, { color: tokens.accentDark }]}>Tools</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontWeight: "600",
    letterSpacing: -0.1,
  },
})
