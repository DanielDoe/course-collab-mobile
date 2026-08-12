import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { loginCanvasBubbles } from "../../lib/login-color-theme"

function LoginBubble({
  style,
  color,
  driftX,
  driftY,
  duration,
}: {
  style: object
  color: string
  driftX: number
  driftY: number
  duration: number
}) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(driftX, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-driftX, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
    ty.value = withRepeat(
      withSequence(
        withTiming(-driftY, { duration: duration * 1.12, easing: Easing.inOut(Easing.sin) }),
        withTiming(driftY, { duration: duration * 1.12, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
  }, [driftX, driftY, duration, tx, ty])

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }))

  return (
    <Animated.View
      style={[style, { backgroundColor: color }, motion]}
      pointerEvents="none"
    />
  )
}

/** Decorative Color Hunt bubbles behind auth screens — canvas only, not list rows. */
export function LoginCanvasBubbles() {
  const tokens = useAppThemeTokens()
  const bubbles = loginCanvasBubbles(tokens)

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LoginBubble
        style={styles.bubbleA}
        color={bubbles.a}
        driftX={5}
        driftY={7}
        duration={3800}
      />
      <LoginBubble
        style={styles.bubbleB}
        color={bubbles.b}
        driftX={-4}
        driftY={5}
        duration={4400}
      />
      <LoginBubble
        style={styles.bubbleC}
        color={bubbles.c}
        driftX={3}
        driftY={-4}
        duration={4100}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  bubbleA: {
    position: "absolute",
    top: "8%",
    right: -28,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  bubbleB: {
    position: "absolute",
    top: "34%",
    left: -36,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  bubbleC: {
    position: "absolute",
    bottom: "12%",
    right: 24,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
})
