import { useQuery } from "@tanstack/react-query"
import { fetchStudentProjectsBundle } from "../../lib/query/prefetch"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"
import type { StudentSession } from "../../lib/session"

export function useStudentProjects(session: StudentSession | null) {
  const queryKey = session
    ? queryKeys.student.projects.list(studentQueryScope(session))
    : (["student", "projects", "idle", "list"] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => fetchStudentProjectsBundle(session!),
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.projects,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
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
