import { useMemo } from "react"
import { Ionicons } from "@/components/icons/AppIcon"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { nativeType } from "../../constants/faculty-native-theme"

type Props = {
  title: string
  description?: string
  icon?: keyof typeof Ionicons.glyphMap
}

export function ModulePlaceholderScreen({
  title,
  description = "This module matches the web mobile dashboard. Native screens will roll out incrementally.",
  icon = "phone-portrait-outline"}: Props) {
  const scrollPad = useModuleScrollContentPadding(24)
  const tokens = useAppThemeTokens()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16 },
        card: {
          backgroundColor: tokens.surface,
          borderRadius: 20,
          padding: 20,
          gap: 10,
          borderWidth: 1,
          borderColor: tokens.border,
        },
        iconWrap: {
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: hexToRgba(tokens.accent, 0.1),
          alignItems: "center",
          justifyContent: "center",
        },
        title: nativeType.sheetTitle,
        body: { fontSize: 15, lineHeight: 22, color: tokens.textSecondary },
        note: { fontSize: 13, lineHeight: 19, color: tokens.textMuted, marginTop: 4 },
      }),
    [tokens],
  )

  return (
    <ScrollView
      contentContainerStyle={[styles.content, scrollPad]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={28} color={tokens.accent} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{description}</Text>
        <Text style={styles.note}>
          Full {title.toLowerCase()} workflows remain on the web app for now. Use the side menu to explore other areas.
        </Text>
      </View>
    </ScrollView>
  )
}
