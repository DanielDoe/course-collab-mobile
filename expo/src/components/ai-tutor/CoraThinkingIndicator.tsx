import { useEffect, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import { CORA_NAME } from "../../lib/cora-constants"
import { CoraBrand } from "../cora/CoraBrand"

type ThinkingPhase = {
  label: string
  detail: string
}

const GENERIC_PHASES: ThinkingPhase[] = [
  { label: "Reading your message", detail: "Picking up what you need help with" },
  { label: "Connecting course context", detail: "Linking to your class material" },
  { label: "Exploring ideas", detail: "Mapping a few ways to explain this" },
  { label: "Reasoning through steps", detail: "Building a clear path forward" },
  { label: "Polishing the answer", detail: "Making it easy to follow" },
]

const CIRCUIT_PHASES: ThinkingPhase[] = [
  { label: "Reading your imported problem", detail: "Loading the question details" },
  { label: "Studying the circuit diagram", detail: "Tracing nodes, sources, and branches" },
  { label: "Setting up nodal equations", detail: "Choosing reference nodes and signs" },
  { label: "Tracing currents & voltages", detail: "Following KCL around the network" },
  { label: "Checking units and signs", detail: "Sanity-checking the math" },
  { label: "Packaging your walkthrough", detail: "Turning analysis into clear steps" },
]

const CODEBENCH_PHASES: ThinkingPhase[] = [
  { label: "Reading your code", detail: "Scanning structure, loops, and variables" },
  { label: "Tracing execution", detail: "Following how your program runs line by line" },
  { label: "Exploring runtime state", detail: "Tracking values in memory at each step" },
  { label: "Building your walkthrough", detail: "Turning the trace into clear steps" },
  { label: "Polishing the explanation", detail: "Making each step easy to follow" },
]

const PHASE_MS = 1900

export type CoraThinkingContext = "generic" | "circuit" | "codebench"

function ThinkingDots({ color }: { color: string }) {
  const dot1 = useSharedValue(0.35)
  const dot2 = useSharedValue(0.35)
  const dot3 = useSharedValue(0.35)

  useEffect(() => {
    const pulse = (value: typeof dot1, delay: number) => {
      value.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
            withTiming(0.35, { duration: 420, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          false,
        ),
      )
    }
    pulse(dot1, 0)
    pulse(dot2, 140)
    pulse(dot3, 280)
  }, [dot1, dot2, dot3])

  const s1 = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ scale: 0.82 + dot1.value * 0.28 }],
  }))
  const s2 = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ scale: 0.82 + dot2.value * 0.28 }],
  }))
  const s3 = useAnimatedStyle(() => ({
    opacity: dot3.value,
    transform: [{ scale: 0.82 + dot3.value * 0.28 }],
  }))

  return (
    <View style={styles.dotsRow} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View style={[styles.dot, s1, { backgroundColor: color }]} />
      <Animated.View style={[styles.dot, s2, { backgroundColor: color }]} />
      <Animated.View style={[styles.dot, s3, { backgroundColor: color }]} />
    </View>
  )
}

export function CoraThinkingIndicator({
  domain,
  hasImportedQuestion,
  context = "generic",
  /** Hide the left logo column when the screen header already shows Cora branding. */
  hideBrand = false,
}: {
  domain?: string | null
  hasImportedQuestion?: boolean
  context?: CoraThinkingContext
  hideBrand?: boolean
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const phases = useMemo(() => {
    if (context === "codebench") return CODEBENCH_PHASES
    if (hasImportedQuestion && (domain === "circuit" || !domain)) return CIRCUIT_PHASES
    return GENERIC_PHASES
  }, [context, domain, hasImportedQuestion])

  const [phaseIndex, setPhaseIndex] = useState(0)
  const spin = useSharedValue(0)
  const breathe = useSharedValue(0)
  const shimmer = useSharedValue(0)

  useEffect(() => {
    setPhaseIndex(0)
    const timer = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length)
    }, PHASE_MS)
    return () => clearInterval(timer)
  }, [phases.length])

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.linear }),
      -1,
      false,
    )
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    )
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    )
  }, [breathe, shimmer, spin])

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
    opacity: 0.55 + breathe.value * 0.35,
  }))

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + breathe.value * 0.14 }],
    opacity: 0.18 + breathe.value * 0.22,
  }))

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + breathe.value * 0.06 }],
  }))

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.08, 0.42, 0.08]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-18, 18]) }],
  }))

  const phase = phases[phaseIndex] ?? phases[0]

  return (
    <View
      style={[styles.wrap, hideBrand && styles.wrapCompact]}
      accessibilityRole="text"
      accessibilityLabel={`${CORA_NAME} is thinking`}
    >
      {hideBrand ? null : (
        <View style={styles.iconColumn}>
          <Animated.View style={[styles.halo, haloStyle, { backgroundColor: hexToRgba(SN.accent, 0.28) }]} />
          <Animated.View
            style={[
              styles.ring,
              ringStyle,
              {
                borderColor: hexToRgba(SN.accent, 0.45),
                borderTopColor: SN.accent,
                borderRightColor: hexToRgba(SN.accent, 0.12),
              },
            ]}
          />
          <Animated.View style={[styles.logoWrap, iconStyle]}>
            <CoraBrand size="md" />
          </Animated.View>
        </View>
      )}

      <View style={[styles.copy, hideBrand && styles.copyCompact]}>
        <View style={styles.labelRow}>
          <Animated.Text
            key={phase.label}
            entering={FadeInUp.duration(280).springify().damping(18)}
            exiting={FadeOut.duration(160)}
            style={[type.bodyEmphasis, styles.phaseLabel, { color: native.label }]}
          >
            {phase.label}
          </Animated.Text>
          <ThinkingDots color={SN.accent} />
        </View>

        <View style={styles.detailTrack}>
          <Animated.View style={[styles.detailSweep, sweepStyle, { backgroundColor: SN.accent }]} />
          <Animated.Text
            key={`${phaseIndex}-detail`}
            entering={FadeIn.duration(260).delay(60)}
            exiting={FadeOut.duration(140)}
            style={[type.caption, styles.phaseDetail, { color: SN.secondaryLabel }]}
          >
            {phase.detail}
          </Animated.Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 4,
  },
  wrapCompact: {
    paddingVertical: 0,
  },
  iconColumn: {
    width: 58,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  halo: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  ring: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 6,
    paddingTop: 6,
  },
  copyCompact: {
    paddingTop: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  phaseLabel: {
    fontSize: 16,
    lineHeight: 21,
    flexShrink: 1,
  },
  detailTrack: {
    overflow: "hidden",
    minHeight: 18,
  },
  detailSweep: {
    position: "absolute",
    left: 0,
    top: 2,
    width: 28,
    height: 14,
    borderRadius: 999,
    opacity: 0.12,
  },
  phaseDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
})
