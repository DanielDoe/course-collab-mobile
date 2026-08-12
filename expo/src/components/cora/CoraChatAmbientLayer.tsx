import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { facultyCoraChatAmbientBlobs } from "../../lib/faculty-cora-theme"

type Props = {
  isDark: boolean
  /** When false, blobs fade out for a calmer reading surface during active chat. */
  visible?: boolean
}

/** Soft color washes behind Cora chat content — pointerEvents none. */
export function CoraChatAmbientLayer({ isDark, visible = true }: Props) {
  const blobs = facultyCoraChatAmbientBlobs(isDark)
  const opacity = useSharedValue(visible ? 1 : 0)

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    })
  }, [opacity, visible])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedStyle]}>
      <View style={[styles.blob, styles.blobTop, { backgroundColor: blobs.top }]} />
      <View style={[styles.blob, styles.blobCenter, { backgroundColor: blobs.center }]} />
      <View style={[styles.blob, styles.blobBottom, { backgroundColor: blobs.bottom }]} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  blobTop: {
    width: 280,
    height: 280,
    top: "8%",
    right: -72,
  },
  blobCenter: {
    width: 220,
    height: 220,
    top: "38%",
    left: -64,
  },
  blobBottom: {
    width: 300,
    height: 300,
    bottom: "14%",
    right: -48,
  },
})
