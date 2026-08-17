import { StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"

type Props = {
  label: string
}

/** Centered iMessage-style day/time stamp between chat turns. */
export function CoraChatDayDivider({ label }: Props) {
  const native = useThemedNative()

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="header"
      accessibilityLabel={label}
    >
      <Text style={[styles.label, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  label: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
})
