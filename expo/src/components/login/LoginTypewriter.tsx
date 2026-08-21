import { useEffect, useMemo, useRef, useState } from "react"
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { useAuthFlowLayout } from "../../lib/responsive-layout"
import { useLoginTheme } from "./login-theme"

/** Rotating login headlines — opener matches auth welcome; rest inspired by web LandingHero. */
const LOGIN_TYPEWRITER_LINES = [
  "Learn. Practice. Collaborate. Succeed.",
  "AI Tutors Ready 24/7. Ask Anything.",
  "Code, Compile & Level Up in CodeBench.",
  "Instant Grading. Feedback in Seconds.",
  "Circuit Labs & Textbook-Aligned Practice.",
  "Climb the Leaderboard. Compete & Win.",
  "Practice Hub & Labs That Stick.",
] as const

const TYPE_MS = 48
const DELETE_MS = 26
const HOLD_MS = 2400
const BETWEEN_MS = 380

function TypewriterCaret({ color }: { color: string }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0, { duration: 480, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [opacity])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  // Nested Text caret stays on the same line as the typed characters.
  return (
    <Animated.Text style={[{ color, fontWeight: "300" }, style]} accessible={false}>
      |
    </Animated.Text>
  )
}

type Props = {
  style?: StyleProp<TextStyle>
  color?: string
}

export function LoginTypewriter({ style, color }: Props) {
  const { LOGIN, loginType } = useLoginTheme()
  const { isCompactHeight } = useAuthFlowLayout()
  const accent = color ?? LOGIN.purple
  const [lineIndex, setLineIndex] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentLine = LOGIN_TYPEWRITER_LINES[lineIndex] ?? LOGIN_TYPEWRITER_LINES[0]
  const visible = useMemo(() => currentLine.slice(0, charCount), [charCount, currentLine])

  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled)
    })
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion)
    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    if (reduceMotion) {
      clearTimer()
      setLineIndex(0)
      setCharCount(LOGIN_TYPEWRITER_LINES[0].length)
      return clearTimer
    }

    let index = 0
    let count = 0
    let phase: "type" | "hold" | "delete" = "type"

    const schedule = (fn: () => void, delay: number) => {
      timerRef.current = setTimeout(fn, delay)
    }

    const tick = () => {
      const line = LOGIN_TYPEWRITER_LINES[index] ?? LOGIN_TYPEWRITER_LINES[0]
      const full = line.length

      if (phase === "type") {
        if (count < full) {
          count += 1
          setCharCount(count)
          setLineIndex(index)
          schedule(tick, TYPE_MS)
          return
        }
        phase = "hold"
        schedule(tick, HOLD_MS)
        return
      }

      if (phase === "hold") {
        phase = "delete"
        schedule(tick, DELETE_MS)
        return
      }

      if (count > 0) {
        count -= 1
        setCharCount(count)
        schedule(tick, DELETE_MS)
        return
      }

      index = (index + 1) % LOGIN_TYPEWRITER_LINES.length
      setLineIndex(index)
      phase = "type"
      schedule(tick, BETWEEN_MS)
    }

    setLineIndex(0)
    setCharCount(0)
    schedule(tick, 280)

    return clearTimer
  }, [reduceMotion])

  return (
    <View
      style={[styles.wrap, { minHeight: isCompactHeight ? 56 : 72 }]}
      accessibilityRole="header"
      accessibilityLabel={currentLine}
    >
      <Text style={[loginType.heroTitle, styles.headline, { color: accent }, style]}>
        {visible}
        {!reduceMotion ? <TypewriterCaret color={accent} /> : null}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    width: "100%",
  },
  headline: {
    textAlign: "center",
  },
})
