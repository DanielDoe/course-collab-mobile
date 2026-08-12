import type { MembershipTier } from "../../types/dashboard"
import type { LoginPortal } from "../../constants/portals"

/** Cora persona — never merges scopes across roles. */
export type CoraRole = "student" | "faculty" | "admin"

export type CoraToolId =
  | "learn_concepts"
  | "step_by_step_solver"
  | "code_assistant"
  | "circuit_assistant"
  | "create_flashcards"
  | "generate_questions"
  | "build_quizzes"
  | "grade_assistance"
  | "student_analytics"
  | "faculty_analytics"
  | "enrollment_analytics"
  | "revenue_analytics"
  | "platform_configuration"
  | "security_center"
  | "ai_governance"
  | "executive_reports"
  /** Faculty-only server actions (announcement / flashcard automations). */
  | "faculty_automation"
  /** Generic conversational turn — scoped by role, not a privileged tool. */
  | "chat"

export type CoraContextSource =
  | "own_enrollments"
  | "released_course_materials"
  | "own_learning_history"
  | "published_lectures"
  | "assigned_course_content"
  | "instructor_assessments"
  | "section_student_performance"
  | "teaching_analytics"
  | "institutional_dashboards"
  | "operational_analytics"
  | "financial_governance"

export type CoraPermissionClaims = {
  role: CoraRole
  userId: string
  institutionId: number | null
  courseIds: number[]
  sectionIds: string[]
  membershipTier: MembershipTier | null
  featurePermissions: string[]
  allowedTools: CoraToolId[]
  contextSources: CoraContextSource[]
}

export type CoraIdentity = {
  role: CoraRole
  userId: string
  displayName?: string
  institutionId: number | null
  courseIds: number[]
  sectionIds: string[]
  membershipTier: MembershipTier | null
  portal: LoginPortal
}

/** Sent with every AI request — backend must enforce the same rules. */
export type CoraAccessEnvelope = {
  version: 1
  requestId: string
  clientTimestamp: string
  role: CoraRole
  identity: {
    userId: string
    institutionId: number | null
    courseIds: number[]
    sectionIds: string[]
    membershipTier: MembershipTier | null
  }
  claims: CoraPermissionClaims
  /** Human-readable checks performed on the client before send. */
  permissionChecks: string[]
  invokedTool?: CoraToolId
  promptHash?: string
}

export type CoraAuditOutcome = "success" | "blocked" | "error"

export type CoraAuditEntry = {
  requestId: string
  userId: string
  role: CoraRole
  institutionId: number | null
  timestamp: string
  courseIds: number[]
  sectionIds: string[]
  tool: CoraToolId
  dataSources: string[]
  promptHash: string
  responseHash?: string
  tokensConsumed?: number
  model?: string
  outcome: CoraAuditOutcome
  permissionChecks: string[]
  blockReason?: string
}

export class CoraAccessDeniedError extends Error {
  readonly tool: CoraToolId
  readonly role: CoraRole

  constructor(tool: CoraToolId, role: CoraRole, message?: string) {
    super(message ?? `Cora cannot use "${tool}" for role "${role}".`)
    this.name = "CoraAccessDeniedError"
    this.tool = tool
    this.role = role
  }
}
