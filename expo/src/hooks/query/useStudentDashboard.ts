import { useQuery } from "@tanstack/react-query"
import { fetchStudentDashboardBundle } from "../../lib/student-dashboard-stats"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"
import { useStudentSessionApiReady } from "../useStudentSessionApiReady"

export function useStudentDashboard(session: StudentSession | null) {
  const apiReady = useStudentSessionApiReady(session)
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.dashboard.bundle(studentQueryScope(session))
      : ["student", "dashboard", "idle", "bundle"],
    queryFn: () => fetchStudentDashboardBundle(session!),
    enabled: Boolean(session && apiReady),
    staleTime: STALE_BY_RESOURCE.studentDashboard,
  })
  const hasData = query.data != null
  return {
    stats: query.data?.stats ?? null,
    trend: query.data?.trend ?? [],
    comparison: query.data?.comparison ?? [],
    insights: query.data?.insights ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    partialError: query.data?.stats.partialError ?? null,
    refetch: query.refetch,
  }
}
