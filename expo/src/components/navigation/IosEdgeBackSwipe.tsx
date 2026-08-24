import { Platform, StyleSheet, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { runOnJS } from "react-native-reanimated"

const EDGE_WIDTH = 28
const SWIPE_THRESHOLD = 72

/** iOS left-edge pan when native stack gesture is disabled for nested UI. */
export function IosEdgeBackSwipe({
  onBack,
  topInset = 0,
}: {
  onBack: () => void
  topInset?: number
}) {
  if (Platform.OS !== "ios") return null

  const gesture = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetX(-6)
    .failOffsetY([-28, 28])
    .onEnd((event) => {
      if (event.translationX >= SWIPE_THRESHOLD) {
        runOnJS(onBack)()
      }
    })

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.edge, { top: topInset }]} accessibilityLabel="Swipe to go back" />
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  edge: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    zIndex: 12,
  },
})
