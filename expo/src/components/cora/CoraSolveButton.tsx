import { Platform, Pressable, StyleSheet, Text } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import { CORA_BUTTON_GRADIENT, CORA_SOLVE_LABEL } from "../../lib/cora-constants"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"

type Props = {
  onPress: () => void
  disabled?: boolean
}

export function CoraSolveButton({ onPress, disabled = false }: Props) {
  const type = useNativeType()

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, disabled && styles.disabled, pressed && !disabled && { opacity: NATIVE.pressedOpacity }]}
    >
      <LinearGradient
        colors={CORA_BUTTON_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons name="sparkles" size={18} color="#ffffff" />
        <Text style={[type.bodyEmphasis, styles.label]}>{CORA_SOLVE_LABEL}</Text>
        <Ionicons name="list-outline" size={16} color="rgba(255,255,255,0.92)" />
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#4f46e5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  label: {
    color: "#ffffff",
  },
  disabled: {
    opacity: 0.45,
  },
})
