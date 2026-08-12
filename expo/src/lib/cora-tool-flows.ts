import type { CoraToolCacheKey } from "./cora-tool-results-cache"

export type CoraToolFlowId =
  | "summarize"
  | "glossary"
  | "flashcards"
  | "quiz"
  | "explain"
  | "review-work"
  | "create-resource"
  | "export-notes"

export type FlashcardToolVariant = "explain" | "memorize" | "breakdown" | "connect"
export type QuizToolVariant = "coach" | "weak-areas" | "rapid"
export type ConceptToolVariant = "explain" | "review" | "resource"

export type CoraToolLaunchPayload = {
  toolId: CoraToolFlowId
  variant: string
  userMessage: string
  contextBlock: string
  cacheKey: CoraToolCacheKey
  sourceLabel: string
  cachedResult?: string
  threadTitle?: string
}

export const FLASHCARD_TOOL_ACTIONS: Array<{
  id: FlashcardToolVariant
  label: string
  subtitle: string
  icon: "bulb-outline" | "sparkles-outline" | "git-branch-outline" | "link-outline"
}> = [
  {
    id: "explain",
    label: "Explain it",
    subtitle: "Plain-language explanation with examples",
    icon: "bulb-outline",
  },
  {
    id: "memorize",
    label: "Memory tricks",
    subtitle: "Mnemonics and easy ways to remember",
    icon: "sparkles-outline",
  },
  {
    id: "breakdown",
    label: "Break it down",
    subtitle: "Step-by-step deconstruction of the concept",
    icon: "git-branch-outline",
  },
  {
    id: "connect",
    label: "Connect ideas",
    subtitle: "Link this card to other course topics",
    icon: "link-outline",
  },
]

export const QUIZ_TOOL_ACTIONS: Array<{
  id: QuizToolVariant
  label: string
  subtitle: string
  icon: "school-outline" | "trending-down-outline" | "flash-outline"
}> = [
  {
    id: "coach",
    label: "Guided quiz",
    subtitle: "Cora quizzes you one question at a time with hints",
    icon: "school-outline",
  },
  {
    id: "weak-areas",
    label: "Weak areas",
    subtitle: "Focus on topics where your accuracy is lowest",
    icon: "trending-down-outline",
  },
  {
    id: "rapid",
    label: "Rapid review",
    subtitle: "Quick conceptual questions without scoring pressure",
    icon: "flash-outline",
  },
]

export function buildSummarizePrompt(label: string): string {
  return `Summarize "${label}" for exam prep. Use bullet points, call out definitions, formulas, and common exam traps.`
}

export function buildGlossaryPrompt(label: string): string {
  return `Build a glossary for "${label}". For each term: definition, why it matters, and one common misconception to avoid.`
}

export function buildFlashcardPrompt(variant: FlashcardToolVariant, label: string): string {
  switch (variant) {
    case "explain":
      return `Explain this flashcard in simple terms with a concrete example:\n${label}`
    case "memorize":
      return `Give me memory tricks and mnemonics to remember this flashcard:\n${label}`
    case "breakdown":
      return `Break this flashcard concept into smaller steps I can study in order:\n${label}`
    case "connect":
      return `Show how this flashcard connects to other ideas in my course and what to study next:\n${label}`
  }
}

export function buildQuizPrompt(variant: QuizToolVariant, label: string): string {
  switch (variant) {
    case "coach":
      return `Quiz me on "${label}" using the practice questions provided. Ask one question at a time, wait for my answer, then give brief feedback before the next.`
    case "weak-areas":
      return `I'm weak on "${label}". Start with the concepts I'm most likely to miss, then quiz me with targeted questions.`
    case "rapid":
      return `Rapid review for "${label}": ask short conceptual questions one at a time. Keep feedback to one sentence between questions.`
  }
}

export function buildExplainConceptPrompt(concept: string): string {
  return `Explain this concept step by step with examples and a quick self-check question at the end:\n\n${concept.trim()}`
}

export function buildReviewWorkPrompt(description: string): string {
  return `Review my work below. Point out gaps, errors, and concrete improvements. Be constructive and specific.\n\n${description.trim()}`
}

export function buildCreateResourcePrompt(source: string): string {
  return `Help me create a study resource (outline, notes, or flashcard set) from this material:\n\n${source.trim()}`
}

export function cacheKeyForLecture(
  toolId: "summarize" | "glossary",
  lectureId: number,
  contentHash: string,
): CoraToolCacheKey {
  return {
    toolId,
    variant: "default",
    resourceKey: `lecture:${lectureId}`,
    contentHash,
  }
}

export function cacheKeyForFlashcard(
  variant: FlashcardToolVariant,
  deckId: number,
  cardId: number,
  contentHash: string,
): CoraToolCacheKey {
  return {
    toolId: "flashcards",
    variant,
    resourceKey: `deck:${deckId}:card:${cardId}`,
    contentHash,
  }
}

export function cacheKeyForQuiz(
  variant: QuizToolVariant,
  topicName: string,
  contentHash: string,
): CoraToolCacheKey {
  return {
    toolId: "quiz",
    variant,
    resourceKey: `topic:${topicName}`,
    contentHash,
  }
}
