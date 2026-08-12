import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  reportSummaryLine,
  reportTypeLabel,
  type ReportTemplateConfig,
  type SavedInstructorReport,
} from "../../lib/instructor-reports-utils"
import {
  FACULTY_REPORTS_COLOR,
  facultyReportSavedThumb,
  facultyReportTemplateThumb,
} from "../../lib/faculty-reports-theme"
import { solidListThumbFromHash } from "../../lib/solid-list-thumb"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

export function FacultyReportTemplateCard({
  template,
  onPress,
}: {
  template: ReportTemplateConfig
  onPress: () => void
}) {
  const native = useThemedNative()
  const thumb = facultyReportTemplateThumb(template.tone)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon={template.icon}
      title={template.label}
      description={template.description}
      trailing={
        <View style={styles.trailing}>
          <FacultyStatusPill label={template.category} tone="neutral" />
          <Ionicons name="sparkles-outline" size={18} color={FACULTY_REPORTS_COLOR.ai} />
        </View>
      }
      onPress={onPress}
    />
  )
}

export function FacultyReportSavedCard({
  report,
  onPress,
}: {
  report: SavedInstructorReport
  onPress: () => void
}) {
  const thumb = facultyReportSavedThumb(report.id)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="document-text-outline"
      title={report.title}
      description={`${reportTypeLabel(report.type)} · ${reportSummaryLine(report)}`}
      onPress={onPress}
    />
  )
}

export function FacultyReportStudentHitCard({
  student,
  onPress,
}: {
  student: { id: number; fullName: string; email: string; section: string | null }
  onPress: () => void
}) {
  const thumb = solidListThumbFromHash(`report-student-${student.id}`)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      title={student.fullName}
      description={student.section ? `Section ${student.section} · ${student.email}` : student.email}
      onPress={onPress}
    />
  )
}

const styles = StyleSheet.create({
  trailing: { alignItems: "flex-end", gap: 6 },
})
