import { Gesture, type PanGesture } from "react-native-gesture-handler"
import { runOnJS, type SharedValue } from "react-native-reanimated"
import {
  DRAWER_EDGE_OPEN_THRESHOLD,
  DRAWER_VELOCITY_OPEN,
} from "./shell-drawer-motion"

/** Touch must begin within this many px of the screen's left edge. */
export const DRAWER_EDGE_HIT_WIDTH = 64

/** Pan that opens the drawer when the finger starts on the left edge and moves right. */
export function buildDrawerEdgeOpenGesture(
  onOpen: () => void,
  edgeTopInsetSv: SharedValue<number>,
): PanGesture {
  return Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event, stateManager) => {
      "worklet"
      const touch = event.allTouches[0]
      if (touch == null) {
        stateManager.fail()
        return
      }
      // Keep top chrome/back buttons out of the drawer edge zone.
      if (touch.x > DRAWER_EDGE_HIT_WIDTH || touch.y < edgeTopInsetSv.value) {
        stateManager.fail()
        return
      }
      stateManager.activate()
    })
    .activeOffsetX(4)
    .failOffsetX(-6)
    .failOffsetY([-36, 36])
    .onEnd((event) => {
      const shouldOpen =
        event.translationX >= DRAWER_EDGE_OPEN_THRESHOLD || event.velocityX >= DRAWER_VELOCITY_OPEN
      if (shouldOpen) {
        runOnJS(onOpen)()
      }
    })
}
