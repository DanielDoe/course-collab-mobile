export type {
  CoraRole,
  CoraToolId,
  CoraContextSource,
  CoraPermissionClaims,
  CoraIdentity,
  CoraAccessEnvelope,
  CoraAuditEntry,
  CoraAuditOutcome,
} from "./types"
export { CoraAccessDeniedError } from "./types"

export { CORA_TOOL_PERMISSIONS, toolsForRole, canRoleUseTool, toolLabel } from "./tools"

export {
  CORA_CONTEXT_SOURCES,
  CORA_ALLOWED_DATA,
  CORA_DENIED_DATA,
  FACULTY_CORA_RESTRICTED_MODULE_IDS,
  isFacultyCoraRestrictedModule,
} from "./data-scope"

export {
  resolveCoraRole,
  resolveCoraIdentity,
  buildPermissionClaims,
  coraPersonaLabel,
  coraPersonaIdentityLine,
  type ResolveCoraIdentityInput,
} from "./identity"

export {
  canUseTool,
  guardToolAccess,
  assertToolAccess,
  guardFacultyModuleLink,
  isCoraAccessDeniedError,
  type CoraGuardResult,
} from "./guard"

export {
  filterStudentContextForCora,
  contextSourcesForRole,
  contextSourceLabels,
  leastContextSourcesForRole,
} from "./context-policy"

export {
  buildCoraAccessEnvelope,
  coraAccessBody,
  hashCoraText,
  type BuildEnvelopeInput,
} from "./envelope"

export {
  coraToolFlowToRbac,
  coraSectionToRbac,
  facultyCapabilityToRbac,
  facultyActionToRbac,
  coraComposerToolToRbac,
} from "./tool-mappings"

export {
  logCoraAudit,
  getCoraAuditBuffer,
  clearCoraAuditBuffer,
  flushCoraAuditToServer,
  type LogCoraAuditInput,
} from "./audit"

export {
  prepareCoraRequest,
  prepareCoraRequestOrThrow,
  filterContextForCoraRole,
  recordCoraSuccess,
  recordCoraError,
} from "./prepare-request"
