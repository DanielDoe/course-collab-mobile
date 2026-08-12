import type { ReactNode } from "react"
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useShellChrome } from "../../context/AppearanceProvider"
import { GlassChromeBar } from "./GlassSurface"
import { NATIVE_HEADER_BAR_HEIGHT } from "../shell/shell-shared"

type Props = {
  title: string
  style?: StyleProp<ViewStyle>
  right?: ReactNode
  left?: ReactNode
}

/**
 * Floating glass navigation header — content scrolls beneath for visible refraction.
 */
export function GlassHeader({ title, style, right, left }: Props) {
  const insets = useSafeAreaInsets()
  const chrome = useShellChrome()

  return (
    <GlassChromeBar
      style={[styles.wrap, { paddingTop: insets.top }, style]}
      borderBottomColor={chrome.headerBorder}
    >
      <View style={[styles.bar, { minHeight: NATIVE_HEADER_BAR_HEIGHT }]}>
        <View style={styles.side}>{left}</View>
        <Text style={[styles.title, { color: chrome.label }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.side}>{right}</View>
      </View>
    </GlassChromeBar>
  )
}

/** Minimum top inset when content sits under a floating GlassHeader. */
export function useGlassHeaderInset(): number {
  const insets = useSafeAreaInsets()
  return insets.top + NATIVE_HEADER_BAR_HEIGHT
}

const styles = StyleSheet.create({
  wrap: Platform.select({
    ios: {},
    android: { elevation: 2 },
    default: {},
  }),
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  side: {
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
})
