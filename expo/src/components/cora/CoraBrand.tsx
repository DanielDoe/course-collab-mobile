import { useId } from "react"
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { CORA_WORDMARK, CORA_WORDMARK_GRADIENT } from "../../lib/cora-constants"

type Size = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_PX: Record<Size, number> = {
  xs: 13,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
}

type Props = {
  size?: Size
  style?: StyleProp<ViewStyle>
  /** Use SVG gradient wordmark (default) or solid fallback text */
  variant?: "gradient" | "solid"
  /** Override solid variant text color (e.g. on purple buttons) */
  color?: string
}

export function CoraBrand({ size = "md", style, variant = "gradient", color }: Props) {
  const tokens = useAppThemeTokens()
  const gradientId = useId().replace(/:/g, "")
  const fontSize = SIZE_PX[size]
  const width = Math.ceil(fontSize * 2.35)
  const height = Math.ceil(fontSize * 1.15)

  if (variant === "solid") {
    return (
      <Text
        style={[
          styles.solid,
          {
            fontSize,
            color: color ?? tokens.accent,
          },
        ]}
      >
        {CORA_WORDMARK}
      </Text>
    )
  }

  const [c0, c1, c2] = tokens.isDark
    ? (["#c4b5fd", "#818cf8", "#67e8f9"] as const)
    : CORA_WORDMARK_GRADIENT

  return (
    <View style={[styles.wrap, { width, height }, style]} accessibilityRole="text" accessibilityLabel="Cora">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={c0} />
            <Stop offset="50%" stopColor={c1} />
            <Stop offset="100%" stopColor={c2} />
          </LinearGradient>
        </Defs>
        <SvgText
          fill={`url(#${gradientId})`}
          fontSize={fontSize}
          fontWeight="300"
          x={0}
          y={fontSize * 0.92}
          letterSpacing={-fontSize * 0.03}
          fontFamily={Platform.select({ ios: "System", android: "sans-serif-light", default: "System" })}
        >
          {CORA_WORDMARK}
        </SvgText>
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
  },
  solid: {
    fontWeight: "300",
    letterSpacing: -0.6,
    textTransform: "lowercase",
  },
})
