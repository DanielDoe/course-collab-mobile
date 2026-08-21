import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import type { LectureItem } from "../../lib/student-api"
import type { FlashcardCard, FlashcardDeck } from "../../lib/flashcards-api"
import type { TopicProgress } from "../../lib/practice-api"
import type { StudentSession } from "../../lib/session"
import {
  loadFlashcardDecks,
  loadFlashcardToolContext,
  loadLectureList,
  loadLectureToolContext,
  loadPracticeToolContext,
  loadPracticeTopics,
} from "../../lib/cora-tool-context"
import {
  buildCreateResourcePrompt,
  buildExplainConceptPrompt,
  buildFlashcardPrompt,
  buildGlossaryPrompt,
  buildQuizPrompt,
  buildReviewWorkPrompt,
  buildSummarizePrompt,
  cacheKeyForFlashcard,
  cacheKeyForLecture,
  cacheKeyForQuiz,
  FLASHCARD_TOOL_ACTIONS,
  QUIZ_TOOL_ACTIONS,
  type CoraToolFlowId,
  type CoraToolLaunchPayload,
  type FlashcardToolVariant,
  type QuizToolVariant,
} from "../../lib/cora-tool-flows"
import { findLatestCachedToolResult, getCachedToolResult } from "../../lib/cora-tool-results-cache"
import { CORA_TOOLS } from "../../lib/cora-nav-config"
import {
  FacultySheetChrome,
  FacultySheetContainer,
} from "../faculty/faculty-collab-sheet-ui"
import {
  CoraToolPickerCard,
  CoraToolPickerList,
  CoraToolPickerSection,
} from "./CoraToolPickerCard"
import { SYSTEM } from "../../constants/faculty-native-theme"

type Props = {
  visible: boolean
  toolId: CoraToolFlowId | null
  session: StudentSession
  onClose: () => void
  onLaunch: (payload: CoraToolLaunchPayload) => void
}

type Step =
  | "lecture"
  | "deck"
  | "card"
  | "flashcard-action"
  | "topic"
  | "quiz-action"
  | "concept"
  | "review"
  | "resource"

function toolTitle(toolId: CoraToolFlowId | null): string {
  return CORA_TOOLS.find((t) => t.id === toolId)?.title ?? "Cora tool"
}

export function CoraToolFlowSheet({ visible, toolId, session, onClose, onLaunch }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  const [step, setStep] = useState<Step>("lecture")
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")

  const [lectures, setLectures] = useState<LectureItem[]>([])
  const [cachedLectureIds, setCachedLectureIds] = useState<Set<number>>(new Set())

  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null)
  const [cards, setCards] = useState<FlashcardCard[]>([])
  const [selectedCard, setSelectedCard] = useState<FlashcardCard | null>(null)

  const [topics, setTopics] = useState<TopicProgress[]>([])
  const [selectedTopic, setSelectedTopic] = useState<TopicProgress | null>(null)

  const [freeText, setFreeText] = useState("")

  const initialStep = useMemo((): Step => {
    if (!toolId) return "lecture"
    if (toolId === "summarize" || toolId === "glossary") return "lecture"
    if (toolId === "flashcards") return "deck"
    if (toolId === "quiz") return "topic"
    if (toolId === "explain") return "concept"
    if (toolId === "review-work") return "review"
    if (toolId === "create-resource") return "resource"
    return "lecture"
  }, [toolId])

  const reset = useCallback(() => {
    setStep(initialStep)
    setLoading(false)
    setProcessing(false)
    setError("")
    setSelectedDeck(null)
    setSelectedCard(null)
    setSelectedTopic(null)
    setCards([])
    setFreeText("")
  }, [initialStep])

  useEffect(() => {
    if (!visible) return
    reset()
  }, [visible, toolId, reset])

  useEffect(() => {
    if (!visible || !toolId || !session) return
    let cancelled = false

    async function loadStepData() {
      setLoading(true)
      setError("")
      try {
        if (toolId === "summarize" || toolId === "glossary") {
          const list = await loadLectureList(session)
          if (cancelled) return
          setLectures(list)
          const cached = new Set<number>()
          await Promise.all(
            list.map(async (lecture) => {
              const hit = await findLatestCachedToolResult(toolId, "default", `lecture:${lecture.id}`)
              if (hit) cached.add(lecture.id)
            }),
          )
          if (!cancelled) setCachedLectureIds(cached)
        } else if (toolId === "flashcards") {
          const list = await loadFlashcardDecks(session)
          if (!cancelled) setDecks(list)
        } else if (toolId === "quiz") {
          const list = await loadPracticeTopics(session)
          if (!cancelled) setTopics(list)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load options.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadStepData()
    return () => {
      cancelled = true
    }
  }, [visible, toolId, session])

  const handleBack = () => {
    if (step === "card") {
      setStep("deck")
      setSelectedCard(null)
      return
    }
    if (step === "flashcard-action") {
      setStep("card")
      return
    }
    if (step === "quiz-action") {
      setStep("topic")
      return
    }
    onClose()
  }

  const launchLectureTool = async (lecture: LectureItem) => {
    if (!toolId || (toolId !== "summarize" && toolId !== "glossary")) return
    setProcessing(true)
    setError("")
    try {
      const ctx = await loadLectureToolContext(session, lecture)
      const cacheKey = cacheKeyForLecture(toolId, ctx.lectureId, ctx.contentHash)
      const cached =
        (await getCachedToolResult(cacheKey)) ??
        (await findLatestCachedToolResult(toolId, "default", cacheKey.resourceKey))

      const userMessage =
        toolId === "summarize" ? buildSummarizePrompt(ctx.label) : buildGlossaryPrompt(ctx.label)

      onLaunch({
        toolId,
        variant: "default",
        userMessage,
        contextBlock: ctx.contextBlock,
        cacheKey,
        sourceLabel: ctx.label,
        cachedResult: cached?.result,
        threadTitle: toolId === "summarize" ? `Summary: ${lecture.title}` : `Glossary: ${lecture.title}`,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare lecture.")
    } finally {
      setProcessing(false)
    }
  }

  const launchFlashcardTool = async (variant: FlashcardToolVariant) => {
    if (!selectedDeck || !selectedCard) return
    setProcessing(true)
    setError("")
    try {
      const ctx = await loadFlashcardToolContext(session, selectedDeck.id, selectedCard.id)
      if (!ctx) throw new Error("Flashcard not found.")
      const cacheKey = cacheKeyForFlashcard(variant, ctx.deck.id, ctx.card.id, ctx.contentHash)
      const cached =
        (await getCachedToolResult(cacheKey)) ??
        (await findLatestCachedToolResult("flashcards", variant, cacheKey.resourceKey))

      onLaunch({
        toolId: "flashcards",
        variant,
        userMessage: buildFlashcardPrompt(variant, ctx.label),
        contextBlock: ctx.contextBlock,
        cacheKey,
        sourceLabel: ctx.label,
        cachedResult: cached?.result,
        threadTitle: ctx.card.frontText.slice(0, 56),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare flashcard.")
    } finally {
      setProcessing(false)
    }
  }

  const launchQuizTool = async (variant: QuizToolVariant) => {
    if (!selectedTopic) return
    setProcessing(true)
    setError("")
    try {
      const topic =
        variant === "weak-areas"
          ? { ...selectedTopic, name: selectedTopic.name }
          : selectedTopic
      const ctx = await loadPracticeToolContext(session, topic, variant === "rapid" ? 3 : 5)
      const cacheKey = cacheKeyForQuiz(variant, ctx.topic.name, ctx.contentHash)
      const cached =
        (await getCachedToolResult(cacheKey)) ??
        (await findLatestCachedToolResult("quiz", variant, cacheKey.resourceKey))

      onLaunch({
        toolId: "quiz",
        variant,
        userMessage: buildQuizPrompt(variant, ctx.label),
        contextBlock: ctx.contextBlock,
        cacheKey,
        sourceLabel: ctx.label,
        cachedResult: cached?.result,
        threadTitle: `Quiz: ${ctx.topic.name}`,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare quiz.")
    } finally {
      setProcessing(false)
    }
  }

  const launchFreeTextTool = (mode: "explain" | "review-work" | "create-resource") => {
    const trimmed = freeText.trim()
    if (!trimmed) {
      setError("Enter some text to continue.")
      return
    }
    const userMessage =
      mode === "explain"
        ? buildExplainConceptPrompt(trimmed)
        : mode === "review-work"
          ? buildReviewWorkPrompt(trimmed)
          : buildCreateResourcePrompt(trimmed)

    onLaunch({
      toolId: mode,
      variant: "default",
      userMessage,
      contextBlock: "",
      cacheKey: {
        toolId: mode,
        variant: "default",
        resourceKey: `text:${hashText(trimmed)}`,
        contentHash: hashText(trimmed),
      },
      sourceLabel: trimmed.slice(0, 48),
      threadTitle: mode === "explain" ? "Explain concept" : mode === "review-work" ? "Review my work" : "Create resource",
    })
    onClose()
  }

  const selectDeck = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck)
    setLoading(true)
    setError("")
    try {
      const { flashcardsApi } = await import("../../lib/flashcards-api")
      const data = await flashcardsApi.getDeck(session, deck.id)
      setCards(data.cards ?? [])
      setStep("card")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cards.")
    } finally {
      setLoading(false)
    }
  }

  const headerTitle = useMemo(() => {
    if (step === "lecture") return `Choose lecture · ${toolTitle(toolId)}`
    if (step === "deck") return "Choose deck"
    if (step === "card") return selectedDeck?.title ?? "Choose card"
    if (step === "flashcard-action") return "What should Cora do?"
    if (step === "topic") return "Choose topic"
    if (step === "quiz-action") return "Quiz style"
    if (step === "concept") return "Concept to explain"
    if (step === "review") return "Paste your work"
    if (step === "resource") return "Source material"
    return toolTitle(toolId)
  }, [step, toolId, selectedDeck])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer menuSheet style={{ flex: 1 }}>
        <FacultySheetChrome topInset={insets.top} title={headerTitle} onClose={handleBack} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          {processing ? (
            <View style={styles.centered}>
              <ActivityIndicator color={SN.accent} size="large" />
              <Text style={[type.caption, { color: SN.secondaryLabel, marginTop: 10 }]}>
                Preparing Cora…
              </Text>
            </View>
          ) : null}

          {!processing && loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={SN.accent} />
            </View>
          ) : null}

          {!processing && !loading && error ? (
            <Text style={[type.caption, styles.error, { color: SN.secondaryLabel }]}>{error}</Text>
          ) : null}

          {!processing && !loading && step === "lecture" ? (
            <CoraToolPickerSection
              label="Lectures"
              hint="Cached summaries load instantly when available"
            >
              {lectures.length === 0 ? (
                <Text style={[type.caption, { color: SN.secondaryLabel }]}>No lectures published yet.</Text>
              ) : (
                <CoraToolPickerList>
                  {lectures.map((lecture, index) => {
                    const cached = cachedLectureIds.has(lecture.id)
                    return (
                      <CoraToolPickerCard
                        key={lecture.id}
                        index={index}
                        icon="play-outline"
                        title={lecture.title}
                        subtitle={`Week ${lecture.week}`}
                        meta={
                          cached
                            ? "Ready · cached"
                            : lecture.description?.trim() || "Tap to run with Cora"
                        }
                        metaColor={cached ? SYSTEM.green.color : undefined}
                        onPress={() => void launchLectureTool(lecture)}
                      />
                    )
                  })}
                </CoraToolPickerList>
              )}
            </CoraToolPickerSection>
          ) : null}

          {!processing && !loading && step === "deck" ? (
            <CoraToolPickerSection label="Flashcard decks">
              {decks.length === 0 ? (
                <Text style={[type.caption, { color: SN.secondaryLabel }]}>No decks available yet.</Text>
              ) : (
                <CoraToolPickerList>
                  {decks.map((deck, index) => (
                    <CoraToolPickerCard
                      key={deck.id}
                      index={index}
                      icon="layers-outline"
                      title={deck.title}
                      subtitle={deck.topic?.trim() || "Flashcard deck"}
                      meta={`${deck.cardCount} cards`}
                      onPress={() => void selectDeck(deck)}
                    />
                  ))}
                </CoraToolPickerList>
              )}
            </CoraToolPickerSection>
          ) : null}

          {!processing && !loading && step === "card" ? (
            <CoraToolPickerSection label="Pick a card">
              {cards.length === 0 ? (
                <Text style={[type.caption, { color: SN.secondaryLabel }]}>This deck has no cards yet.</Text>
              ) : (
                <CoraToolPickerList>
                  {cards.map((card, index) => (
                    <CoraToolPickerCard
                      key={card.id}
                      index={index}
                      icon="reader-outline"
                      title={card.frontText.trim()}
                      subtitle={card.backText.trim()}
                      meta="Choose action next"
                      onPress={() => {
                        setSelectedCard(card)
                        setStep("flashcard-action")
                      }}
                    />
                  ))}
                </CoraToolPickerList>
              )}
            </CoraToolPickerSection>
          ) : null}

          {!processing && !loading && step === "flashcard-action" ? (
            <CoraToolPickerSection label="Actions">
              <CoraToolPickerList>
                {FLASHCARD_TOOL_ACTIONS.map((action, index) => (
                  <CoraToolPickerCard
                    key={action.id}
                    index={index}
                    icon={action.icon}
                    title={action.label}
                    subtitle={action.subtitle}
                    onPress={() => void launchFlashcardTool(action.id)}
                  />
                ))}
              </CoraToolPickerList>
            </CoraToolPickerSection>
          ) : null}

          {!processing && !loading && step === "topic" ? (
            <CoraToolPickerSection label="Practice topics">
              {topics.length === 0 ? (
                <Text style={[type.caption, { color: SN.secondaryLabel }]}>No practice topics yet.</Text>
              ) : (
                <CoraToolPickerList>
                  {topics.map((topic, index) => (
                    <CoraToolPickerCard
                      key={topic.name}
                      index={index}
                      icon="help-circle-outline"
                      title={topic.name}
                      subtitle={`${topic.questionCount} questions`}
                      meta={`${topic.accuracy}% accuracy`}
                      onPress={() => {
                        setSelectedTopic(topic)
                        setStep("quiz-action")
                      }}
                    />
                  ))}
                </CoraToolPickerList>
              )}
            </CoraToolPickerSection>
          ) : null}

          {!processing && !loading && step === "quiz-action" ? (
            <CoraToolPickerSection label="Quiz style">
              <CoraToolPickerList>
                {QUIZ_TOOL_ACTIONS.map((action, index) => (
                  <CoraToolPickerCard
                    key={action.id}
                    index={index}
                    icon={action.icon}
                    title={action.label}
                    subtitle={action.subtitle}
                    onPress={() => void launchQuizTool(action.id)}
                  />
                ))}
              </CoraToolPickerList>
            </CoraToolPickerSection>
          ) : null}

          {!processing && !loading && (step === "concept" || step === "review" || step === "resource") ? (
            <CoraToolPickerSection
              label={step === "concept" ? "Your concept" : step === "review" ? "Your work" : "Material"}
            >
              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                placeholder={
                  step === "concept"
                    ? "e.g. Kirchhoff's voltage law, convolution, pointer arithmetic…"
                    : step === "review"
                      ? "Paste homework, essay draft, code, or lab report…"
                      : "Paste notes, outline ideas, or describe what to create…"
                }
                placeholderTextColor={native.tertiaryLabel}
                multiline
                style={[
                  styles.textArea,
                  {
                    color: native.label,
                    borderColor: native.separator,
                    backgroundColor: native.groupedBackground,
                  },
                ]}
              />
              <Pressable
                onPress={() =>
                  launchFreeTextTool(
                    step === "concept" ? "explain" : step === "review" ? "review-work" : "create-resource",
                  )
                }
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: SN.accent },
                  pressed && { opacity: NATIVE.pressedOpacity },
                ]}
              >
                <Text style={styles.primaryBtnText}>Continue with Cora</Text>
              </Pressable>
            </CoraToolPickerSection>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

function hashText(input: string): string {
  let hash = 0
  const normalized = input.trim().replace(/\s+/g, " ")
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 8,
    gap: 12,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  error: {
    textAlign: "center",
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
})
