import { useQuery } from "@tanstack/react-query"
import { fetchStudentGroupsBundle } from "../../lib/query/prefetch"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"
import type { StudentSession } from "../../lib/session"

export function useStudentGroups(session: StudentSession | null) {
  const queryKey = session
    ? queryKeys.student.groups.list(studentQueryScope(session))
    : (["student", "groups", "idle", "list"] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => fetchStudentGroupsBundle(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.groups,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  return {
    groups: query.data?.groups ?? [],
    discover: query.data?.discover ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
