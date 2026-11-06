import type { NotificationPrefs } from "./settings-preferences"

/** Row shape from GET/PUT `/api/student/notifications/preferences`. */
export type ServerNotificationPreferences = {
  quiz_reminders?: boolean | null
  practice_updates?: boolean | null
  ai_tutor_alerts?: boolean | null
  codebench_results?: boolean | null
  deadline_alerts?: boolean | null
  group_messages?: boolean | null
  project_updates?: boolean | null
  homework_alerts?: boolean | null
  exam_alerts?: boolean | null
  lecture_updates?: boolean | null
  announcement_alerts?: boolean | null
  forum_replies?: boolean | null
}

const ASSESSMENT_PUSH_KEYS: Array<keyof ServerNotificationPreferences> = [
  "quiz_reminders",
  "deadline_alerts",
  "homework_alerts",
  "exam_alerts",
]

function isEnabled(value: boolean | null | undefined): boolean {
  return value !== false
}

/** Map server push prefs into the mobile settings toggles. */
export function mobilePushPrefsFromServer(
  server: ServerNotificationPreferences | null | undefined,
): Pick<NotificationPrefs, "quizReminders" | "announcementAlerts"> {
  if (!server) {
    return { quizReminders: true, announcementAlerts: true }
  }

  const quizReminders = ASSESSMENT_PUSH_KEYS.every((key) => isEnabled(server[key]))
  return {
    quizReminders,
    announcementAlerts: isEnabled(server.announcement_alerts),
  }
}

/** Merge mobile push toggles into a server preferences row for PUT. */
export function applyMobilePushPrefsToServer(
  server: ServerNotificationPreferences,
  mobile: Pick<NotificationPrefs, "quizReminders" | "announcementAlerts">,
): ServerNotificationPreferences {
  return {
    ...server,
    quiz_reminders: mobile.quizReminders,
    deadline_alerts: mobile.quizReminders,
    homework_alerts: mobile.quizReminders,
    exam_alerts: mobile.quizReminders,
    announcement_alerts: mobile.announcementAlerts,
  }
}

export function mergeNotificationPrefs(
  local: NotificationPrefs,
  server: ServerNotificationPreferences | null | undefined,
): NotificationPrefs {
  const remote = mobilePushPrefsFromServer(server)
  return {
    ...local,
    quizReminders: remote.quizReminders,
    announcementAlerts: remote.announcementAlerts,
  }
}
