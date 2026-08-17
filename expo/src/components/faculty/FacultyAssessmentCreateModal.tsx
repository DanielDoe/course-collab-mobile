import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { ASSESSMENT_TYPE_CONFIG, type AssessmentType } from "../../lib/faculty-assessment-utils"
import { FACULTY_ASSESSMENT_COLOR, facultyAssessmentThumb } from "../../lib/faculty-assessment-theme"
import { questionBankTypeLabel, stripQuestionPreview } from "../../lib/faculty-question-bank-utils"
import {
  instructorApi,
  type InstructorBankQuestion,
  type InstructorBankTopic,
} from "../../lib/instructor-api"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { useFacultyModuleScrollPadding, FacultySearchToolbar } from "./faculty-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetSection,
  FacultySheetSubmitButton,
  FacultySheetTextInput,

} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { NativeSelect } from "../NativeSelect"
import { secondsSelectOptions } from "./FacultyNativePickers"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  assessmentType: AssessmentType
  scope: Scope | null
  initialTitle?: string
  initialDescription?: string
  onClose: () => void
  onCreated: (quizId: number) => void
}

export function FacultyAssessmentCreateModal({
  visible,
  assessmentType,
  scope,
  initialTitle,
  initialDescription,
  onClose,
  onCreated,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  const insets = useSafeAreaInsets()
  const scrollPad = useFacultyModuleScrollPadding(24)
  const config = ASSESSMENT_TYPE_CONFIG[assessmentType]

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState("30")

  const [topics, setTopics] = useState<InstructorBankTopic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [view, setView] = useState<"topics" | "questions">("topics")
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [questions, setQuestions] = useState<InstructorBankQuestion[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const resetForm = useCallback(() => {
    setTitle("")
    setDescription("")
    setTimeLimit("30")
    setView("topics")
    setActiveTopic(null)
    setQuestions([])
    setSelectedIds([])
    setSearch("")
    setError("")
  }, [])

  useEffect(() => {
    if (!visible) {
      resetForm()
      return
    }
    setTitle(initialTitle ?? "")
    setDescription(initialDescription ?? "")
    if (!scope) return
    setTopicsLoading(true)
    instructorApi
      .getQuestionBankTopics(scope)
      .then(setTopics)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load question bank topics.")
      })
      .finally(() => setTopicsLoading(false))
  }, [visible, scope, resetForm, initialTitle, initialDescription])

  const loadQuestions = useCallback(async () => {
    if (!scope || !activeTopic) return
    setQuestionsLoading(true)
    setError("")
    try {
      const rows = await instructorApi.getQuestionBank(scope, { topic: activeTopic })
      setQuestions(rows)
      setSelectedIds((prev) => prev.filter((id) => rows.some((row) => row.id === id)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load questions.")
      setQuestions([])
    } finally {
      setQuestionsLoading(false)
    }
  }, [scope, activeTopic])

  useEffect(() => {
    if (!visible || view !== "questions" || !activeTopic) return
    void loadQuestions()
  }, [visible, view, activeTopic, loadQuestions])

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return topics
    return topics.filter((t) => t.name.toLowerCase().includes(q))
  }, [topics, search])

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return questions
    return questions.filter((item) =>
      [item.question_text, item.question_type, item.difficulty, item.topic]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [questions, search])

  function openTopic(topicName: string) {
    Keyboard.dismiss()
    setActiveTopic(topicName)
    setView("questions")
    setSearch("")
    setError("")
  }

  function backToTopics() {
    Keyboard.dismiss()
    setView("topics")
    setActiveTopic(null)
    setQuestions([])
    setSearch("")
  }

  function toggleQuestion(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function selectAllVisible() {
    setSelectedIds(filteredQuestions.map((q) => q.id))
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function handleCreate() {
    Keyboard.dismiss()
    if (!scope) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      AppAlert.alert("Title required", `Enter a ${config.shortLabel.toLowerCase()} title.`)
      return
    }
    if (selectedIds.length === 0) {
      AppAlert.alert("Select questions", "Choose at least one question from the bank.")
      return
    }
    const limit = Number.parseInt(timeLimit, 10)
    if (!Number.isFinite(limit) || limit < 5) {
      AppAlert.alert("Invalid timer", "Seconds per question must be at least 5.")
      return
    }

    setCreating(true)
    setError("")
    try {
      const result = await instructorApi.createQuizFromBank(scope, {
        title: trimmedTitle,
        description: description.trim() || null,
        question_ids: selectedIds,
        assessment_type: assessmentType,
        time_limit: limit,
      })
      AppAlert.alert(
        "Created",
        `${config.shortLabel} created with ${result.questions_added ?? selectedIds.length} question(s).`,
      )
      onCreated(result.quiz_id)
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not create assessment."
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title={`New ${config.shortLabel.toLowerCase()}`} onClose={onClose} />

        <ScrollView
          style={moduleStyles.scroll}
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetSection label="Details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Title">
              <FacultySheetTextInput
                value={title}
                onChangeText={setTitle}
                placeholder={`${config.shortLabel} title…`}
                accessibilityLabel="Title"
                testID="assessment-title"
                keyboardType="ascii-capable"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
                autoFocus
              />
            </FacultySheetField>
            <FacultySheetField label="Description (optional)">
              <FacultySheetTextInput
                multiline
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description for students…"
              />
            </FacultySheetField>
            <FacultySheetField label="Time per question">
              <NativeSelect
                placeholder="30 seconds"
                value={timeLimit}
                options={secondsSelectOptions(Number(timeLimit))}
                onChange={setTimeLimit}
              />
            </FacultySheetField>
          </FacultySheetSection>

          <FacultySheetSection
            label="Questions from bank"
            hint={
              view === "topics"
                ? `Pick a topic, then select the questions to include in this ${config.shortLabel.toLowerCase()}.`
                : undefined
            }
            tone={SHEET_SECTION.tools}
          >
            {view === "questions" ? (
              <Pressable style={styles.backRow} onPress={backToTopics}>
                <Ionicons name="chevron-back" size={20} color={FACULTY_ASSESSMENT_COLOR.link} />
                <Text style={[type.bodyEmphasis, { flex: 1, color: native.label, lineHeight: 22 }]} numberOfLines={2}>
                  {activeTopic}
                </Text>
              </Pressable>
            ) : null}

            <FacultySearchToolbar
              placement="inline"
              value={search}
              onChange={setSearch}
              placeholder={view === "topics" ? "Search topics…" : "Search questions…"}
              showFilter={false}
            />

            {view === "questions" ? (
              <View style={styles.selectionRow}>
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
                  {selectionCount} selected · {filteredQuestions.length} shown
                </Text>
                <Pressable
                  onPress={allVisibleSelected ? clearSelection : selectAllVisible}
                  accessibilityRole="button"
                  accessibilityLabel={allVisibleSelected ? "Clear all" : "Select all"}
                >
                  <Text style={[type.caption, { color: FACULTY_ASSESSMENT_COLOR.link, fontWeight: "600" }]}>
                    {allVisibleSelected ? "Clear all" : "Select all"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

            {view === "topics" ? (
              topicsLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={FACULTY_ASSESSMENT_COLOR.link} size="large" />
                </View>
              ) : filteredTopics.length === 0 ? (
                <FacultyEmptyState
                  icon="folder-outline"
                  title={topics.length === 0 ? "No topics yet" : "No matching topics"}
                  body={
                    topics.length === 0
                      ? "Add questions to the bank first, grouped by topic."
                      : "Try another search term."
                  }
                />
              ) : (
                <View style={styles.list}>
                  {filteredTopics.map((topic) => (
                    <FacultySignatureListCard
                      key={topic.id}
                      thumb={facultyAssessmentThumb(topic.name)}
                      icon="folder-outline"
                      title={topic.name}
                      metaLine={`${topic.question_count} question${topic.question_count === 1 ? "" : "s"}`}
                      onPress={() => openTopic(topic.name)}
                    />
                  ))}
                </View>
              )
            ) : questionsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={FACULTY_ASSESSMENT_COLOR.link} size="large" />
              </View>
            ) : filteredQuestions.length === 0 ? (
              <FacultyEmptyState
                icon="library-outline"
                title={questions.length === 0 ? "No questions in this topic" : "No matching questions"}
                body={
                  questions.length === 0
                    ? "This topic does not have any questions yet."
                    : "Try another search term."
                }
              />
            ) : (
              <View style={styles.list}>
                {filteredQuestions.map((question) => {
                  const selected = selectedIds.includes(question.id)
                  const preview = stripQuestionPreview(question.question_text) || "Untitled question"
                  return (
                    <Pressable
                      key={question.id}
                      style={({ pressed }) => [
                        moduleStyles.card,
                        styles.questionCard,
                        selected && { borderColor: FACULTY_ASSESSMENT_COLOR.link, backgroundColor: linkSoft },
                        pressed && moduleStyles.cardPressed,
                      ]}
                      onPress={() => toggleQuestion(question.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select question ${preview}`}
                      accessibilityState={{ selected }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: native.separator },
                          selected && {
                            backgroundColor: FACULTY_ASSESSMENT_COLOR.link,
                            borderColor: FACULTY_ASSESSMENT_COLOR.link,
                          },
                        ]}
                      >
                        {selected ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                      </View>
                      <View style={styles.questionMain}>
                        <View style={styles.questionPills}>
                          {question.question_type ? (
                            <FacultyStatusPill
                              label={questionBankTypeLabel(question.question_type)}
                              tone="neutral"
                            />
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
          </FacultySheetSection>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: native.groupedBackground,
              borderTopColor: native.separator,
            },
          ]}
        >
          <FacultySheetSubmitButton
            label={`Create ${config.shortLabel.toLowerCase()}${selectionCount > 0 ? ` (${selectionCount})` : ""}`}
            onPress={() => void handleCreate()}
            disabled={creating || selectionCount === 0 || !title.trim()}
            loading={creating}
          />
        </View>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  loadingBox: { paddingVertical: 32, alignItems: "center" },
  list: { gap: 12 },
  questionCard: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
