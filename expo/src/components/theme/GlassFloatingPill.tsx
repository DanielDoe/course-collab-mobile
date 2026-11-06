import type { ReactNode } from "react"
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { searchDockReadableBorder, searchDockReadableWash } from "../../lib/glass-search-dock-veil"
import { GlassSurface, useGlassChromeMode } from "./GlassSurface"

/** Symmetric padding inside the glass pill. */
export const LIQUID_GLASS_SEARCH_DOCK_INNER_PAD = 6
/** Standard iOS search / composer row height. */
export const LIQUID_GLASS_SEARCH_DOCK_ROW_HEIGHT = 36
/** Glass pill body (inner padding + row). */
export const GLASS_FLOATING_PILL_HEIGHT =
  LIQUID_GLASS_SEARCH_DOCK_ROW_HEIGHT + LIQUID_GLASS_SEARCH_DOCK_INNER_PAD * 2

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  innerStyle?: StyleProp<ViewStyle>
  /** `regular` + wash reduces compositor ghost text from the previous screen. */
  glassEffectStyle?: "clear" | "regular"
  frosted?: boolean
  /** Denser frost for controls that sit over scrolling lists (search dock). */
  readableFrost?: boolean
  washColor?: string
  borderColor?: string
}

/** Shared Liquid Glass capsule — search dock, message composer, etc. */
export function GlassFloatingPill({
  children,
  style,
  innerStyle,
  glassEffectStyle = "clear",
  frosted = false,
  readableFrost = false,
  washColor,
  borderColor: borderColorOverride,
}: Props) {
  const tokens = useAppThemeTokens()
  const { nativeLiquidGlass, backend } = useGlassChromeMode(tokens)
  const borderColor =
    borderColorOverride ??
    (readableFrost
      ? searchDockReadableBorder(tokens.isDark)
      : tokens.isDark
        ? "rgba(255, 255, 255, 0.16)"
        : "rgba(0, 0, 0, 0.08)")
  const wash =
    washColor ??
    (readableFrost
      ? searchDockReadableWash(tokens.isDark)
      : tokens.isDark
        ? "rgba(28, 28, 30, 0.48)"
        : "rgba(255, 255, 255, 0.48)")
  const showWash = frosted || readableFrost

  return (
    <View
      accessible={false}
      style={[
        styles.glass,
        {
          borderColor: nativeLiquidGlass ? borderColor : "transparent",
          backgroundColor: backend === "solid" ? tokens.chrome.headerBg : "transparent",
        },
        style,
      ]}
    >
      {backend !== "solid" ? (
        <View
          accessible={false}
          importantForAccessibility="no"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <GlassSurface style={StyleSheet.absoluteFill} glassEffectStyle={glassEffectStyle} />
          {showWash ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} />
          ) : null}
        </View>
      ) : null}
      <View accessible={false} style={[styles.inner, innerStyle]}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  glass: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  inner: {
    paddingHorizontal: LIQUID_GLASS_SEARCH_DOCK_INNER_PAD,
    paddingVertical: LIQUID_GLASS_SEARCH_DOCK_INNER_PAD,
    minHeight: GLASS_FLOATING_PILL_HEIGHT,
    justifyContent: "center",
    zIndex: 1,
  },
})
