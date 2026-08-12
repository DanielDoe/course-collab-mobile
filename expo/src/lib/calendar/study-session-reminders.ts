import { Platform } from "react-native"
import type { CalendarEvent } from "./types"
import { formatEventTimeRange } from "./calendar-utils"
import { getClassReminderPrefs } from "./reminder-preferences"
import {
  getNotificationsModule,
  initializeNotificationSystem,
  requestNotificationPermissions,
} from "../notifications/notification-service"
import { NOTIFICATION_CATEGORY } from "../notifications/notification-categories"

const STUDY_REMINDER_PREFIX = "study-reminder-"
const MAX_SCHEDULED = 48
const HORIZON_DAYS = 14

function isStudySessionEvent(event: CalendarEvent): boolean {
  return (
    event.event_type === "study_session" ||
    event.event_type === "ai_reminder" ||
    event.title?.startsWith("Practice Hub:") ||
    event.title?.startsWith("Flashcards:") ||
    event.title?.startsWith("Study:")
  )
}

function reminderIdentifier(event: CalendarEvent): string {
  return `${STUDY_REMINDER_PREFIX}${event.id}-${event.start_time}`
}

export async function cancelStudySessionReminders(): Promise<void> {
  const Notifications = await getNotificationsModule()
  if (!Notifications) return

  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const ours = scheduled
    .filter((n) => n.identifier.startsWith(STUDY_REMINDER_PREFIX))
    .map((n) => n.identifier)

  await Promise.all(ours.map((id) => Notifications.cancelScheduledNotificationAsync(id)))
}

export async function syncStudySessionReminders(events: CalendarEvent[]): Promise<{
  scheduled: number
  permissionGranted: boolean
}> {
  try {
    const prefs = await getClassReminderPrefs()
    await cancelStudySessionReminders()

    if (!prefs.enabled) {
      return { scheduled: 0, permissionGranted: false }
    }

    const Notifications = await getNotificationsModule()
    if (!Notifications) {
      return { scheduled: 0, permissionGranted: false }
    }

    await initializeNotificationSystem()
    const permitted = await requestNotificationPermissions()
    if (!permitted) {
      return { scheduled: 0, permissionGranted: false }
    }

    const now = Date.now()
    const horizon = now + HORIZON_DAYS * 86_400_000

    const upcoming = events
      .filter((event) => isStudySessionEvent(event) && event.start_time)
      .map((event) => ({
        event,
        startMs: new Date(event.start_time!).getTime(),
        minutesBefore: event.reminder_minutes ?? prefs.minutesBefore,
      }))
      .filter(({ startMs }) => startMs > now && startMs <= horizon)
      .sort((a, b) => a.startMs - b.startMs)
      .slice(0, MAX_SCHEDULED)

    let scheduled = 0

    for (const { event, startMs, minutesBefore } of upcoming) {
      const triggerDate = new Date(startMs - minutesBefore * 60_000)
      if (triggerDate.getTime() <= now) continue

      const timeLabel = formatEventTimeRange(event)

      await Notifications.scheduleNotificationAsync({
        identifier: reminderIdentifier(event),
        content: {
          title:
            event.title?.startsWith("Flashcards:")
              ? "Flashcard review soon"
              : event.title?.startsWith("Practice Hub:")
                ? "Practice Hub session soon"
                : "Study session starting soon",
          subtitle: event.title,
          body: timeLabel,
          data: {
            route: event.title?.startsWith("Flashcards:")
              ? "/module/flashcards"
              : event.title?.startsWith("Practice Hub:")
                ? "/module/practice"
                : "/module/calendar",
            eventType: event.event_type,
            type: "calendar",
          },
          sound: "default",
          categoryIdentifier: NOTIFICATION_CATEGORY.QUIZ,
          ...(Platform.OS === "android" ? { channelId: "study-reminders" } : {}),
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

export async function syncAllCalendarReminders(events: CalendarEvent[]): Promise<{
  studyScheduled: number
}> {
  const study = await syncStudySessionReminders(events)
  return { studyScheduled: study.scheduled }
}
