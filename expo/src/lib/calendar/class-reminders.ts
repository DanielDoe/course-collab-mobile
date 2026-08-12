import { Platform } from "react-native"
import type { CalendarEvent } from "./types"
import { formatEventTimeRange, isClassMeetingEvent } from "./calendar-utils"
import { getClassReminderPrefs } from "./reminder-preferences"
import {
  getNotificationsModule,
  initializeNotificationSystem,
  requestNotificationPermissions,
} from "../notifications/notification-service"
import { NOTIFICATION_CATEGORY } from "../notifications/notification-categories"

const REMINDER_PREFIX = "class-reminder-"
const MAX_SCHEDULED = 48
const HORIZON_DAYS = 14

export async function initClassReminderNotifications(): Promise<void> {
  await initializeNotificationSystem()
}

export async function ensureNotificationPermission(): Promise<boolean> {
  return requestNotificationPermissions()
}

function reminderIdentifier(event: CalendarEvent): string {
  return `${REMINDER_PREFIX}${event.id}-${event.start_time}`
}

export async function cancelClassReminders(): Promise<void> {
  const Notifications = await getNotificationsModule()
  if (!Notifications) return

  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const ours = scheduled
    .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
    .map((n) => n.identifier)

  await Promise.all(ours.map((id) => Notifications.cancelScheduledNotificationAsync(id)))
}

export async function syncClassMeetingReminders(classMeetings: CalendarEvent[]): Promise<{
  scheduled: number
  permissionGranted: boolean
}> {
  try {
    const prefs = await getClassReminderPrefs()
    await cancelClassReminders()

    if (!prefs.enabled) {
      return { scheduled: 0, permissionGranted: false }
    }

    const Notifications = await getNotificationsModule()
    if (!Notifications) {
      return { scheduled: 0, permissionGranted: false }
    }

    const permitted = await ensureNotificationPermission()
    if (!permitted) {
      return { scheduled: 0, permissionGranted: false }
    }

    const now = Date.now()
    const horizon = now + HORIZON_DAYS * 86_400_000

    const upcoming = classMeetings
      .filter((event) => isClassMeetingEvent(event) && event.start_time)
      .map((event) => ({ event, startMs: new Date(event.start_time!).getTime() }))
      .filter(({ startMs }) => startMs > now && startMs <= horizon)
      .sort((a, b) => a.startMs - b.startMs)
      .slice(0, MAX_SCHEDULED)

    let scheduled = 0

    for (const { event, startMs } of upcoming) {
      const triggerDate = new Date(startMs - prefs.minutesBefore * 60_000)
      if (triggerDate.getTime() <= now) continue

      const timeLabel = formatEventTimeRange(event)
      const location = event.location ? ` · ${event.location}` : ""

      await Notifications.scheduleNotificationAsync({
        identifier: reminderIdentifier(event),
        content: {
          title: "Class starting soon",
          subtitle: event.title,
          body: `${timeLabel}${location}`,
          data: { route: "/module/calendar", eventType: "class_meeting", type: "class" },
          sound: "default",
          categoryIdentifier: NOTIFICATION_CATEGORY.CLASS,
          ...(Platform.OS === "android" ? { channelId: "class-reminders" } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      })

      scheduled += 1
    }

    return { scheduled, permissionGranted: true }
  } catch {
    return { scheduled: 0, permissionGranted: false }
  }
}

export async function getScheduledClassReminderCount(): Promise<number> {
  const Notifications = await getNotificationsModule()
  if (!Notifications) return 0

  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  return scheduled.filter((n) => n.identifier.startsWith(REMINDER_PREFIX)).length
}
