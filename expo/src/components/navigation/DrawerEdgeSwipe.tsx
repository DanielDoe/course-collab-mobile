import { useEffect, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Gesture, GestureDetector, type PanGesture } from "react-native-gesture-handler"
import { useSharedValue } from "react-native-reanimated"
import { buildDrawerEdgeOpenGesture } from "./drawer-edge-open-gesture"

type Props = {
  active: boolean
  topInset?: number
  onOpen?: () => void
  /** When wrapped in ShellDrawerMotionProvider, pass its edgeOpenGesture instead of onOpen. */
  gesture?: PanGesture
}

/**
 * @deprecated Prefer ShellDrawerEdgeCapture — overlay strips lose to ScrollViews.
 * Left-edge pan to open the shell drawer.
 */
export function DrawerEdgeSwipe({ active, topInset = 0, onOpen, gesture }: Props) {
  const edgeTopInsetSv = useSharedValue(topInset)

  useEffect(() => {
    edgeTopInsetSv.value = topInset
  }, [edgeTopInsetSv, topInset])

  const edgeOpenGesture = useMemo(() => {
    if (gesture) return gesture
    if (!onOpen) return Gesture.Pan()
    return buildDrawerEdgeOpenGesture(onOpen, edgeTopInsetSv)
  }, [edgeTopInsetSv, gesture, onOpen])

  if (!active) return null

  return (
    <GestureDetector gesture={edgeOpenGesture}>
      <View
        style={[styles.edge, { top: topInset }]}
        collapsable={false}
        pointerEvents="box-only"
        accessibilityRole="button"
        accessibilityLabel="Swipe to open navigation menu"
      />
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  edge: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 64,
    backgroundColor: "transparent",
    zIndex: 50,
  },
})
