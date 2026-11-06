import { Easing } from "react-native-reanimated"
import { spring } from "../../lib/motion"

export const DRAWER_OPEN_SPRING = spring.drawer

export const DRAWER_EDGE_OPEN_THRESHOLD = 28
export const DRAWER_SWIPE_CLOSE_THRESHOLD = 40
export const DRAWER_VELOCITY_OPEN = 320
export const DRAWER_VELOCITY_CLOSE = -520
export const DRAWER_TAP_SLOP = 10

export const DRAWER_OPEN_TIMING = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
} as const

export const DRAWER_CLOSE_TIMING = {
  duration: 260,
  easing: Easing.out(Easing.cubic),
} as const

export { shouldAnimateDrawerClosed } from "./shell-drawer-close"
