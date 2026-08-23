import type { FacultySession } from "./session"
import { splitFacultyCoursesByTerm } from "./faculty-course-lists"
import { instructorApi, type InstructorCourse } from "./instructor-api"
import {
  asCoursePickerItem,
  expandFacultyCoursesForActiveTerm,
  expandFacultyOfferingsForActiveTerm,
  type FacultyCoursePickerItem,
  type FacultyTermOffering,
} from "./faculty-course-picker-logic"

export type { FacultyCoursePickerItem } from "./faculty-course-picker-logic"
export {
  expandFacultyCoursesForActiveTerm,
  expandFacultyOfferingsForActiveTerm,
  facultyPickerItemMatchesSelection,
} from "./faculty-course-picker-logic"

function activeTermOfferings(
  offerings: FacultyTermOffering[],
  activeTermId: number | null,
): FacultyTermOffering[] {
  return offerings.filter((offering) => {
    if (offering.is_active_term === false) return false
    if (activeTermId != null && offering.academic_term_id != null) {
      return offering.academic_term_id === activeTermId
    }
    return offering.is_active_term !== false
  })
}

function inactiveTermOfferings(
  offerings: FacultyTermOffering[],
  activeTermId: number | null,
): FacultyTermOffering[] {
  return offerings.filter((offering) => {
    if (offering.is_active_term === false) return true
    if (activeTermId != null && offering.academic_term_id != null) {
      return offering.academic_term_id !== activeTermId
    }
    return offering.is_active_term === false
  })
}

export function facultyCoursePickerItemsForTermSplit(
  catalogCourses: InstructorCourse[],
  activeOfferings: FacultyTermOffering[],
  inactiveOfferings: FacultyTermOffering[],
  sessionsByCourseId: ReadonlyMap<number, import("./instructor-api").InstructorSession[]>,
): FacultyCoursePickerItem[] {
  const currentItems =
    activeOfferings.length > 0
      ? expandFacultyOfferingsForActiveTerm(activeOfferings)
      : expandFacultyCoursesForActiveTerm(
          splitFacultyCoursesByTerm(catalogCourses).currentTerm,
          sessionsByCourseId,
        )
  const otherItems =
    inactiveOfferings.length > 0
      ? expandFacultyOfferingsForActiveTerm(inactiveOfferings)
      : splitFacultyCoursesByTerm(catalogCourses).otherTerms.map((course) => asCoursePickerItem(course))
  return [...currentItems, ...otherItems]
}

export async function fetchFacultyCoursePickerItems(
  session: FacultySession,
): Promise<FacultyCoursePickerItem[]> {
  const data = await instructorApi.getCourses({
    instructorId: session.id,
    universityId: session.selectedUniversityId ?? null,
  })
  const catalog = (data.courses ?? []).filter((course) => course.id > 0)
  const offerings = (data.offerings ?? []) as FacultyTermOffering[]
  const activeTermId = data.activeTerm?.id ?? null
  const currentOfferings = activeTermOfferings(offerings, activeTermId)
  const pastOfferings = inactiveTermOfferings(offerings, activeTermId)

  const sessionsByCourseId = new Map<number, import("./instructor-api").InstructorSession[]>()
  const needsSessionFallback = currentOfferings.length === 0
  const { currentTerm } = splitFacultyCoursesByTerm(catalog)

  if (needsSessionFallback && activeTermId != null && currentTerm.length > 0) {
    await Promise.all(
      currentTerm.map(async (course) => {
        try {
          const response = await instructorApi.getSessions(
            { instructorId: session.id, courseId: course.id },
            activeTermId,
          )
          sessionsByCourseId.set(course.id, response.sessions ?? [])
        } catch {
          sessionsByCourseId.set(course.id, [])
        }
      }),
    )
  }

  return facultyCoursePickerItemsForTermSplit(catalog, currentOfferings, pastOfferings, sessionsByCourseId)
}
