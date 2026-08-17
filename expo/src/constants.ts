import { AUTH_CONFIG } from "./config/auth"
import { resolveApiBaseUrl, PRODUCTION_API_BASE_URL } from "./config/api"

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

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl()
}

export function getProductionApiBaseUrl(): string {
  return PRODUCTION_API_BASE_URL
}

/** Resolved once at module load — prefer getApiBaseUrl() for network calls. */
export const API_BASE_URL = resolveApiBaseUrl()

export const SESSION_DURATION_MS = AUTH_CONFIG.sessionDurationMs
