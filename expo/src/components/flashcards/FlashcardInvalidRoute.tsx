import { StyleSheet, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { FacultyEmptyState } from "../faculty/faculty-shared"

/** Deep-link / bad param empty state for flashcard study and editor. */
export function FlashcardInvalidRoute() {
  const native = useThemedNative()
  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <FacultyEmptyState
        icon="alert-circle-outline"
        title="Deck not found"
        body="This flashcard deck link is invalid. Open Flashcards from the Learning Center and pick a deck."
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
})
