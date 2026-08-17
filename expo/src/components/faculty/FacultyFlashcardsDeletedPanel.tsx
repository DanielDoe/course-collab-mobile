import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import type { FlashcardCard, FlashcardDeck } from "../../lib/flashcards-api"
import { instructorFlashcardsApi } from "../../lib/instructor-content-api"
import type { InstructorScope } from "../../lib/instructor-content-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FACULTY_FLASHCARD_COLOR } from "../../lib/faculty-flashcard-theme"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultySearchToolbar } from "./faculty-module-shell"

type DeletedCard = FlashcardCard & {
  deckTitle?: string
  deckTopic?: string | null
  deletedAt?: string
}

type Props = {
  scope: InstructorScope
  decks: FlashcardDeck[]
  cards: DeletedCard[]
  onChanged: () => Promise<void>
}

type TypeFilter = "all" | "decks" | "cards"

export function FacultyFlashcardsDeletedPanel({ scope, decks, cards, onChanged }: Props) {
  const { native, tokens, type, styles: moduleStyles } = useModuleTheme()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [busy, setBusy] = useState(false)

  const filteredDecks = useMemo(() => {
    if (typeFilter === "cards") return []
    const q = search.trim().toLowerCase()
    if (!q) return decks
    return decks.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.topic ?? "").toLowerCase().includes(q),
    )
  }, [decks, search, typeFilter])

  const filteredCards = useMemo(() => {
    if (typeFilter === "decks") return []
    const q = search.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(
      (c) =>
        c.frontText.toLowerCase().includes(q) ||
        c.backText.toLowerCase().includes(q) ||
        (c.deckTitle ?? "").toLowerCase().includes(q),
    )
  }, [cards, search, typeFilter])

  async function restoreDecks(deckIds: number[]) {
    if (deckIds.length === 0 || busy) return
    setBusy(true)
    try {
      await instructorFlashcardsApi.restoreDeleted(scope, { deckIds })
      await onChanged()
    } catch (err) {
      AppAlert.alert("Restore failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function restoreCards(cardIds: number[]) {
    if (cardIds.length === 0 || busy) return
    setBusy(true)
    try {
      await instructorFlashcardsApi.restoreDeleted(scope, { cardIds })
      await onChanged()
    } catch (err) {
      AppAlert.alert("Restore failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setBusy(false)
    }
  }

  function confirmPermanentDelete(deckIds: number[]) {
    AppAlert.alert(
      "Permanently delete?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (busy) return
              setBusy(true)
              try {
                await instructorFlashcardsApi.permanentlyDeleteDeleted(scope, { deckIds })
                await onChanged()
              } catch (err) {
                AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
              } finally {
                setBusy(false)
              }
            })()
          },
        },
      ],
    )
  }

  const isEmpty = decks.length === 0 && cards.length === 0

  return (
    <>
      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search deleted items…"
        showFilter={false}
        filterLabel={
          typeFilter === "all" ? "All types" : typeFilter === "decks" ? "Decks only" : "Cards only"
        }
        trailingAction={{
          icon: "filter-outline",
          accessibilityLabel: "Filter deleted type",
          onPress: () => {
            setTypeFilter((prev) =>
              prev === "all" ? "decks" : prev === "decks" ? "cards" : "all",
            )
          },
        }}
      />

      {isEmpty ? (
        <FacultyEmptyState icon="trash-outline" title="No deleted items" body="Deleted decks and cards appear here." />
      ) : (
        <View style={localStyles.list}>
          {filteredDecks.map((deck) => (
            <View
              key={`deck-${deck.id}`}
              style={[
                moduleStyles.sectionCard,
                localStyles.row,
                tokens.cardShadow,
                { backgroundColor: native.secondaryGrouped, borderColor: tokens.border, borderWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={localStyles.copy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
                  {deck.title}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  Deck{deck.topic ? ` · ${deck.topic}` : ""} · {deck.cardCount === 1 ? "1 card" : `${deck.cardCount} cards`}
                </Text>
              </View>
              <View style={localStyles.actions}>
                <Pressable
                  onPress={() => void restoreDecks([deck.id])}
                  disabled={busy}
                  style={localStyles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Restore deck"
                >
                  <Ionicons name="arrow-undo-outline" size={20} color={FACULTY_FLASHCARD_COLOR.link} />
                </Pressable>
                <Pressable
                  onPress={() => confirmPermanentDelete([deck.id])}
                  disabled={busy}
                  style={localStyles.actionBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Permanently delete ${deck.title}`}
                >
                  <Ionicons name="trash-outline" size={20} color={tokens.danger} />
                </Pressable>
              </View>
            </View>
          ))}

          {filteredCards.map((card) => (
            <View
              key={`card-${card.id}`}
              style={[
                moduleStyles.sectionCard,
                localStyles.row,
                tokens.cardShadow,
                { backgroundColor: native.secondaryGrouped, borderColor: tokens.border, borderWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={localStyles.copy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
                  {card.frontText}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
                  {card.backText}
                </Text>
                <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                  From {card.deckTitle ?? "deck"}
                  {card.deckTopic ? ` · ${card.deckTopic}` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => void restoreCards([card.id])}
                disabled={busy}
                style={localStyles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel="Restore card"
              >
                <Ionicons name="arrow-undo-outline" size={20} color={FACULTY_FLASHCARD_COLOR.link} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </>
  )
}

const localStyles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  copy: { flex: 1, gap: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
})
