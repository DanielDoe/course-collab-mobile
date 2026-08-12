import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerDiscussion } from "../../lib/summer-camp-api"
import { formatRelativeTime, stripHtml } from "../../lib/collaboration-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"

function authorLabel(discussion: SummerDiscussion): string {
  if (discussion.kind === "announcement") return discussion.author_name ?? "Camp faculty"
  return discussion.author_name ?? "Camper"
}

function authorInitial(discussion: SummerDiscussion): string {
  return (authorLabel(discussion).trim()[0] ?? "C").toUpperCase()
}

function previewText(discussion: SummerDiscussion): string {
  const raw = discussion.description ?? discussion.body ?? ""
  return stripHtml(raw).trim()
}

function statusLabel(discussion: SummerDiscussion): string | null {
  if (discussion.kind === "announcement") return "Announcement"
  if (discussion.is_resolved) return "Resolved"
  return "Open"
}

function statusTone(discussion: SummerDiscussion): "success" | "live" | "neutral" {
  if (discussion.is_resolved) return "success"
  if (discussion.kind === "announcement") return "neutral"
  return "live"
}

type Props = {
  discussion: SummerDiscussion
  onPress?: () => void
  last?: boolean
}

export function SummerDiscussionListCard({ discussion, onPress, last }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const preview = previewText(discussion)
  const pill = statusLabel(discussion)
  const replies = discussion.reply_count ?? 0
  const metaParts = [
    authorLabel(discussion),
    discussion.training_title,
    discussion.created_at ? formatRelativeTime(discussion.created_at) : undefined,
  ].filter(Boolean)

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: native.separator },
        last && styles.rowLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: tokens.accentSoft }]}>
          <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{authorInitial(discussion)}</Text>
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={2}>
              {discussion.title}
            </Text>
            {pill ? <FacultyStatusPill label={pill} tone={statusTone(discussion)} /> : null}
          </View>
          {preview ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
              {preview}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={1}>
          {metaParts.join(" · ")}
        </Text>
        {discussion.kind !== "announcement" ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
            {replies} repl{replies === 1 ? "y" : "ies"}
          </Text>
        ) : null}
      </View>

      {onPress ? (
        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>View details</Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, lineHeight: 21 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingLeft: 48,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
    paddingTop: 2,
  },
})
