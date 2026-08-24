import { useQuery } from "@tanstack/react-query"
import { instructorApi } from "../../lib/instructor-api"
import type { InstructorScope } from "../../lib/instructor-api"
import { effectiveFacultySectionCode, fetchFacultyTermSessions } from "../../lib/faculty-section-scope"
import { facultyQueryScopeFromInstructor, queryKeys, STALE_BY_RESOURCE } from "../../lib/query"

export async function fetchFacultyStudentsBundle(scope: InstructorScope, sessionFilter: string) {
  const sessions = await fetchFacultyTermSessions(scope)
  const sessionCode =
    sessionFilter === "ALL"
      ? undefined
      : (effectiveFacultySectionCode(scope, sessionFilter, "ALL") ?? sessionFilter)
  const [students, resets, requests] = await Promise.all([
    instructorApi.getStudents(scope, sessionCode),
    instructorApi.getPasswordResets(scope),
    instructorApi.getAccountRequests(scope),
  ])
  return { sessions, students, resets, requests }
}

export function useFacultyStudents(scope: InstructorScope | null, sessionFilter: string) {
  const query = useQuery({
    queryKey: scope
      ? [...queryKeys.faculty.students.list(facultyQueryScopeFromInstructor(scope)), sessionFilter]
      : ["faculty", "students", "idle", "list", sessionFilter],
    queryFn: () => fetchFacultyStudentsBundle(scope!, sessionFilter),
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.facultyStudents,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    sessions: query.data?.sessions ?? [],
    students: query.data?.students ?? [],
    resets: query.data?.resets ?? [],
    requests: query.data?.requests ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
