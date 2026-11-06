/**
 * Cora disclosure-security types.
 *
 * Authorization (who may act) lives in `cora-rbac`.
 * This module decides what may be *said* and what tool output may reach the model.
 *
 * Classifications are INTERNAL. Never return them to users.
 */

import type { CoraRole } from "../cora-rbac/types"

/** Authenticated Cora actor. Career covers guest / Cora Career workspaces. */
export type CoraSecurityActor = CoraRole | "career"

export type CoraSecurityIntent =
  | "normal"
  | "security_education"
  | "authorized_product"
  | "platform_internals"
  | "security_report"
  | "exploit_verify"
  | "reconnaissance"
  | "privilege_bypass"
  | "secret_extraction"
  | "prompt_extraction"
  | "tool_extraction"
  | "prompt_injection"

export type CoraSecurityAction = "allow" | "safe_reply" | "report"

/** Protected information class — never disclosed through ordinary chat. */
export const COURSECOLLAB_SECURITY_INTERNAL = [
  "vulnerability_findings",
  "penetration_testing_results",
  "security_audit_findings",
  "unresolved_security_bugs",
  "authorization_weaknesses",
  "internal_api_topology",
  "private_endpoint_inventory",
  "database_topology",
  "authentication_internals",
  "session_internals",
  "cors_configuration",
  "secret_management",
  "internal_network",
  "server_configuration",
  "deployment_architecture",
  "internal_logs",
  "security_telemetry",
  "security_source_code",
  "exploitability_assessments",
  "system_prompts",
  "hidden_tool_definitions",
  "provider_configuration",
] as const

export type CoraSecurityInternalClass = (typeof COURSECOLLAB_SECURITY_INTERNAL)[number]

export type CoraSecurityClassification = {
  intent: CoraSecurityIntent
  /** Internal only — never serialize to the client UI. */
  reasons: string[]
  platformTargeted: boolean
  cumulative: boolean
}

export type CoraSecurityTurnInput = {
  actor: CoraSecurityActor
  message: string
  history?: ReadonlyArray<{ role?: string; content?: string }>
  /** Uploaded / retrieved text. Treated as DATA, never as instructions. */
  untrustedContent?: ReadonlyArray<string>
}

export type CoraSecurityTurnDecision = {
  action: CoraSecurityAction
  reply?: string
  classification: CoraSecurityClassification
}

export type CoraSecurityEventCategory =
  | "reconnaissance"
  | "privilege_bypass"
  | "secret_extraction"
  | "prompt_extraction"
  | "tool_extraction"
  | "prompt_injection"
  | "output_dlp"
  | "tool_auth_failure"
  | "exploit_verify"
  | "security_report"
  | "cross_role_request"
  | "repeated_suspicious"

export type CoraSecurityAuditEvent = {
  timestamp: string
  actor: CoraSecurityActor
  userId?: string
  role: CoraSecurityActor
  category: CoraSecurityEventCategory
  outcome: "blocked" | "redacted" | "routed" | "logged"
  tool?: string
  /** Hash only — never the raw prompt. */
  promptHash?: string
}

export const CORA_SAFE_ACTION_FAILED =
  "I couldn't complete that action. Please try again or contact support."

export const CORA_SAFE_DISCLOSURE_REFUSAL =
  "I can't provide internal CourseCollab vulnerability, exploit, or security-configuration information. I can help with general application-security concepts or explain the security and privacy controls available to you."

export const CORA_SAFE_PROMPT_REFUSAL =
  "I can't share hidden instructions, system prompts, or internal tool definitions. I can help you use CourseCollab with the capabilities available to your account."

export const CORA_SAFE_SECRET_REFUSAL =
  "I can't provide API keys, secrets, credentials, or environment values."

export const CORA_SAFE_SCOPE_REFUSAL =
  "I can only work with the courses and records your account is authorized to use."
