import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { LectureSamplePracticeConfig } from "../../lib/lecture-types"
import { StudentLectureSamplePracticeQuestionCard } from "./StudentLectureSamplePracticeQuestionCard"

type Props = {
  lectureId: number
  studentDatabaseId: string
  courseLabel: string
  config: LectureSamplePracticeConfig
  expandedId: string | null
  reviewedIds: Set<string>
  onToggle: (questionId: string) => void
  onReviewed: (questionId: string) => void
}

export function StudentLectureSamplePracticePanel({
  lectureId,
  studentDatabaseId,
  courseLabel,
  config,
  expandedId,
  reviewedIds,
  onToggle,
  onReviewed,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const label = config.button_label?.trim() || "Sample Practice"

  return (
    <View style={styles.wrap}>
      <View style={[styles.intro, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
        <View style={styles.introTop}>
          <View style={[styles.introIcon, { backgroundColor: tokens.accentSoft }]}>
            <Ionicons name="sparkles-outline" size={18} color={tokens.accent} />
          </View>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>{label}</Text>
        </View>
        <Text style={[type.secondary, styles.introBody, { color: native.secondaryLabel }]}>
          Work through each example, submit your answer, then reveal the solution — one question at a time.
        </Text>
      </View>

      <View style={styles.list}>
        {config.questions.map((question, index) => (
          <StudentLectureSamplePracticeQuestionCard
            key={question.id}
            lectureId={lectureId}
            studentDatabaseId={studentDatabaseId}
            courseLabel={courseLabel}
            question={question}
            index={index}
            expanded={expandedId === question.id}
            reviewed={reviewedIds.has(question.id)}
            onToggle={() => onToggle(question.id)}
            onReviewed={() => onReviewed(question.id)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  intro: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  introTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  introIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  introBody: {
    lineHeight: 20,
  },
  list: {
    gap: 10,
  },
})
