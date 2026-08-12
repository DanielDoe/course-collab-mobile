import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { NativeSwitch } from "../NativeSwitch"
import {
  instructorApi,
  type InstructorBankQuestion,
  type PracticeTopic,
  type PracticeTopicQuestion} from "../../lib/instructor-api"
import { questionBankTypeLabel, stripQuestionPreview } from "../../lib/faculty-question-bank-utils"
import {
  FACULTY_PRACTICE_COLOR,
  facultyPracticeDifficultyTone,
  facultyPracticeQuestionThumb,
} from "../../lib/faculty-practice-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultySearchToolbar } from "./faculty-module-shell"
import { FacultyQuestionBankPreviewModal } from "./FacultyQuestionBankPreviewModal"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner
} from "./faculty-collab-sheet-ui"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  topic: PracticeTopic | null
  session: string
  acting: boolean
  onClose: () => void
  onOpenSettings: () => void
  onChanged: () => void
  onActingChange: (acting: boolean) => void
}

export function FacultyPracticeTopicQuestionsModal({
  visible,
  scope,
  topic,
  session,
  acting,
  onClose,
  onOpenSettings,
  onChanged,
  onActingChange}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [questions, setQuestions] = useState<PracticeTopicQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [previewQuestion, setPreviewQuestion] = useState<InstructorBankQuestion | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const load = useCallback(async () => {
    if (!scope || !topic) return
    setError("")
    setLoading(true)
    try {
      const res = await instructorApi.getPracticeTopicQuestions(scope, topic.name, session)
      setQuestions(res.questions)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load questions.")
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [scope, topic, session])

  useEffect(() => {
    if (!visible || !scope || !topic) return
    setSearch("")
    void load()
  }, [visible, scope, topic, session, load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return questions
    return questions.filter((item) =>
      [item.questionText, item.questionType, item.difficulty, item.hint]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [questions, search])

  const allVisibleAvailable =
    filtered.length > 0 && filtered.every((q) => q.isAvailable)

  async function runMutation(action: () => Promise<unknown>) {
    if (!scope) return
    onActingChange(true)
    setError("")
    try {
      await action()
      await load()
      onChanged()
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.message.includes("<!DOCTYPE"))) {
        setError("Question hide/show needs a backend update. You can still preview questions.")
      } else {
        setError(err instanceof ApiError ? err.message : "Update failed.")
      }
      await load()
    } finally {
      onActingChange(false)
    }
  }

  async function toggleQuestion(question: PracticeTopicQuestion, enabled: boolean) {
    setQuestions((prev) =>
      prev.map((row) => (row.id === question.id ? { ...row, isAvailable: enabled } : row)),
    )
    await runMutation(() =>
      instructorApi.togglePracticeQuestion(scope!, {
        questionId: question.id,
        session,
        isAvailable: enabled}),
    )
  }

  async function setAllVisible(enabled: boolean) {
    const ids = filtered.map((q) => q.id)
    if (ids.length === 0 || !topic) return
    setQuestions((prev) =>
      prev.map((row) => (ids.includes(row.id) ? { ...row, isAvailable: enabled } : row)),
    )
    await runMutation(() =>
      instructorApi.bulkTogglePracticeQuestions(scope!, {
        topic: topic.name,
        session,
        questionIds: ids,
        isAvailable: enabled}),
    )
  }

  async function openPreview(question: PracticeTopicQuestion) {
    if (!scope) return
    setPreviewLoading(true)
    try {
      const full = await instructorApi.getQuestionBankQuestion(scope, question.id)
      setPreviewQuestion(full)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load question preview.")
    } finally {
      setPreviewLoading(false)
    }
  }

  if (!topic) return null

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title={topic.name}
            onClose={onClose}
            rightSlot={
              <Pressable
                onPress={onOpenSettings}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Topic settings"
              >
                <Ionicons name="settings-outline" size={22} color={FACULTY_PRACTICE_COLOR.link} />
              </Pressable>
            }
          />

          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load().finally(() => setRefreshing(false))}
                tintColor={FACULTY_PRACTICE_COLOR.link}
              />
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={collabSheetStyles.introText}>
              Turn questions on or off for the student Practice Hub. Hidden questions will not appear in practice
              sessions.
            </Text>

            <FacultySearchToolbar
              placement="inline"
              value={search}
              onChange={setSearch}
              placeholder="Search questions…"
              showFilter={false}
            />

            {filtered.length > 0 ? (
              <View style={styles.bulkRow}>
                <Text style={[type.caption, { fontWeight: "700", color: native.secondaryLabel }]}>
                  {filtered.filter((q) => q.isAvailable).length} visible in list
                </Text>
                <Pressable onPress={() => void setAllVisible(!allVisibleAvailable)} disabled={acting}>
                  <Text style={[type.bodyEmphasis, { color: FACULTY_PRACTICE_COLOR.link }]}>
                    {allVisibleAvailable ? "Hide all shown" : "Show all shown"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {error ? <FacultySheetErrorBanner message={error} /> : null}

            {loading ? (
              <ActivityIndicator color={FACULTY_PRACTICE_COLOR.link} style={styles.loader} />
            ) : filtered.length === 0 ? (
              <FacultyEmptyState
                icon="help-circle-outline"
                title={questions.length === 0 ? "No questions" : "No matches"}
                body={
                  questions.length === 0
                    ? "This topic has no questions in the bank yet."
                    : "Try another search term."
                }
              />
            ) : (
              <View style={styles.list}>
                {filtered.map((question, index) => {
                  const preview = stripQuestionPreview(question.questionText)
                  const thumb = facultyPracticeQuestionThumb(index)
                  return (
                    <View
                      key={question.id}
                      style={[
                        styles.card,
                        tokens.cardShadow,
                        {
                          backgroundColor: native.secondaryGrouped,
                          borderColor: tokens.border,
                        },
                        !question.isAvailable && styles.cardHidden,
                      ]}
                    >
                      <View style={styles.cardTop}>
                        <SolidListThumbTile thumb={thumb} size="compact">
                          <Text style={[type.caption, styles.thumbLabel, { color: thumb.icon }]}>
                            Q{index + 1}
                          </Text>
                        </SolidListThumbTile>
                        <View style={styles.cardCopy}>
                          <View style={styles.titleRow}>
                            <View style={styles.pillRow}>
                              {question.questionType ? (
                                <FacultyStatusPill
                                  label={questionBankTypeLabel(question.questionType)}
                                  tone="neutral"
                                />
                              ) : null}
                              {question.difficulty ? (
                                <FacultyStatusPill
                                  label={question.difficulty}
                                  tone={facultyPracticeDifficultyTone(question.difficulty)}
                                />
                              ) : null}
                            </View>
                            <NativeSwitch
                              value={question.isAvailable}
                              disabled={acting}
                              activeTrackColor={FACULTY_PRACTICE_COLOR.link}
                              onValueChange={(enabled) => void toggleQuestion(question, enabled)}
                            />
                          </View>
                          <Text
                            style={[
                              type.bodyEmphasis,
                              styles.questionText,
                              { color: question.isAvailable ? native.label : native.secondaryLabel },
                            ]}
                            numberOfLines={3}
                          >
                            {preview || "Untitled question"}
                          </Text>
                          {(question.options ?? []).length > 0 ? (
                            <Text style={[type.caption, { color: native.tertiaryLabel }]} numberOfLines={1}>
                              {(question.options ?? []).length} options
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Pressable
                        style={styles.previewBtn}
                        onPress={() => void openPreview(question)}
                        disabled={previewLoading}
                      >
                        <Ionicons name="eye-outline" size={16} color={FACULTY_PRACTICE_COLOR.link} />
                        <Text style={[type.caption, styles.previewLabel, { color: FACULTY_PRACTICE_COLOR.link }]}>
                          Preview question
                        </Text>
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </FacultySheetContainer>
      </Modal>

      <FacultyQuestionBankPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
    </>
  )
}

const styles = StyleSheet.create({
  bulkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loader: { marginTop: 32 },
  list: { gap: 12 },
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  cardHidden: { opacity: 0.72 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardCopy: { flex: 1, gap: 6, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  thumbLabel: { fontWeight: "700", fontSize: 11 },
  questionText: { fontSize: 15, lineHeight: 21 },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  previewLabel: { fontWeight: "700" },
})