import { useReducedMotion } from "react-native-reanimated"
import { motion } from "./motion"

/** App-wide Reduce Motion. Prefer this over ad-hoc AccessibilityInfo listeners. */
export function useAppReducedMotion(): boolean {
  return Boolean(useReducedMotion())
}

export function reducedDuration(ms: number, reduceMotion: boolean): number {
  if (reduceMotion) return motion.instant
  return ms
}
