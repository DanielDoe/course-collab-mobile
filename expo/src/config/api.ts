import Constants from "expo-constants"
import { getAppEnvironment, isProductionEnvironment } from "./environment"

export const PRODUCTION_API_BASE_URL = "https://course-collab.com"

const LOCAL_HOST_PATTERNS =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|.*\.local|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/

export function isLocalOrLanHost(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url)
    if (protocol !== "https:" && protocol !== "http:") return true
    return LOCAL_HOST_PATTERNS.test(hostname)
  } catch {
    return true
  }
}

export function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/$/, "")
}

function readExtraAppUrl(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.appUrl
  if (typeof fromExtra === "string" && fromExtra.trim()) return fromExtra.trim()
  return undefined
}

function readConfiguredAppUrl(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_APP_URL
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim()
  return readExtraAppUrl()
}

function productionSafeApiBase(fallbackConfigured?: string): string {
  const extra = readExtraAppUrl()
  if (extra && !isLocalOrLanHost(extra)) return normalizeApiBaseUrl(extra)
  if (fallbackConfigured && !isLocalOrLanHost(fallbackConfigured)) {
    return normalizeApiBaseUrl(fallbackConfigured)
  }
  return PRODUCTION_API_BASE_URL
}

/** Resolve API base URL from Expo config with production-safe fallbacks. */
export function resolveApiBaseUrl(): string {
  const configured = readConfiguredAppUrl()
  if (configured) {
    const normalized = normalizeApiBaseUrl(configured)
    const blockLocalInDev =
      typeof __DEV__ !== "undefined" &&
      __DEV__ &&
      process.env.EXPO_PUBLIC_USE_LOCAL_API !== "true"
    // Never ship a local/LAN API URL in production builds; dev simulators default to hosted API
    // unless EXPO_PUBLIC_USE_LOCAL_API=true (see EXPO_PUBLIC_APP_URL=http://localhost:3000).
    if (isLocalOrLanHost(normalized) && (isProductionEnvironment() || blockLocalInDev)) {
      return productionSafeApiBase()
    }
    return normalized
  }

  return PRODUCTION_API_BASE_URL
}

/** Public web origin for membership/credit checkout links opened in Safari. */
export function resolvePurchaseBaseUrl(): string {
  const configured = resolveApiBaseUrl()
  if (isLocalOrLanHost(configured)) {
    return configured
  }
  return PRODUCTION_API_BASE_URL
}

export function validateProductionApiConfig(): string[] {
  const errors: string[] = []
  const env = getAppEnvironment()
  const baseUrl = resolveApiBaseUrl()

  if (env === "production") {
    if (isLocalOrLanHost(baseUrl)) {
      errors.push(`Production API URL resolves to local/LAN host: ${baseUrl}`)
    }
    if (!baseUrl.startsWith("https://")) {
      errors.push(`Production API URL must use HTTPS: ${baseUrl}`)
    }
    if (baseUrl.includes("ngrok") || baseUrl.includes(".preview.") || baseUrl.includes("staging.")) {
      errors.push(`Production API URL appears to be non-production: ${baseUrl}`)
    }
  }

  return errors
}
