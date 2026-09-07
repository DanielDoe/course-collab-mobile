import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeInDown, FadeInRight, type EntryExitAnimationFunction } from "react-native-reanimated"
import { motion, spring, useAppReducedMotion } from "../../lib/motion"

type Props = {
  panelKey: string
  children: ReactNode
}

const STAGGER_MS = 48
const STAGGER_CAP_MS = 320

/** Whole auth panel — slides in gently when switching welcome ↔ portal. */
function panelEntering(): EntryExitAnimationFunction {
  return FadeInRight.duration(motion.slow)
    .springify()
    .damping(spring.standard.damping)
    .stiffness(spring.standard.stiffness)
    .mass(spring.standard.mass)
}

/** Staggered block inside a panel (header, fields, rows). */
function itemEntering(index: number): EntryExitAnimationFunction {
  const delay = Math.min(index * STAGGER_MS, STAGGER_CAP_MS)
  return FadeInDown.delay(delay)
    .duration(motion.normal)
    .springify()
    .damping(spring.gentle.damping)
    .stiffness(spring.gentle.stiffness)
    .mass(spring.gentle.mass)
}

export function AuthFlowPanelTransition({ panelKey, children }: Props) {
  const reduceMotion = useAppReducedMotion()

  if (reduceMotion) {
    return (
      <View key={panelKey} style={styles.panel}>
        {children}
      </View>
    )
  }

  return (
    <Animated.View key={panelKey} entering={panelEntering()} style={styles.panel}>
      {children}
    </Animated.View>
  )
}

/** Staggered fade-up for login rows, headers, and CTAs within one panel. */
export function AuthFlowEnterItem({
  index,
  children,
  style,
}: {
  index: number
  children: ReactNode
  style?: object
}) {
  const reduceMotion = useAppReducedMotion()
  if (reduceMotion) {
    return <View style={style}>{children}</View>
  }
  return (
    <Animated.View entering={itemEntering(index)} style={style}>
      {children}
    </Animated.View>
  )
}

/** Softer entrance for onboarding headers and hero blocks. */
export function AuthFlowHeroEnter({ children }: { children: ReactNode }) {
  const reduceMotion = useAppReducedMotion()
  if (reduceMotion) return <>{children}</>
  return <Animated.View entering={itemEntering(0)}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  panel: { width: "100%" },
})
