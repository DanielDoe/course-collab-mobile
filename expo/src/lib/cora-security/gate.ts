/**
 * Input + output security gates for every Cora turn.
 *
 * USER → auth/scope (rbac) → input gate → orchestrator → sanitized tools
 *      → model → output DLP → USER
 *
 * Classification stays internal. Users only see safe product copy.
 */

import { classifyCoraSecurityIntent, isBlockedSecurityIntent } from "./intent-classifier"
import { filterCoraOutput } from "./output-filter"
import { logCoraSecurityEvent } from "./audit"
import { buildCoraSecurityReportReply } from "./report-workflow"
import { sanitizeCoraToolResult, sanitizeCoraUserError, stripInternalCoraPayload } from "./sanitize-tool-result"
import {
  CORA_SAFE_DISCLOSURE_REFUSAL,
  CORA_SAFE_PROMPT_REFUSAL,
  CORA_SAFE_SECRET_REFUSAL,
  CORA_SAFE_SCOPE_REFUSAL,
  type CoraSecurityActor,
  type CoraSecurityEventCategory,
  type CoraSecurityIntent,
  type CoraSecurityTurnDecision,
  type CoraSecurityTurnInput,
} from "./types"
import type { CoraIdentity } from "../cora-rbac/types"

function replyForIntent(intent: CoraSecurityIntent): string {
  if (intent === "secret_extraction") return CORA_SAFE_SECRET_REFUSAL
  if (intent === "privilege_bypass") return CORA_SAFE_SCOPE_REFUSAL
  if (intent === "prompt_extraction" || intent === "tool_extraction" || intent === "prompt_injection") {
    return CORA_SAFE_PROMPT_REFUSAL
  }
  return CORA_SAFE_DISCLOSURE_REFUSAL
}

function categoryForIntent(intent: CoraSecurityIntent): CoraSecurityEventCategory {
  if (intent === "privilege_bypass") return "privilege_bypass"
  if (intent === "secret_extraction") return "secret_extraction"
  if (intent === "prompt_extraction") return "prompt_extraction"
  if (intent === "tool_extraction") return "tool_extraction"
  if (intent === "prompt_injection") return "prompt_injection"
  if (intent === "exploit_verify") return "exploit_verify"
  if (intent === "security_report") return "security_report"
  if (intent === "platform_internals") return "reconnaissance"
  return "reconnaissance"
}

export function evaluateCoraSecurityTurn(
  input: CoraSecurityTurnInput,
  identity?: Pick<CoraIdentity, "userId" | "role"> | null,
): CoraSecurityTurnDecision {
  const classification = classifyCoraSecurityIntent(input)

  if (classification.intent === "security_report" || classification.intent === "exploit_verify") {
    logCoraSecurityEvent({
      actor: input.actor,
      identity,
      category: categoryForIntent(classification.intent),
      outcome: "routed",
      prompt: input.message,
    })
    return {
      action: "report",
      reply: buildCoraSecurityReportReply(),
      classification,
    }
  }

  if (isBlockedSecurityIntent(classification.intent)) {
    logCoraSecurityEvent({
      actor: input.actor,
      identity,
      category: categoryForIntent(classification.intent),
      outcome: "blocked",
      prompt: input.message,
    })
    return {
      action: "safe_reply",
      reply: replyForIntent(classification.intent),
      classification,
    }
  }

  return { action: "allow", classification }
}

export function applyCoraOutputGate(
  text: string,
  actor: CoraSecurityActor,
  identity?: Pick<CoraIdentity, "userId" | "role"> | null,
): string {
  const filtered = filterCoraOutput(text)
  if (filtered.blocked || filtered.redacted) {
    logCoraSecurityEvent({
      actor,
      identity,
      category: "output_dlp",
      outcome: filtered.blocked ? "blocked" : "redacted",
    })
  }
  return filtered.text
}

export function publicCoraDecision(decision: CoraSecurityTurnDecision): {
  action: CoraSecurityTurnDecision["action"]
  reply?: string
} {
  return { action: decision.action, reply: decision.reply }
}

export {
  sanitizeCoraToolResult,
  sanitizeCoraUserError,
  stripInternalCoraPayload,
}
