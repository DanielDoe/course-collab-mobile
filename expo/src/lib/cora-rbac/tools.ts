import type { CoraRole, CoraToolId } from "./types"

/** Tool capability matrix — Cora never exceeds the invoking user's role. */
export const CORA_TOOL_PERMISSIONS: Record<CoraToolId, Record<CoraRole, boolean>> = {
  learn_concepts: { student: true, faculty: true, admin: true },
  step_by_step_solver: { student: true, faculty: true, admin: false },
  code_assistant: { student: true, faculty: true, admin: false },
  circuit_assistant: { student: true, faculty: true, admin: false },
  personal_flashcards: { student: true, faculty: true, admin: false },
  generate_questions: { student: false, faculty: true, admin: false },
  build_quizzes: { student: false, faculty: true, admin: false },
  grade_assistance: { student: false, faculty: true, admin: false },
  student_analytics: { student: true, faculty: true, admin: true },
  faculty_analytics: { student: false, faculty: true, admin: true },
  enrollment_analytics: { student: false, faculty: false, admin: true },
  revenue_analytics: { student: false, faculty: false, admin: true },
  platform_configuration: { student: false, faculty: false, admin: true },
  security_center: { student: false, faculty: false, admin: true },
  ai_governance: { student: false, faculty: false, admin: true },
  executive_reports: { student: false, faculty: false, admin: true },
  faculty_automation: { student: false, faculty: true, admin: false },
  chat: { student: true, faculty: true, admin: true },
}

export function toolsForRole(role: CoraRole): CoraToolId[] {
  return (Object.keys(CORA_TOOL_PERMISSIONS) as CoraToolId[]).filter(
    (tool) => CORA_TOOL_PERMISSIONS[tool][role],
  )
}

export function canRoleUseTool(role: CoraRole, tool: CoraToolId): boolean {
  return CORA_TOOL_PERMISSIONS[tool]?.[role] ?? false
}

export function toolLabel(tool: CoraToolId): string {
  const labels: Record<CoraToolId, string> = {
    learn_concepts: "Learn Concepts",
    step_by_step_solver: "Step-by-Step Solver",
    code_assistant: "Code Assistant",
    circuit_assistant: "Circuit Assistant",
    personal_flashcards: "Propose flashcards",
    generate_questions: "Generate Questions",
    build_quizzes: "Build Quizzes",
    grade_assistance: "Grade Assistance",
    student_analytics: "Student Analytics",
    faculty_analytics: "Faculty Analytics",
    enrollment_analytics: "Enrollment Analytics",
    revenue_analytics: "Revenue Analytics",
    platform_configuration: "Platform Configuration",
    security_center: "Security Center",
    ai_governance: "AI Governance",
    executive_reports: "Executive Reports",
    faculty_automation: "Faculty Automation",
    chat: "Chat",
  }
  return labels[tool] ?? tool
}
