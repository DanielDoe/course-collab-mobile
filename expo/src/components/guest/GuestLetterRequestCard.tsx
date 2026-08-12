import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { RecommendationRequest } from "../../lib/course-info-api"
import { formatRelativeTime } from "../../lib/collaboration-api"
import {
  formatRecommendationDeadline,
  getRecommendationJourney,
  getRecommendationPipelineTone,
  recommendationPillarShort,
  recommendationPurposeLabel,
  recommendationStatusLabel,
  recommendationStatusTone,
} from "../../lib/faculty-recommendation-utils"
import { guestCanDownload, guestNeedsAction } from "../../lib/guest-recommendation-utils"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { guestPipelineColor } from "./guest-shared"

type Props = {
  item: RecommendationRequest
  onPress: () => void
}

function purposeIcon(purpose: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    scholarship: "ribbon-outline",
    internship: "briefcase-outline",
    graduate_school: "school-outline",
    job_application: "document-text-outline",
    research_opportunity: "flask-outline",
    other: "sparkles-outline",
  }
  return map[purpose] ?? "document-text-outline"
}

function footerActionLabel(status: string): string {
  if (guestNeedsAction(status)) return "Continue workspace"
  if (guestCanDownload(status)) return status === "downloaded" ? "View letter PDF" : "Preview letter PDF"
  if (status === "rejected") return "View details"
  return "Open workspace"
}

function MetaChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const chipLayout = useKpiGridCardStyle("48%")

  return (
    <View
      style={[
        styles.metaChip,
        chipLayout,
        {
          backgroundColor: tokens.accentSoft,
          borderColor: tokens.accentBorder,
        },
      ]}
    >
      <View style={styles.metaChipHead}>
        <View style={[styles.metaChipIcon, { backgroundColor: tokens.accentSoftStrong }]}>
          <Ionicons name={icon} size={12} color={tokens.accent} />
        </View>
        <Text style={[type.footnote, styles.metaChipLabel]}>{label}</Text>
      </View>
      <Text style={[type.caption, styles.metaChipValue, { color: native.label }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

export function GuestLetterRequestCard({ item, onPress }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const journey = getRecommendationJourney({
    status: item.status,
    aiDraftCount: item.draft_count ?? 0,
  })
  const pipelineTone = getRecommendationPipelineTone(item.status, journey.step)
  const progressColor = guestPipelineColor(pipelineTone, tokens)
  const progressPct = Math.round((journey.step / journey.total) * 100)
  const updatedLabel = formatRelativeTime(item.updated_at ?? item.created_at)
  const actionLabel = footerActionLabel(item.status)
  const purposeTitle = recommendationPurposeLabel(item.purpose)

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: native.separator,
        },
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${purposeTitle}, ${recommendationStatusLabel(item.status)}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconTile, { backgroundColor: tokens.accentSoftStrong }]}>
          <Ionicons name={purposeIcon(item.purpose)} size={20} color={tokens.accent} />
        </View>
        <View style={styles.topCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
            {purposeTitle}
          </Text>
          <View style={styles.pillarRow}>
            <View
              style={[
                styles.pillarPill,
                {
                  backgroundColor: semanticSoft(progressColor, tokens.isDark, tokens.isDark ? 0.24 : 0.12),
                  borderColor: semanticSoft(progressColor, tokens.isDark, tokens.isDark ? 0.4 : 0.22),
                },
              ]}
            >
              <Text style={[type.footnote, { color: progressColor, fontWeight: "700" }]}>
                {recommendationPillarShort(journey.pillar)}
              </Text>
            </View>
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
              Step {journey.step}/{journey.total}
            </Text>
          </View>
        </View>
        <FacultyStatusPill label={recommendationStatusLabel(item.status)} tone={recommendationStatusTone(item.status)} />
      </View>

      <View style={styles.progressBlock}>
        <View style={[styles.progressTrack, { backgroundColor: semanticSoft(progressColor, tokens.isDark, 0.1) }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPct}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
        <Text style={[type.caption, styles.journeyHeadline, { color: native.label }]} numberOfLines={1}>
          {journey.headline}
        </Text>
        <Text style={[type.footnote, { color: native.secondaryLabel }]} numberOfLines={1}>
          {journey.subline}
        </Text>
      </View>

      <View style={styles.metaGrid}>
        <MetaChip icon="person-outline" label="Instructor" value={item.instructor_name ?? "Not assigned"} />
        <MetaChip icon="book-outline" label="Course" value={item.course_code ?? item.course_description ?? "Course"} />
        <MetaChip icon="calendar-outline" label="Deadline" value={formatRecommendationDeadline(item.deadline)} />
        <MetaChip icon="layers-outline" label="Drafts" value={String(item.draft_count ?? 0)} />
      </View>

      {item.student_request_description ? (
        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: native.fill,
              borderColor: native.separator,
            },
          ]}
        >
          <Ionicons name="chatbox-ellipses-outline" size={14} color={tokens.accent} />
          <Text style={[type.secondary, styles.noteText]} numberOfLines={2}>
            {item.student_request_description}
          </Text>
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: native.separator }]}>
        <Text style={[type.footnote, { color: native.tertiaryLabel }]}>Updated {updatedLabel}</Text>
        <View
          style={[
            styles.footerAction,
            {
              backgroundColor: tokens.accentSoftStrong,
              borderColor: tokens.accentBorder,
            },
          ]}
        >
          <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "700" }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={tokens.accent} />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  pillarPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  progressBlock: {
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  journeyHeadline: {
    fontWeight: "700",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  metaChipHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  metaChipLabel: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  metaChipValue: {
    fontWeight: "600",
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  noteText: {
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  footerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
})
