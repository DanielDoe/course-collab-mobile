import { useQuery } from "@tanstack/react-query"
import { courseInfoApi } from "../../lib/course-info-api"
import { bookedOfficeHoursToCalendarEvents } from "../../lib/calendar/office-hours-events"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import { keepSameCoursePlaceholder } from "../../lib/query/same-course-placeholder"
import type { CalendarEvent } from "../../lib/calendar/types"
import type { StudentSession } from "../../lib/session"

export function useStudentCalendar(
  session: StudentSession | null,
  range: { startDate: Date; endDate: Date },
) {
  const start = range.startDate.toISOString()
  const end = range.endDate.toISOString()
  const queryKey = session
    ? queryKeys.student.calendar.range(studentQueryScope(session), start, end)
    : (["student", "calendar", "idle", "range", start, end] as const)
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const [eventsData, scheduleData, hoursData] = await Promise.all([
        courseInfoApi.getCalendarEvents(session!, range),
        courseInfoApi.getClassSchedule(session!, range),
        courseInfoApi.getOfficeHours(session!).catch(() => ({ requests: [] })),
      ])
      return {
        personalEvents: eventsData,
        classMeetings: scheduleData.events ?? [],
        classSchedule: scheduleData,
        officeHourEvents: [
          ...bookedOfficeHoursToCalendarEvents(hoursData.requests ?? []).filter((event) => {
            const start = event.start_time ? new Date(event.start_time).getTime() : 0
            return start >= range.startDate.getTime() && start <= range.endDate.getTime()
          }),
          ...((scheduleData.officeHoursEvents ?? []) as CalendarEvent[]),
        ],
      }
    },
    enabled: Boolean(session),
    staleTime: STALE_BY_RESOURCE.calendar,
    placeholderData: (previous, previousQuery) => keepSameCoursePlaceholder(previous, previousQuery, queryKey),
  })
  const hasData = query.data != null
  return {
    personalEvents: query.data?.personalEvents ?? [],
    classMeetings: query.data?.classMeetings ?? [],
    classSchedule: query.data?.classSchedule ?? { hasSchedule: false },
    officeHourEvents: query.data?.officeHourEvents ?? [],
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
