/**
 * Bind every Cora execution to the authenticated identity.
 * Model-generated IDs cannot expand course, section, or user scope.
 */

import type { CoraIdentity } from "../cora-rbac/types"
import { CORA_SAFE_SCOPE_REFUSAL } from "./types"

export type CoraRequestedResource = {
  userId?: string | null
  studentId?: string | number | null
  courseId?: number | null
  sectionId?: string | null
}

export type CoraResourceScopeResult =
  | { allowed: true; bound: { userId: string; courseIds: number[]; sectionIds: string[] } }
  | { allowed: false; reason: string }

function sameId(left: string | number | null | undefined, right: string | number | null | undefined): boolean {
  if (left == null || right == null) return false
  return String(left) === String(right)
}

/**
 * Authorization gateway for resource arguments.
 * Faculty/admin may address students in their authorized scope, but cannot
 * invent a course or institution they do not hold.
 */
export function bindCoraResourceScope(
  identity: Pick<CoraIdentity, "role" | "userId" | "courseIds" | "sectionIds">,
  requested: CoraRequestedResource = {},
): CoraResourceScopeResult {
  const bound = {
    userId: identity.userId,
    courseIds: [...identity.courseIds],
    sectionIds: [...identity.sectionIds],
  }

  if (identity.role === "student" || identity.role === "faculty") {
    if (requested.courseId != null && identity.courseIds.length > 0) {
      if (!identity.courseIds.includes(requested.courseId)) {
        return { allowed: false, reason: CORA_SAFE_SCOPE_REFUSAL }
      }
    }
    if (requested.sectionId && identity.sectionIds.length > 0) {
      if (!identity.sectionIds.includes(requested.sectionId)) {
        return { allowed: false, reason: CORA_SAFE_SCOPE_REFUSAL }
      }
    }
  }

  if (identity.role === "student") {
    if (requested.userId && !sameId(requested.userId, identity.userId)) {
      return { allowed: false, reason: CORA_SAFE_SCOPE_REFUSAL }
    }
    if (requested.studentId != null && !sameId(requested.studentId, identity.userId)) {
      return { allowed: false, reason: CORA_SAFE_SCOPE_REFUSAL }
    }
  }

  return { allowed: true, bound }
}

export function assertCoraResourceScope(
  identity: Pick<CoraIdentity, "role" | "userId" | "courseIds" | "sectionIds">,
  requested?: CoraRequestedResource,
): CoraResourceScopeResult["allowed"] extends true ? true : never {
  const result = bindCoraResourceScope(identity, requested)
  if (!result.allowed) {
    throw new Error(result.reason)
  }
  return true as never
}
