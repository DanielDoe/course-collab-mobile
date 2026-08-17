import { StyleSheet, Text, View } from "react-native"
import { useNativeType } from "../../lib/themed-module-theme"

/** Subtle label for AI-generated assistant content. */
export function CoraAiIndicator({ label = "Cora response" }: { label?: string }) {
  const type = useNativeType()
  return (
    <View style={styles.root} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={[type.footnote, styles.label]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignSelf: "flex-start" },
  label: {
    color: "#64748b",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
})
