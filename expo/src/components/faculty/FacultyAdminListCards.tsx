import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import type { InstructorCourse } from "../../lib/instructor-api"
import { facultyAdminCourseThumb } from "../../lib/faculty-admin-theme"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { FacultyStatusPill } from "./faculty-shared"

type CourseRow = InstructorCourse & { is_active_term?: boolean; term_label?: string | null }

export function FacultyMyCourseCard({
  course,
  active,
  onPress,
}: {
  course: CourseRow
  active: boolean
  onPress: () => void
}) {
  const thumb = facultyAdminCourseThumb(course.id)
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
      trailing={active ? <FacultyStatusPill label="Selected" tone="live" /> : undefined}
      onPress={onPress}
    />
  )
}
