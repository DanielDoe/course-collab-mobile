import { useQuery } from "@tanstack/react-query"
import { studentApi } from "../../lib/student-api"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"
import type { StudentSession } from "../../lib/session"

export function useStudentGrades(session: StudentSession | null) {
  const queryKey = session
    ? queryKeys.student.grades.bundle(studentQueryScope(session))
    : (["student", "grades", "idle", "bundle"] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => studentApi.getGrades(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.studentGrades,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  return {
    payload: query.data ?? null,
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
