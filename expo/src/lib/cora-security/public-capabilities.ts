/**
 * Product-level capability descriptions.
 * Internal tool names, routes, and service mappings stay out of user-visible text.
 */

import { CORA_TOOL_PERMISSIONS, toolLabel } from "../cora-rbac/tools"
import type { CoraRole, CoraToolId } from "../cora-rbac/types"
import { ADMIN_CORA_MODULE_REGISTRY } from "../cora/admin-module-registry"
import { FACULTY_CORA_MODULE_REGISTRY } from "../cora/faculty-module-registry"
import { STUDENT_CORA_MODULE_REGISTRY } from "../cora/student-module-registry"
import type { CoraSecurityActor } from "./types"

export type PublicCoraCapability = {
  id: string
  label: string
  description: string
}

const CAREER_PUBLIC_CAPABILITIES: PublicCoraCapability[] = [
  {
    id: "career_coaching",
    label: "Career coaching",
    description: "I can help with career exploration, interview practice, and professional writing in your career workspace.",
  },
]

const PRODUCT_DESCRIPTIONS: Partial<Record<CoraToolId, string>> = {
  chat: "I can answer questions using the CourseCollab features available to your account.",
  learn_concepts: "I can help explain course concepts you are allowed to study.",
  step_by_step_solver: "I can walk through problems you share.",
  code_assistant: "I can help with coding practice in tools available to your plan.",
  circuit_assistant: "I can help with circuit practice in tools available to your plan.",
  personal_flashcards: "I can help you create your own flashcards.",
  generate_questions: "I can help instructors draft questions for assigned courses.",
  build_quizzes: "I can help instructors assemble assessments from authorized banks.",
  grade_assistance: "I can help instructors review work in their assigned courses.",
  student_analytics: "I can summarize your own learning progress.",
  faculty_analytics: "I can summarize teaching analytics for assigned courses.",
  enrollment_analytics: "I can summarize institution enrollment analytics your admin role may view.",
  revenue_analytics: "I can summarize finance analytics your admin role may view.",
  platform_configuration: "I can explain product settings your admin role is authorized to manage.",
  security_center: "I can explain product-level security settings your admin role is authorized to manage.",
  ai_governance: "I can explain AI governance controls your admin role is authorized to manage.",
  executive_reports: "I can draft operational summaries from authorized institution dashboards.",
  faculty_automation: "I can help schedule authorized teaching automations.",
}

export function publicCapabilitiesForRole(actor: CoraSecurityActor): PublicCoraCapability[] {
  if (actor === "career") return CAREER_PUBLIC_CAPABILITIES

  const tools = (Object.keys(CORA_TOOL_PERMISSIONS) as CoraToolId[]).filter(
    (tool) => CORA_TOOL_PERMISSIONS[tool][actor],
  )
  return tools.map((id) => ({
    id,
    label: toolLabel(id),
    description: PRODUCT_DESCRIPTIONS[id] ?? `I can help with ${toolLabel(id).toLowerCase()}.`,
  }))
}

export function publicModuleLabelsForRole(actor: CoraSecurityActor): string[] {
  if (actor === "student") {
    return Object.values(STUDENT_CORA_MODULE_REGISTRY).map((mod) => mod.label)
  }
  if (actor === "faculty") {
    return Object.values(FACULTY_CORA_MODULE_REGISTRY)
      .filter((mod) => mod.risk && Object.keys(mod.risk).length > 0)
      .map((mod) => mod.label)
  }
  if (actor === "admin") {
    return Object.values(ADMIN_CORA_MODULE_REGISTRY)
      .filter((mod) => mod.status === "live")
      .map((mod) => mod.label)
  }
  return CAREER_PUBLIC_CAPABILITIES.map((cap) => cap.label)
}

/** Least-context execution packet — product labels only, no routes or schemas. */
export function selectCoraExecutionContext(input: {
  actor: CoraSecurityActor
  moduleLabel?: string
}): { actor: CoraSecurityActor; capabilities: PublicCoraCapability[] } {
  const all = publicCapabilitiesForRole(input.actor)
  if (!input.moduleLabel) {
    return { actor: input.actor, capabilities: all.slice(0, 4) }
  }
  const needle = input.moduleLabel.toLowerCase()
  const matched = all.filter(
    (cap) => cap.label.toLowerCase().includes(needle) || cap.id.toLowerCase().includes(needle),
  )
  return { actor: input.actor, capabilities: matched.length > 0 ? matched : all.slice(0, 2) }
}

export function describeCoraCapabilityForUser(actor: CoraSecurityActor, tool: CoraToolId | string): string {
  if (actor === "career") {
    return "I can help through CourseCollab's authorized career tools."
  }
  const found = publicCapabilitiesForRole(actor).find((cap) => cap.id === tool)
  return found?.description ?? "I can help through CourseCollab's authorized course tools."
}

export { type CoraRole }
