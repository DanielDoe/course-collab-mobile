import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import type { CoraActionProposal, CoraConfirmActionResult } from "../../lib/cora/types"
import { activityToolLabel } from "../../lib/cora/activity-store"

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
    case "practice_quiz":
      return "school-outline"
    case "study_plan":
      return "map-outline"
    case "syllabus":
      return "book-outline"
    case "lecture":
      return "easel-outline"
    case "account":
      return "person-circle-outline"
    default:
      return "sparkles-outline"
  }
}

function isProposalExpired(proposal: CoraActionProposal): boolean {
  const expires = Date.parse(proposal.expiresAt)
  return Number.isFinite(expires) && expires < Date.now()
}

/**
 * Pending: Confirm / Cancel.
 * Completed: audit receipt only — never re-runs; Open module when a route exists.
 * Expired (not confirmed): read-only notice — ask Cora again.
 */
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
  const native = tokens.native
  const preview = proposal.preview
  const isDone = status === "done" || Boolean(result?.success)
  const isError = status === "error" && !isDone
  const isBusy = status === "confirming"
  const expired = !isDone && !isBusy && isProposalExpired(proposal)
  const actionable = !isDone && !expired && (status === "idle" || status === "error")

  const accent = tokens.accent
  const success = "#34C759"
  const danger = "#FF3B30"
  const statusColor = isDone ? success : isError || expired ? danger : accent
  const openRoute = result?.entity?.route
  const taskTitle =
    result?.entity?.title?.trim() ||
    preview.title ||
    (result?.tool ? activityToolLabel(result.tool) : "Cora task")

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.elevatedSurface || native.secondaryGrouped,
          borderColor: native.separatorOpaque || tokens.border,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={
        isDone ? `Completed: ${taskTitle}` : expired ? `Expired: ${preview.title}` : preview.title
      }
    >
      <View style={styles.header}>
        <View style={[styles.iconTile, { backgroundColor: hexToRgba(statusColor, tokens.isDark ? 0.22 : 0.12) }]}>
          <Ionicons
            name={isDone ? "checkmark-circle" : expired ? "time-outline" : iconForEntity(preview.entityType)}
            size={20}
            color={statusColor}
          />
        </View>
        <View style={styles.headerText}>
          {isDone ? (
            <Text style={[styles.badge, { color: success }]}>Completed</Text>
          ) : expired ? (
            <Text style={[styles.badge, { color: danger }]}>Expired</Text>
          ) : null}
          <Text style={[styles.title, { color: native.label }]} numberOfLines={2}>
            {isDone ? taskTitle : preview.title}
          </Text>
          <Text style={[styles.summary, { color: native.secondaryLabel }]} numberOfLines={4}>
            {isDone
              ? resultMessage || result?.message || preview.summary
              : expired
                ? "This confirmation expired. Ask Cora again if you still want to run it — it was not executed."
                : preview.summary}
          </Text>
        </View>
      </View>

      {(isDone || actionable || isError) && preview.fields.length > 0 ? (
        <View style={[styles.fields, { borderTopColor: native.separator }]}>
          {preview.fields.map((field) => (
            <View key={`${field.label}-${field.value}`} style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: native.tertiaryLabel }]}>{field.label}</Text>
              <Text style={[styles.fieldValue, { color: native.label }]} numberOfLines={3}>
                {field.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {isError && (resultMessage || result?.error === "in_progress") ? (
        <Text style={[styles.errorText, { color: danger }]}>
          {result?.error === "in_progress"
            ? "This action is already being confirmed."
            : resultMessage}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {isDone ? (
          openRoute ? (
            <Pressable
              onPress={() => onOpen?.(String(openRoute))}
              style={[styles.btn, styles.btnPrimary, { backgroundColor: accent }]}
              accessibilityRole="button"
              accessibilityLabel="Open module"
            >
              <Text style={styles.btnPrimaryText}>Open module</Text>
            </Pressable>
          ) : (
            <Text style={[styles.auditHint, { color: native.tertiaryLabel }]}>
              Already executed — kept for your records
            </Text>
          )
        ) : expired ? (
          <Text style={[styles.auditHint, { color: native.tertiaryLabel }]}>Not executed</Text>
        ) : (
          <>
            <Pressable
              onPress={onCancel}
              disabled={isBusy}
              style={[
                styles.btn,
                styles.btnGhost,
                {
                  borderColor: native.separator,
                  backgroundColor: tokens.isDark ? hexToRgba("#FFFFFF", 0.06) : hexToRgba("#000000", 0.03),
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnGhostText, { color: native.label }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isBusy || !actionable}
              style={[
                styles.btn,
                styles.btnPrimary,
                { backgroundColor: accent },
                (isBusy || !actionable) && styles.btnDisabled,
              ]}
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
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
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
  badge: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
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
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldRow: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 19,
  },
  errorText: {
    fontSize: 13,
  },
  auditHint: {
    fontSize: 13,
    fontWeight: "500",
    alignSelf: "flex-end",
    paddingVertical: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
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
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "600",
  },
  btnPrimary: {
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
