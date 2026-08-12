import Constants from "expo-constants"
import { Platform } from "react-native"

export const BRAND = {
  /** CourseCollab mark — drawer logo tile & brand accents */
  red: "#C1272D",
  redDark: "#9B1F24",
  redSoft: "#FFF1F1",
  redBorder: "#FECACA",
  purple: "#582c83",
  purpleLight: "#7a4eba",
  purpleDark: "#3d1f5c",
  gold: "#eaaa00",
  goldSoft: "#FFF7ED",
  goldBorder: "#FED7AA",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  slate: "#64748b",
  border: "#e2e8f0",
} as const

const PRODUCTION_DEFAULT = "https://coursecollab.vercel.app"

function isPrivateLanHost(host: string): boolean {
  if (!host || host === "localhost" || host === "127.0.0.1") return false
  if (host.endsWith(".exp.direct") || host.includes("expo.dev")) return false
  if (host.startsWith("192.168.")) return true
  if (host.startsWith("10.")) return true
  return /^172\.(1[6-9]|2\d|3[01])\./.test(host)
}

function resolveApiBaseUrl(): string {
  const configured =
    (Constants.expoConfig?.extra?.appUrl as string | undefined)?.replace(/\/$/, "") ??
    PRODUCTION_DEFAULT

  if (!__DEV__) return configured

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined
  const useLocalApi = extra?.useLocalApi === true || extra?.useLocalApi === "true"

  // Default in dev (Expo Go, simulator, device): production unless explicitly opted in.
  if (!useLocalApi) return configured

  const localApiUrl = typeof extra?.localApiUrl === "string" ? extra.localApiUrl.replace(/\/$/, "") : null
  const lanApiUrl = typeof extra?.lanApiUrl === "string" ? extra.lanApiUrl.replace(/\/$/, "") : null

  if (configured.includes("127.0.0.1") || configured.includes("localhost")) {
    return configured
  }

  if (Constants.isDevice) {
    if (lanApiUrl) return lanApiUrl
    const host = Constants.expoConfig?.hostUri?.split(":")[0]
    if (host && isPrivateLanHost(host)) {
      return `http://${host}:3000`
    }
    return configured
  }

  if (Platform.OS === "android") return "http://10.0.2.2:3000"
  return localApiUrl ?? "http://127.0.0.1:3000"
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl()
}

export function getProductionApiBaseUrl(): string {
  const configured =
    (Constants.expoConfig?.extra?.appUrl as string | undefined)?.replace(/\/$/, "") ??
    PRODUCTION_DEFAULT
  return configured
}

/** Resolved once at module load — prefer getApiBaseUrl() for network calls. */
export const API_BASE_URL = resolveApiBaseUrl()

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000
