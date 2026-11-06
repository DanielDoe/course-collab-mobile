import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View} from "react-native"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { AppAlert } from "../../lib/app-alert"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorLecture, type InstructorScope } from "../../lib/instructor-api"
import {
  defaultWorkspaceConfig,
  emptyWorkspaceQuestion,
  type LectureWorkspaceCategory,
  type LectureWorkspaceConfig,
  type LectureWorkspaceQuestion} from "../../lib/lecture-types"
import {
  categoryLabel,
  parseLectureWorkspace,
  solutionLinesToText,
  textToSolutionLines,
} from "../../lib/lecture-workspace-utils"

const WORKSPACE_CATEGORIES: Array<{ value: LectureWorkspaceCategory; label: string }> = [
  { value: "nodal", label: categoryLabel("nodal") },
  { value: "mesh", label: categoryLabel("mesh") },
  { value: "thevenin_norton", label: categoryLabel("thevenin_norton") },
]
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { createEmptyWorkspace } from "../../lib/circuit-workspace"
import { CircuitWorkspaceEditor } from "../ink/CircuitWorkspaceEditor"
import { workspaceUploadError } from "../../lib/workspace-upload"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetAddButton,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetFormLayout,
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
  onRemove,
  scope,
}: {
  question: LectureWorkspaceQuestion
  onChange: (q: LectureWorkspaceQuestion) => void
  onRemove: () => void
  scope: InstructorScope | null
}) {
  const collabSheetStyles = useCollabSheetStyles()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const solutionText = solutionLinesToText(question.step_by_step_solution.content)
  const [uploading, setUploading] = useState(false)
  const inkWorkspace = question.instructor_solution_workspace ?? createEmptyWorkspace()

  async function attachSolutionFile(uri: string, name: string, mime: string, size?: number) {
    if (!scope) return
    const invalid = workspaceUploadError({ name, mime, size })
    if (invalid) {
      AppAlert.alert("File not supported", invalid)
      return
    }
    setUploading(true)
    try {
      const uploaded = await instructorApi.uploadQuestionMedia(scope, {
        uri,
        name,
        type: mime,
      })
      onChange({
        ...question,
        question_media: {
          media_enabled: true,
          media_url: uploaded.url,
          media_type: uploaded.media_type ?? (mime.includes("pdf") ? "pdf" : "image"),
          media_caption: name,
          media_alt_text: name,
        },
      })
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Could not attach this file.")
    } finally {
      setUploading(false)
    }
  }

  async function pickSolutionFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*"],
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    await attachSolutionFile(
      asset.uri,
      asset.name ?? "solution.pdf",
      asset.mimeType ?? "application/pdf",
      asset.size,
    )
  }

  async function pickSolutionPhoto(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Camera access", "Allow camera access to photograph a worked solution.")
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Photos access", "Allow photo library access to attach a solution image.")
        return
      }
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
        })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    await attachSolutionFile(
      asset.uri,
      asset.fileName ?? `solution-${Date.now()}.jpg`,
      asset.mimeType ?? "image/jpeg",
      asset.fileSize,
    )
  }

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
        <FacultySheetField label="Worked solution">
          <Text style={[collabSheetStyles.bodyText, { marginBottom: 8 }]}>
            Draw digitally, or upload a photo/PDF of a board or paper solution.
          </Text>
          <CircuitWorkspaceEditor
            workspace={inkWorkspace}
            onChange={(instructor_solution_workspace) =>
              onChange({ ...question, instructor_solution_workspace })
            }
          />
          <View style={localStyles.attachRow}>
            <Pressable
              style={[localStyles.attachBtn, { borderColor: tokens.border, backgroundColor: native.secondaryGrouped }]}
              onPress={() => void pickSolutionPhoto(true)}
              disabled={uploading || !scope}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <Ionicons name="camera-outline" size={16} color={tokens.accent} />
              <Text style={[localStyles.attachLabel, { color: native.label }]}>Take photo</Text>
            </Pressable>
            <Pressable
              style={[localStyles.attachBtn, { borderColor: tokens.border, backgroundColor: native.secondaryGrouped }]}
              onPress={() => void pickSolutionPhoto(false)}
              disabled={uploading || !scope}
              accessibilityRole="button"
              accessibilityLabel="Choose photo"
            >
              <Ionicons name="images-outline" size={16} color={tokens.accent} />
              <Text style={[localStyles.attachLabel, { color: native.label }]}>Choose photo</Text>
            </Pressable>
            <Pressable
              style={[localStyles.attachBtn, { borderColor: tokens.border, backgroundColor: native.secondaryGrouped }]}
              onPress={() => void pickSolutionFile()}
              disabled={uploading || !scope}
              accessibilityRole="button"
              accessibilityLabel="Choose file"
            >
              <Ionicons name="document-outline" size={16} color={tokens.accent} />
              <Text style={[localStyles.attachLabel, { color: native.label }]}>
                {uploading ? "Uploading…" : "Choose file"}
              </Text>
            </Pressable>
          </View>
          {question.question_media?.media_url ? (
            <View style={localStyles.mediaRow}>
              <Text style={[collabSheetStyles.bodyText, { flex: 1 }]} numberOfLines={1}>
                {question.question_media.media_caption || question.question_media.media_url}
              </Text>
              <Pressable
                onPress={() => onChange({ ...question, question_media: undefined })}
                accessibilityRole="button"
                accessibilityLabel="Remove attached solution"
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={tokens.danger} />
              </Pressable>
            </View>
          ) : null}
        </FacultySheetField>
        <FacultySheetToggleRow
          title="Unlock step-by-step for students"
          subtitle={
            question.solution_unlocked
              ? "Students can reveal the written solution in class."
              : "Students see a locked message until you unlock this problem."
          }
          value={question.solution_unlocked === true}
          onValueChange={(solution_unlocked) => onChange({ ...question, solution_unlocked })}
        />
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
        <FacultySheetFormLayout
          header={
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
          }
          contentContainerStyle={collabSheetStyles.scroll}
        >
        {loading ? (
          <View style={localStyles.loadingBox}>
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : (
          <>
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
                scope={scope}
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
          </>
        )}
        </FacultySheetFormLayout>
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
  attachRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  attachLabel: { fontSize: 13, fontWeight: "600" },
  mediaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
})
