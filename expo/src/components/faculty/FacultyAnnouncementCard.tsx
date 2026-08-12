import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { InstructorAnnouncement } from "../../lib/instructor-api"
import { summarizeAnnouncement } from "../../lib/announcement-summary"
import { formatAnnouncementRelativeDate } from "../../lib/faculty-announcement-utils"
import {
  FACULTY_ANNOUNCEMENT_COLOR,
  facultyAnnouncementListThumb,
  facultyAnnouncementPinnedMeta,
  facultyAnnouncementPriorityMeta,
} from "../../lib/faculty-announcement-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type Props = {
  item: InstructorAnnouncement
  index: number
  onPress: () => void
}

function StatusChip({
  label,
  color,
  icon,
}: {
  label: string
  color: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  const type = useNativeType()
  return (
    <View style={styles.statusChip}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[type.footnote, styles.statusChipText, { color }]}>{label}</Text>
    </View>
  )
}

export function FacultyAnnouncementCard({ item, index, onPress }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const solidThumb = facultyAnnouncementListThumb(index)
  const pinned = item.pinned ? facultyAnnouncementPinnedMeta() : null
  const priority = facultyAnnouncementPriorityMeta(item.priority)
  const summary = summarizeAnnouncement(item.content ?? "", {
    title: item.title,
    aiSummary: item.ai_summary,
    maxLength: 140,
  })

  const metaParts = ["Course-wide", formatAnnouncementRelativeDate(item.created_at)].filter(Boolean)

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <SolidListThumbTile thumb={solidThumb} icon="megaphone-outline" />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={[type.caption, styles.preview, { color: native.secondaryLabel }]} numberOfLines={2}>
          {summary}
        </Text>

        <View style={styles.statusRow}>
          {pinned ? <StatusChip label={pinned.label} color={pinned.color} icon={pinned.icon} /> : null}
          {priority ? <StatusChip label={priority.label} color={priority.color} icon={priority.icon} /> : null}
          {item.is_active === false ? (
            <StatusChip label="Inactive" color={native.tertiaryLabel} icon="pause-circle-outline" />
          ) : null}
          {item.ai_summary ? (
            <View style={styles.statusChip}>
              <Ionicons name="sparkles-outline" size={12} color={FACULTY_ANNOUNCEMENT_COLOR.ai} />
              <Text style={[type.footnote, styles.statusChipText, { color: FACULTY_ANNOUNCEMENT_COLOR.ai }]}>
                AI summary
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={1}>
            {metaParts.join(" · ")}
          </Text>
          <View style={styles.stats}>
            {item.read_count != null ? (
              <View style={styles.stat}>
                <Ionicons name="eye-outline" size={12} color={native.tertiaryLabel} />
                <Text style={[type.footnote, { color: native.tertiaryLabel }]}>{item.read_count}</Text>
              </View>
            ) : null}
            {(item.comments_count ?? 0) > 0 ? (
              <View style={styles.stat}>
                <Ionicons name="chatbubble-outline" size={12} color={native.tertiaryLabel} />
                <Text style={[type.footnote, { color: native.tertiaryLabel }]}>{item.comments_count}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 88,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingVertical: 1,
  },
  title: {
    lineHeight: 20,
  },
  preview: {
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 16,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusChipText: {
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  chevron: {
    flexShrink: 0,
    marginTop: 4,
  },
})
