import { useEffect, useMemo, useRef } from "react"
import { Platform, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import * as Haptics from "expo-haptics"
import Animated, {
  Easing,
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
import { useNativeType } from "../../lib/themed-module-theme"

export type FlashcardCelebrationPayload = {
  pointsEarned: number
  streakBonus?: number
  streak?: number
  bonusType?: "timed" | "boss"
  firstKnownThisWeek?: boolean
  /** Defaults to "XP" (flashcards). Assessments use "pts". */
  pointsLabel?: string
  /** Shown when pointsEarned is 0. Defaults to "Mastered!" */
  zeroPointsTitle?: string
  /** Optional subtitle chips — replaces streak/bonus lines when set. */
  messageLines?: string[]
  /** Visual tone — assessments set success/warning/danger; flashcards use default accent. */
  tone?: "success" | "warning" | "danger" | "default"
}

type Props = {
  payload: FlashcardCelebrationPayload
  onComplete: () => void
}

const PARTICLE_COUNT = 16
const DURATION_MS = 1300

function triggerCelebrationHaptic(tone?: FlashcardCelebrationPayload["tone"]) {
  if (Platform.OS !== "ios") return
  if (tone === "danger") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    return
  }
  if (tone === "warning") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    return
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

function Particle({
  index,
  color,
  progress,
}: {
  index: number
  color: string
  progress: SharedValue<number>
}) {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2
  const distance = 72 + (index % 4) * 18

  const style = useAnimatedStyle(() => {
    const p = progress.value
    return {
      opacity: (1 - p) * 0.95,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p - 24 * p },
        { scale: 1 - p * 0.55 },
      ],
    }
  })

  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />
}

function resolveCelebrationTheme(
  tokens: ReturnType<typeof useAppThemeTokens>,
  tone: FlashcardCelebrationPayload["tone"],
) {
  if (tone === "success") {
    return {
      glow: tokens.success,
      ring: tokens.success,
      badge: tokens.success,
      chipBg: tokens.success,
      chipText: tokens.success,
      particles: [tokens.success, tokens.accent, tokens.secondaryAccent, tokens.success],
    }
  }
  if (tone === "warning") {
    return {
      glow: tokens.warning,
      ring: tokens.warning,
      badge: tokens.warning,
      chipBg: tokens.warning,
      chipText: tokens.warning,
      particles: [tokens.warning, tokens.accent, tokens.success, tokens.warning],
    }
  }
  if (tone === "danger") {
    return {
      glow: tokens.danger,
      ring: tokens.danger,
      badge: tokens.danger,
      chipBg: tokens.danger,
      chipText: tokens.danger,
      particles: [tokens.danger, tokens.warning, tokens.accent, tokens.danger],
    }
  }
  return {
    glow: tokens.warning,
    ring: tokens.accent,
    badge: tokens.accent,
    chipBg: tokens.warning,
    chipText: tokens.accentDark,
    particles: [
      tokens.accent,
      tokens.warning,
      tokens.success,
      tokens.secondaryAccent,
      tokens.accentHover,
      ...tokens.chartPalette.slice(0, 4),
    ],
  }
}

export function FlashcardKnownCelebration({ payload, onComplete }: Props) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const burst = useSharedValue(0)
  const xpScale = useSharedValue(0)
  const xpY = useSharedValue(28)
  const ringScale = useSharedValue(0.4)
  const ringOpacity = useSharedValue(0)
  const glowOpacity = useSharedValue(0)
  const bonusOpacity = useSharedValue(0)

  const theme = useMemo(
    () => resolveCelebrationTheme(tokens, payload.tone),
    [payload.tone, tokens],
  )

  const particleColors = useMemo(
    () => theme.particles,
    [theme.particles],
  )

  const bonusLines = useMemo(() => {
    if (payload.messageLines?.length) return payload.messageLines.slice(0, 2)
    const lines: string[] = []
    if (payload.bonusType === "timed") lines.push("Speed bonus")
    if (payload.bonusType === "boss") lines.push("Boss card mastered")
    if ((payload.streakBonus ?? 0) > 0) lines.push(`+${payload.streakBonus} streak bonus`)
    if (payload.firstKnownThisWeek) lines.push("First mastered this week")
    if ((payload.streak ?? 0) >= 3) lines.push(`${payload.streak} card streak`)
    return lines.slice(0, 2)
  }, [payload])

  const pointsLabel = payload.pointsLabel ?? "XP"
  const zeroPointsTitle = payload.zeroPointsTitle ?? "Mastered!"
  const displayPoints =
    payload.pointsEarned % 1 === 0
      ? String(payload.pointsEarned)
      : payload.pointsEarned.toFixed(1)
  const badgeIcon =
    payload.tone === "success"
      ? "checkmark-circle"
      : payload.tone === "warning"
        ? "alert-circle"
        : payload.tone === "danger"
          ? "close-circle"
          : payload.pointsEarned > 0
            ? "sparkles"
            : "checkmark-circle"

  useEffect(() => {
    triggerCelebrationHaptic(payload.tone)

    burst.value = withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) })
    ringScale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 220 }),
      withTiming(1.45, { duration: 420, easing: Easing.out(Easing.quad) }),
    )
    ringOpacity.value = withSequence(
      withTiming(0.85, { duration: 180 }),
      withDelay(420, withTiming(0, { duration: 380 })),
    )
    glowOpacity.value = withSequence(
      withTiming(0.55, { duration: 160 }),
      withDelay(520, withTiming(0, { duration: 420 })),
    )
    xpScale.value = withDelay(
      80,
      withSequence(
        withSpring(1.12, { damping: 9, stiffness: 260 }),
        withSpring(1, { damping: 14, stiffness: 280 }),
      ),
    )
    xpY.value = withDelay(
      80,
      withTiming(-8, { duration: 720, easing: Easing.out(Easing.cubic) }),
    )
    bonusOpacity.value = withDelay(220, withTiming(1, { duration: 320 }))

    const timer = setTimeout(() => onCompleteRef.current(), DURATION_MS)
    return () => clearTimeout(timer)
  }, [bonusOpacity, burst, glowOpacity, payload.pointsEarned, payload.tone, ringOpacity, ringScale, xpScale, xpY])

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))

  const xpStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, xpScale.value),
    transform: [{ scale: xpScale.value }, { translateY: xpY.value }],
  }))

  const bonusStyle = useAnimatedStyle(() => ({
    opacity: bonusOpacity.value,
    transform: [{ translateY: (1 - bonusOpacity.value) * 12 }],
  }))

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[styles.glow, glowStyle, { backgroundColor: hexToRgba(theme.glow, 0.35) }]}
      />
      <Animated.View
        style={[styles.ring, ringStyle, { borderColor: hexToRgba(theme.ring, 0.55) }]}
      />

      {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
        <Particle
          key={index}
          index={index}
          color={particleColors[index % particleColors.length]}
          progress={burst}
        />
      ))}

      <Animated.View style={[styles.xpBadge, xpStyle, tokens.cardShadow]}>
        <View style={[styles.xpInner, { backgroundColor: theme.badge }]}>
          <Ionicons name={badgeIcon} size={22} color="#fff" />
          {payload.pointsEarned > 0 ? (
            <>
              <Text style={styles.xpAmount}>+{displayPoints}</Text>
              <Text style={styles.xpLabel}>{pointsLabel}</Text>
            </>
          ) : (
            <Text style={styles.masteredText}>{zeroPointsTitle}</Text>
          )}
        </View>
      </Animated.View>

      {bonusLines.length > 0 ? (
        <Animated.View style={[styles.bonusRow, bonusStyle]}>
          {bonusLines.map((line) => (
            <View
              key={line}
              style={[
                styles.bonusChip,
                {
                  backgroundColor: hexToRgba(theme.chipBg, tokens.isDark ? 0.22 : 0.14),
                  borderColor: hexToRgba(theme.chipBg, 0.35),
                },
              ]}
            >
              <Text style={[type.caption, styles.bonusText, { color: theme.chipText }]}>
                {line}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  ring: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  xpBadge: {
    borderRadius: 999,
    overflow: "hidden",
  },
  xpInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  xpAmount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  xpLabel: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  masteredText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bonusRow: {
    position: "absolute",
    bottom: "22%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  bonusChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bonusText: {
    fontWeight: "700",
  },
})
