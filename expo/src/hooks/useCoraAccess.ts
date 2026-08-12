import { useMemo } from "react"
import type { MembershipTier } from "../types/dashboard"
import { useSession } from "../context/SessionProvider"
import type { InstructorScope } from "../lib/instructor-content-api"
import {
  buildPermissionClaims,
  canUseTool,
  guardToolAccess,
  prepareCoraRequest,
  resolveCoraIdentity,
  type CoraToolId,
} from "../lib/cora-rbac"
import { isCoraAccessDeniedError } from "../lib/cora-rbac/guard"

export type UseCoraAccessOptions = {
  membershipTier?: MembershipTier | null
  scope?: InstructorScope | null
}

export function useCoraAccess(options: UseCoraAccessOptions = {}) {
  const { session } = useSession()

  return useMemo(() => {
    if (!session) {
      return {
        available: false as const,
        identity: null,
        claims: null,
        role: null,
        canUseTool: (_tool: CoraToolId) => false,
        guardTool: (_tool: CoraToolId) => ({
          allowed: false as const,
          checks: [],
          reason: "Not signed in",
          tool: "chat" as CoraToolId,
        }),
        prepareRequest: (_tool: CoraToolId, _prompt?: string) => {
          throw new Error("Not signed in")
        },
      }
    }

    const identity = resolveCoraIdentity({
      session,
      membershipTier: options.membershipTier,
      scope: options.scope,
    })

    if (!identity) {
      return {
        available: false as const,
        identity: null,
        claims: null,
        role: null,
        canUseTool: (_tool: CoraToolId) => false,
        guardTool: (_tool: CoraToolId) => ({
          allowed: false as const,
          checks: [],
          reason: "Cora is not available for this portal",
          tool: "chat" as CoraToolId,
        }),
        prepareRequest: (_tool: CoraToolId, _prompt?: string) => {
          throw new Error("Cora is not available for this portal")
        },
      }
    }

    const claims = buildPermissionClaims(identity)

    return {
      available: true as const,
      identity,
      claims,
      role: identity.role,
      canUseTool: (tool: CoraToolId) => canUseTool(claims, tool),
      guardTool: (tool: CoraToolId) => guardToolAccess(identity, claims, tool),
      prepareRequest: (tool: CoraToolId, prompt?: string) =>
        prepareCoraRequest({
          session,
          tool,
          prompt,
          membershipTier: options.membershipTier,
          scope: options.scope,
        }),
    }
  }, [session, options.membershipTier, options.scope])
}

export { isCoraAccessDeniedError }
