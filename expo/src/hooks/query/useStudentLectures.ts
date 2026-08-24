import { useQuery } from "@tanstack/react-query"
import { studentApi } from "../../lib/student-api"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"

export function useStudentLectures(session: StudentSession | null) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.lectures.list(studentQueryScope(session))
      : ["student", "lectures", "idle", "list"],
    queryFn: () => studentApi.getLectures(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.lectures,
  })
  const hasData = query.data != null
  return {
    lectures: query.data?.lectures ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
