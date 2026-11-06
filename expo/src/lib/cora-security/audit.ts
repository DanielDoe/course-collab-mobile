/**
 * Security-event audit. Hashes prompts. Never stores raw user text or
 * classification payloads that belong only on the server.
 *
 * Does not auto-punish accounts. Repeated events are countable for review.
 */

import { hashCoraText } from "../cora-rbac/envelope"
import type { CoraIdentity } from "../cora-rbac/types"
import type { CoraSecurityActor, CoraSecurityAuditEvent, CoraSecurityEventCategory } from "./types"

const MAX_EVENTS = 200
const events: CoraSecurityAuditEvent[] = []

export type LogCoraSecurityEventInput = {
  actor: CoraSecurityActor
  identity?: Pick<CoraIdentity, "userId" | "role"> | null
  category: CoraSecurityEventCategory
  outcome: CoraSecurityAuditEvent["outcome"]
  tool?: string
  prompt?: string
}

export function logCoraSecurityEvent(input: LogCoraSecurityEventInput): CoraSecurityAuditEvent {
  const event: CoraSecurityAuditEvent = {
    timestamp: new Date().toISOString(),
    actor: input.actor,
    userId: input.identity?.userId,
    role: input.identity?.role ?? input.actor,
    category: input.category,
    outcome: input.outcome,
    tool: input.tool,
    promptHash: input.prompt ? hashCoraText(input.prompt) : undefined,
  }
  events.unshift(event)
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("[CoraSecurityAudit]", {
      category: event.category,
      outcome: event.outcome,
      role: event.role,
    })
  }

  return event
}

export function getCoraSecurityAuditBuffer(): readonly CoraSecurityAuditEvent[] {
  return events
}

export function clearCoraSecurityAuditBuffer(): void {
  events.length = 0
}

export function countRecentSecurityEvents(
  userId: string,
  category: CoraSecurityEventCategory,
  windowMs = 60 * 60 * 1000,
): number {
  const since = Date.now() - windowMs
  return events.filter(
    (event) =>
      event.userId === userId &&
      event.category === category &&
      Date.parse(event.timestamp) >= since,
  ).length
}

/** Telemetry only — never suspends an account from a single cybersecurity question. */
export function shouldReviewRepeatedSecurityActivity(userId: string): boolean {
  return countRecentSecurityEvents(userId, "reconnaissance") >= 8
}
