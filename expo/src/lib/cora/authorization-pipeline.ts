/**
 * Unified Cora authorization pipeline stages.
 * The LLM cannot skip any stage — resolvers + confirm runtime enforce this.
 */

export const CORA_AUTHORIZATION_PIPELINE = [
  "authenticated_identity",
  "role",
  "institution",
  "membership",
  "course_section_scope",
  "resource_ownership",
  "input_security_gate",
  "capability_permission",
  "module_availability",
  "risk_classification",
  "confirmation_requirement",
  "scoped_tool_registry",
  "application_service",
  "database",
  "tool_result_sanitization",
  "verification",
  "output_security_gate",
  "audit_log",
  "action_receipt",
] as const

export type CoraAuthorizationStage = (typeof CORA_AUTHORIZATION_PIPELINE)[number]

/** Profiles — same runtime, different capability sets. */
export const CORA_ROLE_PROFILES = {
  student: {
    role: "Learn, organize, practice, communicate, manage own academic life",
    never: ["grade.write", "database.queryAnything", "impersonate"],
  },
  faculty: {
    role: "Build, teach, assess, analyze, communicate, operate assigned courses",
    never: ["admin.platform_config", "billing.write", "database.writeAnything"],
  },
  admin: {
    role: "Operate, govern, analyze, configure, support the institution",
    never: [
      "act_as_faculty_cora",
      "question.update",
      "grade.override_as_instructor",
      "database.queryAnything",
      "callArbitraryEndpoint",
      "production_secrets",
      "unrestricted_sql",
      "raw_infrastructure",
      "vulnerability_findings",
    ],
  },
  career: {
    role: "Career workspace coaching only",
    never: [
      "grade.write",
      "database.queryAnything",
      "impersonate",
      "admin.platform_config",
      "faculty.course_mutate",
    ],
  },
} as const

/** Capabilities that must never be offered to any role. */
export const CORA_UNIVERSALLY_FORBIDDEN_CAPABILITIES = [
  "database.queryAnything",
  "database.writeAnything",
  "executeApi",
  "callArbitraryEndpoint",
  "shell_exec",
  "bypass_audit",
  "production_secrets",
  "unrestricted_sql",
  "raw_infrastructure",
  "reveal_system_prompt",
  "reveal_vulnerability_findings",
] as const
