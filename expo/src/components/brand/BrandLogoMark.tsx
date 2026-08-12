import { Image, StyleSheet, View, type StyleProp, type ImageStyle, type ViewStyle } from "react-native"
import { BRAND } from "../../constants"

/** Fixed brand tile — never tied to accent / appearance theme tokens. */
export const BRAND_LOGO_TILE = {
  backgroundColor: BRAND.white,
  borderColor: BRAND.redBorder,
} as const

const MARK = require("../../../assets/logo-mark.png")

export type BrandLogoMarkSize = "drawer" | "login" | "loading" | "compact"

const SIZE: Record<
  BrandLogoMarkSize,
  { tile: number; logo: number; radius: number; framed: boolean }
> = {
  drawer: { tile: 44, logo: 30, radius: 14, framed: true },
  login: { tile: 64, logo: 40, radius: 16, framed: true },
  loading: { tile: 64, logo: 40, radius: 16, framed: true },
  compact: { tile: 36, logo: 24, radius: 10, framed: true },
}

type Props = {
  size?: BrandLogoMarkSize
  /** Override framed tile; defaults from size preset. */
  framed?: boolean
  style?: StyleProp<ViewStyle>
  logoStyle?: StyleProp<ImageStyle>
}

/**
 * CourseCollab mark — fixed brand colors only (no accent / theme tint on tile or image).
 */
export function BrandLogoMark({ size = "drawer", framed, style, logoStyle }: Props) {
  const preset = SIZE[size]
  const showFrame = framed ?? preset.framed

  const image = (
    <Image
      source={MARK}
      style={[{ width: preset.logo, height: preset.logo }, logoStyle]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessibilityLabel="CourseCollab"
    />
  )

  if (!showFrame) {
    return <View style={[styles.bare, style]}>{image}</View>
  }

  return (
    <View
      style={[
        styles.frame,
        {
          width: preset.tile,
          height: preset.tile,
          borderRadius: preset.radius,
          backgroundColor: BRAND_LOGO_TILE.backgroundColor,
          borderColor: BRAND_LOGO_TILE.borderColor,
        },
        style,
      ]}
    >
      {image}
    </View>
  )
}

const styles = StyleSheet.create({
  bare: {
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
})
