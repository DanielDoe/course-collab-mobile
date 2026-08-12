import { StyleSheet, Text, View } from "react-native"
import type { UniversityRecord } from "../../lib/api"
import { BrandLogoMark } from "../brand/BrandLogoMark"
import { useLoginTheme } from "./login-theme"
import { UniversityAuthLogoImage } from "./UniversityAuthLogoImage"

type Props = {
  title: string
  subtitle?: string
  /** When omitted, shows the CourseCollab mark (faculty / generic auth). */
  university?: Pick<UniversityRecord, "logo" | "name" | "short_name" | "primary_color"> | null
  accent?: string
}

export function LoginBrandHeader({ title, subtitle, university, accent }: Props) {
  const { LOGIN, loginType } = useLoginTheme()
  const schoolAccent = accent ?? university?.primary_color ?? LOGIN.purple

  return (
    <View style={styles.wrap}>
      {university ? (
        <UniversityAuthLogoImage university={university} variant="header" />
      ) : (
        <BrandLogoMark size="login" />
      )}

      <Text style={[loginType.panelTitle, styles.title, { color: LOGIN.label }]}>{title}</Text>

      {subtitle ? (
        <Text style={[loginType.panelDescription, styles.subtitle, { color: LOGIN.secondaryLabel }]}>
          {subtitle}
        </Text>
      ) : university ? (
        <Text style={[loginType.panelDescription, styles.subtitle, { color: LOGIN.secondaryLabel }]}>
          {university.name}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  title: { textAlign: "center", marginTop: 2 },
  subtitle: { textAlign: "center", lineHeight: 20, maxWidth: 300 },
})
