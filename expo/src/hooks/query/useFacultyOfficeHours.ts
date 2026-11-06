import { useQuery } from "@tanstack/react-query"
import type { InstructorScope } from "../../lib/instructor-content-api"
import { fetchFacultyOfficeHoursBundle } from "../../lib/query/prefetch"
import { facultyQueryScopeFromInstructor, queryKeys, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"

export function useFacultyOfficeHours(scope: InstructorScope | null) {
  const queryKey = scope
    ? queryKeys.faculty.officeHours.bundle(facultyQueryScopeFromInstructor(scope))
    : (["faculty", "officeHours", "idle", "bundle"] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => fetchFacultyOfficeHoursBundle(scope!),
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.officeHours,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  return {
    requests: query.data?.requests ?? [],
    regularHours: query.data?.regularHours ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
