import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { flashcardsApi, type FlashcardCard, type FlashcardDeck } from "../../lib/flashcards-api"
import {
  prepareTempCardId,
  useAddStudentFlashcardCard,
  useDeleteStudentFlashcardCard,
  useDeleteStudentFlashcardDeck,
  useStudentFlashcardDeck,
  useUpdateStudentFlashcardDeck,
} from "../../hooks/query/useStudentFlashcards"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { safeRouterBack } from "../../lib/safe-router-back"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FlashcardInvalidRoute } from "./FlashcardInvalidRoute"
import { FlashcardFlipCard } from "./FlashcardFlipCard"
import { FlashcardDifficultyPicker } from "./FlashcardDifficultyPicker"
import { FlashcardDifficultyBadge } from "./FlashcardDifficultyBadge"
import type { FlashcardDifficulty } from "../../lib/flashcard-difficulty"

const FLASHCARDS_HOME = "/module/flashcards"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function FlashcardDeckEditorScreen() {
  const { deckId: deckIdRaw } = useLocalSearchParams<{ deckId: string }>()
  const deckId = Number(deckIdRaw)
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const deckQuery = useStudentFlashcardDeck(session, deckId)
  const updateDeckMutation = useUpdateStudentFlashcardDeck(session)
  const deleteDeckMutation = useDeleteStudentFlashcardDeck(session)
  const addCardMutation = useAddStudentFlashcardCard(session)
  const deleteCardMutation = useDeleteStudentFlashcardCard(session)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deck, setDeck] = useState<FlashcardDeck | null>(null)
  const [cards, setCards] = useState<FlashcardCard[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [topic, setTopic] = useState("")
  const [frontText, setFrontText] = useState("")
  const [backText, setBackText] = useState("")
  const [cardDifficulty, setCardDifficulty] = useState<FlashcardDifficulty>("medium")
  const [addingCard, setAddingCard] = useState(false)
  const [previewFlipped, setPreviewFlipped] = useState(false)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(deckId)) return
    const cached = deckQuery.data
    if (cached?.deck) {
      if (cached.deck.canEdit === false) throw new ApiError("You can only edit your own decks.", 403)
      setDeck(cached.deck)
      setCards(cached.cards ?? [])
      setTitle(cached.deck.title)
      setDescription(cached.deck.description)
      setTopic(cached.deck.topic ?? "")
      if (deckId < 0 || !deckQuery.isFetching) return
    }
    if (deckId < 0) return
    const res = await flashcardsApi.getDeck(session, deckId)
    if (!res.deck.canEdit) throw new ApiError("You can only edit your own decks.", 403)
    setDeck(res.deck)
    setCards(res.cards ?? [])
    setTitle(res.deck.title)
    setDescription(res.deck.description)
    setTopic(res.deck.topic ?? "")
  }, [session, deckId, deckQuery.data, deckQuery.isFetching])

  useEffect(() => {
    if (!session || !Number.isFinite(deckId)) return
    setLoading(deckQuery.isLoading && !deckQuery.data)
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Could not load deck."))
  }, [session, deckId, load, deckQuery.isLoading, deckQuery.data])

  async function saveDeck() {
    if (!session || !deck || saving) return
    setSaving(true)
    try {
      const res = await updateDeckMutation.mutateAsync({
        deckId: deck.id,
        title,
        description,
        topic: topic.trim() || undefined,
      })
      setDeck(res.deck)
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function addCard() {
    if (!session || !deck || addingCard) return
    if (!frontText.trim() || !backText.trim()) {
      AppAlert.alert("Missing text", "Enter both front and back text.")
      return
    }
    setAddingCard(true)
    try {
      const res = await addCardMutation.mutateAsync({
        deckId: deck.id,
        tempId: prepareTempCardId(),
        frontText: frontText.trim(),
        backText: backText.trim(),
        sortOrder: cards.length,
        difficulty: cardDifficulty,
      })
      setCards((prev) => [...prev.filter((row) => row.id !== res.card.id), res.card])
      setFrontText("")
      setBackText("")
      setPreviewFlipped(false)
      setDeck((prev) => (prev ? { ...prev, cardCount: prev.cardCount + 1 } : prev))
    } catch (err) {
      AppAlert.alert("Add failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setAddingCard(false)
    }
  }

  function deleteCard(card: FlashcardCard) {
    if (!session) return
    AppAlert.alert("Delete card?", card.frontText, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              if (!deck) return
              deleteCardMutation.mutate({ deckId: deck.id, cardId: card.id })
              setCards((prev) => prev.filter((row) => row.id !== card.id))
              setDeck((prev) => (prev ? { ...prev, cardCount: Math.max(0, prev.cardCount - 1) } : prev))
            } catch (err) {
              AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
            }
          })()
        },
      },
    ])
  }

  function deleteDeck() {
    if (!session || !deck) return
    AppAlert.alert("Delete deck?", "All cards in this deck will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              deleteDeckMutation.mutate(deck.id)
              safeRouterBack(router, FLASHCARDS_HOME)
            } catch (err) {
              AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Try again.")
            }
          })()
        },
      },
    ])
  }

  if (!Number.isFinite(deckId) || deckId < 1) {
    return <FlashcardInvalidRoute />
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    )
  }

  if (error || !deck) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.body, { color: tokens.danger }]}>{error || "Deck not found."}</Text>
        <Pressable onPress={() => safeRouterBack(router, FLASHCARDS_HOME)}>
          <Text style={[type.bodyEmphasis, { color: tokens.accent, marginTop: 12 }]}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: native.groupedBackground }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: native.separator }]}>
        <Pressable onPress={() => safeRouterBack(router, FLASHCARDS_HOME)} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={tokens.accent} />
        </Pressable>
        <Text style={[type.navTitle, styles.topTitle]} numberOfLines={1}>
          Edit deck
        </Text>
        <Pressable onPress={deleteDeck} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color={tokens.danger} />
        </Pressable>
        <Pressable
          onPress={() => void saveDeck()}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: tokens.accent }]}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Deck title"
          placeholderTextColor={native.tertiaryLabel}
          style={[styles.field, type.bodyEmphasis, { color: native.label, borderColor: native.separator }]}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={native.tertiaryLabel}
          style={[styles.field, type.body, { color: native.label, borderColor: native.separator }]}
        />
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="Topic (optional)"
          placeholderTextColor={native.tertiaryLabel}
          style={[styles.field, type.body, { color: native.label, borderColor: native.separator }]}
        />

        {cards.length > 0 ? (
          <Pressable
            onPress={() => router.push(`/flashcards/${deck.id}`)}
            style={[styles.studyBtn, { backgroundColor: tokens.accent }]}
          >
            <Ionicons name="play-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Study deck</Text>
          </Pressable>
        ) : null}

        <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Cards</Text>
        <View style={styles.cardList}>
          {cards.map((card) => (
            <View
              key={card.id}
              style={[styles.cardRow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
            >
              <View style={styles.cardRowCopy}>
                <View style={styles.cardRowHead}>
                  <Text style={[type.bodyEmphasis, { color: native.label, flex: 1 }]} numberOfLines={2}>
                    {card.frontText}
                  </Text>
                  <FlashcardDifficultyBadge difficulty={card.difficulty} compact />
                </View>
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
                  {card.backText}
                </Text>
              </View>
              <Pressable onPress={() => deleteCard(card)} hitSlop={8} accessibilityLabel="Delete card">
                <Ionicons name="close-circle-outline" size={20} color={tokens.danger} />
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Add card</Text>
        {(frontText.trim() || backText.trim()) ? (
          <View style={styles.previewWrap}>
            <FlashcardFlipCard
              frontText={frontText.trim() || "Front preview"}
              backText={backText.trim() || "Back preview"}
              flipped={previewFlipped}
              onFlip={() => setPreviewFlipped((prev) => !prev)}
              cardKey={`${frontText}-${backText}-${cardDifficulty}`}
              difficulty={cardDifficulty}
              showStack={false}
              style={styles.previewCard}
            />
          </View>
        ) : null}
        <FlashcardDifficultyPicker value={cardDifficulty} onChange={setCardDifficulty} />
        <TextInput
          value={frontText}
          onChangeText={setFrontText}
          placeholder="Front"
          placeholderTextColor={native.tertiaryLabel}
          style={[styles.field, type.body, { color: native.label, borderColor: native.separator }]}
        />
        <TextInput
          value={backText}
          onChangeText={setBackText}
          placeholder="Back"
          placeholderTextColor={native.tertiaryLabel}
          style={[styles.field, type.body, { color: native.label, borderColor: native.separator }]}
        />
        <Pressable
          onPress={() => void addCard()}
          disabled={addingCard}
          style={[styles.addBtn, { borderColor: tokens.accent }]}
        >
          {addingCard ? (
            <ActivityIndicator color={tokens.accent} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={tokens.accent} />
              <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Add card</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle: { flex: 1 },
  saveBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  content: { padding: 16, gap: 10 },
  field: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionLabel: { fontWeight: "700", marginTop: 8 },
  cardList: { gap: 8 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cardRowCopy: { flex: 1, minWidth: 0, gap: 4 },
  cardRowHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewWrap: { minHeight: 420, marginBottom: 4, alignItems: "center", paddingVertical: 8 },
  previewCard: { width: "100%" },
  studyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
  },
})
