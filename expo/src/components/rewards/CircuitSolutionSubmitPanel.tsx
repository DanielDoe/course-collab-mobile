import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppAlert } from "../../lib/app-alert"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { CachedRemoteImage } from "../media/CachedRemoteImage"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { API_BASE_URL } from "../../constants"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  compactSolutionForSubmit,
  hasRequiredSolutionUpload,
  listSolutionFiles,
  parseSolutionAnswer,
  solutionPartKey,
  type SolutionUploadsMap,
} from "../../lib/classroom-submission"
import { useStudentSubmissionLayout } from "../../lib/circuit-submission-layout"
import { rewardsApi } from "../../lib/rewards-api"
import { circuitSubmissionUi as ui } from "../assessments/circuit-submission-ui"
import { workspaceUploadError } from "../../lib/workspace-upload"

type SubmissionMode = "upload" | "photo"

type Props = {
  session: StudentSession
  assignmentId: number
  maxFiles?: number
  requireUpload?: boolean
  disabled?: boolean
  onSubmitted: () => void
}

function resolveFilePreviewUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`
}

export function CircuitSolutionSubmitPanel({
  session,
  assignmentId,
  maxFiles = 10,
  requireUpload = true,
  disabled,
  onSubmitted,
}: Props) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const { notesHeight, largeUpload } = useStudentSubmissionLayout()
  const [answerJson, setAnswerJson] = useState(() =>
    JSON.stringify({
      version: 1,
      submission_status: "draft",
      submission_mode: "upload",
      solution_uploads: {},
      written_notes: "",
    }),
  )
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const answer = parseSolutionAnswer(answerJson)
  const mode: SubmissionMode = answer.submission_mode === "photo" ? "photo" : "upload"
  const files = listSolutionFiles(answer.solution_uploads)
  const atMax = files.length >= maxFiles

  const updateAnswer = useCallback((next: ReturnType<typeof parseSolutionAnswer>) => {
    setAnswerJson(JSON.stringify(next))
  }, [])

  const setMode = (nextMode: SubmissionMode) => {
    updateAnswer({ ...parseSolutionAnswer(answerJson), submission_mode: nextMode })
  }

  async function uploadAsset(uri: string, name: string, mime: string, uploadMode: SubmissionMode) {
    if (atMax) {
      AppAlert.alert("File limit", `You can attach up to ${maxFiles} files.`)
      return
    }
    setUploading(true)
    try {
      const partId = solutionPartKey(files.length)
      const uploaded = await rewardsApi.uploadClassroomSolutionFile(session, {
        assignmentId,
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
    const invalid = workspaceUploadError({
      name: asset.name,
      mime: asset.mimeType,
      size: asset.size,
    })
    if (invalid) {
      AppAlert.alert("File not supported", invalid)
      return
    }
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
    const invalid = workspaceUploadError({
      name,
      mime: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize,
    })
    if (invalid) {
      AppAlert.alert("File not supported", invalid)
      return
    }
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

  async function handleSubmit() {
    const parsed = parseSolutionAnswer(answerJson)
    if (!hasRequiredSolutionUpload(parsed, requireUpload)) {
      AppAlert.alert(
        "Solution required",
        "Upload a PDF or image, take a photo of your work, or choose a photo from your library.",
      )
      return
    }
    setSubmitting(true)
    try {
      const compact = compactSolutionForSubmit(parsed)
      const result = await rewardsApi.submitClassroomSolution(session, {
        submissionId: assignmentId,
        studentAnswer: compact,
      })
      AppAlert.alert(
        result.autoApproved ? "Submitted!" : "Submitted for review",
        result.message ??
          (result.autoApproved
            ? `${result.pointsAwarded ?? ""} provisional points recorded.`
            : result.instructorFeedback ?? "Your instructor will review your submission."),
      )
      onSubmitted()
    } catch (err) {
      AppAlert.alert("Submit failed", err instanceof ApiError ? err.message : "Could not submit solution.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={[ui.modeSegment, { borderColor: tokens.border, backgroundColor: tokens.background }]}>
        <Pressable
          style={[
            ui.modeSegmentBtn,
            mode === "upload" && { backgroundColor: hexToRgba(tokens.accent, 0.1) },
          ]}
          onPress={() => setMode("upload")}
          disabled={disabled || uploading}
        >
          <Ionicons name="document-attach-outline" size={16} color={mode === "upload" ? tokens.accent : SN.secondaryLabel} />
          <Text style={[ui.modeLabel, { color: mode === "upload" ? tokens.accent : tokens.text }]}>Upload</Text>
        </Pressable>
        <View style={[ui.modeSegmentDivider, { backgroundColor: tokens.border }]} />
        <Pressable
          style={[
            ui.modeSegmentBtn,
            mode === "photo" && { backgroundColor: hexToRgba(tokens.accent, 0.1) },
          ]}
          onPress={() => setMode("photo")}
          disabled={disabled || uploading}
        >
          <Ionicons name="camera-outline" size={16} color={mode === "photo" ? tokens.accent : SN.secondaryLabel} />
          <Text style={[ui.modeLabel, { color: mode === "photo" ? tokens.accent : tokens.text }]}>Photo</Text>
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
            <Text style={[styles.uploadHint, { color: SN.secondaryLabel }]}>Tap to open Files or Photos</Text>
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

      {uploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={tokens.accent} />
          <Text style={[styles.uploadingText, { color: SN.secondaryLabel }]}>Uploading…</Text>
        </View>
      ) : null}

      {files.map((file, index) => (
        <View key={`${file.url}-${index}`} style={[styles.fileRow, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
          {file.mime.startsWith("image/") ? (
            <CachedRemoteImage uri={resolveFilePreviewUrl(file.url)} variant="thumbnail" style={styles.thumb} />
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
          <Pressable onPress={() => removeFile(index)} hitSlop={8} disabled={disabled || submitting}>
            <Ionicons name="trash-outline" size={18} color={tokens.danger} />
          </Pressable>
        </View>
      ))}

      <Text style={[styles.fieldLabel, { color: SN.secondaryLabel }]}>Notes (optional)</Text>
      <TextInput
        style={[
          styles.notesInput,
          {
            borderColor: tokens.border,
            backgroundColor: tokens.background,
            color: tokens.text,
            height: notesHeight,
            minHeight: notesHeight,
          },
        ]}
        value={answer.written_notes ?? ""}
        onChangeText={(written_notes) => updateAnswer({ ...answer, written_notes })}
        placeholder="Type steps, calculations, or notes here…"
        placeholderTextColor={SN.secondaryLabel}
        multiline
        textAlignVertical="top"
        editable={!disabled && !submitting}
      />

      <Pressable
        style={[
          styles.submitBtn,
          { backgroundColor: tokens.accent },
          (disabled || submitting || uploading) && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={disabled || submitting || uploading}
      >
        <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit for grading"}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "700" },
  actionLabel: { fontSize: 13, fontWeight: "600" },
  actionLabelLarge: { fontSize: 15 },
  uploadHint: { fontSize: 12, lineHeight: 16, textAlign: "center" },
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
  notesInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  submitBtn: {
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
})
