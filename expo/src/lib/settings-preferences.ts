import * as SecureStore from "expo-secure-store"

export type NotificationPrefs = {
  quizReminders: boolean
  announcementAlerts: boolean
  classReminders: boolean
  classReminderMinutes: 15 | 30 | 60
}

const PREFS_KEY = "course-collab.notification-prefs"

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  quizReminders: true,
  announcementAlerts: true,
  classReminders: true,
  classReminderMinutes: 30}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY)
    if (!raw) return DEFAULT_NOTIFICATION_PREFS
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>
    return {
      quizReminders: parsed.quizReminders ?? DEFAULT_NOTIFICATION_PREFS.quizReminders,
      announcementAlerts: parsed.announcementAlerts ?? DEFAULT_NOTIFICATION_PREFS.announcementAlerts,
      classReminders: parsed.classReminders ?? DEFAULT_NOTIFICATION_PREFS.classReminders,
      classReminderMinutes: parsed.classReminderMinutes ?? DEFAULT_NOTIFICATION_PREFS.classReminderMinutes}
  } catch {
    return DEFAULT_NOTIFICATION_PREFS
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs))
}
