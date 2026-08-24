import { useQuery } from "@tanstack/react-query"
import { studentApi } from "../../lib/student-api"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"

export function useStudentGrades(session: StudentSession | null) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.grades.bundle(studentQueryScope(session))
      : ["student", "grades", "idle", "bundle"],
    queryFn: () => studentApi.getGrades(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.studentGrades,
    placeholderData: (previous) => previous,
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
