import { useLocalSearchParams } from "expo-router"
import { FlashcardInvalidRoute } from "../../../src/components/flashcards/FlashcardInvalidRoute"
import { FlashcardStudyScreen } from "../../../src/components/flashcards/FlashcardStudyScreen"

export default function FlashcardStudyRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>()
  const deckNum = typeof deckId === "string" ? Number(deckId) : NaN

  if (!Number.isFinite(deckNum) || deckNum < 1) {
    return <FlashcardInvalidRoute />
  }

  return <FlashcardStudyScreen />
}
