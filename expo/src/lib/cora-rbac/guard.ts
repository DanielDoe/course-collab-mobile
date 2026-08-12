import { isFacultyCoraRestrictedModule } from "./data-scope"
import { canRoleUseTool } from "./tools"
import { CoraAccessDeniedError, type CoraIdentity, type CoraPermissionClaims, type CoraToolId } from "./types"

export type CoraGuardResult =
  | { allowed: true; checks: string[] }
  | { allowed: false; checks: string[]; reason: string; tool: CoraToolId }

export function canUseTool(claims: CoraPermissionClaims, tool: CoraToolId): boolean {
  return claims.allowedTools.includes(tool) && canRoleUseTool(claims.role, tool)
}

export function guardToolAccess(
  identity: CoraIdentity,
  claims: CoraPermissionClaims,
  tool: CoraToolId,
): CoraGuardResult {
  const checks: string[] = [
    `role=${identity.role}`,
    `userId=${identity.userId}`,
    `tool=${tool}`,
  ]

  if (identity.role === "student" && tool !== "chat") {
    if (!identity.membershipTier || identity.membershipTier === "Scholar") {
      if (tool !== "learn_concepts") {
        checks.push("membership=Scholar_blocked")
        return {
          allowed: false,
          checks,
          reason: "Explorer or Trailblazer membership is required for this Cora tool.",
          tool,
        }
      }
    }
    if (tool === "code_assistant" && identity.membershipTier !== "Trailblazer") {
      checks.push("membership=Trailblazer_required_for_code")
      return {
        allowed: false,
        checks,
        reason: "CodeBench Cora requires Trailblazer membership.",
        tool,
      }
    }
  }

  if (identity.role === "faculty" && identity.courseIds.length === 0 && tool !== "chat") {
    checks.push("course_scope=missing")
    return {
      allowed: false,
      checks,
      reason: "Select a course before using Cora teaching tools.",
      tool,
    }
  }

  if (!canUseTool(claims, tool)) {
    checks.push("tool=denied_by_rbac")
    return {
      allowed: false,
      checks,
      reason: `Your role (${identity.role}) cannot use ${tool}.`,
      tool,
    }
  }

  checks.push("tool=allowed")
  return { allowed: true, checks }
}

export function assertToolAccess(
  identity: CoraIdentity,
  claims: CoraPermissionClaims,
  tool: CoraToolId,
): string[] {
  const result = guardToolAccess(identity, claims, tool)
  if (!result.allowed) {
    throw new CoraAccessDeniedError(tool, identity.role, result.reason)
  }
  return result.checks
}

export function guardFacultyModuleLink(moduleId: string): boolean {
  return !isFacultyCoraRestrictedModule(moduleId)
}

export function isCoraAccessDeniedError(err: unknown): err is CoraAccessDeniedError {
  return err instanceof CoraAccessDeniedError
}
