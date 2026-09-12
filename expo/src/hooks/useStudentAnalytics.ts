import { useQuery } from "@tanstack/react-query"
import { fetchStudentAnalytics } from "../lib/student-analytics-fetch"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../lib/query"
import { keepSameCoursePlaceholder } from "../lib/query/same-course-placeholder"
import type { StudentSession } from "../lib/session"

export function useStudentAnalytics(session: StudentSession | null, enabled = true) {
  const queryKey = session
    ? queryKeys.student.analytics.bundle(studentQueryScope(session))
    : (["student", "analytics", "idle", "bundle"] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => fetchStudentAnalytics(session!),
    enabled: Boolean(session) && enabled,
    staleTime: STALE_BY_RESOURCE.studentAnalytics,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null

  return {
    data: query.data ?? null,
    isInitialLoading: !hasData && query.isLoading,
    refreshing: query.isFetching && hasData,
    error: !hasData && query.isError ? query.error : null,
    refetch: query.refetch,
  }
}
