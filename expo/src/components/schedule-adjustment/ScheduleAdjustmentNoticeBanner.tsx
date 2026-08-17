import { useEffect, useRef, useState } from "react"
import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { INSTITUTIONAL_SAFEGUARD_NOTICE } from "../../lib/schedule-adjustment/workflow-steps"

const SHOW_MS = 3200
const FADE_MS = 280

export function ScheduleAdjustmentNoticeBanner() {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [visible, setVisible] = useState(true)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -6, duration: FADE_MS, useNativeDriver: true }),
      ]).start(() => setVisible(false))
    }, SHOW_MS)
    return () => clearTimeout(timer)
  }, [opacity, translateY])

  if (!visible) return null

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={INSTITUTIONAL_SAFEGUARD_NOTICE}
      style={[
        styles.banner,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: `${tokens.accent}18`,
        },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: tokens.accent }]} />
      <Ionicons name="shield-checkmark-outline" size={16} color={tokens.accent} style={styles.icon} />
      <View style={styles.copy}>
        <Text style={[type.caption, styles.title, { color: native.label }]}>Finalize only after approval</Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
          Departmental and institutional requirements must be satisfied first.
        </Text>
      </View>
      <Pressable
        onPress={() => setVisible(false)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.dismiss}
      >
        <Ionicons name="close" size={16} color={native.tertiaryLabel} />
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: 12,
    paddingVertical: 8,
    paddingRight: 8,
    minHeight: 44,
  },
  stripe: {
    width: 3,
    alignSelf: "stretch",
    marginRight: 10,
  },
  icon: { marginRight: 8 },
  copy: { flex: 1, gap: 1, minWidth: 0 },
  title: { fontWeight: "700" },
  dismiss: { padding: 4 },
})
