import { useQuery } from "@tanstack/react-query"
import { instructorApi, type InstructorScope } from "../../lib/instructor-api"
import type { InstructorCalendarView } from "../../lib/instructor-calendar"
import { facultyQueryScopeFromInstructor, queryKeys, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"

export function useFacultyCalendar(
  scope: InstructorScope | null,
  range: { startDate: Date; endDate: Date },
  view: InstructorCalendarView = "all",
) {
  const start = range.startDate.toISOString()
  const end = range.endDate.toISOString()
  const queryKey = scope
    ? queryKeys.faculty.calendar.range(facultyQueryScopeFromInstructor(scope), start, end, view)
    : (["faculty", "calendar", "idle", "range", start, end, view] as const)
  const query = useQuery({
    queryKey,
    queryFn: () => instructorApi.getCalendar(scope!, range, view),
    enabled: Boolean(scope?.courseId),
    staleTime: STALE_BY_RESOURCE.calendar,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  return {
    events: query.data?.events ?? [],
    scheduleText: query.data?.scheduleText ?? null,
    location: query.data?.location ?? null,
    openAdjustments: query.data?.openAdjustments ?? [],
    scheduleSummaries: query.data?.scheduleSummaries ?? [],
    calendarScope: query.data?.calendarScope ?? view,
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
