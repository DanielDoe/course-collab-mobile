import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Keyboard, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorBankTopic, type InstructorSession } from "../../lib/instructor-api"
import type { FlashcardCard, FlashcardDeck } from "../../lib/flashcards-api"
import {
  clampFlashcardBatchSize,
  DEFAULT_FLASHCARD_BATCH_SIZE,
} from "../../lib/flashcard-batch-study"
import { canUseFlashcardMcq } from "../../lib/flashcard-quiz"
import { FlashcardQuizPreview } from "../flashcards/FlashcardQuizPreview"
import { FlashcardDifficultyPicker } from "../flashcards/FlashcardDifficultyPicker"
import type { FlashcardDifficulty } from "../../lib/flashcard-difficulty"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyFlashcards } from "../../hooks/query/useFacultyFlashcards"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import { useFacultySectionFilter } from "../../lib/faculty-section-scope"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { consumeFacultyCoraPending } from "../../lib/faculty-cora-pending"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyEmptyState } from "./faculty-shared"
import { FacultyFlashcardDeckListCard } from "./FacultyFlashcardDeckListCard"
import { FacultyFlashcardEditorCardRow } from "./FacultyFlashcardEditorCardRow"
import { FacultyFlashcardsDeletedPanel } from "./FacultyFlashcardsDeletedPanel"
import { FacultyFlashcardsTopicAvailabilitySection } from "./FacultyFlashcardsTopicAvailabilitySection"
import {
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"
import {
  FACULTY_FLASHCARD_COLOR,
  facultyFlashcardGenerateChrome,
  facultyFlashcardSwitchTrack,
} from "../../lib/faculty-flashcard-theme"
import { NativeSelect } from "../NativeSelect"
import { KeyboardAwareForm } from "../ui/KeyboardAwareForm"
import { BATCH_SIZE_OPTIONS } from "./FacultyNativePickers"
import {
  FacultyAdminSection,
  FacultyAdminStatRow,
  FacultyAdminToggleRow,
} from "./faculty-admin-ui"
import {
  instructorFlashcardsApi,
  type ModuleConfiguration,
  type ModuleTopicRow,
} from "../../lib/instructor-content-api"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"

type Tab = "all" | "topics" | "configuration" | "deleted"

function formatUnitCount(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function formatDeckCardMeta(deckCount: number, cardCount: number): string {
  return `${formatUnitCount(deckCount, "deck")} · ${formatUnitCount(cardCount, "card")}`
}

function flashcardErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError || err instanceof Error) {
    const message = err.message.trim()
    if (message) return message
  }
  return fallback
}

const TABS: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "all", label: "All", icon: "layers-outline" },
  { id: "topics", label: "Topics", icon: "folder-outline" },
  { id: "configuration", label: "Config", icon: "options-outline" },
  { id: "deleted", label: "Deleted", icon: "trash-outline" },
]

export function FacultyFlashcardsScreen() {
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 88 })
  const { scope, ready } = useFacultyScope()
  const { sessionFilter: deckSessionFilter, setSessionFilter: setDeckSessionFilter, apiSession: deckApiSession } =
    useFacultySectionFilter(scope, "all")
  const {
    sessionFilter: topicSession,
    setSessionFilter: setTopicSession,
    apiSession: topicApiSession,
    sentinel: topicSentinel,
  } = useFacultySectionFilter(scope, "ALL")
  const { tokens, native, styles: moduleStyles, type } = useModuleTheme()

  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const cardsQuery = useFacultyFlashcards(
    ready ? scope : null,
    deckApiSession ?? "",
    topicApiSession ?? topicSentinel,
  )
  const decks = cardsQuery.decks
  const deletedDecks = cardsQuery.deletedDecks
  const deletedCards = cardsQuery.deletedCards
  const topics = cardsQuery.topics
  const bankTopics = cardsQuery.bankTopics
  const config = cardsQuery.config
  const sessions = cardsQuery.sessions
  const loading = cardsQuery.isInitialLoading
  const refreshing = cardsQuery.isRefreshing && !cardsQuery.isInitialLoading
  const error = cardsQuery.error instanceof ApiError
    ? cardsQuery.error.message
    : cardsQuery.error
      ? "Could not load flashcards."
      : ""

  const [deckEditorOpen, setDeckEditorOpen] = useState(false)
  useSuppressModuleSearchDock(deckEditorOpen)
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null)
  const [cards, setCards] = useState<FlashcardCard[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [topic, setTopic] = useState("")
  const [sessionCode, setSessionCode] = useState("")
  const [showInPracticeHub, setShowInPracticeHub] = useState(false)
  const [isPublished, setIsPublished] = useState(true)
  const [frontText, setFrontText] = useState("")
  const [backText, setBackText] = useState("")
  const [cardDifficulty, setCardDifficulty] = useState<FlashcardDifficulty>("medium")
  const [saving, setSaving] = useState(false)
  const [generateTopic, setGenerateTopic] = useState("")
  const [generating, setGenerating] = useState(false)
  const [requireMcqValidation, setRequireMcqValidation] = useState(true)
  const [cardsBeforeQuiz, setCardsBeforeQuiz] = useState(String(DEFAULT_FLASHCARD_BATCH_SIZE))
  const [configBatchSize, setConfigBatchSize] = useState(String(DEFAULT_FLASHCARD_BATCH_SIZE))
  const [configSaving, setConfigSaving] = useState(false)
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null)
  const [distractorDrafts, setDistractorDrafts] = useState<Record<number, string[]>>({})
  const [previewCardId, setPreviewCardId] = useState<number | null>(null)
  const [showQuizPreview, setShowQuizPreview] = useState(false)
  const [editingCardId, setEditingCardId] = useState<number | null>(null)
  const [editFront, setEditFront] = useState("")
  const [editBack, setEditBack] = useState("")
  const [editDifficulty, setEditDifficulty] = useState<FlashcardDifficulty>("medium")

  const load = useCallback(async () => {
    await cardsQuery.refetch()
  }, [cardsQuery.refetch])

  useEffect(() => {
    if (cardsQuery.configBatchSize) setConfigBatchSize(cardsQuery.configBatchSize)
  }, [cardsQuery.configBatchSize])

  useEffect(() => {
    if (!ready || !scope?.courseId) return
    void consumeFacultyCoraPending(scope.instructorId, scope.courseId, "flashcard_topic").then((pending) => {
      if (pending?.kind !== "flashcard_topic" || !pending.topicName.trim()) return
      setTab("topics")
      setGenerateTopic(pending.topicName.trim())
    })
  }, [ready, scope?.courseId, scope?.instructorId])

  const switchTrack = facultyFlashcardSwitchTrack(tokens)
  const generateChrome = useMemo(
    () => facultyFlashcardGenerateChrome(native, tokens.isDark),
    [native, tokens.isDark],
  )

  const bankTopicOptions = useMemo(
    () =>
      bankTopics.map((topic) => ({
        value: topic.name,
        label: topic.name,
        detail:
          topic.question_count > 0
            ? formatUnitCount(topic.question_count, "question")
            : undefined,
      })),
    [bankTopics],
  )

  const deckTopicOptions = useMemo(() => {
    const names = new Set<string>()
    config?.topics.forEach((row) => names.add(row.name))
    bankTopics.forEach((row) => names.add(row.name))
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }))
  }, [config?.topics, bankTopics])

  const sessionOptions = useMemo(
    () => [
      { value: "all", label: scope?.sessionCode ? scope.sessionCode : "All sections" },
      ...sessions
        .filter((session) => !scope?.sessionCode || session.code === scope.sessionCode)
        .map((session) => ({
        value: session.code,
        label: session.code,
        detail:
          session.description ??
          (session.student_count != null
            ? formatUnitCount(session.student_count, "student")
            : undefined),
      })),
    ],
    [sessions, scope?.sessionCode],
  )

  const topicSessionOptions = useMemo(
    () => [
      { value: topicSentinel, label: scope?.sessionCode ? scope.sessionCode : "All sections" },
      ...sessions
        .filter((session) => !scope?.sessionCode || session.code === scope.sessionCode)
        .map((session) => ({
        value: session.code,
        label: session.code,
        detail: session.description ?? undefined,
      })),
    ],
    [sessions, scope?.sessionCode, topicSentinel],
  )

  const filteredDecks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return decks.filter((deck) => {
      if (!q) return true
      return (
        deck.title.toLowerCase().includes(q) ||
        deck.description.toLowerCase().includes(q) ||
        (deck.topic?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [decks, search])

  const decksPager = useFacultyListPager(filteredDecks, `${search}:${deckSessionFilter}`, "decks")
  const topicsPager = useFacultyListPager(topics, topicSession, "topics")

  async function openDeck(deck: FlashcardDeck) {
    if (!scope) return
    Keyboard.dismiss()
    try {
      const res = await instructorFlashcardsApi.getDeck(scope, deck.id)
      setEditingDeck(deck)
      setTitle(deck.title)
      setDescription(deck.description)
      setTopic(deck.topic ?? "")
      setSessionCode(deck.session ?? "")
      setShowInPracticeHub(deck.isPublished ? deck.showInPracticeHub : false)
      setIsPublished(deck.isPublished)
      setRequireMcqValidation(deck.requireMcqValidation !== false)
      setCardsBeforeQuiz(String(deck.cardsBeforeQuiz ?? DEFAULT_FLASHCARD_BATCH_SIZE))
      setExpandedCardId(null)
      setDistractorDrafts({})
      setPreviewCardId(null)
      setShowQuizPreview(false)
      setEditingCardId(null)
      setCards(res.cards ?? [])
      setDeckEditorOpen(true)
    } catch (err) {
      setEditingDeck(null)
      setCards([])
      setDeckEditorOpen(false)
      AppAlert.alert(
        "Could not load deck",
        err instanceof ApiError ? err.message : "Failed to load cards for this deck.",
      )
    }
  }

  function openCreate() {
    setEditingDeck(null)
    setTitle("")
    setDescription("")
    setTopic("")
    setSessionCode(scope?.sessionCode ?? "")
    setShowInPracticeHub(false)
    setIsPublished(true)
    setRequireMcqValidation(config?.requireMcqValidation !== false)
    setCardsBeforeQuiz(String(config?.cardsBeforeQuiz ?? DEFAULT_FLASHCARD_BATCH_SIZE))
    setCards([])
    setExpandedCardId(null)
    setDistractorDrafts({})
    setPreviewCardId(null)
    setShowQuizPreview(false)
    setEditingCardId(null)
    setDeckEditorOpen(true)
  }

  function handlePublishedChange(next: boolean) {
    setIsPublished(next)
    if (!next) setShowInPracticeHub(false)
  }

  function startEditCard(card: FlashcardCard) {
    setEditingCardId(card.id)
    setEditFront(card.frontText)
    setEditBack(card.backText)
    setEditDifficulty(card.difficulty ?? "medium")
    setExpandedCardId(null)
  }

  function cancelEditCard() {
    setEditingCardId(null)
    setEditFront("")
    setEditBack("")
    setEditDifficulty("medium")
  }

  async function saveCardEdit() {
    if (!scope || editingCardId == null || saving) return
    if (!editFront.trim() || !editBack.trim()) {
      AppAlert.alert("Missing text", "Enter front and back text.")
      return
    }
    setSaving(true)
    try {
      const res = await instructorFlashcardsApi.updateCard(scope, editingCardId, {
        frontText: editFront.trim(),
        backText: editBack.trim(),
        difficulty: editDifficulty,
      })
      setCards((prev) => prev.map((row) => (row.id === editingCardId ? res.card : row)))
      cancelEditCard()
    } catch (err) {
      AppAlert.alert("Save failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setSaving(false)
    }
  }

  async function moveCard(index: number, direction: -1 | 1) {
    if (!scope || saving) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= cards.length) return
    const current = cards[index]
    const target = cards[targetIndex]
    setSaving(true)
    try {
      await Promise.all([
        instructorFlashcardsApi.updateCard(scope, current.id, { sortOrder: targetIndex }),
        instructorFlashcardsApi.updateCard(scope, target.id, { sortOrder: index }),
      ])
      setCards((prev) => {
        const next = [...prev]
        next[index] = { ...target, sortOrder: index }
        next[targetIndex] = { ...current, sortOrder: targetIndex }
        return next.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      })
    } catch (err) {
      AppAlert.alert("Reorder failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setSaving(false)
    }
  }

  function deleteDeckFromEditor() {
    if (!editingDeck) return
    AppAlert.alert("Delete deck?", editingDeck.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (!scope) return
            try {
              await instructorFlashcardsApi.deleteDeck(scope, editingDeck.id)
              setDeckEditorOpen(false)
              setEditingDeck(null)
              await load()
            } catch (err) {
              AppAlert.alert("Delete failed", flashcardErrorMessage(err, "Try again."))
            }
          })()
        },
      },
    ])
  }

  async function saveDeck() {
    if (!scope || saving) return
    if (!title.trim()) {
      AppAlert.alert("Missing title", "Enter a deck title.")
      return
    }
    setSaving(true)
    try {
      const payload = {
        title,
        description,
        topic: topic.trim() || undefined,
        session: sessionCode.trim() || null,
        showInPracticeHub: isPublished ? showInPracticeHub : false,
        isPublished,
        requireMcqValidation,
        cardsBeforeQuiz: clampFlashcardBatchSize(Number(cardsBeforeQuiz)),
      }
      if (editingDeck) {
        await instructorFlashcardsApi.updateDeck(scope, editingDeck.id, payload)
      } else {
        await instructorFlashcardsApi.createDeck(scope, payload)
      }
      setDeckEditorOpen(false)
      await load()
    } catch (err) {
      AppAlert.alert("Save failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setSaving(false)
    }
  }

  async function addCard() {
    if (!scope || !editingDeck || saving) return
    if (!frontText.trim() || !backText.trim()) {
      AppAlert.alert("Missing text", "Enter front and back text.")
      return
    }
    setSaving(true)
    try {
      const res = await instructorFlashcardsApi.addCard(scope, editingDeck.id, {
        frontText: frontText.trim(),
        backText: backText.trim(),
        sortOrder: cards.length,
        difficulty: cardDifficulty,
      })
      setCards((prev) => [...prev, res.card])
      setFrontText("")
      setBackText("")
    } catch (err) {
      AppAlert.alert("Add failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setSaving(false)
    }
  }

  function deleteCard(card: FlashcardCard) {
    if (!scope) return
    AppAlert.alert("Delete card?", card.frontText.trim() || "This card", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await instructorFlashcardsApi.deleteCard(scope, card.id)
              setCards((prev) => prev.filter((row) => row.id !== card.id))
            } catch (err) {
              AppAlert.alert("Delete failed", flashcardErrorMessage(err, "Try again."))
            }
          })()
        },
      },
    ])
  }

  function deleteDeck(deck: FlashcardDeck) {
    if (!scope) return
    AppAlert.alert("Delete deck?", deck.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await instructorFlashcardsApi.deleteDeck(scope, deck.id)
              await load()
            } catch (err) {
              AppAlert.alert("Delete failed", flashcardErrorMessage(err, "Try again."))
            }
          })()
        },
      },
    ])
  }

  async function saveDistractors(cardId: number) {
    if (!scope || saving) return
    const drafts = distractorDrafts[cardId] ?? ["", "", ""]
    const customDistractors = drafts.map((t) => t.trim()).filter(Boolean).slice(0, 3)
    setSaving(true)
    try {
      const res = await instructorFlashcardsApi.updateCard(scope, cardId, { customDistractors })
      setCards((prev) => prev.map((row) => (row.id === cardId ? res.card : row)))
      AppAlert.alert("Saved", "Custom distractors updated.")
    } catch (err) {
      AppAlert.alert("Save failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setSaving(false)
    }
  }

  async function saveCourseMcqToggle(next: boolean) {
    if (!scope || configSaving) return
    setConfigSaving(true)
    try {
      const res = await instructorFlashcardsApi.updateConfiguration(scope, {
        requireMcqValidation: next,
      })
      setRequireMcqValidation(res.requireMcqValidation)
      setConfig((prev) => (prev ? { ...prev, requireMcqValidation: res.requireMcqValidation } : prev))
      await load()
    } catch (err) {
      AppAlert.alert("Update failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setConfigSaving(false)
    }
  }

  async function saveCourseBatchSize(raw: string) {
    if (!scope || configSaving) return
    const next = clampFlashcardBatchSize(Number(raw))
    setConfigBatchSize(String(next))
    setConfigSaving(true)
    try {
      const res = await instructorFlashcardsApi.updateConfiguration(scope, { cardsBeforeQuiz: next })
      setConfigBatchSize(String(res.cardsBeforeQuiz))
      setConfig((prev) => (prev ? { ...prev, cardsBeforeQuiz: res.cardsBeforeQuiz } : prev))
      await load()
    } catch (err) {
      AppAlert.alert("Update failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setConfigSaving(false)
    }
  }

  function cardDistractorDrafts(card: FlashcardCard): string[] {
    if (distractorDrafts[card.id]) return distractorDrafts[card.id]
    const existing = card.customDistractors ?? []
    return [existing[0] ?? "", existing[1] ?? "", existing[2] ?? ""]
  }

  async function toggleTopic(topicName: string, session: string, isAvailable: boolean) {
    if (!scope) return
    try {
      await instructorFlashcardsApi.toggleTopic(scope, topicName, session, isAvailable)
      await load()
    } catch (err) {
      AppAlert.alert("Update failed", flashcardErrorMessage(err, "Try again."))
    }
  }

  async function generateFromBank() {
    if (!scope || generating) return
    const topicName = generateTopic.trim()
    if (!topicName) {
      AppAlert.alert("Topic required", "Enter a question bank topic name.")
      return
    }
    setGenerating(true)
    try {
      const res = await instructorFlashcardsApi.generateFromBank(scope, { topicName, maxCards: 20 })
      AppAlert.alert(
        "Generated",
        `Added ${res.cardsAdded} cards${res.skipped ? ` (${res.skipped} skipped)` : ""}.`,
      )
      setGenerateTopic("")
      await load()
      if (res.deck) await openDeck(res.deck)
    } catch (err) {
      AppAlert.alert("Generate failed", flashcardErrorMessage(err, "Try again."))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable />
        {tab === "all" ? (
          <FacultySearchToolbar
            value={search}
            onChange={setSearch}
            placeholder="Search flashcard decks…"
            showFilter={false}
            trailingAction={{
              onPress: openCreate,
              accessibilityLabel: "Create deck",
              icon: "add",
            }}
          />
        ) : null}

        <QueryRefreshBanner visible={cardsQuery.refreshFailed} onRetry={() => void load()} />
        {error ? (
          <View style={[localStyles.errorBox, { backgroundColor: `${tokens.danger}14` }]}>
            <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
          </View>
        ) : null}
      </FacultyModuleStickyHeader>

      {loading ? (
        <QuerySkeleton />
      ) : (
        <ScrollView
          style={moduleStyles.scroll}
          contentContainerStyle={[moduleStyles.content, listScrollPad]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void load()
              }}
            />
          }
        >
          {tab === "all" ? (
            <>
              <NativeSelect
                placeholder="Filter by section"
                value={deckSessionFilter}
                options={sessionOptions}
                onChange={setDeckSessionFilter}
              />
              <View
                style={[
                  moduleStyles.sectionCard,
                  localStyles.generateBox,
                  {
                    backgroundColor: generateChrome.surface,
                    borderColor: native.separator,
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={localStyles.generateHead}>
                  <View
                    style={[
                      localStyles.generateIcon,
                      { backgroundColor: generateChrome.iconTile },
                    ]}
                  >
                    <Ionicons name="sparkles-outline" size={16} color={generateChrome.iconInk} />
                  </View>
                  <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
                    Generate from question bank
                  </Text>
                </View>
                <NativeSelect
                  placeholder="Select question bank topic"
                  value={generateTopic}
                  options={bankTopicOptions}
                  onChange={setGenerateTopic}
                  disabled={bankTopicOptions.length === 0}
                  loading={loading}
                />
                {bankTopicOptions.length === 0 ? (
                  <Text style={[type.caption, { color: native.tertiaryLabel }]}>
                    Add topics in Question Bank first, then generate a deck here.
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => void generateFromBank()}
                  disabled={generating}
                  accessibilityRole="button"
                  accessibilityLabel="Generate deck"
                  style={[
                    localStyles.generateBtn,
                    {
                      backgroundColor: FACULTY_FLASHCARD_COLOR.action,
                      opacity: generating ? 0.55 : 1,
                    },
                  ]}
                >
                  {generating ? (
                    <ActivityIndicator color={FACULTY_FLASHCARD_COLOR.actionInk} />
                  ) : (
                    <Text style={[localStyles.generateBtnText, { color: FACULTY_FLASHCARD_COLOR.actionInk }]}>
                      Generate deck
                    </Text>
                  )}
                </Pressable>
              </View>

              {filteredDecks.length === 0 ? (
                <FacultyEmptyState
                  icon="layers-outline"
                  title="No flashcard decks"
                  body="Create a deck or generate one from your question bank by topic."
                />
              ) : (
                <View style={localStyles.deckList}>
                  {decksPager.items.map((deck) => (
                    <FacultyFlashcardDeckListCard
                      key={deck.id}
                      deck={deck}
                      onPress={() => void openDeck(deck)}
                      onDelete={() => deleteDeck(deck)}
                    />
                  ))}
                  <FacultyListPagerFooter pager={decksPager} />
                </View>
              )}
            </>
          ) : null}

          {tab === "topics" ? (
            topics.length === 0 ? (
              <FacultyEmptyState icon="folder-outline" title="No topics yet" body="Assign topics on decks under All Flashcards." />
            ) : (
              <>
                <NativeSelect
                  placeholder="Section"
                  value={topicSession}
                  options={topicSessionOptions}
                  onChange={setTopicSession}
                />
                {topicsPager.items.map((row) => {
                  const availability = row.availability?.[topicSession] ?? row.availability?.ALL
                  const enabled = availability?.is_available !== false
                  return (
                    <View key={row.name} style={[moduleStyles.card, localStyles.topicRow]}>
                      <View style={localStyles.cardCopy}>
                        <Text style={[type.bodyEmphasis, { color: native.label }]}>{row.name}</Text>
                        <Text style={[type.caption, { color: native.secondaryLabel }]}>
                          {formatDeckCardMeta(row.deck_count ?? 0, row.card_count ?? 0)}
                        </Text>
                      </View>
                      <Switch
                        value={enabled}
                        onValueChange={(value) => void toggleTopic(row.name, topicSession, value)}
                        accessibilityLabel={`${row.name} available`}
                        trackColor={switchTrack}
                        thumbColor={
                          Platform.OS === "android"
                            ? enabled
                              ? FACULTY_FLASHCARD_COLOR.action
                              : native.switchAndroidThumbOff
                            : undefined
                        }
                        ios_backgroundColor={native.switchIosOffBackground}
                      />
                    </View>
                  )
                })}
                <FacultyListPagerFooter pager={topicsPager} />
              </>
            )
          ) : null}

          {tab === "configuration" && config ? (
            <View style={localStyles.configSections}>
              <FacultyAdminSection
                title="Course Defaults"
                footer="Applied to new decks. Each deck can override these settings."
              >
                <FacultyAdminToggleRow
                  label="Quiz-check mode"
                  subtitle="Students learn in batches, then answer MCQs before advancing."
                  value={config.requireMcqValidation !== false}
                  onChange={(value) => void saveCourseMcqToggle(value)}
                  disabled={configSaving}
                  isLast={config.requireMcqValidation === false}
                  activeTrackColor={FACULTY_FLASHCARD_COLOR.action}
                />
                {config.requireMcqValidation !== false ? (
                  <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                    <NativeSelect
                      label="Cards before quiz"
                      placeholder="10 cards"
                      value={configBatchSize}
                      options={BATCH_SIZE_OPTIONS}
                      onChange={(value) => {
                        setConfigBatchSize(value)
                        void saveCourseBatchSize(value)
                      }}
                    />
                  </View>
                ) : null}
              </FacultyAdminSection>

              <FacultyAdminStatRow
                stats={[
                  {
                    label: "Sections",
                    value: String(config.sections.length),
                    icon: "people-outline",
                    iconColor: FACULTY_FLASHCARD_COLOR.link,
                  },
                  {
                    label: "Topics",
                    value: String(config.topics.length),
                    icon: "folder-outline",
                    iconColor: FACULTY_FLASHCARD_COLOR.link,
                  },
                ]}
              />

              <FacultyFlashcardsTopicAvailabilitySection
                config={config}
                onToggle={toggleTopic}
                disabled={configSaving}
              />
            </View>
          ) : null}

          {tab === "deleted" && scope ? (
            <FacultyFlashcardsDeletedPanel
              scope={scope}
              decks={deletedDecks}
              cards={deletedCards}
              onChanged={load}
            />
          ) : null}
        </ScrollView>
      )}

      <Modal visible={deckEditorOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[localStyles.editorRoot, { backgroundColor: native.groupedBackground }]}>
          <View style={[localStyles.editorHeader, { borderBottomColor: native.separator }]}>
            <Pressable
              onPress={() => setDeckEditorOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[type.bodyEmphasis, { color: FACULTY_FLASHCARD_COLOR.link }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => Keyboard.dismiss()}
              accessibilityRole="header"
              accessibilityLabel={editingDeck ? "Edit deck" : "New deck"}
            >
              <Text style={[type.sheetTitle, { color: native.label }]}>
                {editingDeck ? "Edit deck" : "New deck"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void saveDeck()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save"
            >
              <Text style={[type.bodyEmphasis, { color: FACULTY_FLASHCARD_COLOR.action }]}>
                {saving ? "…" : "Save"}
              </Text>
            </Pressable>
          </View>
          <KeyboardAwareForm contentContainerStyle={localStyles.editorBody}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Deck title"
              accessibilityLabel="Deck title"
              placeholderTextColor={native.tertiaryLabel}
              style={[localStyles.input, { color: native.label, borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              accessibilityLabel="Description"
              placeholderTextColor={native.tertiaryLabel}
              style={[localStyles.input, { color: native.label, borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}
            />
            <NativeSelect
              placeholder="Topic"
              value={topic}
              options={deckTopicOptions}
              onChange={setTopic}
              disabled={deckTopicOptions.length === 0}
            />
            <NativeSelect
              placeholder="Section"
              value={sessionCode}
              options={sessionOptions}
              onChange={setSessionCode}
            />
            <View style={localStyles.switchRow}>
              <Text style={[type.body, { color: native.label }]}>Published</Text>
              <Switch
                value={isPublished}
                onValueChange={handlePublishedChange}
                accessibilityLabel="Published"
                trackColor={switchTrack}
                thumbColor={Platform.OS === "android" ? (isPublished ? FACULTY_FLASHCARD_COLOR.action : native.switchAndroidThumbOff) : undefined}
                ios_backgroundColor={native.switchIosOffBackground}
              />
            </View>
            <View style={localStyles.switchRow}>
              <View style={localStyles.cardCopy}>
                <Text style={[type.body, { color: native.label }]}>Show in Practice Hub</Text>
                {!isPublished ? (
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    Publish the deck first to surface it in Practice Hub.
                  </Text>
                ) : null}
              </View>
              <Switch
                value={showInPracticeHub}
                onValueChange={setShowInPracticeHub}
                disabled={!isPublished}
                accessibilityLabel="Show in Practice Hub"
                trackColor={switchTrack}
                thumbColor={Platform.OS === "android" ? (showInPracticeHub ? FACULTY_FLASHCARD_COLOR.action : native.switchAndroidThumbOff) : undefined}
                ios_backgroundColor={native.switchIosOffBackground}
              />
            </View>

            {editingDeck ? (
              <>
                <View style={localStyles.switchRow}>
                  <View style={localStyles.cardCopy}>
                    <Text style={[type.body, { color: native.label }]}>Quiz-check mode</Text>
                    <Text style={[type.caption, { color: native.secondaryLabel }]}>
                      Batch learn → water break → MCQ quiz
                    </Text>
                  </View>
                  <Switch
                    value={requireMcqValidation}
                    onValueChange={setRequireMcqValidation}
                    accessibilityLabel="Quiz-check mode"
                    trackColor={switchTrack}
                    thumbColor={
                      Platform.OS === "android"
                        ? requireMcqValidation
                          ? FACULTY_FLASHCARD_COLOR.action
                          : native.switchAndroidThumbOff
                        : undefined
                    }
                    ios_backgroundColor={native.switchIosOffBackground}
                  />
                </View>
                {requireMcqValidation ? (
                  <View style={localStyles.configSettingRow}>
                    <Text style={[type.body, { color: native.label }]}>Cards before quiz</Text>
                    <View style={{ minWidth: 140 }}>
                      <NativeSelect
                        placeholder="10 cards"
                        value={cardsBeforeQuiz}
                        options={BATCH_SIZE_OPTIONS}
                        onChange={setCardsBeforeQuiz}
                      />
                    </View>
                  </View>
                ) : null}

                {requireMcqValidation && canUseFlashcardMcq(cards) ? (
                  <View style={[localStyles.previewBox, { borderColor: native.separator }]}>
                    <Pressable
                      onPress={() => setShowQuizPreview((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={showQuizPreview ? "Hide quiz preview" : "Show quiz preview"}
                      style={localStyles.previewToggle}
                    >
                      <Text style={[type.bodyEmphasis, { color: FACULTY_FLASHCARD_COLOR.link }]}>
                        {showQuizPreview ? "Hide quiz preview" : "Show quiz preview"}
                      </Text>
                      <Ionicons
                        name={showQuizPreview ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={FACULTY_FLASHCARD_COLOR.link}
                      />
                    </Pressable>
                    {showQuizPreview ? (
                      <FlashcardQuizPreview
                        cards={cards}
                        activeCardId={previewCardId}
                        onActiveCardIdChange={setPreviewCardId}
                        accentColor={FACULTY_FLASHCARD_COLOR.link}
                      />
                    ) : null}
                  </View>
                ) : null}

                <Text style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}>Cards</Text>
                <View style={localStyles.editorCardList}>
                {cards.map((card, cardIndex) => {
                  const expanded = expandedCardId === card.id
                  const drafts = cardDistractorDrafts(card)
                  const showQuiz = requireMcqValidation && canUseFlashcardMcq(cards)
                  const isEditing = editingCardId === card.id
                  return (
                    <FacultyFlashcardEditorCardRow
                      key={card.id}
                      card={card}
                      index={cardIndex}
                      total={cards.length}
                      showQuizAction={showQuiz}
                      editing={isEditing}
                      expanded={expanded}
                      editFront={editFront}
                      editBack={editBack}
                      editDifficulty={editDifficulty}
                      saving={saving}
                      onStartEdit={() => startEditCard(card)}
                      onCancelEdit={cancelEditCard}
                      onSaveEdit={() => void saveCardEdit()}
                      onEditFrontChange={setEditFront}
                      onEditBackChange={setEditBack}
                      onEditDifficultyChange={setEditDifficulty}
                      onMoveUp={() => void moveCard(cardIndex, -1)}
                      onMoveDown={() => void moveCard(cardIndex, 1)}
                      onToggleQuiz={() => {
                        setPreviewCardId(card.id)
                        setShowQuizPreview(true)
                        setExpandedCardId(expanded ? null : card.id)
                      }}
                      onDelete={() => deleteCard(card)}
                    >
                      {expanded && requireMcqValidation ? (
                        <View style={[localStyles.distractorBox, { borderTopColor: native.separator, backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
                          <Text style={[type.caption, { color: native.secondaryLabel }]}>
                            Optional wrong answers (up to 3). Other cards fill in the rest.
                          </Text>
                          {drafts.map((value, di) => (
                            <TextInput
                              key={`${card.id}-d-${di}`}
                              value={value}
                              onChangeText={(text) => {
                                const next = [...drafts]
                                next[di] = text
                                setDistractorDrafts((prev) => ({ ...prev, [card.id]: next }))
                              }}
                              placeholder={`Custom distractor ${di + 1}`}
                              accessibilityLabel={`Custom distractor ${di + 1}`}
                              placeholderTextColor={native.tertiaryLabel}
                              style={[localStyles.input, localStyles.distractorInput, { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground }]}
                            />
                          ))}
                          <Pressable
                            onPress={() => void saveDistractors(card.id)}
                            disabled={saving}
                            accessibilityRole="button"
                            accessibilityLabel="Save distractors"
                            style={[localStyles.generateBtn, { backgroundColor: FACULTY_FLASHCARD_COLOR.action }]}
                          >
                            <Text style={[localStyles.generateBtnText, { color: FACULTY_FLASHCARD_COLOR.actionInk }]}>
                              Save distractors
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </FacultyFlashcardEditorCardRow>
                  )
                })}
                </View>
                <FlashcardDifficultyPicker value={cardDifficulty} onChange={setCardDifficulty} />
                <Text
                  style={[type.caption, localStyles.sectionLabel, { color: native.secondaryLabel }]}
                  accessible={false}
                >
                  New card
                </Text>
                <TextInput
                  value={frontText}
                  onChangeText={setFrontText}
                  placeholder="Front"
                  accessibilityLabel="New card front"
                  autoCorrect={false}
                  autoCapitalize="none"
                  placeholderTextColor={native.tertiaryLabel}
                  style={[localStyles.input, { color: native.label, borderColor: native.separator, backgroundColor: native.secondaryGrouped, minHeight: 44 }]}
                />
                <TextInput
                  value={backText}
                  onChangeText={setBackText}
                  placeholder="Back"
                  accessibilityLabel="New card back"
                  autoCorrect={false}
                  autoCapitalize="none"
                  placeholderTextColor={native.tertiaryLabel}
                  style={[localStyles.input, { color: native.label, borderColor: native.separator, backgroundColor: native.secondaryGrouped, minHeight: 44 }]}
                />
                <Pressable
                  onPress={() => void addCard()}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Add card"
                  style={[localStyles.generateBtn, { backgroundColor: FACULTY_FLASHCARD_COLOR.action }]}
                >
                  <Text style={[localStyles.generateBtnText, { color: FACULTY_FLASHCARD_COLOR.actionInk }]}>
                    Add card
                  </Text>
                </Pressable>
                <Pressable
                  onPress={deleteDeckFromEditor}
                  accessibilityRole="button"
                  accessibilityLabel="Delete deck"
                  style={localStyles.deleteLink}
                >
                  <Text style={[type.bodyEmphasis, { color: tokens.danger }]}>Delete deck</Text>
                </Pressable>
              </>
            ) : null}
          </KeyboardAwareForm>
        </View>
      </Modal>
    </View>
  )
}

const localStyles = StyleSheet.create({
  headerZone: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  errorBox: { marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardCopy: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deleteLink: { marginTop: 8, alignSelf: "center", minHeight: 44, justifyContent: "center" },
  topicRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  configSettingRow: { marginTop: 12, gap: 8 },
  batchInput: { maxWidth: 96, alignSelf: "flex-start" },
  previewBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  previewToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardRowHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  distractorBox: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  distractorInput: { fontSize: 14, paddingVertical: 8 },
  generateBox: { gap: 10, padding: 14 },
  configSections: { gap: 28 },
  generateHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  generateIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deckList: { gap: 12 },
  editorCardList: { gap: 12 },
  generateBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  generateBtnText: { fontWeight: "700" },
  editorRoot: { flex: 1 },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editorBody: { padding: 16, gap: 10 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontWeight: "700", marginTop: 8 },
  cardRow: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
})
