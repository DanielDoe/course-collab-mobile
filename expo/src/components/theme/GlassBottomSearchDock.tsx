import { type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { useAnimatedStyle } from "react-native-reanimated"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useAnimatedKeyboardHeight } from "../../lib/motion"
import {
  SEARCH_DOCK_VEIL_FADE,
  searchDockGutterColor,
  searchDockReadableBorder,
  searchDockReadableWash,
  searchDockVeilColors,
} from "../../lib/glass-search-dock-veil"
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
 * Floating bottom search capsule.
 * A reading veil fades list content into the page color so Liquid Glass
 * stays visible without card text competing with the search icons.
 */
export function GlassBottomSearchDock({ children }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const keyboardHeight = useAnimatedKeyboardHeight()
  const restingBottom = Math.max(insets.bottom - LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP, 0)
  const veilColors = searchDockVeilColors(native.groupedBackground)
  const gutterColor = searchDockGutterColor(native.groupedBackground)

  const hostStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(keyboardHeight.value - restingBottom, 0) }],
  }))

  return (
    <Animated.View
      style={[
        styles.host,
        { bottom: restingBottom, paddingBottom: LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP },
        hostStyle,
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={veilColors}
        locations={[0, 0.42, 1]}
        pointerEvents="none"
        style={styles.veil}
      />
      <View pointerEvents="none" style={[styles.gutter, { backgroundColor: gutterColor }]} />
      <View style={styles.pillWrap} pointerEvents="box-none">
        <GlassFloatingPill
          glassEffectStyle="regular"
          frosted
          readableFrost
          washColor={searchDockReadableWash(tokens.isDark)}
          borderColor={searchDockReadableBorder(tokens.isDark)}
        >
          {children}
        </GlassFloatingPill>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    paddingTop: SEARCH_DOCK_VEIL_FADE,
    alignItems: "stretch",
  },
  veil: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: SEARCH_DOCK_VEIL_FADE,
  },
  gutter: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SEARCH_DOCK_VEIL_FADE,
    bottom: 0,
  },
  pillWrap: {
    paddingHorizontal: LIQUID_GLASS_SEARCH_DOCK_H_INSET,
    paddingTop: LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP,
  },
})
