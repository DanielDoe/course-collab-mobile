import { type ReactNode } from "react"
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import {
  FAB_PRESS_SCALE,
  PRESS_SCALE,
  timing,
  triggerMotionHaptic,
  useAppReducedMotion,
  type MotionHaptic,
} from "../../lib/motion"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Props = Omit<PressableProps, "style"> & {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  scaleTo?: number
  haptic?: MotionHaptic | null
}

/**
 * Shared press feedback for cards, rows, buttons, and + controls.
 * Scale only — no per-tap haptics unless explicitly requested.
 */
export function PressableScale({
  children,
  style,
  scaleTo = PRESS_SCALE,
  haptic = null,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const reduceMotion = useAppReducedMotion()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        if (!disabled && !reduceMotion) {
          scale.value = withTiming(scaleTo, timing.pressIn)
        }
        if (!disabled && haptic) triggerMotionHaptic(haptic)
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        if (!reduceMotion) {
          scale.value = withTiming(1, timing.pressOut)
        }
        onPressOut?.(event)
      }}
    >
      {children}
    </AnimatedPressable>
  )
}

export function FabPressableScale(props: Omit<Props, "scaleTo">) {
  return <PressableScale {...props} scaleTo={FAB_PRESS_SCALE} haptic={props.haptic ?? "light"} />
}
