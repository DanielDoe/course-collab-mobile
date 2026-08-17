import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { assessmentTypeLabel } from "../../lib/faculty-assessment-utils"
import type { AtRiskStudentRow } from "../../lib/faculty-analytics-utils"
import { reportPerformanceColor } from "../../lib/assessment-report-theme"
import {
  formatFacultyRelativeTime,
  type InstructorProgressReviewRow,
  type InstructorRecentActivity,
  type PracticeStudentProgress,
} from "../../lib/instructor-api"
import { periodBadgeLabel } from "../../lib/progress-review-utils"
import {
  FACULTY_PROGRESS_REVIEWS_COLOR,
  facultyProgressReviewKpiAccent,
  facultyProgressReviewStatusMeta,
  facultyProgressReviewThumb,
} from "../../lib/faculty-progress-reviews-theme"
import {
  FACULTY_ACTIVITY_COLOR,
  facultyActivityStatusMeta,
  facultyActivityThumb,
} from "../../lib/faculty-recent-activity-theme"
import {
  FACULTY_STUDENT_PROGRESS_COLOR,
  facultyAtRiskThumb,
  facultyStudentProgressThumb,
} from "../../lib/faculty-student-progress-theme"
import { studentInitials } from "../../lib/faculty-students-utils"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { practiceStudentAttempts, practiceStudentName, practiceStudentScore } from "./FacultyPracticeModals"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export function FacultyAnalyticsKpiTile({
  label,
  value,
  accentIndex,
}: {
  label: string
  value: string
  accentIndex: number
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const thumb = facultyProgressReviewKpiAccent(accentIndex)

  return (
    <View style={[styles.kpiTile, { backgroundColor: native.secondaryGrouped }]}>
      <SolidListThumbTile thumb={thumb} size="compact" />
      <Text style={[type.bodyEmphasis, styles.kpiValue]}>{value}</Text>
      <Text style={[type.caption, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

export function FacultyRecentActivityKpiRow({ total, submitted, inProgress }: { total: number; submitted: number; inProgress: number }) {
  return (
    <View style={styles.kpiRow}>
      <FacultyAnalyticsKpiTile label="Events" value={String(total)} accentIndex={0} />
      <FacultyAnalyticsKpiTile label="Submitted" value={String(submitted)} accentIndex={1} />
      <FacultyAnalyticsKpiTile label="In progress" value={String(inProgress)} accentIndex={2} />
    </View>
  )
}

export function FacultyRecentActivityCard({
  item,
  onPress,
}: {
  item: InstructorRecentActivity
  onPress: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const thumb = facultyActivityThumb(item.status, item.id)
  const status = facultyActivityStatusMeta(item.status)
  const scoreLabel =
    item.percentage != null
      ? `${Math.round(item.percentage)}%`
      : item.score != null
        ? String(item.score)
        : null
  const scoreColor = item.percentage != null ? reportPerformanceColor(item.percentage) : FACULTY_ACTIVITY_COLOR.link

  const metaParts = [
    item.assessment_type ? assessmentTypeLabel(item.assessment_type) : null,
    item.created_at ? formatFacultyRelativeTime(item.created_at) : null,
  ].filter(Boolean)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="pulse-outline"
      title={item.title}
      description={item.student_name ?? undefined}
      metaLine={metaParts.join(" · ")}
      status={status}
      accentLine={scoreLabel ? { text: scoreLabel, color: scoreColor } : undefined}
      footer={
        item.message?.trim() ? (
          <Text style={[type.caption, styles.message, { color: native.secondaryLabel }]} numberOfLines={2}>
            {item.message}
          </Text>
        ) : (
          <Text style={[type.caption, styles.link, { color: FACULTY_ACTIVITY_COLOR.link }]}>View actions</Text>
        )
      }
      onPress={onPress}
    />
  )
}

export function FacultyProgressReviewCard({
  review,
  onPress,
}: {
  review: InstructorProgressReviewRow
  onPress: () => void
}) {
  const type = useNativeType()
  const sent = Boolean(review.emailSentAt)
  const thumb = facultyProgressReviewThumb(sent ? "saved" : "missing", review.id)
  const status = facultyProgressReviewStatusMeta(sent)

  const meta = [
    periodBadgeLabel(review.reviewPeriod, review.asOfDate),
    review.createdAt ? `Created ${formatFacultyRelativeTime(review.createdAt)}` : null,
    review.modelUsed,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <FacultySignatureListCard
      thumb={thumb}
      thumbChild={
        <Text style={[type.caption, styles.initials, { color: thumb.icon }]}>{studentInitials(review.fullName)}</Text>
      }
      title={review.fullName}
      description={[review.section ?? "No section", review.email].filter(Boolean).join(" · ")}
      metaLine={meta}
      status={status}
      footer={
        <Text style={[type.caption, styles.link, { color: FACULTY_PROGRESS_REVIEWS_COLOR.link }]}>Read review</Text>
      }
      onPress={onPress}
    />
  )
}

export function FacultyStudentProgressCard({
  student,
  onPress,
}: {
  student: PracticeStudentProgress
  onPress: () => void
}) {
  const native = useThemedNative()
  const thumb = facultyStudentProgressThumb(student.student_id)
  const score = Math.round(practiceStudentScore(student))
  const scoreColor = reportPerformanceColor(score)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="person-outline"
      title={practiceStudentName(student)}
      description={`${practiceStudentAttempts(student)} attempts · ${score}% avg${student.student_section ? ` · ${student.student_section}` : ""}`}
      accentLine={
        student.topics_practiced?.length
          ? {
              text: `${student.topics_practiced.length} topic${student.topics_practiced.length === 1 ? "" : "s"} practiced`,
              color: FACULTY_STUDENT_PROGRESS_COLOR.link,
            }
          : undefined
      }
      trailing={<Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />}
      onPress={onPress}
    />
  )
}

export function FacultyAtRiskCard({
  row,
  onPress,
}: {
  row: AtRiskStudentRow
  onPress: () => void
}) {
  const type = useNativeType()
  const thumb = facultyAtRiskThumb(row.id)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="warning-outline"
      title={row.name}
      description={row.section ?? undefined}
      metaLine={row.detail ?? undefined}
      status={{
        label: row.reason,
        color: row.tone === "danger" ? FACULTY_STUDENT_PROGRESS_COLOR.atRisk : FACULTY_STUDENT_PROGRESS_COLOR.warning,
        icon: row.tone === "danger" ? "alert-circle-outline" : "warning-outline",
      }}
      footer={
        <Text style={[type.caption, styles.link, { color: FACULTY_STUDENT_PROGRESS_COLOR.link }]}>View actions</Text>
      }
      onPress={onPress}
    />
  )
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiTile: {
    flex: 1,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
  },
  kpiValue: { fontSize: 22 },
  initials: { fontWeight: "700" },
  link: { alignSelf: "flex-end", fontWeight: NATIVE.titleWeight },
  message: { lineHeight: 18, fontWeight: "600" },
})
