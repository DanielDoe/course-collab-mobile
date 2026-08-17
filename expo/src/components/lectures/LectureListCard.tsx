import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { LectureItem } from "../../lib/student-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { lectureSolidThumb, lectureStatusAccent } from "../../lib/lecture-list-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  clampProgress,
  lectureStatusLabel,
  lectureTitleIncludesCourse,
  resolveLectureCardKind,
  type LectureCardKind,
} from "./lecture-list-utils"

type Props = {
  lecture: LectureItem
  courseLabel: string
  index: number
  onPress: () => void
}

function thumbIcon(kind: LectureCardKind): keyof typeof Ionicons.glyphMap {
  if (kind === "locked") return "lock-closed-outline"
  if (kind === "in_progress") return "time-outline"
  return "play-outline"
}

function statusIcon(kind: LectureCardKind): keyof typeof Ionicons.glyphMap {
  if (kind === "completed") return "checkmark-circle"
  return "ellipse"
}

export function LectureListCard({ lecture, courseLabel, index, onPress }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const kind = resolveLectureCardKind(lecture)
  const progress = clampProgress(lecture.progress_percentage)
  const solidThumb = lectureSolidThumb(index, kind)
  const statusColor = lectureStatusAccent(kind, solidThumb)
  const locked = kind === "locked"
  const showProgress = kind === "in_progress"

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed && !locked ? NATIVE.pressedOpacity : 1,
        },
      ]}
      disabled={locked}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`${lecture.title}, ${lectureStatusLabel(kind)}, ${progress} percent viewed`}
    >
      <SolidListThumbTile thumb={solidThumb} icon={thumbIcon(kind)} />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {lecture.title}
        </Text>
        {lectureTitleIncludesCourse(lecture.title, courseLabel) ? null : (
          <Text style={[type.caption, styles.course, { color: native.secondaryLabel }]} numberOfLines={1}>
            {courseLabel}
          </Text>
        )}

        <View style={styles.statusRow}>
          <View style={styles.statusMain}>
            <Ionicons
              name={statusIcon(kind)}
              size={kind === "completed" ? 14 : 8}
              color={statusColor}
              style={kind === "completed" ? undefined : styles.statusDot}
            />
            <Text style={[type.footnote, styles.statusText, { color: statusColor }]}>
              {lectureStatusLabel(kind)}
            </Text>
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>• {progress}% viewed</Text>
          </View>

          {showProgress ? (
            <View style={[styles.progressTrack, { backgroundColor: hexToRgba(solidThumb.label, tokens.isDark ? 0.22 : 0.16) }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(progress, 4)}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
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
    gap: 2,
    paddingVertical: 1,
  },
  title: {
    lineHeight: 20,
  },
  course: {
    lineHeight: 16,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 16,
  },
  statusMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  statusDot: {
    marginHorizontal: 2,
  },
  statusText: {
    fontWeight: "600",
  },
  progressTrack: {
    width: 52,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    flexShrink: 0,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  chevron: {
    flexShrink: 0,
    marginTop: 2,
  },
})
