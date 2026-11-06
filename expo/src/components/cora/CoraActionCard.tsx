import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import type { CoraActionProposal, CoraConfirmActionResult, CoraProposalPreviewField } from "../../lib/cora/types"
import { resolveCoraOpenRoute } from "../../lib/cora/resolve-open-route"
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

function entityTypeLabel(entityType: string): string {
  switch (entityType) {
    case "flashcard_deck":
      return "Flashcards"
    case "note":
      return "Notes"
    case "calendar_events":
      return "Calendar"
    case "practice_quiz":
      return "Practice"
    case "study_plan":
      return "Study plan"
    case "announcement":
      return "Announcement"
    case "assessment":
      return "Assessment"
    case "message":
      return "Message"
    case "syllabus":
      return "Syllabus"
    case "lecture":
      return "Lecture"
    case "account":
      return "Account"
    case "question":
      return "Question bank"
    default:
      return "Cora task"
  }
}

function isProposalExpired(proposal: CoraActionProposal): boolean {
  const expires = Date.parse(proposal.expiresAt)
  return Number.isFinite(expires) && expires < Date.now()
}

function isCompactField(field: CoraProposalPreviewField): boolean {
  const value = String(field.value ?? "").trim()
  return value.length > 0 && value.length <= 32 && !value.includes("\n")
}

function partitionFields(fields: CoraProposalPreviewField[]) {
  const compact: CoraProposalPreviewField[] = []
  const wide: CoraProposalPreviewField[] = []
  for (const field of fields) {
    if (isCompactField(field)) compact.push(field)
    else wide.push(field)
  }
  return { compact, wide }
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
  const type = useNativeType()
  const { width: windowWidth } = useWindowDimensions()
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
  const openRoute = resolveCoraOpenRoute(result?.entity?.route, result?.entity?.type ?? preview.entityType)
  const taskTitle =
    result?.entity?.title?.trim() ||
    preview.title ||
    (result?.tool ? activityToolLabel(result.tool) : "Cora task")
  const showFields = (isDone || actionable || isError) && preview.fields.length > 0
  const { compact, wide } = partitionFields(preview.fields)
  const useFieldGrid = windowWidth >= 340 && compact.length > 0

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.isDark ? native.secondaryGrouped : native.groupedBackground,
          borderColor: tokens.border,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={
        isDone ? `Completed: ${taskTitle}` : expired ? `Expired: ${preview.title}` : preview.title
      }
    >
      <View style={styles.cardBody}>
        <View style={styles.header}>
          <View style={[styles.iconTile, { backgroundColor: hexToRgba(statusColor, tokens.isDark ? 0.24 : 0.12) }]}>
            <Ionicons
              name={isDone ? "checkmark-circle" : expired ? "time-outline" : iconForEntity(preview.entityType)}
              size={22}
              color={statusColor}
            />
          </View>
          <View style={styles.headerText}>
            <View style={styles.headerMeta}>
              <View style={[styles.entityChip, { backgroundColor: hexToRgba(accent, tokens.isDark ? 0.18 : 0.1) }]}>
                <Text style={[styles.entityChipText, { color: accent }]}>
                  {entityTypeLabel(preview.entityType).toUpperCase()}
                </Text>
              </View>
              {isDone ? (
                <Text style={[styles.statusBadge, { color: success }]}>Done</Text>
              ) : expired ? (
                <Text style={[styles.statusBadge, { color: danger }]}>Expired</Text>
              ) : null}
            </View>
            <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
              {isDone ? taskTitle : preview.title}
            </Text>
            <Text style={[type.caption, styles.summary, { color: native.secondaryLabel }]} numberOfLines={4}>
              {isDone
                ? resultMessage || result?.message || preview.summary
                : expired
                  ? "This confirmation expired. Ask Cora again if you still want to run it — it was not executed."
                  : preview.summary}
            </Text>
          </View>
        </View>

        {showFields ? (
          <View style={styles.fieldsBlock}>
            {wide.map((field) => (
              <View
                key={`wide-${field.label}-${field.value}`}
                style={[
                  styles.fieldTile,
                  styles.fieldTileWide,
                  {
                    backgroundColor: hexToRgba(native.fill, tokens.isDark ? 0.55 : 0.65),
                    borderColor: native.separator,
                  },
                ]}
              >
                <Text style={[styles.fieldLabel, { color: native.tertiaryLabel }]}>{field.label}</Text>
                <Text style={[type.callout, styles.fieldValue, { color: native.label }]} numberOfLines={4}>
                  {field.value}
                </Text>
              </View>
            ))}
            {compact.length > 0 ? (
              <View style={[styles.fieldGrid, useFieldGrid ? styles.fieldGridTwoCol : null]}>
                {compact.map((field) => (
                  <View
                    key={`compact-${field.label}-${field.value}`}
                    style={[
                      styles.fieldTile,
                      useFieldGrid ? styles.fieldTileHalf : styles.fieldTileWide,
                      {
                        backgroundColor: hexToRgba(native.fill, tokens.isDark ? 0.55 : 0.65),
                        borderColor: native.separator,
                      },
                    ]}
                  >
                    <Text style={[styles.fieldLabel, { color: native.tertiaryLabel }]}>{field.label}</Text>
                    <Text style={[type.bodyEmphasis, styles.fieldValueCompact, { color: native.label }]} numberOfLines={2}>
                      {field.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {isError && (resultMessage || result?.error === "in_progress") ? (
          <Text style={[type.caption, styles.errorText, { color: danger }]}>
            {result?.error === "in_progress"
              ? "This action is already being confirmed."
              : resultMessage}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {isDone ? (
            openRoute ? (
              <Pressable
                onPress={() => {
                  if (!onOpen) return
                  // Route is already native-resolved; callers must not re-map to web.
                  onOpen(openRoute)
                }}
                style={[styles.btn, styles.btnPrimary, styles.btnFull, { backgroundColor: accent }]}
                accessibilityRole="button"
                accessibilityLabel="Open module"
              >
                <Text style={[styles.btnPrimaryText, { color: tokens.accentInk ?? "#FFFFFF" }]}>Open module</Text>
              </Pressable>
            ) : (
              <Text style={[type.caption, styles.auditHint, { color: native.tertiaryLabel }]}>
                Already executed — kept for your records
              </Text>
            )
          ) : expired ? (
            <Text style={[type.caption, styles.auditHint, { color: native.tertiaryLabel }]}>Not executed</Text>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                onPress={onCancel}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnSecondary,
                  {
                    backgroundColor: tokens.isDark ? hexToRgba("#FFFFFF", 0.08) : hexToRgba("#000000", 0.04),
                    borderColor: native.separator,
                    opacity: pressed ? NATIVE.pressedOpacity : 1,
                  },
                ]}
                accessibilityRole="button"
              >
                <Text style={[type.bodyEmphasis, styles.btnSecondaryText, { color: native.label }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={isBusy || !actionable}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  styles.btnPrimaryFlex,
                  { backgroundColor: accent, opacity: pressed ? NATIVE.pressedOpacity : isBusy || !actionable ? 0.72 : 1 },
                ]}
                accessibilityRole="button"
              >
                {isBusy ? (
                  <ActivityIndicator color={tokens.accentInk ?? "#FFFFFF"} />
                ) : (
                  <Text
                    style={[type.bodyEmphasis, styles.btnPrimaryText, { color: tokens.accentInk ?? "#FFFFFF" }]}
                    numberOfLines={1}
                  >
                    {preview.confirmLabel}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardBody: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  headerText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  entityChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  entityChipText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
  },
  summary: {
    lineHeight: 18,
  },
  fieldsBlock: {
    gap: 8,
  },
  fieldGrid: {
    gap: 8,
  },
  fieldGridTwoCol: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  fieldTile: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  fieldTileWide: {
    width: "100%",
  },
  fieldTileHalf: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 120,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  fieldValue: {
    lineHeight: 20,
  },
  fieldValueCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  errorText: {
    lineHeight: 18,
  },
  auditHint: {
    textAlign: "center",
    paddingVertical: 4,
  },
  actions: {
    paddingTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    flex: 0.92,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnSecondaryText: {
    fontSize: 15,
  },
  btnPrimary: {},
  btnPrimaryFlex: {
    flex: 1.35,
    minWidth: 0,
  },
  btnFull: {
    alignSelf: "stretch",
    width: "100%",
  },
  btnPrimaryText: {
    fontSize: 15,
  },
})
