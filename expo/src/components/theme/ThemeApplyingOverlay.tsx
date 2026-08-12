import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { AppThemeTokens } from "../../constants/app-themes"
import { hexToRgba } from "../../constants/app-themes"

type Props = {
  tokens: AppThemeTokens
  message?: string
}

export function ThemeApplyingOverlay({ tokens, message = "Applying theme…" }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: hexToRgba(tokens.background, tokens.isDark ? 0.82 : 0.72),
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <View
        style={[
          styles.card,
          tokens.cardShadow,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.message, { color: tokens.text }]}>{message}</Text>
        <Text style={[styles.sub, { color: tokens.textSecondary }]}>Updating colors and surfaces</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    minWidth: 220,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  message: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  sub: { fontSize: 13, textAlign: "center" },
})
