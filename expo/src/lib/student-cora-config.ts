import type { Ionicons } from "@/components/icons/AppIcon"
import { CORA_TAGLINE } from "./cora-constants"
import { CORA_HOME_QUICK_ACTIONS, CORA_SECTIONS, type CoraSectionId } from "./cora-nav-config"

export const STUDENT_CORA_GREETING = "What would you like to accomplish today?"
export const STUDENT_CORA_TAGLINE = CORA_TAGLINE

export type StudentCoraCapabilityId = string

export type StudentCoraCapability = {
  id: StudentCoraCapabilityId
  label: string
  tagline: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  section: CoraSectionId
  toolId?: string
  examplePrompts: string[]
}

const QUICK_ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "explain-problem": "help-circle-outline",
  "walk-circuit": "git-network-outline",
  "help-code": "code-slash-outline",
  "prepare-exam": "flag-outline",
  "review-homework": "search-outline",
  "generate-flashcards": "layers-outline",
  "summarize-lecture": "document-text-outline",
  "create-study-plan": "calendar-outline",
}

const QUICK_ACTION_PROMPTS: Record<string, string[]> = {
  "explain-problem": [
    "Explain this homework problem step by step",
    "Why is my answer wrong for this question?",
    "Break down the key concepts I need before I can solve this",
    "Show me a similar worked example I can follow",
    "What common mistakes should I watch for on problems like this?",
    "Help me check my reasoning without giving away the final answer",
  ],
  "walk-circuit": [
    "Walk me through this circuit analysis step by step",
    "Explain the voltage and current in each branch",
    "Set up nodal or mesh equations for this circuit",
    "Find the equivalent resistance seen by the source",
    "Explain how changing one resistor affects the rest of the circuit",
    "Check my circuit analysis and point out where I went wrong",
  ],
  "help-code": [
    "Help me debug this code and explain what's going wrong",
    "Trace through this program and show me the output",
    "Explain this algorithm line by line",
    "Suggest a cleaner way to structure this solution",
    "Walk through a sample input and show variable values at each step",
    "Review my code for logic errors and edge cases",
  ],
  "prepare-exam": [
    "Help me prepare for my upcoming exam with a focused review plan",
    "Quiz me on the topics most likely to appear on the exam",
    "What should I review first based on my weak areas?",
    "Give me a 30-minute warm-up drill before the exam",
    "Summarize the must-know formulas and definitions for this exam",
    "Build a last-week checklist so I don't miss anything important",
  ],
  "review-homework": [
    "Review my homework and point out gaps in my reasoning",
    "Check my work and suggest concrete improvements",
    "Compare my approach to the method my instructor expects",
    "Tell me which steps are correct and which need rework",
    "Help me rewrite my explanation more clearly",
    "Flag anything that would lose partial credit",
  ],
  "generate-flashcards": [
    "Generate flashcards from my latest lecture material",
    "Create flashcards for the concepts I'm struggling with most",
    "Make cards focused on definitions I keep mixing up",
    "Build a deck from this week's practice problems",
    "Turn my lecture notes into front/back flashcard pairs",
    "Prioritize flashcards for topics that show up on assessments",
  ],
  "summarize-lecture": [
    "Summarize the key ideas from my latest lecture",
    "Build a glossary of important terms from this week's lectures",
    "Turn this lecture into a short outline I can review tonight",
    "List the formulas and when to use each one",
    "Highlight common exam traps from this material",
    "Create a one-page cheat sheet from the lecture",
  ],
  "create-study-plan": [
    "Create a daily study plan for the next two weeks",
    "Build an exam countdown schedule with daily focus topics",
    "Balance lectures, practice, and flashcards for this week",
    "Plan study blocks around my upcoming deadlines",
    "Suggest what to review each day before my next exam",
    "Adjust my plan if I'm behind on practice and readings",
  ],
}

export const STUDENT_CORA_CAPABILITIES: StudentCoraCapability[] = CORA_HOME_QUICK_ACTIONS.map((action) => ({
  id: action.id,
  label: action.title,
  tagline: action.description,
  description: action.description,
  icon: QUICK_ACTION_ICONS[action.id] ?? "sparkles-outline",
  section: action.section,
  toolId: action.toolId,
  examplePrompts: QUICK_ACTION_PROMPTS[action.id] ?? [`Help me with ${action.title.toLowerCase()}`],
}))

export type StudentCoraExploreItem = {
  id: string
  label: string
  tagline: string
  icon: keyof typeof Ionicons.glyphMap
  section: CoraSectionId
}

const EXPLORE_SECTIONS: CoraSectionId[] = ["learn", "code", "insights", "study-plan", "tools", "preferences"]

export const STUDENT_CORA_EXPLORE: StudentCoraExploreItem[] = EXPLORE_SECTIONS.map((sectionId) => {
  const section = CORA_SECTIONS.find((item) => item.id === sectionId)
  return {
    id: sectionId,
    label: section?.label ?? sectionId,
    tagline:
      sectionId === "learn"
        ? "Lecture summaries, flashcards, and quizzes"
        : sectionId === "code"
          ? "CodeBench programming workspace"
          : sectionId === "insights"
            ? "Topic mastery and activity stats"
            : sectionId === "study-plan"
              ? "Daily focus and exam countdown"
              : sectionId === "tools"
                ? "Flashcards, exports, and learning tools"
                : "Learning goals and Cora settings",
    icon: section?.icon ?? "sparkles-outline",
    section: sectionId,
  }
})

export function studentCoraCapability(id: StudentCoraCapabilityId): StudentCoraCapability {
  return (
    STUDENT_CORA_CAPABILITIES.find((capability) => capability.id === id) ?? {
      id,
      label: id,
      tagline: "",
      description: "",
      icon: "sparkles-outline",
      section: "workspace",
      examplePrompts: [],
    }
  )
}
