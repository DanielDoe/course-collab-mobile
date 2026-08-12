import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import type { UniversityRecord } from "../../lib/api"
import { universityAuthLogo } from "../../lib/university-logo-uri"
import { useLoginTheme } from "./login-theme"

type UniversityLike = Pick<UniversityRecord, "logo" | "name" | "short_name" | "primary_color">

type Props = {
  university: UniversityLike
  /** Header wordmarks (wide) vs compact list rows. */
  variant?: "header" | "list"
  style?: StyleProp<ViewStyle>
}

/** Shared university logo — uses auth wordmarks (UH transparent, etc.). */
export function UniversityAuthLogoImage({ university, variant = "header", style }: Props) {
  const { LOGIN } = useLoginTheme()
  const authLogo = universityAuthLogo(university, LOGIN.isDark)
  const accent = university.primary_color ?? LOGIN.purple

  if (!authLogo) {
    return (
      <View
        style={[
          styles.fallback,
          variant === "list" ? styles.fallbackList : styles.fallbackHeader,
          { backgroundColor: accent },
          style,
        ]}
      >
        <Text style={[styles.fallbackText, variant === "list" && styles.fallbackTextList]}>
          {university.short_name.slice(0, 2)}
        </Text>
      </View>
    )
  }

  const box = variant === "list" ? LIST_BOX : null
  let width = authLogo.width
  let height = authLogo.height
  if (box) {
    const scale = Math.min(box / width, box / height, 1)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  return (
    <View style={[variant === "list" ? styles.listWrap : styles.headerWrap, style]}>
      <Image
        source={{ uri: authLogo.uri }}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel={university.name}
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}

const LIST_BOX = 40

const styles = StyleSheet.create({
  headerWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  listWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackHeader: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: 4,
  },
  fallbackList: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  fallbackText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  fallbackTextList: {
    fontSize: 13,
  },
})
