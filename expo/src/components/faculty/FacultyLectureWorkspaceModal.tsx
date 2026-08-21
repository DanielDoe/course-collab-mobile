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
  WORKSPACE_CATEGORIES,
  defaultWorkspaceConfig,
  emptyWorkspaceQuestion,
  type LectureWorkspaceConfig,
  type LectureWorkspaceQuestion} from "../../lib/lecture-types"
import {
  parseLectureWorkspace,
  solutionLinesToText,
  textToSolutionLines,
} from "../../lib/lecture-workspace-utils"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
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
import { FacultyLectureWorkspacePreview } from "./FacultyLectureWorkspacePreview"

type Props = {
  visible: boolean
  lecture: InstructorLecture | null
  onClose: () => void
}

function QuestionEditor({
  question,
  onChange,
  onRemove}: {
  question: LectureWorkspaceQuestion
  onChange: (q: LectureWorkspaceQuestion) => void
  onRemove: () => void
}) {
  const collabSheetStyles = useCollabSheetStyles()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const solutionText = solutionLinesToText(question.step_by_step_solution.content)

  return (
    <>
      <FacultySheetSection label="Student preview" tone={SHEET_SECTION.tools}>
        <FacultyLectureWorkspacePreview question={question} />
      </FacultySheetSection>

      <FacultySheetSection
        label={question.title || "Untitled"}
        tone={SHEET_SECTION.edit}
        action={
          <Pressable hitSlop={8} onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove problem">
            <Ionicons name="trash-outline" size={18} color="#b91c1c" />
          </Pressable>
        }
      >
        <FacultySheetField label="Problem ID">
          <TextInput
            style={collabSheetStyles.fieldInput}
            value={question.id}
            onChangeText={(id) => onChange({ ...question, id: id.trim() })}
          />
        </FacultySheetField>
        <FacultySheetField label="Category">
          <View style={localStyles.chipRow}>
            {WORKSPACE_CATEGORIES.map(({ value, label }) => {
              const active = question.category === value
              return (
                <Pressable
                  key={value}
                  style={[
                    localStyles.chip,
                    { borderColor: tokens.border, backgroundColor: native.secondaryGrouped },
                    active && {
                      backgroundColor: tokens.accentSoft,
                      borderColor: tokens.accentBorder,
                    },
                  ]}
                  onPress={() => onChange({ ...question, category: value })}
                >
                  <Text
                    style={[
                      localStyles.chipText,
                      { color: native.secondaryLabel },
                      active && { color: tokens.accentDark },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </FacultySheetField>
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
        <FacultySheetField label="Problem statement">
          <TextInput
            style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
            value={question.question_text}
            onChangeText={(question_text) => onChange({ ...question, question_text })}
            multiline
            textAlignVertical="top"
          />
        </FacultySheetField>
        <FacultySheetField label="Step-by-step solution (one step per line)">
          <TextInput
            style={[collabSheetStyles.fieldInput, localStyles.solutionArea]}
            value={solutionText}
            onChangeText={(text) =>
              onChange({
                ...question,
                step_by_step_solution: {
                  format: "markdown_latex",
                  content: textToSolutionLines(text),
                },
              })
            }
            multiline
            textAlignVertical="top"
            placeholder="Supports markdown headers, **bold**, and $...$ / $$...$$ LaTeX"
            placeholderTextColor={sheetPlaceholderColor}
          />
        </FacultySheetField>
      </FacultySheetSection>
    </>
  )
}

export function FacultyLectureWorkspaceModal({ visible, lecture, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const { scope } = useFacultyScope()
  const [config, setConfig] = useState<LectureWorkspaceConfig>(defaultWorkspaceConfig())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope || !lecture) return
    setLoading(true)
    setError("")
    try {
      const data = await instructorApi.getLectureWorkspace(scope, lecture.id)
      setConfig(parseLectureWorkspace(data.config ?? defaultWorkspaceConfig()))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load workspace.")
      setConfig(defaultWorkspaceConfig())
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
      const payload = parseLectureWorkspace({ ...config, enabled: true })
      const result = await instructorApi.saveLectureWorkspace(scope, lecture.id, payload)
      setConfig(parseLectureWorkspace(result.config))
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save workspace.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Workspace problems"
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

            <FacultySheetSection label="Workspace settings" hint={lecture.title} tone={SHEET_SECTION.tools}>
              <FacultySheetToggleRow
                icon="brush-outline"
                title="Enabled on slides"
                subtitle="Ink workspace button in the lecture viewer"
                value={config.enabled}
                onValueChange={(enabled) => setConfig({ ...config, enabled })}
              />
              <FacultySheetField label="Panel title">
                <TextInput
                  style={collabSheetStyles.fieldInput}
                  value={config.title}
                  onChangeText={(title) => setConfig({ ...config, title })}
                />
              </FacultySheetField>
              <FacultySheetField label="Button label">
                <TextInput
                  style={collabSheetStyles.fieldInput}
                  value={config.button_label ?? "Workspace"}
                  onChangeText={(button_label) => setConfig({ ...config, button_label })}
                />
              </FacultySheetField>
            </FacultySheetSection>

            <FacultySheetSection
              label={`Problems (${config.questions.length})`}
              tone={SHEET_SECTION.edit}
              action={
                <FacultySheetAddButton
                  label="Add problem"
                  onPress={() =>
                    setConfig({
                      ...config,
                      questions: [...config.questions, emptyWorkspaceQuestion(config.questions.length)],
                    })
                  }
                />
              }
            >
              {config.questions.length === 0 ? (
                <View style={localStyles.empty}>
                  <Ionicons name="brush-outline" size={24} color={tokens.textMuted} />
                  <Text style={collabSheetStyles.emptyText}>
                    No workspace problems yet. Publish problems with ink solutions for students to view in class.
                  </Text>
                </View>
              ) : null}
            </FacultySheetSection>

            {config.questions.map((q, idx) => (
              <QuestionEditor
                key={`${q.id}-${idx}`}
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  solutionArea: { minHeight: 180 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 12 },
})
