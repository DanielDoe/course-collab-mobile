import type { InstructorCourse } from "./instructor-api"

function pickerRowKey(course: InstructorCourse): string {
  return course.picker_key ?? `course-${course.id}`
}

export function splitFacultyCoursesByTerm(courses: InstructorCourse[]) {
  const currentTerm = courses.filter((course) => course.is_active_term !== false)
  const otherTerms = courses.filter((course) => course.is_active_term === false)
  return { currentTerm, otherTerms }
}

/** @deprecated Post-login selection uses the full course list. Kept for optional term filtering elsewhere. */
export function facultyCoursesForLoginSelection(courses: InstructorCourse[]): InstructorCourse[] {
  const { currentTerm } = splitFacultyCoursesByTerm(courses)
  return currentTerm.length > 0 ? currentTerm : courses
}

export function facultyCoursePickerSections(courses: InstructorCourse[]) {
  const unique = [...new Map(courses.map((course) => [pickerRowKey(course), course])).values()]
  const { currentTerm, otherTerms } = splitFacultyCoursesByTerm(unique)
  const hasTermSplit = currentTerm.length > 0 && otherTerms.length > 0

  if (!hasTermSplit) {
    return [{ key: "all", label: null as string | null, courses: unique }]
  }

  return [
    { key: "current", label: "Current Term", courses: currentTerm },
    { key: "other", label: "Other Terms", courses: otherTerms },
  ]
}

export function facultyCourseRowSemesterVisible(
  course: InstructorCourse,
  courses: InstructorCourse[],
  duplicateCodes: Set<string>,
) {
  return Boolean(
    course.semester &&
      (duplicateCodes.has(course.picker_key ?? String(course.id)) ||
        courses.length > 1 ||
        course.is_active_term === false),
  )
}
