import { type ReactNode, useEffect, useState } from "react"
import { Keyboard, Platform, StyleSheet, View } from "react-native"
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
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const bottomPad = Math.max(insets.bottom, LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP)

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height)
    })
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return (
    <View
      style={[
        styles.host,
        keyboardHeight > 0
          ? { bottom: keyboardHeight, paddingBottom: LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP }
          : { paddingBottom: bottomPad },
      ]}
      pointerEvents="box-none"
    >
      <GlassFloatingPill glassEffectStyle="regular" frosted>
        {children}
      </GlassFloatingPill>
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
