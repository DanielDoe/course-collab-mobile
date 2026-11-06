import { useEffect, useMemo } from "react"
import { AppState } from "react-native"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyCalendar } from "../../hooks/query/useFacultyCalendar"
import {
  initFacultyClassReminderNotifications,
  syncFacultyClassMeetingReminders,
} from "../../lib/calendar"

export function FacultyClassReminderSync() {
  const { scope, ready } = useFacultyScope()
  const range = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 14)
    return { startDate: start, endDate: end }
  }, [])

  const calendar = useFacultyCalendar(ready ? scope : null, range, "all")

  useEffect(() => {
    void initFacultyClassReminderNotifications()
  }, [])

  useEffect(() => {
    void syncFacultyClassMeetingReminders(calendar.events)
  }, [calendar.events])

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncFacultyClassMeetingReminders(calendar.events)
      }
    })
    return () => sub.remove()
  }, [calendar.events])

  return null
}
