import { SYSTEM } from "../constants/faculty-native-theme"
import type { FlashcardDeck } from "./flashcards-api"

export type FlashcardDeckCardKind = "empty" | "completed" | "in_progress" | "available"

export function clampMasteryPct(value?: number): number {
  if (value == null || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function resolveFlashcardDeckKind(
  deck: FlashcardDeck,
  masteryPct?: number,
): FlashcardDeckCardKind {
  if (deck.cardCount <= 0) return "empty"
  const pct = clampMasteryPct(masteryPct)
  if (pct >= 100) return "completed"
  if (pct > 0) return "in_progress"
  return "available"
}

export function flashcardDeckStatusLabel(kind: FlashcardDeckCardKind): string {
  switch (kind) {
    case "empty":
      return "Empty deck"
    case "completed":
      return "Mastered"
    case "in_progress":
      return "In progress"
    default:
      return "Ready to study"
  }
}

export function flashcardDeckStatusColor(
  kind: FlashcardDeckCardKind,
  accentColor: string,
): string {
  switch (kind) {
    case "completed":
      return SYSTEM.green.color
    case "empty":
      return SYSTEM.gray.color
    case "in_progress":
      return SYSTEM.orange.color
    default:
      return accentColor
  }
}

export function flashcardDeckTopicLabel(deck: FlashcardDeck): string {
  const topic = deck.topic?.trim()
  if (topic) return topic
  return deck.deckKind === "course" ? "Course deck" : "My deck"
}

export function flashcardDeckMetaLine(deck: FlashcardDeck, masteryPct?: number): string {
  const count = `${deck.cardCount} card${deck.cardCount === 1 ? "" : "s"}`
  const pct = clampMasteryPct(masteryPct)
  if (deck.cardCount <= 0) return "Add cards to start studying"
  if (pct > 0) return `${count} · ${pct}% mastered`
  return count
}
