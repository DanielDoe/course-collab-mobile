import { hashCoraText } from "./envelope"
import type { CoraAuditEntry, CoraAuditOutcome, CoraIdentity, CoraToolId } from "./types"

const MAX_LOCAL_AUDIT_ENTRIES = 200
const auditBuffer: CoraAuditEntry[] = []

export type LogCoraAuditInput = {
  identity: CoraIdentity
  requestId: string
  tool: CoraToolId
  permissionChecks: string[]
  outcome: CoraAuditOutcome
  prompt?: string
  response?: string
  dataSources?: string[]
  tokensConsumed?: number
  model?: string
  blockReason?: string
}

export function logCoraAudit(input: LogCoraAuditInput): CoraAuditEntry {
  const entry: CoraAuditEntry = {
    requestId: input.requestId,
    userId: input.identity.userId,
    role: input.identity.role,
    institutionId: input.identity.institutionId,
    timestamp: new Date().toISOString(),
    courseIds: input.identity.courseIds,
    sectionIds: input.identity.sectionIds,
    tool: input.tool,
    dataSources: input.dataSources ?? [],
    promptHash: input.prompt ? hashCoraText(input.prompt) : "h0",
    responseHash: input.response ? hashCoraText(input.response) : undefined,
    tokensConsumed: input.tokensConsumed,
    model: input.model,
    outcome: input.outcome,
    permissionChecks: input.permissionChecks,
    blockReason: input.blockReason,
  }

  auditBuffer.unshift(entry)
  if (auditBuffer.length > MAX_LOCAL_AUDIT_ENTRIES) {
    auditBuffer.length = MAX_LOCAL_AUDIT_ENTRIES
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("[CoraAudit]", {
      requestId: entry.requestId,
      role: entry.role,
      tool: entry.tool,
      outcome: entry.outcome,
      checks: entry.permissionChecks,
    })
  }

  return entry
}

export function getCoraAuditBuffer(): readonly CoraAuditEntry[] {
  return auditBuffer
}

export function clearCoraAuditBuffer(): void {
  auditBuffer.length = 0
}

/** Future: POST /api/cora/audit when admin portal ships. */
export async function flushCoraAuditToServer(_entries: CoraAuditEntry[]): Promise<void> {
  /* no-op until backend endpoint exists */
}
