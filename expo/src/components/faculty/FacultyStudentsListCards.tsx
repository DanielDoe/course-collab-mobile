import { memo } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { InstructorStudent } from "../../lib/instructor-api"
import { formatStudentRegisteredDate, studentInitials } from "../../lib/faculty-students-utils"
import {
  facultyStudentAccountRequestThumb,
  facultyStudentDirectoryStatus,
  facultyStudentDirectoryThumb,
  facultyStudentResetThumb,
} from "../../lib/faculty-students-theme"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

export const FacultyStudentDirectoryCard = memo(function FacultyStudentDirectoryCard({
  student,
  onPress,
}: {
  student: InstructorStudent
  onPress: () => void
}) {
  const type = useNativeType()
  const native = useThemedNative()
  const thumb = facultyStudentDirectoryThumb(student)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      thumbChild={
        <Text style={[type.caption, styles.initials, { color: thumb.icon }]}>{studentInitials(student.full_name)}</Text>
      }
      title={student.full_name}
      description={student.email ?? undefined}
      metaLine={`${student.student_id} · ${student.quiz_attempts ?? 0} attempts · Registered ${formatStudentRegisteredDate(student.created_at) || "—"}`}
      trailing={
        student.section ? (
          <View style={styles.trailing}>
            <FacultyStatusPill label={student.section} tone="live" />
            <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
          </View>
        ) : undefined
      }
      onPress={onPress}
    />
  )
})

export const FacultyStudentRequestCard = memo(function FacultyStudentRequestCard({
  name,
  subtitle,
  meta,
  badge,
  status,
  thumbKind,
  seed,
  onPress,
}: {
  name: string
  subtitle: string
  meta: string
  badge?: string
  status: string
  thumbKind: "reset" | "request"
  seed: number | string
  onPress: () => void
}) {
  const native = useThemedNative()
  const thumb = thumbKind === "reset" ? facultyStudentResetThumb(seed) : facultyStudentAccountRequestThumb(seed)
  const statusMeta = facultyStudentDirectoryStatus(status)

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon={thumbKind === "reset" ? "key-outline" : "mail-outline"}
      title={name}
      description={subtitle}
      metaLine={meta}
      status={statusMeta}
      trailing={<Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />}
      footer={
        badge ? (
          <View style={styles.badgeRow}>
            <FacultyStatusPill label={badge} tone="live" />
          </View>
        ) : undefined
      }
      onPress={onPress}
    />
  )
})

const styles = StyleSheet.create({
  initials: { fontWeight: "700", fontSize: 11 },
  trailing: { alignItems: "flex-end", gap: 6, paddingTop: 2 },
  badgeRow: { marginTop: 2 },
})
