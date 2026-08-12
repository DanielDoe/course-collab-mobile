import type { ReactNode } from "react"
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"

type Props = {
  onBack: () => void
  onSave?: () => void
  saving?: boolean
  saveDisabled?: boolean
  trailing?: ReactNode
  /** When true, parent already applied top safe-area inset. */
  embedded?: boolean
}

/** Immersive toolbar for native assessment result reports — back + optional PDF save. */
export function AssessmentReportToolbar({
  onBack,
  onSave,
  saving = false,
  saveDisabled = false,
  trailing,
  embedded = false,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  const right = trailing ?? (
    onSave ? (
      <Pressable
        style={[
          styles.saveBtn,
          {
            backgroundColor: saveDisabled ? native.fill : tokens.accentSoftStrong,
            borderColor: saveDisabled ? native.separator : tokens.accentBorder,
            opacity: saveDisabled ? 0.55 : 1,
          },
        ]}
        onPress={onSave}
        disabled={saveDisabled || saving}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Save PDF report"
      >
        {saving ? (
          <ActivityIndicator size="small" color={tokens.accent} />
        ) : (
          <>
            <Ionicons name="download-outline" size={18} color={tokens.accent} />
            <Text style={[styles.saveText, { color: tokens.accent }]}>Save</Text>
          </>
        )}
      </Pressable>
    ) : (
      <View style={styles.saveBtnSpacer} />
    )
  )

  return (
    <View
      style={[
        styles.toolbar,
        {
          paddingTop: embedded ? 0 : insets.top + 6,
          backgroundColor: native.secondaryGrouped,
          borderBottomColor: native.separator,
          borderBottomWidth: embedded ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8} accessibilityRole="button">
        <Ionicons name="chevron-back" size={22} color={tokens.accent} />
        <Text style={[styles.backText, { color: tokens.accent }]}>Back</Text>
      </Pressable>
      <View style={styles.trailing}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 88,
    minHeight: 36,
    justifyContent: "flex-start",
  },
  backText: { fontSize: 16, fontWeight: "600" },
  trailing: {
    minWidth: 72,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
  },
  saveText: { fontSize: 14, fontWeight: "700" },
  saveBtnSpacer: { width: 72, height: 36 },
})
