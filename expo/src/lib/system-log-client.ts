/**
 * Mobile client system error capture — mirrors web lib/system-log-client.ts.
 * Fire-and-forget batch POST to /api/system-log with metadata.platform = mobile-app.
 */
import Constants from "expo-constants"
import { Dimensions, Platform } from "react-native"
import { API_BASE_URL } from "../constants"
import type { AppSession } from "./session"
import { sanitizeLogValue } from "./http"

export const MOBILE_APP_PLATFORM = "mobile-app" as const

export type MobileLogSeverity = "info" | "warning" | "error" | "critical"
export type MobileLogCategory =
  | "frontend"
  | "backend"
  | "api"
  | "database"
  | "authentication"
  | "authorization"
  | "storage"
  | "email"
  | "deployment"
  | "security"
  | "performance"
  | "assessment"

export type MobileClientLogPayload = {
  severity: MobileLogSeverity
  category: MobileLogCategory
  title?: string
  description?: string
  errorMessage: string
  stackTrace?: string
  moduleName?: string
  featureName?: string
  pageUrl?: string
  route?: string
  apiEndpoint?: string
  httpMethod?: string
  httpStatusCode?: number
  userId?: string
  userName?: string
  userRole?: string
  courseId?: number
  courseName?: string
  browser?: string
  operatingSystem?: string
  deviceType?: string
  screenResolution?: string
  sessionId?: string
  executionTimeMs?: number
  metadata?: Record<string, unknown>
}

type MobileLogContext = {
  route?: string
  session?: AppSession | null
}

let logQueue: MobileClientLogPayload[] = []
let batchTimer: ReturnType<typeof setTimeout> | null = null
let sessionId: string | null = null
let mobileContext: MobileLogContext = {}

const BATCH_INTERVAL = 3000
const MAX_BATCH = 20

export function updateMobileLogContext(partial: MobileLogContext): void {
  mobileContext = { ...mobileContext, ...partial }
}

function getMobileSessionId(): string {
  if (!sessionId) {
    sessionId = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
  return sessionId
}

function sessionFields(session: AppSession | null | undefined) {
  if (!session) return {}
  if (session.portal === "student") {
    return {
      userId: session.databaseId,
      userName: session.name,
      userRole: "student",
    }
  }
  if (session.portal === "faculty") {
    return {
      userId: String(session.id),
      userName: session.name,
      userRole: session.role ?? "instructor",
    }
  }
  if (session.portal === "guest") {
    return { userId: session.databaseId, userName: session.name, userRole: "guest" }
  }
  if (session.portal === "summer") {
    return { userId: session.databaseId, userName: session.name, userRole: "summer_camper" }
  }
  if (session.portal === "admin") {
    return { userId: session.id, userName: session.name, userRole: session.platformRole ?? "admin" }
  }
  return {}
}

function mobileMetadata(extra?: Record<string, unknown>): Record<string, unknown> {
  const expoConfig = Constants.expoConfig
  return {
    platform: MOBILE_APP_PLATFORM,
    appSlug: expoConfig?.slug ?? "course-collab-mobile",
    appVersion: expoConfig?.version ?? "unknown",
    expoSdk: Constants.expoVersion ?? undefined,
    nativePlatform: Platform.OS,
    nativeVersion: Platform.Version,
    ...extra,
  }
}

function getDeviceContext() {
  const { width, height } = Dimensions.get("window")
  const session = mobileContext.session
  return {
    route: mobileContext.route,
    pageUrl: mobileContext.route ? `coursecollab://${mobileContext.route.replace(/^\//, "")}` : undefined,
    browser: "CourseCollab Native",
    operatingSystem: Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : Platform.OS,
    deviceType: "mobile",
    screenResolution: `${Math.round(width)}x${Math.round(height)}`,
    sessionId: getMobileSessionId(),
    ...sessionFields(session),
  }
}

function inferModuleFromRoute(route: string): string {
  if (route.includes("/module/ai-tutor") || route.includes("/cora")) return "AI Assistant Module"
  if (route.includes("/assessment")) return "Quiz Module"
  if (route.includes("/lecture")) return "Lectures Module"
  if (route.includes("/practice")) return "Practice Module"
  if (route.includes("/flashcards")) return "Practice Module"
  if (route.includes("/notetaker") || route.includes("/notes")) return "AI Assistant Module"
  if (route.includes("/collaboration")) return "Discussion Module"
  if (route.includes("/rewards")) return "Attendance Module"
  if (route.includes("/membership")) return "Platform Module"
  if (route.includes("/faculty")) return "Administration Module"
  return "Platform Module"
}

function isBenignMobileError(message: string, stack?: string): boolean {
  if (/Network request failed/i.test(message)) return false
  if (/Unable to open URL/i.test(message)) return true
  if (/User cancelled/i.test(message)) return true
  if (/Non-Error promise rejection/i.test(message)) return true
  if (stack && /react-native\/Libraries\/LogBox/i.test(stack)) return true
  return false
}

async function flushQueue() {
  if (logQueue.length === 0) return
  const batch = logQueue.splice(0, MAX_BATCH)
  try {
    await fetch(`${API_BASE_URL}/api/system-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ logs: batch }),
    })
  } catch {
    /* silent */
  }
}

function scheduleFlush() {
  if (batchTimer) return
  batchTimer = setTimeout(() => {
    batchTimer = null
    void flushQueue()
  }, BATCH_INTERVAL)
}

export function reportMobileClientError(
  partial: Partial<MobileClientLogPayload> & { errorMessage: string },
): void {
  try {
    if (isBenignMobileError(partial.errorMessage, partial.stackTrace)) return

    const ctx = getDeviceContext()
    const route = partial.route ?? ctx.route ?? "/"
    const payload: MobileClientLogPayload = {
      severity: partial.severity ?? "error",
      category: partial.category ?? "frontend",
      title: partial.title,
      description: partial.description,
      errorMessage: partial.errorMessage.slice(0, 8000),
      stackTrace: partial.stackTrace?.slice(0, 8000),
      moduleName: partial.moduleName ?? inferModuleFromRoute(route),
      featureName: partial.featureName,
      pageUrl: partial.pageUrl ?? ctx.pageUrl,
      route,
      apiEndpoint: partial.apiEndpoint,
      httpMethod: partial.httpMethod,
      httpStatusCode: partial.httpStatusCode,
      userId: partial.userId ?? ctx.userId,
      userName: partial.userName ?? ctx.userName,
      userRole: partial.userRole ?? ctx.userRole,
      browser: partial.browser ?? ctx.browser,
      operatingSystem: partial.operatingSystem ?? ctx.operatingSystem,
      deviceType: partial.deviceType ?? ctx.deviceType,
      screenResolution: partial.screenResolution ?? ctx.screenResolution,
      sessionId: partial.sessionId ?? ctx.sessionId,
      executionTimeMs: partial.executionTimeMs,
      metadata: mobileMetadata(partial.metadata),
    }

    logQueue.push(payload)
    if (logQueue.length >= MAX_BATCH) {
      void flushQueue()
    } else {
      scheduleFlush()
    }
  } catch {
    /* silent */
  }
}

export function reportMobileApiError(input: {
  path: string
  method?: string
  status: number
  message: string
  body?: unknown
}): void {
  if (input.status < 400) return
  reportMobileClientError({
    severity: input.status >= 500 ? "critical" : "error",
    category: input.status === 401 || input.status === 403 ? "authorization" : "api",
    title: `Mobile API ${input.status}`,
    errorMessage: input.message,
    apiEndpoint: input.path,
    httpMethod: input.method ?? "GET",
    httpStatusCode: input.status,
    metadata: {
      responsePreview:
        typeof input.body === "string"
          ? input.body.slice(0, 200)
          : JSON.stringify(sanitizeLogValue(input.body) ?? null).slice(0, 200),
    },
  })
}

let captureInstalled = false

/** Install global JS error handler once at app boot. */
export function installMobileErrorCapture(): void {
  if (captureInstalled) return
  captureInstalled = true

  const errorUtils = (global as typeof global & {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void
    }
  }).ErrorUtils

  const previousHandler = errorUtils?.getGlobalHandler?.()
  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    reportMobileClientError({
      severity: isFatal ? "critical" : "error",
      category: "frontend",
      title: isFatal ? "Fatal mobile error" : "Unhandled mobile error",
      errorMessage: error?.message ?? String(error),
      stackTrace: error?.stack,
    })
    previousHandler?.(error, isFatal)
  })
}
