import * as SecureStore from "../secure-store-client"
import type { ClassReminderPrefs } from "./types"

const PREFS_KEY = "course-collab.class-reminder-prefs"
const APPLE_CALENDAR_KEY = "course-collab.apple-calendar-event"

export const DEFAULT_CLASS_REMINDER_PREFS: ClassReminderPrefs = {
  enabled: true,
  minutesBefore: 30}

export async function getClassReminderPrefs(): Promise<ClassReminderPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY)
    if (!raw) return DEFAULT_CLASS_REMINDER_PREFS
    const parsed = JSON.parse(raw) as Partial<ClassReminderPrefs>
    return {
      enabled: parsed.enabled ?? DEFAULT_CLASS_REMINDER_PREFS.enabled,
      minutesBefore: parsed.minutesBefore ?? DEFAULT_CLASS_REMINDER_PREFS.minutesBefore}
  } catch {
    return DEFAULT_CLASS_REMINDER_PREFS
  }
}

export async function saveClassReminderPrefs(prefs: ClassReminderPrefs): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs))
}

function scheduleStorageKey(scheduleRaw: string, courseTitle: string): string {
  return `${APPLE_CALENDAR_KEY}.${courseTitle}.${scheduleRaw}`.slice(0, 120)
}

export async function getSavedNativeCalendarEventId(
  scheduleRaw: string,
  courseTitle: string,
): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(scheduleStorageKey(scheduleRaw, courseTitle))
  } catch {
    return null
  }
}

export async function saveNativeCalendarEventId(
  scheduleRaw: string,
  courseTitle: string,
  eventId: string,
): Promise<void> {
  await SecureStore.setItemAsync(scheduleStorageKey(scheduleRaw, courseTitle), eventId)
}
