import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { GLASS_FLOATING_PILL_HEIGHT, GlassFloatingPill } from "./GlassFloatingPill"

/** Horizontal inset from screen edges — equal left and right. */
export const LIQUID_GLASS_SEARCH_DOCK_H_INSET = 16
/** Re-export for module search dock sizing. */
export const LIQUID_GLASS_SEARCH_DOCK_INNER_PAD = 6
export const LIQUID_GLASS_SEARCH_DOCK_ROW_HEIGHT = 36
export const LIQUID_GLASS_SEARCH_DOCK_PILL_HEIGHT = GLASS_FLOATING_PILL_HEIGHT

/** Float gap above the home-indicator safe area. */
export const LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP = 8

type Props = {
  children: ReactNode
}

/**
 * Floating bottom search capsule — native Liquid Glass so list content scrolls underneath.
 */
export function GlassBottomSearchDock({ children }: Props) {
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP)

  return (
    <View
      style={[styles.host, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <GlassFloatingPill>{children}</GlassFloatingPill>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    paddingHorizontal: LIQUID_GLASS_SEARCH_DOCK_H_INSET,
    paddingTop: LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP,
    alignItems: "stretch",
  },
})
