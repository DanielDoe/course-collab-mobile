import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import type { PlaygroundSessionQuestion } from "../../lib/instructor-api"
import {
  applyPlaygroundSessionQuestionDraft,
  draftFromPlaygroundSessionQuestion,
  playgroundQuestionUsesOptions,
  type PlaygroundSessionQuestionDraft,
} from "../../lib/faculty-playground-session-questions"
import { FACULTY_PLAYGROUND_COLOR } from "../../lib/faculty-playground-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FacultySheetAddButton,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetFormLayout,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetSubmitButton,
  FacultySheetTextInput,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  question: PlaygroundSessionQuestion | null
  onClose: () => void
  onSave: (question: PlaygroundSessionQuestion) => void
}

export function FacultyPlaygroundQuestionEditorModal({ question, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets()
  const { native, tokens, type } = useModuleTheme()
  const [draft, setDraft] = useState<PlaygroundSessionQuestionDraft | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!question) {
      setDraft(null)
      setError("")
      return
    }
    setDraft(draftFromPlaygroundSessionQuestion(question))
    setError("")
  }, [question])

  if (!question || !draft) return null

  const usesOptions = playgroundQuestionUsesOptions(question.questionType)

  function update<K extends keyof PlaygroundSessionQuestionDraft>(
    key: K,
    value: PlaygroundSessionQuestionDraft[K],
  ) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updateOption(index: number, value: string) {
    setDraft((prev) => {
      if (!prev) return prev
      const options = [...prev.options]
      options[index] = value
      const correctAnswer = prev.correctAnswer === prev.options[index] ? value : prev.correctAnswer
      return { ...prev, options, correctAnswer }
    })
  }

  function markCorrect(index: number) {
    setDraft((prev) => {
      if (!prev) return prev
      const choice = prev.options[index]?.trim()
      if (!choice) return prev
      return { ...prev, correctAnswer: choice }
    })
  }

  function addOption() {
    setDraft((prev) => (prev ? { ...prev, options: [...prev.options, ""] } : prev))
  }

  function removeOption(index: number) {
    setDraft((prev) => {
      if (!prev || prev.options.length <= 2) return prev
      const removed = prev.options[index]
      const options = prev.options.filter((_, i) => i !== index)
      const correctAnswer = prev.correctAnswer === removed ? "" : prev.correctAnswer
      return { ...prev, options, correctAnswer }
    })
  }

  function save() {
    const result = applyPlaygroundSessionQuestionDraft(question, draft)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSave(result.question)
  }

  return (
    <FacultySheetModal visible onRequestClose={onClose}>
      <FacultySheetFormLayout
        header={
          <FacultySheetChrome
            topInset={insets.top}
            title="Edit session question"
            subtitle="This copy only"
            onClose={onClose}
            accentColor={FACULTY_PLAYGROUND_COLOR.link}
          />
        }
        footer={
          <View style={styles.footerRow}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel session question edit"
              style={styles.cancelBtn}
            >
              <Text style={[type.bodyEmphasis, { color: native.secondaryLabel }]}>Cancel</Text>
            </Pressable>
            <View style={styles.footerGrow}>
              <FacultySheetSubmitButton label="Save for this session" onPress={save} />
            </View>
          </View>
        }
      >
        <FacultySheetNotice message="Changes apply to this playground session only. The source Question Bank question is left unchanged." />
        {error ? (
          <Text style={[type.caption, { color: tokens.danger, fontWeight: "600" }]}>{error}</Text>
        ) : null}

        <FacultySheetSection label="Prompt" tone={SHEET_SECTION.review}>
          <FacultySheetField label="Question">
            <FacultySheetTextInput
              multiline
              value={draft.questionText}
              onChangeText={(value) => update("questionText", value)}
              placeholder="Question students will see in this session"
              accessibilityLabel="Session question text"
            />
          </FacultySheetField>
          <FacultySheetField label="Topic">
            <FacultySheetTextInput
              value={draft.topic}
              onChangeText={(value) => update("topic", value)}
              placeholder="Topic"
              accessibilityLabel="Session question topic"
            />
          </FacultySheetField>
        </FacultySheetSection>

        {usesOptions ? (
          <FacultySheetSection label="Answer choices" hint="Tap the circle to mark the correct choice.">
            {draft.options.map((option, index) => {
              const selected = draft.correctAnswer.trim() === option.trim() && option.trim().length > 0
              return (
                <View key={`opt-${index}`} style={styles.optionRow}>
                  <Pressable
                    onPress={() => markCorrect(index)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Mark option ${index + 1} correct`}
                    style={styles.correctToggle}
                  >
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={selected ? FACULTY_PLAYGROUND_COLOR.link : native.separatorOpaque}
                    />
                    <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </Pressable>
                  <FacultySheetTextInput
                    style={styles.optionInput}
                    value={option}
                    onChangeText={(value) => updateOption(index, value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    multiline
                    accessibilityLabel={`Session option ${index + 1}`}
                  />
                  <Pressable
                    onPress={() => removeOption(index)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove session option ${index + 1}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={tokens.danger} />
                  </Pressable>
                </View>
              )
            })}
            <FacultySheetAddButton label="Add option" onPress={addOption} />
          </FacultySheetSection>
        ) : (
          <FacultySheetField label="Expected answer">
            <FacultySheetTextInput
              value={draft.correctAnswer}
              onChangeText={(value) => update("correctAnswer", value)}
              placeholder="Correct answer for this session"
              accessibilityLabel="Session expected answer"
            />
          </FacultySheetField>
        )}

        <FacultySheetField label="Explanation">
          <FacultySheetTextInput
            multiline
            value={draft.explanation}
            onChangeText={(value) => update("explanation", value)}
            placeholder="Optional explanation for this session"
            accessibilityLabel="Session question explanation"
          />
        </FacultySheetField>
      </FacultySheetFormLayout>
    </FacultySheetModal>
  )
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 4 },
  footerGrow: { flex: 1 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  correctToggle: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 },
  optionInput: { flex: 1 },
})
