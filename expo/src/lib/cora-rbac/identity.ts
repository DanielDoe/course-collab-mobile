import type { MembershipTier } from "../../types/dashboard"
import type { InstructorScope } from "../instructor-content-api"
import type { AppSession, AdminSession, FacultySession, StudentSession } from "../session"
import { CORA_CONTEXT_SOURCES } from "./data-scope"
import { toolsForRole } from "./tools"
import type { CoraIdentity, CoraPermissionClaims, CoraRole } from "./types"

export type ResolveCoraIdentityInput = {
  session: AppSession
  membershipTier?: MembershipTier | null
  scope?: InstructorScope | null
}

function portalToRole(portal: AppSession["portal"]): CoraRole | null {
  if (portal === "student") return "student"
  if (portal === "faculty") return "faculty"
  if (portal === "admin") return "admin"
  return null
}

function studentFeaturePermissions(tier: MembershipTier | null): string[] {
  const base = ["cora:chat", "cora:learn", "cora:solve", "cora:flashcards"]
  if (!tier || tier === "Scholar") return []
  if (tier === "Explorer") return [...base, "cora:notetaker"]
  return [...base, "cora:notetaker", "cora:codebench", "cora:analytics_more"]
}

function facultyFeaturePermissions(): string[] {
  return [
    "cora:chat",
    "cora:create",
    "cora:improve",
    "cora:analyze",
    "cora:explain",
    "cora:automate",
    "cora:review",
    "cora:grade_assist",
    "cora:generate_questions",
  ]
}

function adminFeaturePermissions(): string[] {
  return [
    "cora:chat",
    "cora:executive_reports",
    "cora:enrollment_analytics",
    "cora:revenue_analytics",
    "cora:platform_configuration",
    "cora:security_center",
    "cora:ai_governance",
  ]
}

export function resolveCoraRole(session: AppSession): CoraRole | null {
  return portalToRole(session.portal)
}

export function resolveCoraIdentity(input: ResolveCoraIdentityInput): CoraIdentity | null {
  const role = portalToRole(input.session.portal)
  if (!role) return null

  if (role === "student") {
    const session = input.session as StudentSession
    return {
      role,
      portal: session.portal,
      userId: session.databaseId,
      displayName: session.name,
      institutionId: session.universityId ?? null,
      courseIds: session.courseId != null ? [session.courseId] : [],
      sectionIds: session.section ? [session.section] : [],
      membershipTier: input.membershipTier ?? null,
    }
  }

  if (role === "faculty") {
    const session = input.session as FacultySession
    const scope = input.scope
    return {
      role,
      portal: session.portal,
      userId: String(session.id),
      displayName: session.name,
      institutionId: null,
      courseIds: scope?.courseId != null ? [scope.courseId] : [],
      sectionIds: [],
      membershipTier: null,
    }
  }

  const session = input.session as AdminSession
  return {
    role,
    portal: session.portal,
    userId: session.id,
    displayName: session.name,
    institutionId: null,
    courseIds: [],
    sectionIds: [],
    membershipTier: null,
  }
}

export function buildPermissionClaims(identity: CoraIdentity): CoraPermissionClaims {
  const allowedTools = toolsForRole(identity.role)
  let featurePermissions: string[] = []

  if (identity.role === "student") {
    featurePermissions = studentFeaturePermissions(identity.membershipTier)
  } else if (identity.role === "faculty") {
    featurePermissions = facultyFeaturePermissions()
  } else {
    featurePermissions = adminFeaturePermissions()
  }

  return {
    role: identity.role,
    userId: identity.userId,
    institutionId: identity.institutionId,
    courseIds: identity.courseIds,
    sectionIds: identity.sectionIds,
    membershipTier: identity.membershipTier,
    featurePermissions,
    allowedTools,
    contextSources: CORA_CONTEXT_SOURCES[identity.role],
  }
}

export function coraPersonaLabel(role: CoraRole): string {
  if (role === "student") return "Learning Companion"
  if (role === "faculty") return "Teaching Partner"
  return "Institution Operations Officer"
}

export function coraPersonaIdentityLine(role: CoraRole): string {
  if (role === "student") {
    return "You are Cora Student — a learning companion. You are NOT a teaching assistant, administrator, or instructor."
  }
  if (role === "faculty") {
    return "You are Cora Faculty — a teaching partner and instructional designer for assigned courses only."
  }
  return "You are Cora Admin — an institution operations and platform intelligence assistant."
}
