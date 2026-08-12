import { useMemo } from "react"
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SummerDiscussion, SummerDiscussionTab } from "../../lib/summer-camp-api"
import { formatRelativeTime, stripHtml } from "../../lib/collaboration-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty/faculty-collab-sheet-ui"

type Props = {
  visible: boolean
  discussion: SummerDiscussion | null
  tab: SummerDiscussionTab
  onClose: () => void
  onOpenWeb?: (discussion: SummerDiscussion) => void
}

function bodyText(discussion: SummerDiscussion): string {
  return stripHtml(discussion.body ?? discussion.description ?? "").trim()
}

function statusLabel(discussion: SummerDiscussion): string {
  if (discussion.kind === "announcement") return "Announcement"
  if (discussion.is_resolved) return "Resolved"
  return "Open question"
}

function statusTone(discussion: SummerDiscussion): "success" | "live" | "neutral" {
  if (discussion.is_resolved) return "success"
  if (discussion.kind === "announcement") return "neutral"
  return "live"
}

export function SummerDiscussionActionSheet({ visible, discussion, tab, onClose, onOpenWeb }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens), [native, tokens])

  if (!discussion) return null

  const body = bodyText(discussion)
  const createdLabel = discussion.created_at ? formatRelativeTime(discussion.created_at) : null
  const showOpenWeb = discussion.kind !== "announcement" && onOpenWeb

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Discussion" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={discussion.title}
            subtitle={[discussion.training_title, createdLabel].filter(Boolean).join(" · ") || "Summer camp discussion"}
            icon={discussion.kind === "announcement" ? "megaphone-outline" : "chatbubbles-outline"}
            pills={
              <>
                <FacultyStatusPill label={statusLabel(discussion)} tone={statusTone(discussion)} onDark />
                {discussion.reply_count != null && discussion.kind !== "announcement" ? (
                  <FacultyStatusPill
                    label={`${discussion.reply_count} repl${discussion.reply_count === 1 ? "y" : "ies"}`}
                    tone="neutral"
                    onDark
                  />
                ) : null}
              </>
            }
          />

          {body ? (
            <FacultySheetSection label={discussion.kind === "announcement" ? "Announcement" : "Question"}>
              <View style={styles.copyCard}>
                <Text style={[type.body, styles.copyText, { color: native.label }]}>{body}</Text>
              </View>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Details">
            <FacultySheetGroupedList>
              {discussion.author_name ? (
                <FacultySheetMetricRow icon="person-outline" label="Author" value={discussion.author_name} />
              ) : null}
              {discussion.training_title ? (
                <FacultySheetMetricRow icon="school-outline" label="Training" value={discussion.training_title} />
              ) : null}
              {discussion.module_title ? (
                <FacultySheetMetricRow icon="folder-open-outline" label="Module" value={discussion.module_title} numberOfLines={2} />
              ) : null}
              <FacultySheetMetricRow
                icon="layers-outline"
                label="View"
                value={
                  tab === "my_questions"
                    ? "My questions"
                    : tab === "training"
                      ? "Training discussions"
                      : tab === "announcements"
                        ? "Announcements"
                        : "Resolved"
                }
                isLast={!showOpenWeb}
              />
            </FacultySheetGroupedList>
          </FacultySheetSection>

          {showOpenWeb ? (
            <FacultySheetSection label="Actions">
              <FacultySheetActionRow
                icon="open-outline"
                label="Open thread"
                subtitle="Continue this discussion in the camp help hub"
                tone="primary"
                onPress={() => onOpenWeb(discussion)}
              />
            </FacultySheetSection>
          ) : null}

          {discussion.kind === "announcement" ? (
            <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark) }]}>
              <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
                <Ionicons name="megaphone-outline" size={18} color={tokens.accent} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Instructor announcement</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  Camp-wide updates from your faculty team appear here.
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

function createStyles(
  native: ReturnType<typeof useThemedNative>,
  tokens: ReturnType<typeof useAppThemeTokens>,
) {
  return StyleSheet.create({
    copyCard: {
      borderRadius: NATIVE.sectionRadius,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: native.separator,
      backgroundColor: native.secondaryGrouped,
    },
    copyText: { lineHeight: 23 },
    infoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginTop: 4,
      padding: 14,
      borderRadius: NATIVE.sectionRadius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.accentBorder,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    infoCopy: { flex: 1, gap: 4 },
  })
}
