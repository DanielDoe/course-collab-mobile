import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

type Props = {
  backLabel?: string
  title?: string
  onBack: () => void
  trailing?: ReactNode
}

/** Native toolbar for immersive lecture slide preview — respects appearance theme + dark mode. */
export function LectureSlidePreviewToolbar({
  backLabel = "Lectures",
  title = "Slide preview",
  onBack,
  trailing,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  return (
    <View
      style={[
        styles.toolbar,
        {
          paddingTop: insets.top + 4,
          backgroundColor: native.secondaryGrouped,
          borderBottomColor: native.separator,
        },
      ]}
    >
      <Pressable
        style={styles.backBtn}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Back to ${backLabel}`}
      >
        <Ionicons name="chevron-back" size={22} color={tokens.accent} />
        <Text style={[styles.backText, { color: tokens.accent }]}>{backLabel}</Text>
      </Pressable>
      <Text style={[styles.toolbarTitle, { color: tokens.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.trailing}>{trailing ?? <View style={styles.backBtn} />}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 88,
  },
  backText: { fontSize: 16, fontWeight: "600" },
  toolbarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  trailing: {
    minWidth: 88,
    alignItems: "flex-end",
    justifyContent: "center",
  },
})
