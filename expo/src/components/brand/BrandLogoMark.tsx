import { memo, useState } from "react"
import { StyleSheet, View, type StyleProp, type ImageStyle, type ViewStyle } from "react-native"
import { Image } from "expo-image"
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
const MARK_FALLBACK = require("../../../assets/icon.png")

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
  const [useFallbackAsset, setUseFallbackAsset] = useState(false)

  const image = imageFailed ? (
    <Ionicons name="school" size={preset.logo} color={BRAND.purple} accessibilityLabel="CourseCollab" />
  ) : (
    <Image
      source={useFallbackAsset ? MARK_FALLBACK : MARK}
      style={[{ width: preset.logo, height: preset.logo }, logoStyle]}
      contentFit="contain"
      transition={0}
      cachePolicy="memory-disk"
      accessibilityLabel="CourseCollab"
      onError={() => {
        if (!useFallbackAsset) {
          setUseFallbackAsset(true)
          return
        }
        setImageFailed(true)
      }}
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
