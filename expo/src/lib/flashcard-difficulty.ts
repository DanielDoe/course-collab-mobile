export type FlashcardDifficulty = "easy" | "medium" | "hard" | "very_hard"

export const FLASHCARD_DIFFICULTY_VALUES: FlashcardDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "very_hard",
]

export function normalizeFlashcardDifficulty(raw?: string | null): FlashcardDifficulty {
  const value = String(raw ?? "medium")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  if (value === "very_hard" || value === "veryhard" || value === "expert") return "very_hard"
  if (value === "easy") return "easy"
  if (value === "hard") return "hard"
  return "medium"
}

export function flashcardDifficultyLabel(difficulty: FlashcardDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "Easy"
    case "hard":
      return "Hard"
    case "very_hard":
      return "Very hard"
    default:
      return "Medium"
  }
}
