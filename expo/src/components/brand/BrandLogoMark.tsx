import { memo, useState } from "react"
import { Image, StyleSheet, View, type StyleProp, type ImageStyle, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { BRAND } from "../../constants"

/**
 * In-app mark uses the original transparent PNG so it blends on light/dark chrome.
 * App Store home-screen icon is a separate opaque asset (Apple forbids alpha).
 */
export const BRAND_LOGO_TILE = {
  backgroundColor: "transparent",
  borderColor: "transparent",
} as const

const MARK = require("../../../assets/logo-mark.png")

try {
  const resolved = Image.resolveAssetSource(MARK)
  if (resolved?.uri) {
    void Image.prefetch(resolved.uri)
  }
} catch {
  // Prefetch is best-effort only.
}

export type BrandLogoMarkSize = "drawer" | "login" | "loading" | "compact"

const SIZE: Record<
  BrandLogoMarkSize,
  { tile: number; logo: number; radius: number; framed: boolean }
> = {
  /** Slightly smaller; unframed so drawer theme shows through. */
  drawer: { tile: 40, logo: 36, radius: 12, framed: false },
  login: { tile: 64, logo: 48, radius: 16, framed: false },
  loading: { tile: 64, logo: 48, radius: 16, framed: false },
  compact: { tile: 32, logo: 28, radius: 10, framed: false },
}

type Props = {
  size?: BrandLogoMarkSize
  /** Override framed tile; defaults from size preset. */
  framed?: boolean
  style?: StyleProp<ViewStyle>
  logoStyle?: StyleProp<ImageStyle>
}

/**
 * CourseCollab mark — original artwork with alpha; no theme tint on the image.
 */
function BrandLogoMarkInner({ size = "drawer", framed, style, logoStyle }: Props) {
  const preset = SIZE[size]
  const showFrame = framed ?? preset.framed
  const [imageFailed, setImageFailed] = useState(false)

  const image = imageFailed ? (
    <Ionicons name="school" size={preset.logo} color={BRAND.purple} accessibilityLabel="CourseCollab" />
  ) : (
    <Image
      source={MARK}
      style={[{ width: preset.logo, height: preset.logo }, logoStyle]}
      resizeMode="contain"
      fadeDuration={0}
      accessibilityIgnoresInvertColors
      accessibilityLabel="CourseCollab"
      onError={() => setImageFailed(true)}
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

export const BrandLogoMark = memo(BrandLogoMarkInner)

const styles = StyleSheet.create({
  bare: {
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
})
