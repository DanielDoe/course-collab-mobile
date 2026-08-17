import { Platform } from "react-native"
import { API_BASE_URL } from "../../constants"
import type { AppSession } from "../session"
import { abortTimeout } from "../abort-timeout"
import { getExpoPushToken, getStoredPushToken } from "./notification-service"

type RegisterResult = {
  ok: boolean
  token: string | null
  error?: string
}

async function requestJson(
  url: string,
  method: "POST" | "DELETE",
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: abortTimeout(12_000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function registerPushTokenForSession(session: AppSession): Promise<RegisterResult> {
  if (Platform.OS === "web") {
    return { ok: false, token: null, error: "web" }
  }

  const token = await getExpoPushToken()
  if (!token) {
    return { ok: false, token: null, error: "no_token" }
  }

  const payload = {
    expo_push_token: token,
    platform: Platform.OS,
    device: Platform.OS === "ios" ? "ios" : "android",
  }

  if (session.portal === "student" || session.portal === "guest" || session.portal === "summer") {
    const ok = await requestJson(
      `${API_BASE_URL}/api/student/push-token`,
      "POST",
      { "x-student-id": session.databaseId },
      payload,
    )
    return { ok, token, error: ok ? undefined : "api_unavailable" }
  }

  if (session.portal === "faculty") {
    const ok = await requestJson(
      `${API_BASE_URL}/api/instructor/push-token`,
      "POST",
      { "x-instructor-id": String(session.id) },
      payload,
    )
    return { ok, token, error: ok ? undefined : "api_unavailable" }
  }

  return { ok: true, token }
}

export async function unregisterPushTokenForSession(sessionKey: string): Promise<void> {
  if (Platform.OS === "web") return

  const token = await getStoredPushToken()
  const [portal, id] = sessionKey.split(":")
  if (!portal || !id) return

  const body = token ? { expo_push_token: token } : {}

  if (portal === "student" || portal === "guest" || portal === "summer") {
    await requestJson(
      `${API_BASE_URL}/api/student/push-token`,
      "DELETE",
      { "x-student-id": id },
      body,
    )
    return
  }

  if (portal === "faculty") {
    await requestJson(
      `${API_BASE_URL}/api/instructor/push-token`,
      "DELETE",
      { "x-instructor-id": id },
      body,
    )
  }
}
