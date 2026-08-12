import type { InstructorScope } from "../instructor-content-api"
import type { AppSession } from "../session"
import type { MembershipTier } from "../../types/dashboard"
import { logCoraAudit } from "./audit"
import { filterStudentContextForCora } from "./context-policy"
import { buildCoraAccessEnvelope, coraAccessBody } from "./envelope"
import { assertToolAccess, guardToolAccess } from "./guard"
import { buildPermissionClaims, resolveCoraIdentity } from "./identity"
import {
  CoraAccessDeniedError,
  type CoraAccessEnvelope,
  type CoraIdentity,
  type CoraPermissionClaims,
  type CoraToolId,
} from "./types"

export type PrepareCoraRequestInput = {
  session: AppSession
  tool: CoraToolId
  prompt?: string
  membershipTier?: MembershipTier | null
  scope?: InstructorScope | null
  dataSources?: string[]
}

export type PreparedCoraRequest = {
  identity: CoraIdentity
  claims: CoraPermissionClaims
  envelope: CoraAccessEnvelope
  permissionChecks: string[]
  accessBody: ReturnType<typeof coraAccessBody>
}

/**
 * Universal security pipeline for every Cora AI request:
 * authenticate → role → scope → membership → permissions → envelope → audit-ready.
 */
export function prepareCoraRequest(input: PrepareCoraRequestInput): PreparedCoraRequest {
  const identity = resolveCoraIdentity({
    session: input.session,
    membershipTier: input.membershipTier,
    scope: input.scope,
  })

  if (!identity) {
    throw new Error("Cora is not available for this portal.")
  }

  const claims = buildPermissionClaims(identity)
  const guard = guardToolAccess(identity, claims, input.tool)

  if (!guard.allowed) {
    logCoraAudit({
      identity,
      requestId: `blocked-${Date.now()}`,
      tool: input.tool,
      permissionChecks: guard.checks,
      outcome: "blocked",
      prompt: input.prompt,
      blockReason: guard.reason,
    })
    throw new CoraAccessDeniedError(input.tool, identity.role, guard.reason)
  }

  const envelope = buildCoraAccessEnvelope({
    identity,
    claims,
    permissionChecks: guard.checks,
    invokedTool: input.tool,
    prompt: input.prompt,
  })

  return {
    identity,
    claims,
    envelope,
    permissionChecks: guard.checks,
    accessBody: coraAccessBody(envelope),
  }
}

/** Strict variant that throws on denied tools. */
export function prepareCoraRequestOrThrow(input: PrepareCoraRequestInput): PreparedCoraRequest {
  const identity = resolveCoraIdentity({
    session: input.session,
    membershipTier: input.membershipTier,
    scope: input.scope,
  })
  if (!identity) throw new Error("Cora is not available for this portal.")

  const claims = buildPermissionClaims(identity)
  const checks = assertToolAccess(identity, claims, input.tool)
  const envelope = buildCoraAccessEnvelope({
    identity,
    claims,
    permissionChecks: checks,
    invokedTool: input.tool,
    prompt: input.prompt,
  })

  return {
    identity,
    claims,
    envelope,
    permissionChecks: checks,
    accessBody: coraAccessBody(envelope),
  }
}

export function filterContextForCoraRole<T>(
  role: CoraIdentity["role"],
  context: T | null | undefined,
): T | null {
  if (!context) return null
  if (role === "student") {
    return filterStudentContextForCora(context as never) as T | null
  }
  return context
}

export function recordCoraSuccess(
  prepared: PreparedCoraRequest,
  input: { prompt?: string; response?: string; dataSources?: string[]; model?: string },
): void {
  logCoraAudit({
    identity: prepared.identity,
    requestId: prepared.envelope.requestId,
    tool: prepared.envelope.invokedTool ?? "chat",
    permissionChecks: prepared.permissionChecks,
    outcome: "success",
    prompt: input.prompt,
    response: input.response,
    dataSources: input.dataSources,
    model: input.model,
  })
}

export function recordCoraError(prepared: PreparedCoraRequest, prompt?: string): void {
  logCoraAudit({
    identity: prepared.identity,
    requestId: prepared.envelope.requestId,
    tool: prepared.envelope.invokedTool ?? "chat",
    permissionChecks: prepared.permissionChecks,
    outcome: "error",
    prompt,
  })
}
