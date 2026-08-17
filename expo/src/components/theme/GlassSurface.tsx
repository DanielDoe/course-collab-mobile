import { useEffect, useState, type ReactNode } from "react"
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  UIManager,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { BlurView } from "expo-blur"
import { GlassView, type GlassStyle } from "expo-glass-effect"
import type { AppThemeTokens } from "../../constants/app-themes"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import {
  canUseSystemLiquidGlass,
  isExpoUiHostAvailable,
  resolveLiquidGlassBackend,
  type LiquidGlassBackend,
} from "../../lib/liquid-glass"
import { ExpoUiGlassLayer } from "./ExpoUiGlassLayer"

export function themeUsesGlassBlur(tokens: AppThemeTokens): boolean {
  const blur = tokens.blurRadius ?? tokens.glass?.blurRadius ?? 0
  const surface = tokens.surfaceGlass ?? tokens.glass?.surface
  return blur > 0 && Boolean(surface)
}

function isBlurViewAvailable(): boolean {
  if (Platform.OS === "web") return false
  try {
    return UIManager.getViewManagerConfig?.("ExpoBlurView") != null
  } catch {
    return false
  }
}

/** iOS 26+ native Liquid Glass — safe before native rebuild (returns false if module missing). */
export function canUseNativeLiquidGlass(): boolean {
  return canUseSystemLiquidGlass()
}

export { isExpoUiHostAvailable, resolveLiquidGlassBackend, type LiquidGlassBackend }

const blurNativeAvailable = isBlurViewAvailable()

function useReduceTransparencyEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (Platform.OS !== "ios") return

    let mounted = true
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (mounted) setEnabled(value)
      })
      .catch(() => {})

    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setEnabled,
    )

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  return enabled
}

export function useGlassChromeMode(tokens: AppThemeTokens) {
  const reduceTransparency = useReduceTransparencyEnabled()
  const glassTheme =
    tokens.navigation.style === "floating-glass" || themeUsesGlassBlur(tokens)
  const backend = resolveLiquidGlassBackend({ reduceTransparency })
  const nativeLiquidGlass = backend === "expo-ui" || backend === "glass-effect"
  const blurFallback = backend === "blur" && blurNativeAvailable
  /** Frosted pageSheet / action-sheet surfaces — only for glass-capable themes. */
  const useThemedGlassSheets = backend !== "solid" && glassTheme
  /**
   * Floating nav chrome — OS liquid glass / blur when available.
   * Intentionally independent of `useThemedGlassSheets` (sheet theming must never gate headers).
   */
  const useFloatingNavChrome = backend !== "solid"

  return {
    glassTheme,
    nativeLiquidGlass,
    blurFallback,
    useThemedGlassSheets,
    useFloatingNavChrome,
    backend,
  }
}

/** True when the top bar should float over scrolling module content. */
export function useGlassChromeActive(): boolean {
  const tokens = useAppThemeTokens()
  return useGlassChromeMode(tokens).useFloatingNavChrome
}

/** True when modal/pageSheet hosts should use frosted glass backgrounds (glass themes only). */
export function useThemedGlassSheets(): boolean {
  const tokens = useAppThemeTokens()
  return useGlassChromeMode(tokens).useThemedGlassSheets
}

type GlassSurfaceProps = {
  style?: StyleProp<ViewStyle>
  children?: ReactNode
  /** Blur fallback only — native Liquid Glass ignores heavy overlays. */
  overlayColor?: string
  /** Blur intensity — defaults to theme blurRadius (blur fallback only) */
  intensity?: number
  /** Native Liquid Glass style — defaults to regular */
  glassEffectStyle?: GlassStyle
  /** Hug children instead of flex-filling the parent (bottom sheets / action menus). */
  sizeToContent?: boolean
}

function NativeLiquidGlassLayer({
  style,
  isDark,
  glassEffectStyle = "regular",
  backend,
}: {
  style?: StyleProp<ViewStyle>
  isDark: boolean
  glassEffectStyle?: GlassStyle
  backend: LiquidGlassBackend
}) {
  if (backend === "expo-ui") {
    return (
      <ExpoUiGlassLayer
        style={style}
        isDark={isDark}
        variant={glassEffectStyle}
        interactive
      />
    )
  }

  return (
    <GlassView
      style={style}
      glassEffectStyle={glassEffectStyle}
      colorScheme={isDark ? "dark" : "light"}
      isInteractive
      pointerEvents="none"
    />
  )
}

function BlurGlassLayer({
  isDark,
  intensity,
}: {
  isDark: boolean
  intensity: number
}) {
  const tint = isDark ? "dark" : "light"

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  )
}

/**
 * Chrome material: native Liquid Glass (iOS 26+) → expo-blur → translucent solid fill.
 * Content screens stay opaque; use only on navigation chrome and sheets.
 */
export function GlassSurface({
  style,
  children,
  overlayColor,
  intensity,
  glassEffectStyle = "regular",
  sizeToContent = false,
}: GlassSurfaceProps) {
  const tokens = useAppThemeTokens()
  const { nativeLiquidGlass, blurFallback, backend } = useGlassChromeMode(tokens)
  const fill = overlayColor ?? tokens.surfaceGlass ?? tokens.chrome.headerBg
  const blurIntensity = intensity ?? tokens.glass?.blurRadius ?? tokens.blurRadius ?? 40

  if (backend === "solid") {
    return (
      <View style={[style, { backgroundColor: fill }]}>
        {children}
      </View>
    )
  }

  return (
    <View
      style={[
        style,
        sizeToContent ? styles.wrapContent : styles.wrap,
        { backgroundColor: "transparent" },
      ]}
    >
      {nativeLiquidGlass ? (
        <NativeLiquidGlassLayer
          style={StyleSheet.absoluteFill}
          isDark={tokens.isDark}
          glassEffectStyle={glassEffectStyle}
          backend={backend}
        />
      ) : (
        <BlurGlassLayer isDark={tokens.isDark} intensity={blurIntensity} />
      )}
      {overlayColor ? (
        <View
          style={[StyleSheet.absoluteFill, styles.tintOverlay, { backgroundColor: overlayColor }]}
          pointerEvents="none"
        />
      ) : null}
      <View
        style={[styles.content, sizeToContent ? undefined : styles.contentFlex]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </View>
  )
}

type GlassChromeBarProps = {
  style?: StyleProp<ViewStyle>
  borderBottomColor: string
  children: ReactNode
}

/** Top navigation bar — native Liquid Glass or blur when the OS supports it. */
export function GlassChromeBar({ style, borderBottomColor, children }: GlassChromeBarProps) {
  const tokens = useAppThemeTokens()
  const { nativeLiquidGlass, backend } = useGlassChromeMode(tokens)

  if (backend === "solid") {
    return (
      <View
        style={[
          styles.chromeBar,
          style,
          { backgroundColor: tokens.chrome.headerBg, borderBottomColor },
        ]}
      >
        {children}
      </View>
    )
  }

  return (
    <View
      style={[
        styles.chromeBar,
        style,
        {
          borderBottomColor: nativeLiquidGlass ? "transparent" : borderBottomColor,
          backgroundColor: "transparent",
        },
      ]}
    >
      <GlassSurface style={StyleSheet.absoluteFill} glassEffectStyle="clear" />
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  )
}

type GlassSheetProps = {
  style?: StyleProp<ViewStyle>
  children: ReactNode
  /** Denser frosted fill for account/profile menus — less dashboard bleed-through. */
  menuSheet?: boolean
  /** Expand foreground to fill the sheet host — pageSheet modals only, not bottom menus. */
  fillHeight?: boolean
}

const SHEET_PADDING_KEYS = [
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingHorizontal",
  "paddingVertical",
  "paddingStart",
  "paddingEnd",
] as const satisfies readonly (keyof ViewStyle)[]

/** Keep glass fill edge-to-edge; inset padding applies to foreground content only. */
function splitSheetPadding(style?: StyleProp<ViewStyle>) {
  const flat = StyleSheet.flatten(style) ?? {}
  const rootStyle: ViewStyle = { ...flat }
  const foregroundPadding: ViewStyle = {}

  for (const key of SHEET_PADDING_KEYS) {
    const value = flat[key]
    if (value == null) continue
    foregroundPadding[key] = value
    delete rootStyle[key]
  }

  const topRadius =
    typeof flat.borderTopLeftRadius === "number"
      ? flat.borderTopLeftRadius
      : typeof flat.borderTopRightRadius === "number"
        ? flat.borderTopRightRadius
        : 18

  return { rootStyle, foregroundPadding, topRadius }
}

/** Frosted pageSheet / bottom-menu tint derived from the active appearance theme. */
export function resolveSheetOverlayColor(tokens: AppThemeTokens, menuSheet = false): string {
  const glassSurface = tokens.surfaceGlass ?? tokens.glass?.surface
  if (glassSurface) return glassSurface

  const base = tokens.chrome.sheetBg ?? tokens.native.secondaryGrouped ?? tokens.surface
  const alpha = menuSheet ? (tokens.isDark ? 0.96 : 0.98) : tokens.isDark ? 0.92 : 0.94
  if (base.startsWith("rgba(")) return base
  return hexToRgba(base, alpha)
}

/** Bottom sheet / modal chrome — regular glass + frosted tint for readable menus over busy content. */
export function GlassSheetBackground({ style, children, menuSheet = false, fillHeight = false }: GlassSheetProps) {
  const tokens = useAppThemeTokens()
  const sheetTint = resolveSheetOverlayColor(tokens, menuSheet)
  const blurIntensity = tokens.isDark ? 64 : menuSheet ? 96 : 88
  const { rootStyle, foregroundPadding, topRadius } = splitSheetPadding(style)

  return (
    <View style={[styles.sheetRoot, rootStyle]}>
      <View
        style={[
          styles.sheetBgClip,
          { borderTopLeftRadius: topRadius, borderTopRightRadius: topRadius },
        ]}
        pointerEvents="none"
      >
        <GlassSurface
          style={StyleSheet.absoluteFillObject}
          glassEffectStyle="regular"
          overlayColor={sheetTint}
          intensity={blurIntensity}
        />
      </View>
      <View
        style={[
          fillHeight ? styles.sheetForegroundFill : styles.sheetForeground,
          foregroundPadding,
        ]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </View>
  )
}

export {
  promoAccentBodyStyle,
  promoAccentForegroundColor,
  promoAccentGradientColors,
  promoAccentTitleStyle,
  promoIconOnAccentStyle,
} from "../../lib/promo-accent-theme"

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", flex: 1 },
  wrapContent: { overflow: "visible" },
  tintOverlay: { zIndex: 0 },
  content: { zIndex: 1 },
  contentFlex: { flex: 1 },
  chromeBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sheetRoot: {
    width: "100%",
    overflow: "visible",
  },
  sheetBgClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  sheetForeground: {
    overflow: "visible",
  },
  sheetForegroundFill: {
    flex: 1,
    overflow: "visible",
  },
})
