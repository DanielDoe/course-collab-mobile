import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import type { CoraActionProposal, CoraConfirmActionResult } from "../../lib/cora/types"

type Props = {
  proposal: CoraActionProposal
  status?: "idle" | "confirming" | "done" | "error"
  resultMessage?: string
  onConfirm: () => void
  onCancel: () => void
  onOpen?: (route: string) => void
  result?: CoraConfirmActionResult | null
}

function iconForEntity(entityType: string): keyof typeof Ionicons.glyphMap {
  switch (entityType) {
    case "announcement":
      return "megaphone-outline"
    case "question":
      return "help-circle-outline"
    case "assessment":
      return "clipboard-outline"
    case "message":
      return "chatbubble-ellipses-outline"
    case "flashcard_deck":
      return "albums-outline"
    case "note":
      return "document-text-outline"
    case "calendar_events":
      return "calendar-outline"
    default:
      return "sparkles-outline"
  }
}

/** Native confirmation card for consequential Cora mutations. */
export function CoraActionCard({
  proposal,
  status = "idle",
  resultMessage,
  onConfirm,
  onCancel,
  onOpen,
  result,
}: Props) {
  const tokens = useAppThemeTokens()
  const preview = proposal.preview
  const isDone = status === "done"
  const isError = status === "error"
  const isBusy = status === "confirming"

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.isDark ? NATIVE.secondaryGrouped : "#FFFFFF",
          borderColor: tokens.isDark ? NATIVE.separator : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: isDone
                ? "rgba(52, 199, 89, 0.14)"
                : isError
                  ? "rgba(255, 59, 48, 0.12)"
                  : "rgba(0, 122, 255, 0.12)",
            },
          ]}
        >
          <Ionicons
            name={isDone ? "checkmark-circle" : iconForEntity(preview.entityType)}
            size={20}
            color={isDone ? "#34C759" : isError ? "#FF3B30" : "#007AFF"}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: tokens.native.label }]} numberOfLines={2}>
            {isDone ? "Done" : preview.title}
          </Text>
          <Text style={[styles.summary, { color: tokens.native.secondaryLabel }]} numberOfLines={3}>
            {isDone ? resultMessage || result?.message || preview.summary : preview.summary}
          </Text>
        </View>
      </View>

      {!isDone ? (
        <View style={styles.fields}>
          {preview.fields.map((field) => (
            <View key={`${field.label}-${field.value}`} style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: tokens.native.secondaryLabel }]}>
                {field.label}
              </Text>
              <Text style={[styles.fieldValue, { color: tokens.native.label }]} numberOfLines={3}>
                {field.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {isError && resultMessage ? (
        <Text style={styles.errorText}>{resultMessage}</Text>
      ) : null}

      <View style={styles.actions}>
        {isDone ? (
          <>
            {result?.entity?.route ? (
              <Pressable
                onPress={() => onOpen?.(String(result.entity!.route))}
                style={[styles.btn, styles.btnPrimary]}
                accessibilityRole="button"
              >
                <Text style={styles.btnPrimaryText}>Open</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Pressable
              onPress={onCancel}
              disabled={isBusy}
              style={[styles.btn, styles.btnGhost, { borderColor: tokens.native.separator }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnGhostText, { color: tokens.native.label }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isBusy}
              style={[styles.btn, styles.btnPrimary, isBusy && styles.btnDisabled]}
              accessibilityRole="button"
            >
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>{preview.confirmLabel}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 14,
    lineHeight: 19,
  },
  fields: {
    gap: 8,
    paddingTop: 2,
  },
  fieldRow: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "none",
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 19,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 2,
  },
  btn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "600",
  },
  btnPrimary: {
    backgroundColor: "#007AFF",
    minWidth: 120,
  },
  btnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.7,
  },
})
