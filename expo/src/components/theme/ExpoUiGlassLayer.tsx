import { useState } from "react"
import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { Host, Rectangle } from "@expo/ui/swift-ui"
import { frame, glassEffect } from "@expo/ui/swift-ui/modifiers"
import type { GlassStyle } from "expo-glass-effect"
import { isExpoUiHostAvailable } from "../../lib/liquid-glass"

type Props = {
  style?: StyleProp<ViewStyle>
  isDark: boolean
  variant?: GlassStyle
  interactive?: boolean
}

function mapVariant(variant: GlassStyle): "regular" | "clear" | "identity" {
  if (variant === "clear") return "clear"
  return "regular"
}

/**
 * SwiftUI glassEffect via @expo/ui — sized to the parent view (not the full window).
 */
export function ExpoUiGlassLayer({
  style,
  isDark,
  variant = "regular",
  interactive = true,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  if (Platform.OS !== "ios" || !isExpoUiHostAvailable()) return null

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    if (width <= 0 || height <= 0) return
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    )
  }

  return (
    <View
      style={[StyleSheet.absoluteFill, style]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {size.width > 0 && size.height > 0 ? (
        <Host
          style={{ width: size.width, height: size.height }}
          useViewportSizeMeasurement={false}
          colorScheme={isDark ? "dark" : "light"}
        >
          <Rectangle
            modifiers={[
              frame({ width: size.width, height: size.height }),
              glassEffect({
                glass: {
                  variant: mapVariant(variant),
                  interactive,
                },
              }),
            ]}
          />
        </Host>
      ) : null}
    </View>
  )
}
