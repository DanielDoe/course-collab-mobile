import { useQuery } from "@tanstack/react-query"
import { fetchStudentProjectsBundle } from "../../lib/query/prefetch"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"

export function useStudentProjects(session: StudentSession | null) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.projects.list(studentQueryScope(session))
      : ["student", "projects", "idle", "list"],
    queryFn: () => fetchStudentProjectsBundle(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.projects,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    projects: query.data?.projects ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
