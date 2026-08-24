import { useQuery } from "@tanstack/react-query"
import { courseInfoApi } from "../../lib/course-info-api"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"

export function useStudentCalendar(
  session: StudentSession | null,
  range: { startDate: Date; endDate: Date },
) {
  const start = range.startDate.toISOString()
  const end = range.endDate.toISOString()
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.calendar.range(studentQueryScope(session), start, end)
      : ["student", "calendar", "idle", "range", start, end],
    queryFn: async () => {
      const [eventsData, scheduleData] = await Promise.all([
        courseInfoApi.getCalendarEvents(session!, range),
        courseInfoApi.getClassSchedule(session!, range),
      ])
      return {
        personalEvents: eventsData,
        classMeetings: scheduleData.events ?? [],
        classSchedule: scheduleData,
      }
    },
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.calendar,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    personalEvents: query.data?.personalEvents ?? [],
    classMeetings: query.data?.classMeetings ?? [],
    classSchedule: query.data?.classSchedule ?? { hasSchedule: false },
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
