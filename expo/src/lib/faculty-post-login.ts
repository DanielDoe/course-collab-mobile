import type { InstructorCourse } from "./instructor-api"
import {
  fetchFacultyCoursePickerItems,
  facultyPickerItemMatchesSelection,
  type FacultyCoursePickerItem,
} from "./faculty-course-picker"
import {
  getStoredFacultyCourseId,
  getStoredFacultySessionCode,
  setStoredFacultyCourseId,
  setStoredFacultySessionCode,
} from "./faculty-course-storage"
import { consumeFacultyCoursesBootstrap } from "./app-bootstrap-cache"
import type { FacultySession } from "./session"

export type FacultyCourseResolution = {
  courses: FacultyCoursePickerItem[]
  /** Last-used course/section — suggested on the picker, not auto-applied after login. */
  suggestedCourse: FacultyCoursePickerItem | null
  needsSelection: boolean
}

let pendingFacultyCourses: FacultyCoursePickerItem[] | null = null

export function stashFacultyCoursesForSelection(courses: FacultyCoursePickerItem[]): void {
  pendingFacultyCourses = courses
}

export function consumeFacultyCoursesForSelection(): FacultyCoursePickerItem[] | null {
  const courses = pendingFacultyCourses
  pendingFacultyCourses = null
  return courses
}

export async function fetchFacultyCoursesList(session: FacultySession): Promise<FacultyCoursePickerItem[]> {
  return fetchFacultyCoursePickerItems(session)
}

/** True when the instructor must pick a course or section on the post-login screen. */
export function facultyNeedsCourseSelection(courses: InstructorCourse[]): boolean {
  return courses.length > 1
}

async function resolveSuggestedCourse(
  session: FacultySession,
  courses: FacultyCoursePickerItem[],
): Promise<FacultyCoursePickerItem | null> {
  const storedId = await getStoredFacultyCourseId(session.id)
  if (storedId == null) return null

  const forCourse = courses.filter((course) => course.id === storedId)
  if (forCourse.length === 0) return null
  if (forCourse.length === 1) return forCourse[0] ?? null

  const storedSessionCode = await getStoredFacultySessionCode(session.id, storedId)
  if (storedSessionCode) {
    const sessionMatch = forCourse.find((course) => course.session_code === storedSessionCode)
    if (sessionMatch) return sessionMatch
  }

  return forCourse[0] ?? null
}

export async function resolveFacultyCourses(session: FacultySession): Promise<FacultyCourseResolution> {
  const courses = await fetchFacultyCoursesList(session)

  if (courses.length === 0) {
    return { courses, suggestedCourse: null, needsSelection: false }
  }

  if (courses.length === 1) {
    return { courses, suggestedCourse: courses[0] ?? null, needsSelection: false }
  }

  const suggested = await resolveSuggestedCourse(session, courses)
  return { courses, suggestedCourse: suggested, needsSelection: true }
}

export async function resolveFacultyPostLoginRoute(session: FacultySession): Promise<
  "/dashboard" | "/faculty-select-course"
> {
  const bootstrapped = consumeFacultyCoursesBootstrap()
  const courses =
    bootstrapped && bootstrapped.length > 0
      ? (bootstrapped as FacultyCoursePickerItem[])
      : await fetchFacultyCoursesList(session)

  if (courses.length === 0) {
    return "/dashboard"
  }

  if (courses.length === 1) {
    const course = courses[0]!
    await setStoredFacultyCourseId(session.id, course.id)
    await setStoredFacultySessionCode(session.id, course.id, course.session_code)
    stashFacultyCoursesForSelection(courses)
    return "/dashboard"
  }

  stashFacultyCoursesForSelection(courses)
  return "/faculty-select-course"
}

export { facultyPickerItemMatchesSelection }
