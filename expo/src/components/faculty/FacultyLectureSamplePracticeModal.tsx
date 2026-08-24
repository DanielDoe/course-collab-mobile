import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorLecture } from "../../lib/instructor-api"
import {
  defaultSamplePracticeConfig,
  emptySamplePracticeQuestion,
  type LectureSamplePracticeConfig,
  type LectureSamplePracticeQuestion} from "../../lib/lecture-types"
import {
  parseLectureSamplePractice,
  subquestionOptionsFromText,
  subquestionOptionsToText,
} from "../../lib/lecture-sample-practice-utils"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetAddButton,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetSaveAction,
  FacultySheetSection,
  FacultySheetToggleRow,
  sheetPlaceholderColor
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultyLectureSamplePracticePreview } from "./FacultyLectureSamplePracticePreview"

type Props = {
  visible: boolean
  lecture: InstructorLecture | null
  onClose: () => void
}

function QuestionEditor({
  question,
  onChange,
  onRemove}: {
  question: LectureSamplePracticeQuestion
  onChange: (q: LectureSamplePracticeQuestion) => void
  onRemove: () => void
}) {
  const collabSheetStyles = useCollabSheetStyles()
  const optionsText = subquestionOptionsToText(question.options)

  return (
    <>
      <FacultySheetSection label="Student preview" tone={SHEET_SECTION.tools}>
        <FacultyLectureSamplePracticePreview question={question} />
      </FacultySheetSection>

      <FacultySheetSection
        label={question.title || "Untitled"}
        tone={SHEET_SECTION.edit}
        action={
          <Pressable hitSlop={8} onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove question">
            <Ionicons name="trash-outline" size={18} color="#b91c1c" />
          </Pressable>
        }
      >
        <FacultySheetField label="Title">
          <TextInput
            style={collabSheetStyles.fieldInput}
            value={question.title}
            onChangeText={(title) => onChange({ ...question, title })}
          />
        </FacultySheetField>
        <FacultySheetField label="Topic">
          <TextInput
            style={collabSheetStyles.fieldInput}
            value={question.topic ?? ""}
            onChangeText={(topic) => onChange({ ...question, topic })}
          />
        </FacultySheetField>
        <FacultySheetField label="Question text">
          <TextInput
            style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
            value={question.question_text}
            onChangeText={(question_text) => onChange({ ...question, question_text })}
            multiline
            textAlignVertical="top"
          />
        </FacultySheetField>
        <FacultySheetField label="Options (one per line)">
          <TextInput
            style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
            value={optionsText}
            onChangeText={(text) => {
              onChange({ ...question, options: subquestionOptionsFromText(text) })
            }}
            multiline
            textAlignVertical="top"
          />
        </FacultySheetField>
        <FacultySheetField label="Correct answer">
          <View style={localStyles.answerChips}>
            {(question.options.length > 0
              ? question.options.map((opt) => opt.id.toUpperCase())
              : ["A", "B", "C", "D"]
            ).map((letter) => {
              const selected = (question.correct_answer ?? "").toUpperCase() === letter
              return (
                <Pressable
                  key={letter}
                  style={[localStyles.answerChip, selected && localStyles.answerChipSelected]}
                  onPress={() => onChange({ ...question, correct_answer: letter })}
                >
                  <Text
                    style={[
                      localStyles.answerChipText,
                      selected && localStyles.answerChipTextSelected,
                    ]}
                  >
                    {letter}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </FacultySheetField>
        <FacultySheetField label="Explanation (shown after submit)">
          <TextInput
            style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
            value={question.explanation ?? ""}
            onChangeText={(explanation) => onChange({ ...question, explanation })}
            multiline
            textAlignVertical="top"
            placeholderTextColor={sheetPlaceholderColor}
          />
        </FacultySheetField>
      </FacultySheetSection>
    </>
  )
}

export function FacultyLectureSamplePracticeModal({ visible, lecture, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const { scope } = useFacultyScope()
  const [config, setConfig] = useState<LectureSamplePracticeConfig>(defaultSamplePracticeConfig())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope || !lecture) return
    setLoading(true)
    setError("")
    try {
      const data = await instructorApi.getLectureSamplePractice(scope, lecture.id)
      setConfig(parseLectureSamplePractice(data.config ?? defaultSamplePracticeConfig()))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sample practice.")
      setConfig(defaultSamplePracticeConfig())
    } finally {
      setLoading(false)
    }
  }, [scope, lecture])

  useEffect(() => {
    if (visible && lecture) void load()
  }, [visible, lecture, load])

  if (!lecture) return null

  async function save() {
    if (!scope || !lecture) return
    setSaving(true)
    setError("")
    try {
      const payload = parseLectureSamplePractice(config)
      const result = await instructorApi.saveLectureSamplePractice(scope, lecture.id, payload)
      setConfig(parseLectureSamplePractice(result.config))
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save sample practice.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Sample practice"
          onClose={onClose}
          rightSlot={
            <FacultySheetSaveAction
              label="Save"
              saving={saving}
              disabled={loading}
              onPress={() => void save()}
            />
          }
        />

        {loading ? (
          <View style={localStyles.loadingBox}>
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          >
            {error ? <FacultySheetErrorBanner message={error} /> : null}

            <FacultySheetSection label="Sample practice settings" hint={lecture.title} tone={SHEET_SECTION.tools}>
              <FacultySheetToggleRow
                icon="sparkles-outline"
                title="Enabled on slides"
                subtitle="Shows the sample practice button in the lecture viewer"
                value={config.enabled}
                onValueChange={(enabled) => setConfig({ ...config, enabled })}
              />
              <FacultySheetField label="Button label">
                <TextInput
                  style={collabSheetStyles.fieldInput}
                  value={config.button_label ?? "Sample Practice"}
                  onChangeText={(button_label) => setConfig({ ...config, button_label })}
                />
              </FacultySheetField>
            </FacultySheetSection>

            <FacultySheetSection
              label={`Questions (${config.questions.length})`}
              tone={SHEET_SECTION.edit}
              action={
                <FacultySheetAddButton
                  label="Add question"
                  onPress={() =>
                    setConfig({
                      ...config,
                      questions: [...config.questions, emptySamplePracticeQuestion(config.questions.length)]})
                  }
                />
              }
            >
              {config.questions.length === 0 ? (
                <View style={localStyles.empty}>
                  <Ionicons name="sparkles-outline" size={24} color="#94a3b8" />
                  <Text style={collabSheetStyles.emptyText}>No sample practice questions yet.</Text>
                </View>
              ) : null}
            </FacultySheetSection>

            {config.questions.map((q, idx) => (
              <QuestionEditor
                key={q.id}
                question={q}
                onChange={(next) => {
                  const questions = [...config.questions]
                  questions[idx] = next
                  setConfig({ ...config, questions })
                }}
                onRemove={() =>
                  setConfig({ ...config, questions: config.questions.filter((_, i) => i !== idx) })
                }
              />
            ))}
          </ScrollView>
        )}
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 12 },
  answerChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  answerChip: {
    minWidth: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  answerChipSelected: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  answerChipText: { fontSize: 15, fontWeight: "700", color: "#475569" },
  answerChipTextSelected: { color: "#ffffff" },
})
