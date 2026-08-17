import { Platform } from "react-native"
import Constants from "expo-constants"
import * as SecureStore from "expo-secure-store"
import * as ExpoNotifications from "expo-notifications"
import {
  categoryForNotificationType,
  registerAndroidChannels,
  registerNotificationCategories,
} from "./notification-categories"

const PUSH_TOKEN_KEY = "course-collab.expo-push-token"
let initialized = false

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined"

function notificationsSupported(): boolean {
  return (
    Platform.OS !== "web" &&
    typeof ExpoNotifications.setNotificationHandler === "function"
  )
}

export function getNotificationsModule(): typeof ExpoNotifications | null {
  return notificationsSupported() ? ExpoNotifications : null
}

export async function initializeNotificationSystem(): Promise<void> {
  if (initialized || !notificationsSupported()) return

  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  await registerNotificationCategories(ExpoNotifications)
  await registerAndroidChannels(ExpoNotifications)
  initialized = true
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!notificationsSupported()) return "undetermined"

  await initializeNotificationSystem()
  const settings = await ExpoNotifications.getPermissionsAsync()
  if (settings.granted) return "granted"
  if (settings.status === "denied") return "denied"
  return "undetermined"
}

export async function requestNotificationPermissions(options?: {
  provisional?: boolean
}): Promise<boolean> {
  if (!notificationsSupported()) return false

  await initializeNotificationSystem()

  const current = await ExpoNotifications.getPermissionsAsync()
  if (
    current.granted ||
    current.ios?.status === ExpoNotifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true
  }

  const requested = await ExpoNotifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowProvisional: options?.provisional ?? false,
    },
  })

  return (
    requested.granted ||
    requested.ios?.status === ExpoNotifications.IosAuthorizationStatus.PROVISIONAL
  )
}

export async function setAppBadgeCount(count: number): Promise<void> {
  if (!notificationsSupported()) return
  try {
    await ExpoNotifications.setBadgeCountAsync(Math.max(0, count))
  } catch {
    // Badge unsupported on some platforms
  }
}

export async function clearAppBadge(): Promise<void> {
  await setAppBadgeCount(0)
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  } catch {
    return null
  }
}

export async function clearStoredPushToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!notificationsSupported()) return null

  await initializeNotificationSystem()

  const permitted = await requestNotificationPermissions()
  if (!permitted) return null

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId

    const token = await ExpoNotifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const value = token.data
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, value)
    return value
  } catch {
    return null
  }
}

export type PresentLocalNotificationInput = {
  title: string
  body: string
  data?: Record<string, unknown>
  type?: string
  subtitle?: string
  channelId?: string
}

export async function presentLocalNotification(
  input: PresentLocalNotificationInput,
): Promise<string | null> {
  if (!notificationsSupported()) return null

  await initializeNotificationSystem()

  const categoryIdentifier = categoryForNotificationType(input.type)

  return ExpoNotifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      subtitle: input.subtitle,
      data: input.data ?? {},
      sound: "default",
      badge: 1,
      categoryIdentifier,
      ...(Platform.OS === "android"
        ? { channelId: input.channelId ?? "default" }
        : {}),
    },
    trigger: null,
  })
}

export { initialized as isNotificationSystemInitialized }
