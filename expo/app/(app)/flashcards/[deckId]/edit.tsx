import { useLocalSearchParams } from "expo-router"
import { FlashcardDeckEditorScreen } from "../../../../src/components/flashcards/FlashcardDeckEditorScreen"
import { FlashcardInvalidRoute } from "../../../../src/components/flashcards/FlashcardInvalidRoute"

export default function FlashcardEditorRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>()
  const deckNum = typeof deckId === "string" ? Number(deckId) : NaN

  if (!Number.isFinite(deckNum) || deckNum < 1) {
    return <FlashcardInvalidRoute />
  }

  return <FlashcardDeckEditorScreen />
}
