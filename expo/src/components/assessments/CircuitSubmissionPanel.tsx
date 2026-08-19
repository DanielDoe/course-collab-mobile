import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppAlert } from '../../lib/app-alert'
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { API_BASE_URL } from "../../constants"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import type { SolutionUploadsMap } from "../../lib/classroom-submission"
import {
  circuitSubmissionHasRequiredUpload,
  compactCircuitSubmissionForSubmit,
  listSolutionFiles,
  parseCircuitSubmissionAnswer,
  parseCircuitSubmissionConfig,
  solutionPartKey,
  type CircuitSubmissionAnswer,
  type CircuitSubmissionConfig,
} from "../../lib/circuit-submission-utils"
import { createEmptyWorkspace, workspaceHasContent } from "../../lib/circuit-workspace"
import {
  appendStroke,
  getActivePage,
  undoLastStroke,
} from "../../lib/circuit-workspace-mutations"
import { assessmentQuizApi } from "../../lib/assessment-quiz/assessment-quiz-api"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { CircuitWorkspaceCanvas, CircuitWorkspaceToolbar } from "./CircuitWorkspaceCanvas"
import { circuitSubmissionUi as ui } from "./circuit-submission-ui"
import {
  CIRCUIT_NOTES_HEIGHT_PHONE,
  CIRCUIT_NOTES_HEIGHT_TABLET,
} from "../../lib/circuit-submission-layout"

export { CIRCUIT_NOTES_HEIGHT_PHONE, CIRCUIT_NOTES_HEIGHT_TABLET }

type SubmissionMode = "upload" | "photo" | "workspace"

type Props = {
  session: StudentSession
  attemptId: number
  questionId: number
  value: string
  onChange: (nextJson: string) => void
  config?: unknown
  disabled?: boolean
  /** Explicit notes box height (quiz passes tablet vs phone). */
  notesHeight?: number
  /** @deprecated Prefer notesHeight */
  expandNotes?: boolean
}

function resolveFilePreviewUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`
}

export function CircuitSubmissionPanel({
  session,
  attemptId,
  questionId,
  value,
  onChange,
  config: configRaw,
  disabled,
  notesHeight: notesHeightProp,
  expandNotes = false,
}: Props) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const config: CircuitSubmissionConfig = useMemo(
    () => parseCircuitSubmissionConfig(configRaw),
    [configRaw],
  )
  const maxFiles = config.max_files ?? 10
  const requireUpload = config.require_solution_upload !== false

  const answer = useMemo(() => parseCircuitSubmissionAnswer(value), [value])
  const mode: SubmissionMode = answer.submission_mode ?? "upload"
  const files = listSolutionFiles(answer.solution_uploads)
  const atMax = files.length >= maxFiles

  const [uploading, setUploading] = useState(false)

  const updateAnswer = useCallback(
    (next: CircuitSubmissionAnswer) => {
      onChange(JSON.stringify(next))
    },
    [onChange],
  )

  const setMode = (nextMode: SubmissionMode) => {
    const parsed = parseCircuitSubmissionAnswer(value)
    const next: CircuitSubmissionAnswer = {
      ...parsed,
      submission_mode: nextMode,
    }
    if (nextMode === "workspace" && !parsed.workspace) {
      next.workspace = createEmptyWorkspace()
    }
    updateAnswer(next)
  }

  async function uploadAsset(uri: string, name: string, mime: string, uploadMode: "upload" | "photo") {
    if (atMax) {
      AppAlert.alert("File limit", `You can attach up to ${maxFiles} files.`)
      return
    }
    setUploading(true)
    try {
      const partId = solutionPartKey(files.length)
      const uploaded = await assessmentQuizApi.uploadQuizSolutionFile(session, {
        attemptId,
        questionId,
        partId,
        uri,
        name,
        mime,
      })
      const uploads: SolutionUploadsMap = { ...(answer.solution_uploads ?? {}) }
      uploads[partId] = {
        url: uploaded.url,
        name: uploaded.name ?? name,
        mime: uploaded.mime ?? mime,
        uploaded_at: uploaded.uploaded_at,
      }
      updateAnswer({
        ...answer,
        submission_mode: uploadMode,
        solution_uploads: uploads,
      })
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Could not upload file.")
    } finally {
      setUploading(false)
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*"],
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    await uploadAsset(asset.uri, asset.name ?? "solution.pdf", asset.mimeType ?? "application/pdf", "upload")
  }

  async function pickPhoto(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Camera access", "Allow camera access to photograph your work.")
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Photos access", "Allow photo library access to upload your solution.")
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
    const name = asset.fileName ?? `solution-${Date.now()}.jpg`
    await uploadAsset(asset.uri, name, asset.mimeType ?? "image/jpeg", "photo")
  }

  function removeFile(index: number) {
    const uploads = { ...(answer.solution_uploads ?? {}) }
    delete uploads[solutionPartKey(index)]
    const reindexed: SolutionUploadsMap = {}
    listSolutionFiles(uploads).forEach((file, i) => {
      reindexed[solutionPartKey(i)] = file
    })
    updateAnswer({ ...answer, solution_uploads: reindexed })
  }

  const workspace = answer.workspace ?? createEmptyWorkspace()
  const notesFieldHeight = useMemo(() => {
    if (notesHeightProp != null) return notesHeightProp
    if (!expandNotes) return 96
    if (mode === "workspace") return 80
    const isPad = Platform.OS === "ios" && Platform.isPad
    return isPad ? CIRCUIT_NOTES_HEIGHT_TABLET : CIRCUIT_NOTES_HEIGHT_PHONE
  }, [expandNotes, mode, notesHeightProp])

  const largeUpload = notesHeightProp != null && notesHeightProp >= CIRCUIT_NOTES_HEIGHT_PHONE

  return (
    <View style={[styles.wrap, notesHeightProp != null && styles.wrapQuiz]}>
      {config.submission_instructions ? (
        <Text style={[styles.instructions, { color: SN.secondaryLabel }]}>
          {config.submission_instructions}
        </Text>
      ) : null}

      <View style={[ui.modeSegment, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
        <Pressable
          style={[
            ui.modeSegmentBtn,
            mode === "upload" && {
              backgroundColor: hexToRgba(tokens.accent, 0.1),
            },
          ]}
          onPress={() => setMode("upload")}
          disabled={disabled || uploading}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "upload" }}
        >
          <Ionicons name="document-attach-outline" size={16} color={mode === "upload" ? tokens.accent : SN.secondaryLabel} />
          <Text style={[ui.modeLabel, { color: mode === "upload" ? tokens.accent : tokens.text }]}>Upload</Text>
        </Pressable>
        <View style={[ui.modeSegmentDivider, { backgroundColor: tokens.border }]} />
        <Pressable
          style={[
            ui.modeSegmentBtn,
            mode === "photo" && {
              backgroundColor: hexToRgba(tokens.accent, 0.1),
            },
          ]}
          onPress={() => setMode("photo")}
          disabled={disabled || uploading}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "photo" }}
        >
          <Ionicons name="camera-outline" size={16} color={mode === "photo" ? tokens.accent : SN.secondaryLabel} />
          <Text style={[ui.modeLabel, { color: mode === "photo" ? tokens.accent : tokens.text }]}>Photo</Text>
        </Pressable>
        <View style={[ui.modeSegmentDivider, { backgroundColor: tokens.border }]} />
        <Pressable
          style={[
            ui.modeSegmentBtn,
            mode === "workspace" && {
              backgroundColor: hexToRgba(tokens.accent, 0.1),
            },
          ]}
          onPress={() => setMode("workspace")}
          disabled={disabled || uploading}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === "workspace" }}
        >
          <Ionicons name="brush-outline" size={16} color={mode === "workspace" ? tokens.accent : SN.secondaryLabel} />
          <Text style={[ui.modeLabel, { color: mode === "workspace" ? tokens.accent : tokens.text }]}>Workspace</Text>
        </Pressable>
      </View>

      {mode === "upload" ? (
        <Pressable
          style={[
            ui.actionBtn,
            largeUpload ? ui.uploadDropZone : ui.actionBtnPrimary,
            { borderColor: tokens.border, backgroundColor: tokens.background },
          ]}
          onPress={pickDocument}
          disabled={disabled || uploading || atMax}
        >
          <Ionicons name="cloud-upload-outline" size={largeUpload ? 28 : 18} color={tokens.accent} />
          <Text style={[styles.actionLabel, largeUpload && styles.actionLabelLarge, { color: tokens.text }]}>
            Choose PDF or image
          </Text>
          {largeUpload ? (
            <Text style={[styles.uploadHint, { color: SN.secondaryLabel }]}>
              Tap to open Files or Photos
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      {mode === "photo" ? (
        <View style={ui.photoRow}>
          <Pressable
            style={[
              ui.actionBtn,
              largeUpload ? ui.uploadDropZone : ui.actionBtnPrimary,
              ui.actionBtnHalf,
              { borderColor: tokens.border, backgroundColor: tokens.background },
            ]}
            onPress={() => pickPhoto(true)}
            disabled={disabled || uploading || atMax}
          >
            <Ionicons name="camera-outline" size={largeUpload ? 26 : 18} color={tokens.accent} />
            <Text style={[styles.actionLabel, largeUpload && styles.actionLabelLarge, { color: tokens.text }]}>
              Take photo
            </Text>
          </Pressable>
          <Pressable
            style={[
              ui.actionBtn,
              largeUpload ? ui.uploadDropZone : ui.actionBtnPrimary,
              ui.actionBtnHalf,
              { borderColor: tokens.border, backgroundColor: tokens.background },
            ]}
            onPress={() => pickPhoto(false)}
            disabled={disabled || uploading || atMax}
          >
            <Ionicons name="images-outline" size={largeUpload ? 26 : 18} color={tokens.accent} />
            <Text style={[styles.actionLabel, largeUpload && styles.actionLabelLarge, { color: tokens.text }]}>
              Choose photo
            </Text>
          </Pressable>
        </View>
      ) : null}

      {mode === "workspace" ? (
        <View style={styles.workspaceSection}>
          <CircuitWorkspaceToolbar
            workspace={workspace}
            onChange={(next) => updateAnswer({ ...answer, workspace: next, submission_mode: "workspace" })}
            disabled={disabled || uploading}
            accentColor={tokens.accent}
          />
          <CircuitWorkspaceCanvas
            workspace={workspace}
            onChange={(next) => updateAnswer({ ...answer, workspace: next, submission_mode: "workspace" })}
            disabled={disabled || uploading}
          />
          {!workspaceHasContent(workspace) ? (
            <Text style={[styles.workspaceHint, { color: SN.secondaryLabel }]}>
              Draw your circuit diagram on the ruled notebook above.
            </Text>
          ) : null}
        </View>
      ) : null}

      {(uploading) && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={tokens.accent} />
          <Text style={[styles.uploadingText, { color: SN.secondaryLabel }]}>Uploading…</Text>
        </View>
      )}

      {files.map((file, index) => (
        <View key={`${file.url}-${index}`} style={[styles.fileRow, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
          {file.mime.startsWith("image/") ? (
            <Image source={{ uri: resolveFilePreviewUrl(file.url) }} style={styles.thumb} />
          ) : (
            <View style={[styles.fileIcon, { backgroundColor: hexToRgba(tokens.accent, 0.1) }]}>
              <Ionicons name="document-text-outline" size={22} color={tokens.accent} />
            </View>
          )}
          <View style={styles.fileBody}>
            <Text style={[styles.fileName, { color: tokens.text }]} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={[styles.fileMeta, { color: SN.secondaryLabel }]}>{file.mime}</Text>
          </View>
          {!disabled ? (
            <Pressable onPress={() => removeFile(index)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={tokens.danger} />
            </Pressable>
          ) : null}
        </View>
      ))}

      <View style={styles.notesSection}>
        <Text style={[styles.fieldLabel, { color: SN.secondaryLabel }]}>Notes (optional)</Text>
        <TextInput
          style={[
            styles.notesInput,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.background,
              color: tokens.text,
              height: notesFieldHeight,
              minHeight: notesFieldHeight,
            },
          ]}
          value={answer.written_notes ?? ""}
          onChangeText={(written_notes) => updateAnswer({ ...answer, written_notes })}
          placeholder="Type steps, calculations, or notes here…"
          placeholderTextColor={SN.secondaryLabel}
          multiline
          textAlignVertical="top"
          editable={!disabled && !uploading}
        />
      </View>

      {!circuitSubmissionHasRequiredUpload(answer, config) && requireUpload ? (
        <Text style={[styles.requiredHint, { color: SN.secondaryLabel }]}>
          Upload a file, take a photo, or draw in the workspace before submitting.
        </Text>
      ) : null}
    </View>
  )
}

export function useCircuitSubmitReady(value: string, config?: unknown): boolean {
  const cfg = parseCircuitSubmissionConfig(config)
  return circuitSubmissionHasRequiredUpload(value, cfg)
}

export async function prepareCircuitAnswerForSubmit(
  session: StudentSession,
  payload: {
    attemptId: number
    questionId: number
    answerJson: string
    questionTitle?: string
  },
): Promise<string> {
  const parsed = parseCircuitSubmissionAnswer(payload.answerJson)

  if (parsed.submission_mode === "workspace" && workspaceHasContent(parsed.workspace)) {
    const exported = await assessmentQuizApi.exportCircuitWorkspace(session, {
      attemptId: payload.attemptId,
      questionId: payload.questionId,
      workspace: parsed.workspace,
      title: payload.questionTitle,
    })
    if (exported.answerJson) {
      return exported.answerJson
    }
  }

  return compactCircuitSubmissionForSubmit(parsed)
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  wrapQuiz: { marginTop: 4 },
  instructions: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: "600" },
  actionLabelLarge: { fontSize: 15 },
  uploadHint: { fontSize: 12, lineHeight: 16, textAlign: "center" },
  workspaceSection: { gap: 8 },
  workspaceHint: { fontSize: 12, lineHeight: 17 },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadingText: { fontSize: 13 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#f1f5f9" },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileBody: { flex: 1, gap: 2 },
  fileName: { fontSize: 13, fontWeight: "700" },
  fileMeta: { fontSize: 11 },
  notesSection: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700" },
  notesInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  requiredHint: { fontSize: 12, lineHeight: 17 },
})
