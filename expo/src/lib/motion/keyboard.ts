import { useEffect, useState } from "react"
import { Keyboard, Platform, type KeyboardEvent } from "react-native"
import { Easing, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated"
import { motion } from "./motion"
import { useAppReducedMotion } from "./reducedMotion"
import { easing } from "./transitions"

export const keyboardShowEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
export const keyboardHideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

/** One keyboard strategy per chat surface: iOS padding KAV, Android composer offset. */
export const chatKeyboardAvoidingBehavior = Platform.OS === "ios" ? ("padding" as const) : undefined

/** Auth/login surfaces: animated scroll padding only — never stack KAV + automaticallyAdjustKeyboardInsets. */
export const authKeyboardExtraPad = 16

/** JS-thread keyboard visibility for layout slack / centering decisions. */
export function useKeyboardVisibility(): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = Keyboard.addListener(keyboardShowEvent, () => setVisible(true))
    const hide = Keyboard.addListener(keyboardHideEvent, () => setVisible(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return visible
}

function eventDuration(event: KeyboardEvent, fallback: number): number {
  const duration = event.duration
  if (typeof duration === "number" && duration > 0) return duration
  return fallback
}

/**
 * UI-thread keyboard height. Animate with the system keyboard duration so
 * composers and the search dock do not jump after the keyboard has already moved.
 */
export function useAnimatedKeyboardHeight(): SharedValue<number> {
  const height = useSharedValue(0)
  const reduceMotion = useAppReducedMotion()

  useEffect(() => {
    const show = Keyboard.addListener(keyboardShowEvent, (event) => {
      const next = event.endCoordinates.height
      if (reduceMotion) {
        height.value = next
        return
      }
      height.value = withTiming(next, {
        duration: eventDuration(event, motion.normal),
        easing: easing.standard,
      })
    })
    const hide = Keyboard.addListener(keyboardHideEvent, (event) => {
      if (reduceMotion) {
        height.value = 0
        return
      }
      height.value = withTiming(0, {
        duration: eventDuration(event, motion.fast),
        easing: Easing.out(Easing.cubic),
      })
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [height, reduceMotion])

  return height
}
