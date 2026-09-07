import * as SecureStore from "../secure-store-client"
import type { InstructorCalendarView } from "../instructor-calendar"

const PREFS_KEY = "course-collab.faculty-calendar-prefs"

export type FacultyCalendarPrefs = {
  enabled: boolean
  calendarView: InstructorCalendarView
  notifyBefore: boolean
  notifyAtStart: boolean
}

export const DEFAULT_FACULTY_CALENDAR_PREFS: FacultyCalendarPrefs = {
  enabled: true,
  calendarView: "all",
  notifyBefore: true,
  notifyAtStart: true,
}

export async function getFacultyCalendarPrefs(): Promise<FacultyCalendarPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY)
    if (!raw) return DEFAULT_FACULTY_CALENDAR_PREFS
    const parsed = JSON.parse(raw) as Partial<FacultyCalendarPrefs>
    return {
      enabled: parsed.enabled ?? DEFAULT_FACULTY_CALENDAR_PREFS.enabled,
      calendarView: parsed.calendarView === "selected" ? "selected" : "all",
      notifyBefore: parsed.notifyBefore ?? true,
      notifyAtStart: parsed.notifyAtStart ?? true,
    }
  } catch {
    return DEFAULT_FACULTY_CALENDAR_PREFS
  }
}

export async function saveFacultyCalendarPrefs(prefs: FacultyCalendarPrefs): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs))
}
