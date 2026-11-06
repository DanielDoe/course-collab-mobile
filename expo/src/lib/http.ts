import { abortTimeout } from "./abort-timeout"
import { isProductionEnvironment } from "../config/environment"
import { notifySessionExpired } from "./session-expiry"

export const DEFAULT_API_TIMEOUT_MS = 30_000

const SENSITIVE_KEY =
  /password|token|authorization|cookie|secret|api[_-]?key|credit|ssn|session|email|phone|address|full[_-]?name|student[_-]?id|student[_-]?code|user[_-]?name|prompt|message/i

export function assertProductionHttpsUrl(url: string): void {
  if (!isProductionEnvironment()) return
  if (!url.startsWith("https://")) {
    throw new Error(`Production requests must use HTTPS (${url}).`)
  }
}

export function createApiAbortSignal(timeoutMs = DEFAULT_API_TIMEOUT_MS, existing?: AbortSignal): AbortSignal {
  const timeout = abortTimeout(timeoutMs)
  if (!existing) return timeout
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (existing.aborted || timeout.aborted) {
    abort()
    return controller.signal
  }
  existing.addEventListener("abort", abort, { once: true })
  timeout.addEventListener("abort", abort, { once: true })
  return controller.signal
}

export function noteApiFailure(path: string, status: number, message?: string): void {
  notifySessionExpired(path, status, message)
}

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (value == null || typeof value !== "object" || depth > 3) return value
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeLogValue(item, depth + 1))
  const record = value as Record<string, unknown>
  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(record)) {
    next[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeLogValue(entry, depth + 1)
  }
  return next
}

export function httpErrorKind(status: number): "timeout" | "offline" | "auth" | "forbidden" | "not_found" | "conflict" | "validation" | "rate_limit" | "server" | "client" {
  if (status === 0) return "offline"
  if (status === 408) return "timeout"
  if (status === 401) return "auth"
  if (status === 403) return "forbidden"
  if (status === 404) return "not_found"
  if (status === 409) return "conflict"
  if (status === 422) return "validation"
  if (status === 429) return "rate_limit"
  if (status >= 500) return "server"
  return "client"
}
