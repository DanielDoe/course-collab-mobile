import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useFacultySheetSurfaces } from "../faculty/faculty-collab-sheet-ui"
import { semanticSoft } from "../../lib/themed-module-theme"

type Props = {
  pinned: boolean
  archived: boolean
  busy?: boolean
  onTogglePin: () => void
  onToggleArchive: () => void
  onDelete: () => void
}

export function NotificationDetailActions({
  pinned,
  archived,
  busy = false,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const surfaces = useFacultySheetSurfaces()

  const actions = [
    {
      key: "pin",
      label: pinned ? "Unpin" : "Pin",
      icon: (pinned ? "pin" : "pin-outline") as const,
      color: pinned ? tokens.accent : native.secondaryLabel,
      background: pinned ? tokens.accentSoft : surfaces.pressedBg,
      onPress: onTogglePin,
    },
    {
      key: "archive",
      label: archived ? "Unarchive" : "Archive",
      icon: (archived ? "archive" : "archive-outline") as const,
      color: archived ? tokens.warning : native.secondaryLabel,
      background: archived
        ? semanticSoft(tokens.warning, tokens.isDark)
        : surfaces.pressedBg,
      onPress: onToggleArchive,
    },
    {
      key: "delete",
      label: "Delete",
      icon: "trash-outline" as const,
      color: tokens.danger,
      background: semanticSoft(tokens.danger, tokens.isDark, tokens.isDark ? 0.18 : 0.1),
      onPress: onDelete,
    },
  ] as const

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: native.secondaryLabel }]}>Manage</Text>
      <View
        style={[
          styles.row,
          {
            backgroundColor: surfaces.cardBg,
            borderColor: surfaces.cardBorder,
          },
        ]}
      >
        {actions.map((action, index) => (
          <View key={action.key} style={styles.cell}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: surfaces.cardBorder }]} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              disabled={busy}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: action.background,
                  opacity: busy ? 0.55 : pressed ? NATIVE.pressedOpacity : 1,
                },
              ]}
            >
              {busy && action.key === "delete" ? (
                <ActivityIndicator size="small" color={action.color} />
              ) : (
                <Ionicons name={action.icon} size={20} color={action.color} />
              )}
              <Text style={[styles.label, { color: action.color }]}>{action.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
    paddingHorizontal: 2,
    textTransform: "none",
  },
  row: {
    flexDirection: "row",
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cell: { flex: 1, flexDirection: "row", alignItems: "stretch" },
  divider: { width: StyleSheet.hairlineWidth },
  button: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.1 },
})
