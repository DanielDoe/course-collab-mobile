import type { CoraAccessEnvelope, CoraIdentity, CoraPermissionClaims, CoraToolId } from "./types"

function randomRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `cora-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Lightweight hash for audit — not cryptographic. */
export function hashCoraText(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return `h${(hash >>> 0).toString(16)}`
}

export type BuildEnvelopeInput = {
  identity: CoraIdentity
  claims: CoraPermissionClaims
  permissionChecks: string[]
  invokedTool?: CoraToolId
  prompt?: string
  requestId?: string
}

export function buildCoraAccessEnvelope(input: BuildEnvelopeInput): CoraAccessEnvelope {
  const requestId = input.requestId ?? randomRequestId()
  return {
    version: 1,
    requestId,
    clientTimestamp: new Date().toISOString(),
    role: input.identity.role,
    identity: {
      userId: input.identity.userId,
      institutionId: input.identity.institutionId,
      courseIds: input.identity.courseIds,
      sectionIds: input.identity.sectionIds,
      membershipTier: input.identity.membershipTier,
    },
    claims: input.claims,
    permissionChecks: input.permissionChecks,
    invokedTool: input.invokedTool,
    promptHash: input.prompt ? hashCoraText(input.prompt) : undefined,
  }
}

/** Attach to AI API request bodies — backend must validate claims. */
export function coraAccessBody(envelope: CoraAccessEnvelope): { coraAccess: CoraAccessEnvelope } {
  return { coraAccess: envelope }
}
