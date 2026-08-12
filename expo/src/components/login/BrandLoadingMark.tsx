import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { BRAND } from "../../constants"
import { BrandLogoMark } from "../brand/BrandLogoMark"

/** Logo width — keep ~1.3–1.5× the large ActivityIndicator (~36pt on iOS). */
export const BRAND_LOADING_LOGO_SIZE = 48
export const BRAND_LOADING_GAP = 16

type Props = {
  /** Spinner color only — logo tile is always brand-fixed. */
  color?: string
  style?: StyleProp<ViewStyle>
}

/** Centered logo + spinner for splash, session restore, and signing-in states. */
export function BrandLoadingMark({ color = BRAND.purple, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <BrandLogoMark size="loading" />
      <ActivityIndicator size="large" color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: BRAND_LOADING_GAP,
  },
})
