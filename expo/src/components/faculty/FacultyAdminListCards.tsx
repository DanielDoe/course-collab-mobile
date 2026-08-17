import { StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import type { FacultyCourseOfferingRow } from "../../lib/faculty-my-courses-utils"
import { facultyAdminCourseThumb } from "../../lib/faculty-admin-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { FacultyStatusPill } from "./faculty-shared"

export function FacultyMyCourseCard({
  course,
  active,
  onPress,
}: {
  course: FacultyCourseOfferingRow
  active: boolean
  onPress: () => void
}) {
  const type = useNativeType()
  const thumb = facultyAdminCourseThumb(course.course_id)
  const meta = [course.term_label ?? course.semester].filter(Boolean).join(" · ")

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon="school-outline"
      title={course.course_title}
      description={course.course_code}
      metaLine={meta || undefined}
      status={
        active
          ? { label: "Active course", color: FACULTY_ADMIN_COLOR.link, icon: "checkmark-circle-outline" }
          : undefined
      }
      trailing={
        active ? (
          <FacultyStatusPill label="Selected" tone="live" />
        ) : (
          <Ionicons name="chevron-forward" size={16} color={FACULTY_ADMIN_COLOR.link} />
        )
      }
      footer={
        <Text style={[type.caption, cardStyles.link, { color: FACULTY_ADMIN_COLOR.link }]}>Manage course</Text>
      }
      onPress={onPress}
    />
  )
}

const cardStyles = StyleSheet.create({
  link: { alignSelf: "flex-end", fontWeight: "600" },
})
