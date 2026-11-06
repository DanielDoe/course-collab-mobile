import { Easing } from "react-native-reanimated"
import { motion } from "./motion"

export const easing = {
  standard: Easing.out(Easing.cubic),
  enter: Easing.out(Easing.quad),
  exit: Easing.in(Easing.quad),
  emphasize: Easing.bezier(0.2, 0.8, 0.2, 1),
}

export const timing = {
  fadeIn: { duration: motion.fast, easing: easing.enter },
  fadeOut: { duration: motion.fast, easing: easing.exit },
  backdropIn: { duration: motion.normal, easing: easing.enter },
  backdropOut: { duration: 180, easing: easing.exit },
  sheetOut: { duration: motion.normal, easing: easing.exit },
  pressIn: { duration: 80, easing: easing.standard },
  pressOut: { duration: motion.fast, easing: easing.standard },
} as const

export function durationOrInstant(ms: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : ms
}
