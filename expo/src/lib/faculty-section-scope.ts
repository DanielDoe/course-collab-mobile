import { useEffect, useState } from "react"
import type { InstructorScope, InstructorSession } from "./instructor-api"
import { instructorApi } from "./instructor-api"
import type { FacultySectionFilterSentinel } from "./faculty-section-scope-logic"

export {
  effectiveFacultySectionCode,
  facultyActiveTermCourses,
  facultySessionCodesForScope,
  filterRowsToFacultySection,
  resolveFacultyStoredCourse,
  rowMatchesFacultySection,
  type FacultySectionFilterSentinel,
} from "./faculty-section-scope-logic"

export function useFacultySectionFilter(
  scope: InstructorScope | null,
  sentinel: FacultySectionFilterSentinel = "all",
) {
  const sectionCode = scope?.sessionCode?.trim() ?? ""
  const [sessionFilter, setSessionFilter] = useState(sectionCode || sentinel)

  useEffect(() => {
    setSessionFilter(sectionCode || sentinel)
  }, [scope?.courseId, scope?.sessionId, sectionCode, sentinel])

  const apiSession = sessionFilter === sentinel || !sessionFilter.trim() ? undefined : sessionFilter.trim()

  return { sessionFilter, setSessionFilter, apiSession, sectionCode, sentinel }
}

export async function fetchFacultyTermSessions(scope: InstructorScope): Promise<InstructorSession[]> {
  const termId = scope.academicTermId ?? undefined
  const response = await instructorApi.getSessions(scope, termId)
  return (response.sessions ?? []).filter((session) => session.code.trim().toUpperCase() !== "BETA")
}
