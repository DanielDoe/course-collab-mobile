import type { ReactNode } from "react"
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import * as Haptics from "expo-haptics"
import type { GlassStyle } from "expo-glass-effect"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { GlassSurface, useGlassChromeActive } from "./GlassSurface"
import type { LiquidGlassIntensity } from "./LiquidCard"

type Props = {
  title: string
  description?: string
  intensity?: LiquidGlassIntensity
  style?: StyleProp<ViewStyle>
  children?: ReactNode
  onPress?: () => void
}

function intensityToGlassStyle(intensity: LiquidGlassIntensity): GlassStyle {
  return intensity === "low" ? "clear" : "regular"
}

function intensityToBlur(intensity: LiquidGlassIntensity): number {
  if (intensity === "high") return 72
  if (intensity === "medium") return 48
  return 32
}

function triggerLightHaptic() {
  if (Platform.OS !== "ios") return
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

function triggerSuccessHaptic() {
  if (Platform.OS !== "ios") return
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

/**
 * Pressable liquid card with scale animation and iOS haptic feedback.
 */
export function InteractiveLiquidCard({
  title,
  description,
  intensity = "medium",
  style,
  children,
  onPress,
}: Props) {
  const tokens = useAppThemeTokens()
  const glassActive = useGlassChromeActive()
  const scale = useSharedValue(1)
  const titleColor = tokens.isDark ? "#FFFFFF" : tokens.native.label
  const bodyColor = tokens.isDark ? "rgba(255,255,255,0.72)" : tokens.native.secondaryLabel

  const tapGesture = Gesture.Tap()
    .enabled(Boolean(onPress))
    .maxDuration(250)
    .onBegin(() => {
      scale.value = withTiming(0.97, { duration: 90 })
      runOnJS(triggerLightHaptic)()
    })
    .onFinalize(() => {
      scale.value = withTiming(1, { duration: 140 })
    })
    .onEnd(() => {
      if (onPress) runOnJS(onPress)()
      runOnJS(triggerSuccessHaptic)()
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const content = (
    <View style={styles.contentPadding}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: bodyColor }]}>{description}</Text>
      ) : null}
      {children}
    </View>
  )

  const cardBody = !glassActive ? (
    <View
      style={[
        styles.cardOuter,
        Platform.OS === "android" && styles.androidShadow,
        { backgroundColor: tokens.surface, borderColor: tokens.border },
        Platform.OS === "android" && styles.androidBorder,
      ]}
    >
      {content}
    </View>
  ) : (
    <View style={styles.cardOuter}>
      <GlassSurface
        style={StyleSheet.absoluteFill}
        glassEffectStyle={intensityToGlassStyle(intensity)}
        intensity={intensityToBlur(intensity)}
      />
      {content}
    </View>
  )

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[animatedStyle, style]}>{cardBody}</Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 8,
    width: "100%",
  },
  contentPadding: {
    padding: 18,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  androidBorder: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  androidShadow: {
    elevation: 3,
  },
})
