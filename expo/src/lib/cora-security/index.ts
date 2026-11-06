export {
  COURSECOLLAB_SECURITY_INTERNAL,
  CORA_SAFE_ACTION_FAILED,
  CORA_SAFE_DISCLOSURE_REFUSAL,
  CORA_SAFE_PROMPT_REFUSAL,
  CORA_SAFE_SECRET_REFUSAL,
  CORA_SAFE_SCOPE_REFUSAL,
  type CoraSecurityActor,
  type CoraSecurityIntent,
  type CoraSecurityAction,
  type CoraSecurityClassification,
  type CoraSecurityTurnInput,
  type CoraSecurityTurnDecision,
  type CoraSecurityEventCategory,
  type CoraSecurityAuditEvent,
} from "./types"

export { classifyCoraSecurityIntent, isBlockedSecurityIntent } from "./intent-classifier"
export { normalizeCoraSecurityText, stripFraming, decodeEmbeddedBase64 } from "./normalize"
export { evaluateCoraSecurityTurn, applyCoraOutputGate, publicCoraDecision } from "./gate"
export { sanitizeCoraToolResult, sanitizeCoraUserError, stripInternalCoraPayload } from "./sanitize-tool-result"
export { filterCoraOutput } from "./output-filter"
export { bindCoraResourceScope, assertCoraResourceScope, type CoraRequestedResource } from "./resource-scope"
export {
  publicCapabilitiesForRole,
  publicModuleLabelsForRole,
  selectCoraExecutionContext,
  describeCoraCapabilityForUser,
} from "./public-capabilities"
export {
  logCoraSecurityEvent,
  getCoraSecurityAuditBuffer,
  clearCoraSecurityAuditBuffer,
  countRecentSecurityEvents,
  shouldReviewRepeatedSecurityActivity,
} from "./audit"
export {
  buildCoraSecurityReportReply,
  CORA_SECURITY_REPORT_ROUTE,
  CORA_SECURITY_REPORT_REPLY,
} from "./report-workflow"

export function securityActorFromPortal(
  portal: "student" | "guest" | "summer" | "faculty" | "admin" | string | null | undefined,
): import("./types").CoraSecurityActor {
  if (portal === "faculty") return "faculty"
  if (portal === "admin") return "admin"
  if (portal === "guest") return "career"
  return "student"
}
