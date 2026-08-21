import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { hasActiveQuestionMedia, type QuestionMedia } from "../../lib/classroom-submission"
import {
  BANK_DIFFICULTY_OPTIONS,
  BANK_QUESTION_TYPES,
  EVALUATION_MODE_OPTIONS,
  bankQuestionOptionsToEditable,
  bankTypeRequiresOptions,
  buildBankQuestionSavePayload,
  parseBankGuidelines,
  parseBankQuestionMedia,
  parseBankSubquestions,
  questionBankTypeLabel,
  type BankEditableOption} from "../../lib/faculty-question-bank-utils"
import { instructorApi, type InstructorBankQuestion } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { NATIVE } from "../../constants/faculty-native-theme"
import { QuestionMediaView } from "../rewards/QuestionContent"
import { FacultyGroupedFilterSheet } from "./faculty-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetAddButton,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetOutlineButton,
  FacultySheetSaveAction,
  FacultySheetSection,
  FacultySheetSelectButton,
  FacultySheetTextInput,

} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FACULTY_QUESTION_BANK_COLOR } from "../../lib/faculty-question-bank-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Props = {
  visible: boolean
  questionId?: number | null
  createMode?: boolean
  duplicateFrom?: InstructorBankQuestion | null
  initialQuestionType?: string
  onClose: () => void
  onSaved: () => void
}

type PickerKind = "type" | "difficulty" | "evaluation" | null

export function FacultyQuestionBankEditorModal({
  visible,
  questionId,
  createMode = false,
  duplicateFrom,
  initialQuestionType,
  onClose,
  onSaved}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [error, setError] = useState("")
  const [picker, setPicker] = useState<PickerKind>(null)

  const [questionText, setQuestionText] = useState("")
  const [questionType, setQuestionType] = useState("mcq")
  const [difficulty, setDifficulty] = useState("medium")
  const [topic, setTopic] = useState("")
  const [hint, setHint] = useState("")
  const [explanation, setExplanation] = useState("")
  const [sampleAnswer, setSampleAnswer] = useState("")
  const [expectedAnswer, setExpectedAnswer] = useState("")
  const [evaluationMode, setEvaluationMode] = useState("auto")
  const [guidelines, setGuidelines] = useState<string[]>([])
  const [newGuideline, setNewGuideline] = useState("")
  const [options, setOptions] = useState<BankEditableOption[]>([
    { option_text: "", is_correct: true, option_order: 1 },
    { option_text: "", is_correct: false, option_order: 2 },
  ])
  const [media, setMedia] = useState<QuestionMedia | null>(null)
  const [subquestions, setSubquestions] = useState<unknown>(null)
  const [solutionConfig, setSolutionConfig] = useState<unknown>(null)

  const requiresOptions = bankTypeRequiresOptions(questionType)
  const isMultiPart = questionType === "multi_part"
  const isCircuit = questionType === "circuit_submission"
  const title = createMode ? "New question" : "Edit question"

  const pickerGroups = useMemo(() => {
    if (picker === "type") {
      return [
        {
          id: "type",
          title: "Question type",
          value: questionType,
          options: BANK_QUESTION_TYPES.map((t) => ({ value: t.id, label: t.label }))},
      ]
    }
    if (picker === "difficulty") {
      return [
        {
          id: "difficulty",
          title: "Difficulty",
          value: difficulty,
          options: BANK_DIFFICULTY_OPTIONS.map((d) => ({ value: d.value, label: d.label }))},
      ]
    }
    if (picker === "evaluation") {
      return [
        {
          id: "evaluation",
          title: "Grading mode",
          value: evaluationMode,
          options: EVALUATION_MODE_OPTIONS.map((d) => ({ value: d.value, label: d.label }))},
      ]
    }
    return []
  }, [picker, questionType, difficulty, evaluationMode])

  function resetForm(typeOverride?: string) {
    setQuestionText("")
    setQuestionType(typeOverride ?? initialQuestionType ?? "mcq")
    setDifficulty("medium")
    setTopic("")
    setHint("")
    setExplanation("")
    setSampleAnswer("")
    setExpectedAnswer("")
    setEvaluationMode("auto")
    setGuidelines([])
    setNewGuideline("")
    setOptions([
      { option_text: "", is_correct: true, option_order: 1 },
      { option_text: "", is_correct: false, option_order: 2 },
    ])
    setMedia(null)
    setSubquestions(null)
    setSolutionConfig(null)
    setError("")
  }

  function applyQuestion(q: InstructorBankQuestion) {
    setQuestionText(q.question_text ?? "")
    setQuestionType(q.question_type ?? "mcq")
    setDifficulty(q.difficulty ?? "medium")
    setTopic(q.topic ?? "")
    setHint(q.hint ?? "")
    setExplanation(q.explanation ?? "")
    setSampleAnswer(q.sample_answer ?? "")
    setExpectedAnswer(q.expected_answer ?? "")
    setEvaluationMode(q.evaluation_mode ?? "auto")
    setGuidelines(parseBankGuidelines(q.answer_guidelines))
    setOptions(bankQuestionOptionsToEditable(q.options, q.correct_answer))
    setMedia(parseBankQuestionMedia(q.question_media))
    setSubquestions(q.subquestions ?? null)
    setSolutionConfig(q.solution_upload_config ?? null)
  }

  useEffect(() => {
    if (!visible) return
    resetForm(createMode ? initialQuestionType : undefined)
    if (duplicateFrom) {
      applyQuestion(duplicateFrom)
      return
    }
    if (createMode || !questionId || !scope) return
    setLoading(true)
    instructorApi
      .getQuestionBankQuestion(scope, questionId)
      .then(applyQuestion)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load question."))
      .finally(() => setLoading(false))
  }, [visible, questionId, createMode, duplicateFrom, scope, initialQuestionType])

  function toggleCorrect(index: number) {
    setOptions((prev) => {
      const next = prev.map((opt) => ({ ...opt }))
      if (questionType === "mcq" || questionType === "true_false") {
        next.forEach((opt, i) => {
          opt.is_correct = i === index
        })
      } else {
        next[index].is_correct = !next[index].is_correct
      }
      return next
    })
  }

  function updateOptionText(index: number, value: string) {
    setOptions((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], option_text: value }
      return next
    })
  }

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { option_text: "", is_correct: false, option_order: prev.length + 1 },
    ])
  }

  function removeOption(index: number) {
    if (options.length <= 2) {
      AppAlert.alert("Need at least 2 options", "Multiple-choice questions require at least two answer choices.")
      return
    }
    setOptions((prev) => prev.filter((_, i) => i !== index).map((opt, i) => ({ ...opt, option_order: i + 1 })))
  }

  function addGuideline() {
    const value = newGuideline.trim()
    if (!value) return
    setGuidelines((prev) => [...prev, value])
    setNewGuideline("")
  }

  async function pickDiagram() {
    if (!scope) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      AppAlert.alert("Permission needed", "Allow photo library access to attach a circuit diagram.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploadingMedia(true)
    try {
      let name = asset.fileName ?? `diagram-${Date.now()}.jpg`
      let type = asset.mimeType ?? "image/jpeg"
      if (/\.heic$|\.heif$/i.test(name) || /heic|heif/i.test(type)) {
        name = name.replace(/\.(heic|heif)$/i, ".jpg")
        type = "image/jpeg"
      }
      const uploaded = await instructorApi.uploadQuestionMedia(scope, {
        uri: asset.uri,
        name,
        type,
      })
      setMedia({
        media_enabled: true,
        media_url: uploaded.url,
        media_type: uploaded.media_type ?? "image",
        media_caption: media?.media_caption ?? "",
        media_alt_text: media?.media_alt_text ?? "Circuit diagram"})
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Could not upload diagram.")
    } finally {
      setUploadingMedia(false)
    }
  }

  async function handleSave() {
    if (!scope) return
    if (!questionText.trim()) {
      setError("Question text is required.")
      return
    }
    if (requiresOptions) {
      const filled = options.filter((opt) => opt.option_text.trim())
      if (filled.length < 2) {
        setError("Add at least two answer choices.")
        return
      }
      if (!filled.some((opt) => opt.is_correct)) {
        setError("Mark at least one correct answer.")
        return
      }
    }

    setSaving(true)
    setError("")
    try {
      const payload = buildBankQuestionSavePayload({
        question_text: questionText,
        question_type: questionType,
        difficulty,
        topic,
        hint,
        explanation,
        sample_answer: sampleAnswer,
        expected_answer: expectedAnswer,
        evaluation_mode: evaluationMode,
        guidelines,
        options,
        question_media: media,
        subquestions,
        solution_upload_config: solutionConfig})

      if (createMode || duplicateFrom) {
        await instructorApi.createQuestionBankQuestion(scope, payload)
      } else if (questionId) {
        await instructorApi.updateQuestionBankQuestion(scope, questionId, payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save question.")
    } finally {
      setSaving(false)
    }
  }

  if (!visible) return null

  const subquestionParts = parseBankSubquestions(subquestions)

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title={title}
          onClose={onClose}
          rightSlot={
            <FacultySheetSaveAction
              label={saving ? "Saving…" : "Save"}
              saving={saving}
              disabled={loading}
              onPress={() => void handleSave()}
            />
          }
        />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_QUESTION_BANK_COLOR.link} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {error ? <FacultySheetErrorBanner message={error} /> : null}

            <FacultySheetSection label="Question setup" tone={SHEET_SECTION.edit}>
              <FacultySheetField label="Question type">
                <FacultySheetSelectButton
                  value={questionBankTypeLabel(questionType)}
                  onPress={() => setPicker("type")}
                />
              </FacultySheetField>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <FacultySheetField label="Difficulty">
                    <FacultySheetSelectButton value={difficulty} onPress={() => setPicker("difficulty")} />
                  </FacultySheetField>
                </View>
                <View style={styles.rowItem}>
                  <FacultySheetField label="Grading">
                    <FacultySheetSelectButton
                      value={EVALUATION_MODE_OPTIONS.find((o) => o.value === evaluationMode)?.label ?? evaluationMode}
                      onPress={() => setPicker("evaluation")}
                    />
                  </FacultySheetField>
                </View>
              </View>

              <FacultySheetField label="Topic">
                <FacultySheetTextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="e.g. Chapter 8: AC Power"
                  accessibilityLabel="Topic"
                  testID="question-bank-topic"
                  keyboardType="ascii-capable"
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                  textContentType="none"
                />
              </FacultySheetField>

              <FacultySheetField
                label={isMultiPart ? "Shared stem" : isCircuit ? "Problem statement" : "Question text"}
              >
                <FacultySheetTextInput
                  multiline
                  value={questionText}
                  onChangeText={setQuestionText}
                  placeholder="Supports Markdown and LaTeX (e.g. \(Z_L\), \[...\])"
                  accessibilityLabel="Question text"
                  testID="question-bank-text"
                  keyboardType="ascii-capable"
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                  textContentType="none"
                />
              </FacultySheetField>

              <FacultySheetField label="Diagram / figure">
                {hasActiveQuestionMedia(media) ? (
                  <View style={styles.mediaBlock}>
                    <QuestionMediaView media={media as QuestionMedia} embedded />
                    <FacultySheetOutlineButton label="Remove diagram" icon="trash-outline" onPress={() => setMedia(null)} />
                  </View>
                ) : null}
                <FacultySheetOutlineButton
                  icon="image-outline"
                  label={hasActiveQuestionMedia(media) ? "Replace diagram" : "Attach diagram"}
                  onPress={() => void pickDiagram()}
                  loading={uploadingMedia}
                />
              </FacultySheetField>
            </FacultySheetSection>

            {requiresOptions ? (
              <FacultySheetSection label="Answer choices" tone={SHEET_SECTION.review}>
                {options.map((opt, index) => (
                  <View key={`opt-${index}`} style={styles.optionEditor}>
                    <Pressable style={styles.correctToggle} onPress={() => toggleCorrect(index)}>
                      <Ionicons
                        name={
                          questionType === "select_all"
                            ? opt.is_correct
                              ? "checkbox"
                              : "square-outline"
                            : opt.is_correct
                              ? "radio-button-on"
                              : "radio-button-off"
                        }
                        size={22}
                        color={opt.is_correct ? FACULTY_QUESTION_BANK_COLOR.link : native.separatorOpaque}
                      />
                      <Text style={[type.caption, styles.optionLetter, { color: native.label }]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </Pressable>
                    <FacultySheetTextInput
                      style={styles.optionInput}
                      value={opt.option_text}
                      onChangeText={(value) => updateOptionText(index, value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      multiline
                    />
                    <Pressable onPress={() => removeOption(index)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={tokens.danger} />
                    </Pressable>
                  </View>
                ))}
                <FacultySheetAddButton label="Add option" onPress={addOption} />
              </FacultySheetSection>
            ) : null}

            {isMultiPart && subquestionParts.length > 0 ? (
              <FacultySheetSection label="Sub-questions" tone={SHEET_SECTION.tools}>
                <Text style={collabSheetStyles.introText}>
                  {subquestionParts.length} part{subquestionParts.length === 1 ? "" : "s"} configured. Edit
                  sub-question structure on the web app for now.
                </Text>
                {subquestionParts.map((part, index) => (
                  <View
                    key={`${part.label}-${index}`}
                    style={[
                      styles.readOnlyCard,
                      { borderColor: native.separator, backgroundColor: native.fill },
                    ]}
                  >
                    <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 13 }]}>{part.label}</Text>
                    <Text style={collabSheetStyles.bodyText} numberOfLines={4}>
                      {part.text || "No prompt text"}
                    </Text>
                  </View>
                ))}
              </FacultySheetSection>
            ) : null}

            <FacultySheetSection label="Grading & feedback" tone={SHEET_SECTION.tools}>
              {isCircuit ? (
                <FacultySheetField label="Expected answer (optional)">
                  <FacultySheetTextInput
                    multiline
                    value={expectedAnswer}
                    onChangeText={setExpectedAnswer}
                    placeholder="Reference answer or numeric result"
                  />
                </FacultySheetField>
              ) : null}

              <FacultySheetField label="Hint">
                <FacultySheetTextInput
                  multiline
                  value={hint}
                  onChangeText={setHint}
                  placeholder="Optional hint shown to students"
                />
              </FacultySheetField>

              <FacultySheetField label="Explanation">
                <FacultySheetTextInput
                  multiline
                  value={explanation}
                  onChangeText={setExplanation}
                  placeholder="Post-submission explanation"
                />
              </FacultySheetField>

              <FacultySheetField label="Sample answer">
                <FacultySheetTextInput
                  multiline
                  value={sampleAnswer}
                  onChangeText={setSampleAnswer}
                  placeholder="Model answer for manual or AI grading"
                />
              </FacultySheetField>

              <FacultySheetField label="Grading guidelines">
                {guidelines.map((item, index) => (
                  <View
                    key={`${index}-${item.slice(0, 8)}`}
                    style={[
                      styles.guidelineEditor,
                      { borderColor: native.separator, backgroundColor: native.fill },
                    ]}
                  >
                    <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                      {index + 1}.
                    </Text>
                    <Text style={collabSheetStyles.bodyText}>{item}</Text>
                    <Pressable onPress={() => setGuidelines((prev) => prev.filter((_, i) => i !== index))}>
                      <Ionicons name="close-circle" size={18} color={native.secondaryLabel} />
                    </Pressable>
                  </View>
                ))}
                <View style={styles.guidelineAddRow}>
                  <FacultySheetTextInput
                    style={styles.flexInput}
                    value={newGuideline}
                    onChangeText={setNewGuideline}
                    placeholder="Add a grading guideline"
                  />
                  <Pressable
                    style={[styles.addGuidelineBtn, { backgroundColor: FACULTY_QUESTION_BANK_COLOR.action }]}
                    onPress={addGuideline}
                  >
                    <Ionicons name="add" size={20} color="#ffffff" />
                  </Pressable>
                </View>
              </FacultySheetField>
            </FacultySheetSection>
          </ScrollView>
        )}

        <FacultyGroupedFilterSheet
          visible={picker != null}
          title="Select"
          groups={pickerGroups}
          onSelect={(groupId, value) => {
            if (groupId === "type") setQuestionType(value)
            if (groupId === "difficulty") setDifficulty(value)
            if (groupId === "evaluation") setEvaluationMode(value)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 10 },
  rowItem: { flex: 1 },
  mediaBlock: { gap: 8 },
  optionEditor: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  correctToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 12 },
  optionLetter: { width: 14, textTransform: "none", fontWeight: "600" },
  optionInput: { flex: 1, minHeight: 44 },
  readOnlyCard: {
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4},
  guidelineEditor: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth},
  guidelineAddRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  flexInput: { flex: 1 },
  addGuidelineBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"}})
