import { instructorApi, type InstructorCourse } from "./instructor-api"
import { getStoredFacultyCourseId, setStoredFacultyCourseId } from "./faculty-course-storage"
import { consumeFacultyCoursesBootstrap } from "./app-bootstrap-cache"
import type { FacultySession } from "./session"

export type FacultyCourseResolution = {
  courses: InstructorCourse[]
  /** Last-used course — suggested on the picker, not auto-applied after login. */
  suggestedCourse: InstructorCourse | null
  needsSelection: boolean
}

let pendingFacultyCourses: InstructorCourse[] | null = null

export function stashFacultyCoursesForSelection(courses: InstructorCourse[]): void {
  pendingFacultyCourses = courses
}

export function consumeFacultyCoursesForSelection(): InstructorCourse[] | null {
  const courses = pendingFacultyCourses
  pendingFacultyCourses = null
  return courses
}

function validCourses(courses: InstructorCourse[]): InstructorCourse[] {
  return courses.filter((course) => course.id > 0)
}

export async function fetchFacultyCoursesList(session: FacultySession): Promise<InstructorCourse[]> {
  const { courses: rawCourses } = await instructorApi.getCourses(session.id)
  return validCourses(rawCourses)
}

/** True when the instructor must pick a course on the post-login screen. */
export function facultyNeedsCourseSelection(courses: InstructorCourse[]): boolean {
  return courses.length > 1
}

export async function resolveFacultyCourses(session: FacultySession): Promise<FacultyCourseResolution> {
  const courses = await fetchFacultyCoursesList(session)

  if (courses.length === 0) {
    return { courses, suggestedCourse: null, needsSelection: false }
  }

  if (courses.length === 1) {
    return { courses, suggestedCourse: courses[0] ?? null, needsSelection: false }
  }

  const storedId = await getStoredFacultyCourseId(session.id)
  const suggested =
    storedId != null ? courses.find((course) => course.id === storedId) ?? null : null

  return { courses, suggestedCourse: suggested, needsSelection: true }
}

export async function resolveFacultyPostLoginRoute(session: FacultySession): Promise<
  "/dashboard" | "/faculty-select-course"
> {
  const courses = consumeFacultyCoursesBootstrap() ?? (await fetchFacultyCoursesList(session))

  if (courses.length === 0) {
    return "/dashboard"
  }

  if (courses.length === 1) {
    const course = courses[0]!
    await setStoredFacultyCourseId(session.id, course.id)
    stashFacultyCoursesForSelection(courses)
    return "/dashboard"
  }

  stashFacultyCoursesForSelection(courses)
  return "/faculty-select-course"
}
