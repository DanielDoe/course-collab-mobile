import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { questionBankTypeLabel } from "../../lib/faculty-question-bank-utils"
import { stripQuestionPreview } from "../../lib/faculty-playground-utils"
import {
  FACULTY_PLAYGROUND_COLOR,
  facultyPlaygroundTopicThumb,
} from "../../lib/faculty-playground-theme"
import { APP_BUTTON_RADIUS } from "../../constants/app-button"
import {
  instructorApi,
  type PlaygroundBankQuestion,
  type PlaygroundSessionCreateResult,
  type PlaygroundTopic,
} from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useSearchDockBottomInset } from "../../context/ModuleSearchDockContext"
import { useFacultyModuleNestedHeader } from "../../context/FacultyModuleHeaderContext"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout, FacultySearchToolbar } from "./faculty-module-shell"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { useSheetPlaceholderColor } from "./faculty-collab-sheet-ui"

type Scope = { instructorId: number; courseId: number }

type Props = {
  scope: Scope
  topics: PlaygroundTopic[]
  topicSearchHint?: string
  onSessionCreated: (result: PlaygroundSessionCreateResult) => void
  onReloadTopics: () => Promise<void>
}

const QUESTIONS_FOOTER_HEIGHT = 132

export function FacultyPlaygroundQuestionBank({
  scope,
  topics,
  topicSearchHint,
  onSessionCreated,
  onReloadTopics,
}: Props) {
  const { native, type, styles: moduleStyles } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const searchDockInset = useSearchDockBottomInset()
  const [view, setView] = useState<"topics" | "questions">("topics")
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({
    extraBottom: view === "questions" ? QUESTIONS_FOOTER_HEIGHT + 16 : 24,
    listTopGap: 12,
  })
  const placeholderColor = useSheetPlaceholderColor()
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [questions, setQuestions] = useState<PlaygroundBankQuestion[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [search, setSearch] = useState("")
  const [durationSec, setDurationSec] = useState("10")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const hint = topicSearchHint?.trim()
    if (!hint) return
    setSearch(hint)
    const matched = topics.find((topic) => topic.topic.toLowerCase().includes(hint.toLowerCase()))
    if (matched) setActiveTopic(matched.topic)
  }, [topicSearchHint, topics])

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return topics
    return topics.filter((t) => t.topic.toLowerCase().includes(q))
  }, [topics, search])

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return questions
    return questions.filter((item) =>
      [item.questionText, item.questionType, item.difficulty, item.topic]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [questions, search])

  const loadQuestions = useCallback(async () => {
    if (!activeTopic) return
    setError("")
    setLoading(true)
    try {
      const rows = await instructorApi.getPlaygroundQuestions(scope, { topic: activeTopic })
      setQuestions(rows)
      setSelectedIds((prev) => prev.filter((id) => rows.some((row) => row.id === id)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load questions for this topic.")
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [scope, activeTopic])

  useEffect(() => {
    if (view !== "questions" || !activeTopic) return
    void loadQuestions()
  }, [view, activeTopic, loadQuestions])

  function openTopic(topic: string) {
    setActiveTopic(topic)
    setView("questions")
    setSearch("")
    setSelectedIds([])
    setError("")
  }

  const backToTopics = useCallback(() => {
    setView("topics")
    setActiveTopic(null)
    setQuestions([])
    setSelectedIds([])
    setSearch("")
    setError("")
  }, [])

  useFacultyModuleNestedHeader({
    active: view === "questions" && Boolean(activeTopic),
    title: activeTopic ?? "",
    onBack: backToTopics,
  })

  function toggleQuestion(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function selectAllVisible() {
    setSelectedIds(filteredQuestions.map((q) => q.id))
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      if (view === "topics") {
        await onReloadTopics()
      } else {
        await loadQuestions()
      }
    } finally {
      setRefreshing(false)
    }
  }

  async function createSession() {
    if (selectedIds.length === 0) {
      AppAlert.alert("Select questions", "Choose at least one question to start a playground session.")
      return
    }
    const duration = Number.parseInt(durationSec, 10)
    if (!Number.isFinite(duration) || duration < 5) {
      AppAlert.alert("Invalid timer", "Seconds per question must be at least 5.")
      return
    }

    setCreating(true)
    setError("")
    try {
      const result = await instructorApi.createPlaygroundSession(scope, {
        questionIds: selectedIds,
        questionCount: selectedIds.length,
        durationSec: duration,
        topics: activeTopic ? [activeTopic] : [],
      })
      onSessionCreated(result)
      backToTopics()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not create session."
      setError(message)
      AppAlert.alert("Create failed", message)
    } finally {
      setCreating(false)
    }
  }

  const selectionCount = selectedIds.length
  const allVisibleSelected =
    filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.includes(q.id))

  return (
    <View style={moduleStyles.root}>
      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[localStyles.content, listScrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_PLAYGROUND_COLOR.link}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {view === "topics" ? (
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 20 }]}>
            Pick a topic, choose the questions you want, then create a live playground session.
          </Text>
        ) : null}

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={view === "topics" ? "Search topics…" : "Search questions in this topic…"}
          showFilter={false}
        />

        {view === "questions" ? (
          <View style={localStyles.selectionRow}>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
              {selectionCount} selected · {filteredQuestions.length} shown
            </Text>
            <View style={localStyles.selectionActions}>
              <Pressable onPress={allVisibleSelected ? clearSelection : selectAllVisible}>
                <Text style={[type.caption, { color: FACULTY_PLAYGROUND_COLOR.link, fontWeight: "600" }]}>
                  {allVisibleSelected ? "Clear all" : "Select all"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {error ? (
          <Text
            style={[
              type.caption,
              {
                color: FACULTY_PLAYGROUND_COLOR.danger,
                fontWeight: "600",
                backgroundColor: `${FACULTY_PLAYGROUND_COLOR.danger}14`,
                borderRadius: 10,
                padding: 12,
              },
            ]}
          >
            {error}
          </Text>
        ) : null}

        {view === "topics" ? (
          filteredTopics.length === 0 ? (
            <FacultyEmptyState
              icon="folder-outline"
              title={topics.length === 0 ? "No topics yet" : "No matching topics"}
              body={
                topics.length === 0
                  ? "Playground topics will appear once questions are available."
                  : "Try another search term."
              }
            />
          ) : (
            <View style={localStyles.list}>
              {filteredTopics.map((topic) => (
                <FacultySignatureListCard
                  key={topic.topic}
                  thumb={facultyPlaygroundTopicThumb(topic.topic)}
                  icon="folder-outline"
                  title={topic.topic}
                  metaLine={`${topic.question_count} question${topic.question_count === 1 ? "" : "s"}`}
                  onPress={() => openTopic(topic.topic)}
                />
              ))}
            </View>
          )
        ) : loading ? (
          <View style={localStyles.loadingBox}>
            <ActivityIndicator color={FACULTY_PLAYGROUND_COLOR.link} size="large" />
          </View>
        ) : filteredQuestions.length === 0 ? (
          <FacultyEmptyState
            icon="library-outline"
            title={questions.length === 0 ? "No questions in this topic" : "No matching questions"}
            body={
              questions.length === 0
                ? "This topic does not have any playground questions yet."
                : "Try another search term."
            }
          />
        ) : (
          <View style={localStyles.list}>
            {filteredQuestions.map((question) => {
              const selected = selectedIds.includes(question.id)
              const preview = stripQuestionPreview(question.questionText, 220) || "Untitled question"
              return (
                <Pressable
                  key={question.id}
                  style={({ pressed }) => [
                    moduleStyles.card,
                    localStyles.questionCard,
                    selected && {
                      borderColor: FACULTY_PLAYGROUND_COLOR.link,
                      backgroundColor: `${FACULTY_PLAYGROUND_COLOR.link}14`,
                    },
                    pressed && moduleStyles.cardPressed,
                  ]}
                  onPress={() => toggleQuestion(question.id)}
                >
                  <View
                    style={[
                      localStyles.checkbox,
                      { borderColor: native.separator },
                      selected && {
                        backgroundColor: FACULTY_PLAYGROUND_COLOR.link,
                        borderColor: FACULTY_PLAYGROUND_COLOR.link,
                      },
                    ]}
                  >
                    {selected ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                  </View>
                  <View style={localStyles.questionMain}>
                    <View style={localStyles.questionPills}>
                      {question.questionType ? (
                        <FacultyStatusPill label={questionBankTypeLabel(question.questionType)} tone="neutral" />
                      ) : null}
                      {question.difficulty ? (
                        <FacultyStatusPill label={question.difficulty} tone="neutral" />
                      ) : null}
                    </View>
                    <Text
                      style={[type.bodyEmphasis, { color: native.label, lineHeight: 22, fontSize: 15 }]}
                      numberOfLines={4}
                    >
                      {preview}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        )}
      </ScrollView>

      {view === "questions" ? (
        <View
          style={[
            localStyles.footer,
            {
              paddingBottom: insets.bottom + 12,
              marginBottom: searchDockInset,
              backgroundColor: native.groupedBackground,
              borderTopColor: native.separator,
            },
          ]}
        >
          <View style={localStyles.footerTimer}>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
              Seconds / question
            </Text>
            <TextInput
              style={[
                localStyles.footerInput,
                {
                  borderColor: native.separator,
                  backgroundColor: native.secondaryGrouped,
                  color: native.label,
                },
              ]}
              value={durationSec}
              onChangeText={setDurationSec}
              keyboardType="number-pad"
              maxLength={3}
              placeholderTextColor={placeholderColor}
            />
          </View>
          <Pressable
            style={[
              localStyles.createBtn,
              { backgroundColor: FACULTY_PLAYGROUND_COLOR.action },
              (creating || selectionCount === 0) && localStyles.createBtnDisabled,
            ]}
            disabled={creating || selectionCount === 0}
            onPress={() => void createSession()}
          >
            {creating ? (
              <ActivityIndicator color={FACULTY_PLAYGROUND_COLOR.actionInk} />
            ) : (
              <>
                <Ionicons name="flash-outline" size={18} color={FACULTY_PLAYGROUND_COLOR.actionInk} />
                <Text style={localStyles.createBtnText}>
                  Create session{selectionCount > 0 ? ` (${selectionCount})` : ""}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const localStyles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectionActions: { flexDirection: "row", gap: 12 },
  loadingBox: { paddingVertical: 32, alignItems: "center" },
  list: { gap: 12 },
  questionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  questionMain: { flex: 1, gap: 8, minWidth: 0 },
  questionPills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerTimer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerInput: {
    minWidth: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: APP_BUTTON_RADIUS,
    paddingVertical: 14,
  },
  createBtnDisabled: { opacity: 0.55 },
  createBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
})
