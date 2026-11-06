/**
 * Sanitize tool results before they reach the model or the user.
 * Tool output is a first-class leakage channel — not only chat text.
 */

import { CORA_SAFE_ACTION_FAILED } from "./types"

const DROP_KEYS =
  /^(stack|stacktrace|traceback|sql|query|connectionstring|databaseurl|apikey|api_key|secret|token|authorization|cookie|set-cookie|env|environment|schema|headers|debug|trace|raw|internalurl|servicepath|servicehint|toolhints|functioncall|toolcalls|systemprompt|developerprompt)$/i

const LEAKY_VALUE =
  /(-----BEGIN [A-Z ]*PRIVATE KEY-----)|(\bsk-[A-Za-z0-9]{12,})|(\bBearer\s+[A-Za-z0-9._\-+/=]{12,})|(postgres(ql)?:\/\/\S+)|(mongodb(\+srv)?:\/\/\S+)|(\bAKIA[0-9A-Z]{12,})|((OPENAI|STRIPE|AWS|DATABASE|SECRET|API)[_-]?[A-Z0-9_]*\s*=\s*\S+)/i

const LEAKY_ERROR =
  /(postgresql|psql|sqlite|mongodb|econnrefused|relation ["']\w+["']|at \S+\.(ts|js|py|go):\d+|traceback \(most recent|\/api\/(admin|internal|instructor)\/|enoent:|error:\s+column\s)/i

const INTERNAL_PATH = /(?:^|[\s"'`])(\/(api\/(?:internal|admin)\/[\w\-./?=&]+|Users\/[\w/.\-]+|var\/[\w/.\-]+))/i

export type SanitizeCoraToolResultMeta = {
  redacted: boolean
  droppedKeys: string[]
}

export type SanitizedCoraToolResult<T = unknown> = {
  value: T
  meta: SanitizeCoraToolResultMeta
}

function redactString(value: string, meta: SanitizeCoraToolResultMeta): string {
  if (LEAKY_ERROR.test(value) || INTERNAL_PATH.test(value)) {
    meta.redacted = true
    return CORA_SAFE_ACTION_FAILED
  }
  if (!LEAKY_VALUE.test(value)) return value
  meta.redacted = true
  return value
    .replace(LEAKY_VALUE, "[redacted]")
    .replace(INTERNAL_PATH, " [redacted-path]")
}

function walk(value: unknown, meta: SanitizeCoraToolResultMeta, depth: number): unknown {
  if (value == null || depth > 8) return value
  if (typeof value === "string") return redactString(value, meta)
  if (typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => walk(item, meta, depth + 1))
  if (typeof value !== "object") return value

  const record = value as Record<string, unknown>
  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(record)) {
    if (DROP_KEYS.test(key)) {
      meta.redacted = true
      meta.droppedKeys.push(key)
      continue
    }
    next[key] = walk(entry, meta, depth + 1)
  }
  return next
}

export function sanitizeCoraToolResult<T>(result: T): SanitizedCoraToolResult<T> {
  const meta: SanitizeCoraToolResultMeta = { redacted: false, droppedKeys: [] }
  const value = walk(result, meta, 0) as T
  return { value, meta }
}

export function sanitizeCoraUserError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : ""
  if (!message.trim() || LEAKY_ERROR.test(message) || LEAKY_VALUE.test(message) || INTERNAL_PATH.test(message)) {
    return CORA_SAFE_ACTION_FAILED
  }
  return message.length > 180 ? `${message.slice(0, 180)}…` : message
}

/** Strip fields that must never be forwarded to chat UI. */
export function stripInternalCoraPayload<T extends Record<string, unknown>>(payload: T): T {
  const { value } = sanitizeCoraToolResult({
    ...payload,
    toolCalls: undefined,
    tool_calls: undefined,
    debug: undefined,
    stack: undefined,
    securityClassification: undefined,
    ruleMatched: undefined,
    riskScore: undefined,
  })
  return value
}
