import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  assessmentTypeLabel,
  formatResultScore,
} from "../../lib/faculty-results-utils"
import { formatFacultyRelativeTime, type InstructorAssessmentResult } from "../../lib/instructor-api"
import {
  FACULTY_RESULTS_COLOR,
  facultyResultScoreColor,
  facultyResultThumb,
} from "../../lib/faculty-results-theme"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

export function FacultyResultCard({
  item,
  onPress,
}: {
  item: InstructorAssessmentResult
  onPress: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const title = item.assessment_title ?? item.quiz_title ?? "Assessment"
  const pct = item.percentage ?? 0
  const thumb = facultyResultThumb(item.assessment_type, item.attempt_id)
  const scoreColor = facultyResultScoreColor(pct)

  const metaParts = [
    assessmentTypeLabel(item.assessment_type),
    item.section,
    item.completed_at ? formatFacultyRelativeTime(item.completed_at) : null,
  ].filter(Boolean)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="bar-chart-outline"
      title={title}
      description={`${item.student_name} · ${item.student_id}`}
      metaLine={metaParts.join(" · ")}
      accentLine={{ text: `${formatResultScore(item)} score`, color: scoreColor }}
      trailing={
        <View style={styles.trailing}>
          <Text style={[type.caption, styles.score, { color: scoreColor }]}>{formatResultScore(item)}</Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </View>
      }
      footer={
        <View style={styles.badges}>
          {item.is_flagged ? <FacultyStatusPill label="Flagged" tone="warning" /> : null}
          {item.is_in_progress ? <FacultyStatusPill label="In progress" tone="live" /> : null}
          {item.is_final_grade ? <FacultyStatusPill label="Final" tone="success" /> : null}
          {item.results_finalized ? <FacultyStatusPill label="Finalized" tone="neutral" /> : null}
          <Text style={[type.caption, styles.link, { color: FACULTY_RESULTS_COLOR.link }]}>View full report</Text>
        </View>
      }
      onPress={onPress}
    />
  )
}

const styles = StyleSheet.create({
  trailing: { alignItems: "flex-end", gap: 4 },
  score: { fontWeight: "700", fontSize: 18 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  link: { marginLeft: "auto", fontWeight: NATIVE.titleWeight },
})
