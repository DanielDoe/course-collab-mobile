import type { FacultyCoraActionKind } from "../faculty-cora-api"
import type { FacultyCoraCapabilityId } from "../faculty-cora-config"
import type { CoraToolFlowId } from "../cora-tool-flows"
import type { CoraToolId } from "./types"

export type CoraSectionId =
  | "home"
  | "workspace"
  | "solve"
  | "learn"
  | "code"
  | "insights"
  | "study-plan"
  | "tools"
  | "preferences"

export function coraToolFlowToRbac(toolId: CoraToolFlowId): CoraToolId {
  const map: Record<CoraToolFlowId, CoraToolId> = {
    summarize: "learn_concepts",
    glossary: "learn_concepts",
    flashcards: "personal_flashcards",
    quiz: "learn_concepts",
    explain: "learn_concepts",
    "review-work": "learn_concepts",
    "create-resource": "learn_concepts",
    "export-notes": "learn_concepts",
  }
  return map[toolId] ?? "learn_concepts"
}

export function coraSectionToRbac(section: CoraSectionId): CoraToolId {
  const map: Partial<Record<CoraSectionId, CoraToolId>> = {
    solve: "step_by_step_solver",
    code: "code_assistant",
    insights: "student_analytics",
    learn: "learn_concepts",
    "study-plan": "learn_concepts",
    tools: "learn_concepts",
  }
  return map[section] ?? "chat"
}

export function facultyCapabilityToRbac(capabilityId: FacultyCoraCapabilityId): CoraToolId {
  const map: Record<FacultyCoraCapabilityId, CoraToolId> = {
    create: "generate_questions",
    improve: "generate_questions",
    analyze: "faculty_analytics",
    explain: "learn_concepts",
    automate: "faculty_automation",
    review: "grade_assistance",
    assistant: "chat",
    insights: "faculty_analytics",
  }
  return map[capabilityId] ?? "chat"
}

export function facultyActionToRbac(kind: FacultyCoraActionKind): CoraToolId {
  const map: Record<FacultyCoraActionKind, CoraToolId> = {
    generate_questions: "generate_questions",
    open_quiz_create: "build_quizzes",
    open_module: "chat",
    schedule_automation: "faculty_automation",
    import_from_course: "generate_questions",
  }
  return map[kind] ?? "chat"
}

export function coraComposerToolToRbac(toolKey: string): CoraToolId {
  if (toolKey.includes("code") || toolKey.includes("debug") || toolKey.includes("refactor")) {
    return "code_assistant"
  }
  if (toolKey.includes("circuit")) return "circuit_assistant"
  if (toolKey.includes("flashcard")) return "personal_flashcards"
  if (toolKey.includes("exam") || toolKey.includes("quiz")) return "learn_concepts"
  return "learn_concepts"
}
