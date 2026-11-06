import { useQuery } from "@tanstack/react-query"
import { fetchInstructorDashboardStats } from "../../lib/faculty-dashboard-stats"
import { instructorApi } from "../../lib/instructor-api"
import type { InstructorScope } from "../../lib/instructor-api"
import { facultyQueryScopeFromInstructor, queryKeys, STALE_BY_RESOURCE } from "../../lib/query"

export function useFacultyDashboard(scope: InstructorScope | null) {
  const query = useQuery({
    queryKey: scope
      ? queryKeys.faculty.dashboard.bundle(facultyQueryScopeFromInstructor(scope))
      : ["faculty", "dashboard", "idle", "bundle"],
    queryFn: async () => {
      const [stats, charts, activity] = await Promise.all([
        fetchInstructorDashboardStats(scope!),
        instructorApi.getDashboardCharts(scope!),
        instructorApi.getRecentActivity(scope!),
      ])
      return { stats, charts, activity: activity.slice(0, 8) }
    },
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.facultyDashboard,
  })
  const hasData = query.data != null
  return {
    stats: query.data?.stats ?? null,
    charts: query.data?.charts ?? null,
    activity: query.data?.activity ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
