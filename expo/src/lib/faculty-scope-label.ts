import type { InstructorCourse } from "./instructor-api"

/** Primary scope label for drawer, hero badge, and profile chrome. */
export function facultyScopeLabel(course: InstructorCourse | null | undefined): string {
  if (!course) return "Select course"
  if (course.picker_is_section_row && course.session_code) return course.session_code
  if (course.picker_display_title && course.picker_is_section_row) return course.picker_display_title
  return course.course_code
}

export function facultyScopeKey(course: InstructorCourse | null | undefined): string {
  if (!course) return "none"
  return course.picker_key ?? `${course.id}:${course.session_code ?? ""}`
}
