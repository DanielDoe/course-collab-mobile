import { memo, useEffect, useMemo, useRef } from "react"
import { Platform, StyleSheet, Text, View, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import * as Haptics from "expo-haptics"
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { COLOR_HUNT } from "../../lib/flashcard-difficulty-theme"

type Props = {
  points: number
  isCorrect: boolean
  visible: boolean
}

const PARTICLE_COUNT = 12
const BURST_MS = 560
const BADGE_LIFT_MS = 480

const PARTICLE_SPECS = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2
  return {
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    distance: 52 + (index % 3) * 12,
  }
})

function triggerHaptic(isCorrect: boolean) {
  if (Platform.OS !== "ios") return
  void Haptics.notificationAsync(
    isCorrect
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Warning,
  )
}

const BurstParticle = memo(function BurstParticle({
  spec,
  color,
  progress,
}: {
  spec: (typeof PARTICLE_SPECS)[number]
  color: string
  progress: SharedValue<number>
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value
    return {
      opacity: (1 - p) * 0.88,
      transform: [
        { translateX: spec.cos * spec.distance * p },
        { translateY: spec.sin * spec.distance * p - 16 * p },
        { scale: 1 - p * 0.45 },
      ],
    }
  })

  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />
})

export function PlaygroundPointsBurst({ points, isCorrect, visible }: Props) {
  const tokens = useAppThemeTokens()
  const burst = useSharedValue(0)
  const pop = useSharedValue(0.68)
  const lift = useSharedValue(14)
  const lastKey = useRef("")

  const particleColors = useMemo(
    () => [
      tokens.accent,
      COLOR_HUNT.orange,
      COLOR_HUNT.amber,
      tokens.success,
      tokens.warning,
      tokens.secondaryAccent,
    ],
    [tokens],
  )

  useEffect(() => {
    cancelAnimation(burst)
    cancelAnimation(pop)
    cancelAnimation(lift)

    if (!visible) {
      burst.value = 0
      pop.value = 0.68
      lift.value = 14
      return
    }

    const key = `${points}-${isCorrect}`
    if (lastKey.current === key) return
    lastKey.current = key

    triggerHaptic(isCorrect)
    burst.value = 0
    pop.value = 0.68
    lift.value = 14

    burst.value = withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) })
    pop.value = withSequence(
      withSpring(1.08, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 14, stiffness: 280 }),
    )
    lift.value = withDelay(
      36,
      withTiming(-6, { duration: BADGE_LIFT_MS, easing: Easing.out(Easing.cubic) }),
    )
  }, [visible, points, isCorrect, burst, pop, lift])

  const badgeWrapStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value),
    transform: [{ scale: pop.value }, { translateY: lift.value }],
  }))

  if (!visible) return null

  const fill = isCorrect ? tokens.success : tokens.danger
  const label = isCorrect && points > 0 ? `+${points}` : isCorrect ? "Correct" : "0"
  const glowFill = hexToRgba(fill, tokens.isDark ? 0.28 : 0.18)
  const badgeShadow = tokens.cardShadow as ViewStyle

  return (
    <View style={styles.overlay} pointerEvents="none">
      {PARTICLE_SPECS.map((spec, index) => (
        <BurstParticle
          key={index}
          spec={spec}
          color={particleColors[index % particleColors.length]}
          progress={burst}
        />
      ))}

      <Animated.View style={[styles.badgeWrap, badgeWrapStyle]}>
        <View style={[styles.glow, { backgroundColor: glowFill }]} />
        <View style={[styles.badge, badgeShadow]}>
          <View style={[styles.badgeInner, { backgroundColor: fill }]}>
            <Ionicons
              name={isCorrect ? "flash" : "close-circle"}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.badgeText}>{label}</Text>
            {isCorrect && points > 0 ? <Text style={styles.badgeLabel}>pts</Text> : null}
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  badge: {
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  badgeLabel: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
})
