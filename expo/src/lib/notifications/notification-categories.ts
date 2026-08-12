import { Platform } from "react-native"

export const NOTIFICATION_CATEGORY = {
  DEFAULT: "coursecollab.default",
  QUIZ: "coursecollab.quiz",
  ANNOUNCEMENT: "coursecollab.announcement",
  CLASS: "coursecollab.class",
  MESSAGE: "coursecollab.message",
  GRADE: "coursecollab.grade",
} as const

export type NotificationCategoryId =
  (typeof NOTIFICATION_CATEGORY)[keyof typeof NOTIFICATION_CATEGORY]

const IOS_ACTIONS = {
  view: {
    identifier: "VIEW",
    buttonTitle: "View",
    options: { opensAppToForeground: true },
  },
  markRead: {
    identifier: "MARK_READ",
    buttonTitle: "Mark Read",
    options: { opensAppToForeground: false },
  },
  dismiss: {
    identifier: "DISMISS",
    buttonTitle: "Dismiss",
    options: { isDestructive: true, opensAppToForeground: false },
  },
} as const

export async function registerNotificationCategories(
  Notifications: typeof import("expo-notifications"),
): Promise<void> {
  if (Platform.OS !== "ios") return

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.DEFAULT, [
    IOS_ACTIONS.view,
    IOS_ACTIONS.markRead,
    IOS_ACTIONS.dismiss,
  ])

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.QUIZ, [
    IOS_ACTIONS.view,
    { ...IOS_ACTIONS.markRead, buttonTitle: "Got it" },
  ])

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.ANNOUNCEMENT, [
    IOS_ACTIONS.view,
    IOS_ACTIONS.markRead,
  ])

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.CLASS, [
    IOS_ACTIONS.view,
  ])

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.MESSAGE, [
    IOS_ACTIONS.view,
    IOS_ACTIONS.markRead,
  ])

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY.GRADE, [
    IOS_ACTIONS.view,
  ])
}

export async function registerAndroidChannels(
  Notifications: typeof import("expo-notifications"),
): Promise<void> {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync("default", {
    name: "CourseCollab",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6D5EF6",
    sound: "default",
  })

  await Notifications.setNotificationChannelAsync("urgent", {
    name: "Deadlines & exams",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: "#FF453A",
    sound: "default",
  })

  await Notifications.setNotificationChannelAsync("announcements", {
    name: "Announcements",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#007AFF",
    sound: "default",
  })

  await Notifications.setNotificationChannelAsync("class-reminders", {
    name: "Class reminders",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#34C759",
    sound: "default",
  })

  await Notifications.setNotificationChannelAsync("study-reminders", {
    name: "Study plan reminders",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#8b5cf6",
    sound: "default",
  })

  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: "#6D5EF6",
    sound: "default",
  })
}

export function categoryForNotificationType(type?: string): NotificationCategoryId {
  const t = (type ?? "").toLowerCase()
  if (t.includes("quiz") || t.includes("homework") || t.includes("exam") || t.includes("deadline")) {
    return NOTIFICATION_CATEGORY.QUIZ
  }
  if (t.includes("calendar") || t.includes("study")) return NOTIFICATION_CATEGORY.QUIZ
  if (t.includes("announce")) return NOTIFICATION_CATEGORY.ANNOUNCEMENT
  if (t.includes("class") || t.includes("meeting")) return NOTIFICATION_CATEGORY.CLASS
  if (t.includes("grade") || t.includes("score")) return NOTIFICATION_CATEGORY.GRADE
  if (t.includes("message") || t.includes("forum") || t.includes("discussion")) {
    return NOTIFICATION_CATEGORY.MESSAGE
  }
  return NOTIFICATION_CATEGORY.DEFAULT
}
