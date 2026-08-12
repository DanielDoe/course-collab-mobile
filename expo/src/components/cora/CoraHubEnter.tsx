import type { ReactNode } from "react"
import { View, type StyleProp, type ViewStyle } from "react-native"
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated"

const STAGGER_MS = 28
const BASE_DELAY_MS = 0
const DURATION_MS = 280

export function coraHubEntering(index: number, reduceMotion = false) {
  if (reduceMotion) {
    return FadeIn.delay(Math.min(index * 28, 280)).duration(240)
  }
  return FadeInDown.delay(BASE_DELAY_MS + index * STAGGER_MS)
    .duration(DURATION_MS)
    .springify()
    .damping(17)
    .stiffness(145)
}

type Props = {
  /** When false, content stays mounted but does not animate (e.g. during splash intro). */
  enabled: boolean
  index: number
  reduceMotion?: boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/** Staggered fade-up for Cora hub cards — runs once when `enabled` flips true. */
export function CoraHubEnter({ enabled, index, reduceMotion = false, children, style }: Props) {
  if (!enabled) {
    return <View style={style}>{children}</View>
  }

  return (
    <Animated.View entering={coraHubEntering(index, reduceMotion)} style={style}>
      {children}
    </Animated.View>
  )
}
