const MISPLACED_CIRCUIT_DECK_TITLES = new Set([
  "ac analysis essentials",
  "first-order & op-amp review",
])

const MISPLACED_CIRCUIT_TOPICS = new Set(["transient circuits", "ac analysis"])

/** Circuit-analysis flashcard decks that were seeded on ELEG programming courses by mistake. */
export function isMisplacedCircuitFlashcardDeck(item: {
  title?: string | null
  topic?: string | null
}): boolean {
  const title = String(item.title ?? "").trim().toLowerCase()
  const topic = String(item.topic ?? "").trim().toLowerCase()
  if (MISPLACED_CIRCUIT_DECK_TITLES.has(title)) return true
  if (MISPLACED_CIRCUIT_TOPICS.has(topic)) return true
  if (topic.includes("op-amp") || topic.includes("ac analysis")) return true
  return false
}

export function filterMisplacedCircuitFlashcardDecks<T extends { title?: string | null; topic?: string | null }>(
  decks: T[],
): T[] {
  return decks.filter((deck) => !isMisplacedCircuitFlashcardDeck(deck))
}
