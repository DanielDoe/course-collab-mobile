import type { ReactNode } from "react"
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import type { GlassStyle } from "expo-glass-effect"
import { GlassSurface, useGlassChromeActive } from "./GlassSurface"

export type LiquidGlassIntensity = "low" | "medium" | "high"

type Props = {
  title: string
  description?: string
  intensity?: LiquidGlassIntensity
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

function intensityToGlassStyle(intensity: LiquidGlassIntensity): GlassStyle {
  return intensity === "low" ? "clear" : "regular"
}

function intensityToBlur(intensity: LiquidGlassIntensity): number {
  if (intensity === "high") return 72
  if (intensity === "medium") return 48
  return 32
}

/**
 * Refracting card surface: native Liquid Glass on iOS 26+, blur on Android / older iOS.
 */
export function LiquidCard({
  title,
  description,
  intensity = "medium",
  style,
  children,
}: Props) {
  const tokens = useAppThemeTokens()
  const glassActive = useGlassChromeActive()
  const titleColor = tokens.isDark ? "#FFFFFF" : tokens.native.label
  const bodyColor = tokens.isDark ? "rgba(255,255,255,0.72)" : tokens.native.secondaryLabel

  const content = (
    <View style={styles.contentPadding}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: bodyColor }]}>{description}</Text>
      ) : null}
      {children}
    </View>
  )

  if (!glassActive) {
    return (
      <View
        style={[
          styles.cardOuter,
          Platform.OS === "android" && styles.androidShadow,
          { backgroundColor: tokens.surface, borderColor: tokens.border },
          Platform.OS === "android" && styles.androidBorder,
          style,
        ]}
      >
        {content}
      </View>
    )
  }

  return (
    <View style={[styles.cardOuter, style]}>
      <GlassSurface
        style={StyleSheet.absoluteFill}
        glassEffectStyle={intensityToGlassStyle(intensity)}
        intensity={intensityToBlur(intensity)}
      />
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 8,
    width: "100%",
  },
  contentPadding: {
    padding: 18,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  androidBorder: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  androidShadow: {
    elevation: 3,
  },
})
