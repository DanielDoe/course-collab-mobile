import type { CoraToolFlowId } from "./cora-tool-flows"

const TOOL_THREAD_PREFIX = "cora-tool-"

/** Stable thread ids — one dedicated chat per tool category. */
export const TOOL_THREAD_IDS: Record<Exclude<CoraToolFlowId, "export-notes">, string> = {
  summarize: `${TOOL_THREAD_PREFIX}summarize`,
  glossary: `${TOOL_THREAD_PREFIX}glossary`,
  flashcards: `${TOOL_THREAD_PREFIX}flashcards`,
  quiz: `${TOOL_THREAD_PREFIX}quiz`,
  explain: `${TOOL_THREAD_PREFIX}explain`,
  "review-work": `${TOOL_THREAD_PREFIX}review-work`,
  "create-resource": `${TOOL_THREAD_PREFIX}create-resource`,
}

export function getToolThreadId(toolId: CoraToolFlowId): string | null {
  if (toolId === "export-notes") return null
  return TOOL_THREAD_IDS[toolId]
}

export function isToolThreadId(threadId: string | null | undefined): boolean {
  return Boolean(threadId?.startsWith(TOOL_THREAD_PREFIX))
}

export function getToolThreadTitle(toolId: CoraToolFlowId): string {
  switch (toolId) {
    case "summarize":
      return "Summarize"
    case "glossary":
      return "Glossary"
    case "flashcards":
      return "Flashcards"
    case "quiz":
      return "Quiz Me"
    case "explain":
      return "Explain Concepts"
    case "review-work":
      return "Review My Work"
    case "create-resource":
      return "Create Resources"
    default:
      return "Cora Tools"
  }
}

/** Learn tab cards map to the same dedicated tool chats as Tools. */
export const LEARN_ACTION_TOOL_MAP = {
  lectures: "summarize",
  practice: "quiz",
  flashcards: "flashcards",
  summarize: "summarize",
} as const satisfies Record<string, CoraToolFlowId>

export type LearnActionId = keyof typeof LEARN_ACTION_TOOL_MAP

export function learnActionToToolId(actionId: string): CoraToolFlowId | null {
  if (actionId in LEARN_ACTION_TOOL_MAP) {
    return LEARN_ACTION_TOOL_MAP[actionId as LearnActionId]
  }
  return null
}

export function learnActionMeta(actionId: LearnActionId): string {
  switch (actionId) {
    case "lectures":
      return "Choose lecture"
    case "practice":
      return "Choose topic"
    case "flashcards":
      return "Choose deck"
    case "summarize":
      return "Choose lecture"
    default:
      return "Start"
  }
}
