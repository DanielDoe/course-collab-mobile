import { useQuery } from "@tanstack/react-query"
import { fetchStudentGroupsBundle } from "../../lib/query/prefetch"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"

export function useStudentGroups(session: StudentSession | null) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.groups.list(studentQueryScope(session))
      : ["student", "groups", "idle", "list"],
    queryFn: () => fetchStudentGroupsBundle(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.groups,
    placeholderData: (previous) => previous,
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
