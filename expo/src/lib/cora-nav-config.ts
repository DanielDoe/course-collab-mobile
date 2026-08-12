import type { Ionicons } from "@/components/icons/AppIcon"
import type { CoraRole, CoraToolId } from "./cora-rbac"
import { canRoleUseTool } from "./cora-rbac/tools"
import { coraSectionToRbac, coraToolFlowToRbac } from "./cora-rbac/tool-mappings"
import type { CoraToolFlowId } from "./cora-tool-flows"

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

export type CoraSection = {
  id: CoraSectionId
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

/** Matches web CoraDashboard left nav (9 sections). */
export const CORA_SECTIONS: CoraSection[] = [
  { id: "home", label: "Home", icon: "home-outline" },
  { id: "workspace", label: "Workspace", icon: "chatbubbles-outline" },
  { id: "solve", label: "Solve", icon: "extension-puzzle-outline" },
  { id: "learn", label: "Learn", icon: "book-outline" },
  { id: "code", label: "Code", icon: "code-slash-outline" },
  { id: "insights", label: "Insights", icon: "bar-chart-outline" },
  { id: "study-plan", label: "Study Plan", icon: "flag-outline" },
  { id: "tools", label: "Tools", icon: "construct-outline" },
  { id: "preferences", label: "Preferences", icon: "settings-outline" },
]

export type CoraHomeQuickAction = {
  id: string
  title: string
  description: string
  section: CoraSectionId
  toolId?: string
}

/** Web home quick-action grid (b.Y). */
export const CORA_HOME_QUICK_ACTIONS: CoraHomeQuickAction[] = [
  {
    id: "explain-problem",
    title: "Explain a Problem",
    description: "Break down any question step by step",
    section: "solve",
  },
  {
    id: "walk-circuit",
    title: "Walk Me Through a Circuit",
    description: "Animated circuit analysis",
    section: "solve",
    toolId: "circuit",
  },
  {
    id: "help-code",
    title: "Help Me Code",
    description: "Debug, trace, and visualize execution",
    section: "code",
  },
  {
    id: "prepare-exam",
    title: "Prepare Me for an Exam",
    description: "Adaptive review and practice",
    section: "study-plan",
  },
  {
    id: "review-homework",
    title: "Review My Homework",
    description: "Course-aware feedback",
    section: "learn",
  },
  {
    id: "generate-flashcards",
    title: "Generate Flashcards",
    description: "From lectures or topics",
    section: "tools",
    toolId: "flashcards",
  },
  {
    id: "summarize-lecture",
    title: "Summarize Lecture",
    description: "Notes, glossary, and quiz",
    section: "learn",
    toolId: "summarize",
  },
  {
    id: "create-study-plan",
    title: "Create Study Plan",
    description: "Daily and exam schedules",
    section: "study-plan",
  },
]

export type CoraTool = {
  id: string
  title: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  section?: CoraSectionId
  /** Native module route — opens the module screen (e.g. Lectures, Flashcards). */
  route?: string
  /** Prefilled Cora workspace prompt — starts a new chat when no route is set. */
  workspacePrompt?: string
}

/** How a tool row should behave when tapped. */
export type CoraToolPressKind = "export" | "module" | "workspace" | "section"

export function resolveCoraToolPress(tool: CoraTool): CoraToolPressKind {
  if (tool.id === "export-notes") return "export"
  if (
    tool.id === "summarize" ||
    tool.id === "glossary" ||
    tool.id === "flashcards" ||
    tool.id === "quiz" ||
    tool.id === "explain" ||
    tool.id === "review-work" ||
    tool.id === "create-resource"
  ) {
    return "module"
  }
  if (tool.workspacePrompt) return "workspace"
  if (tool.section) return "section"
  return "section"
}

export const CORA_TOOLS: CoraTool[] = [
  {
    id: "summarize",
    title: "Summarize",
    description: "Condense lecture slides into key ideas",
    icon: "document-text-outline",
    route: "/module/lectures",
    workspacePrompt:
      "Summarize the key ideas from my latest lecture. Use bullet points and highlight definitions I should remember.",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Auto-generate from any lecture section",
    icon: "layers-outline",
    route: "/module/flashcards",
    workspacePrompt:
      "Help me generate flashcards from my course material. Start with the most testable concepts.",
  },
  {
    id: "quiz",
    title: "Quiz Me",
    description: "Practice questions aligned to your course",
    icon: "help-circle-outline",
    route: "/module/practice",
    workspacePrompt:
      "Quiz me with practice questions aligned to my course. Ask one question at a time and check my understanding.",
  },
  {
    id: "glossary",
    title: "Glossary",
    description: "Terms and misconceptions flagged",
    icon: "book-outline",
    route: "/module/lectures",
    workspacePrompt:
      "Build a glossary of important terms from my course and flag common misconceptions for each term.",
  },
  {
    id: "explain",
    title: "Explain a Concept",
    description: "Teach and explain difficult ideas",
    icon: "bulb-outline",
    section: "workspace",
    workspacePrompt:
      "Help me understand a concept from my course. Break it down step by step with examples.",
  },
  {
    id: "review-work",
    title: "Review My Work",
    description: "Homework, essays, code, lab reports",
    icon: "search-outline",
    section: "workspace",
    workspacePrompt:
      "Review my work and give constructive feedback. Point out gaps and suggest concrete improvements.",
  },
  {
    id: "create-resource",
    title: "Create Resource",
    description: "Notes, outlines, and study guides",
    icon: "rocket-outline",
    section: "workspace",
    workspacePrompt:
      "Help me create a learning resource — notes, flashcards, or a study outline — from my course material.",
  },
  {
    id: "export-notes",
    title: "Export Chat to Notes",
    description: "Save workspace conversation to My Notes",
    icon: "download-outline",
    section: "workspace",
  },
]

export function isCoraSectionId(value: string): value is CoraSectionId {
  return CORA_SECTIONS.some((section) => section.id === value)
}

export type CoraPrimaryTab = "home" | "workspace" | "solve"

export function isCoraPrimaryTab(section: CoraSectionId): section is CoraPrimaryTab {
  return section === "home" || section === "workspace" || section === "solve"
}

export function getCoraSectionLabel(id: CoraSectionId): string {
  return CORA_SECTIONS.find((section) => section.id === id)?.label ?? id
}

/** Filter workspace tools to those permitted for the invoking role. */
export function filterCoraToolsForRole(role: CoraRole, tools: CoraTool[] = CORA_TOOLS): CoraTool[] {
  return tools.filter((tool) => canRoleUseTool(role, coraToolFlowToRbac(tool.id as CoraToolFlowId)))
}

export function isCoraToolAllowedForRole(role: CoraRole, toolId: string): boolean {
  return canRoleUseTool(role, coraToolFlowToRbac(toolId as CoraToolFlowId))
}

export function rbacToolForCoraSection(section: CoraSectionId): CoraToolId {
  return coraSectionToRbac(section)
}
