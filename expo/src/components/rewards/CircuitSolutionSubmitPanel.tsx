import { useCallback, useState } from "react"
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { API_BASE_URL } from "../../constants"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  compactSolutionForSubmit,
  hasRequiredSolutionUpload,
  listSolutionFiles,
  parseSolutionAnswer,
  solutionPartKey,
  type SolutionUploadsMap} from "../../lib/classroom-submission"
import { rewardsApi } from "../../lib/rewards-api"
import { useRewardsTheme } from "./rewards-shared"

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
  onSubmitted}: Props) {
  const theme = useRewardsTheme()
  const tokens = useAppThemeTokens()
  const [answerJson, setAnswerJson] = useState(() =>
    JSON.stringify({
      version: 1,
      submission_status: "draft",
      submission_mode: "upload",
      solution_uploads: {},
      written_notes: ""}),
  )
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const answer = parseSolutionAnswer(answerJson)
  const files = listSolutionFiles(answer.solution_uploads)
  const atMax = files.length >= maxFiles

  const updateAnswer = useCallback((next: ReturnType<typeof parseSolutionAnswer>) => {
    setAnswerJson(JSON.stringify(next))
  }, [])

  async function uploadAsset(
    uri: string,
    name: string,
    mime: string,
    mode: "upload" | "photo",
  ) {
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
        mime})
      const uploads: SolutionUploadsMap = { ...(answer.solution_uploads ?? {}) }
      uploads[partId] = {
        url: uploaded.url,
        name: uploaded.name ?? name,
        mime: uploaded.mime ?? mime,
        uploaded_at: uploaded.uploaded_at}
      updateAnswer({
        ...answer,
        submission_mode: mode,
        solution_uploads: uploads})
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
      type: ["application/pdf", "image/*"]})
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
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: false, mediaTypes: ["images"] })

    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const name = asset.fileName ?? `solution-${Date.now()}.jpg`
    await uploadAsset(asset.uri, name, asset.mimeType ?? "image/jpeg", "photo")
  }

  function removeFile(index: number) {
    const uploads = { ...(answer.solution_uploads ?? {}) }
    const key = solutionPartKey(index)
    delete uploads[key]
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
        studentAnswer: compact})
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
      <View style={styles.modeRow}>
        <Pressable style={[styles.modeBtn, { backgroundColor: theme.soft, borderColor: theme.softBorder }]} onPress={pickDocument} disabled={disabled || uploading || atMax}>
          <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
          <Text style={[styles.modeLabel, { color: theme.primaryDark }]}>Upload file</Text>
        </Pressable>
        <Pressable style={[styles.modeBtn, { backgroundColor: theme.soft, borderColor: theme.softBorder }]} onPress={() => pickPhoto(true)} disabled={disabled || uploading || atMax}>
          <Ionicons name="camera-outline" size={20} color={theme.primary} />
          <Text style={[styles.modeLabel, { color: theme.primaryDark }]}>Take photo</Text>
        </Pressable>
        <Pressable style={[styles.modeBtn, { backgroundColor: theme.soft, borderColor: theme.softBorder }]} onPress={() => pickPhoto(false)} disabled={disabled || uploading || atMax}>
          <Ionicons name="images-outline" size={20} color={theme.primary} />
          <Text style={[styles.modeLabel, { color: theme.primaryDark }]}>Choose photo</Text>
        </Pressable>
      </View>

      {uploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      ) : null}

      {files.map((file, index) => (
        <View key={`${file.url}-${index}`} style={[styles.fileRow, { backgroundColor: tokens.surface }]}>
          {file.mime.startsWith("image/") ? (
            <Image source={{ uri: resolveFilePreviewUrl(file.url) }} style={styles.thumb} />
          ) : (
            <View style={[styles.fileIcon, { backgroundColor: theme.soft }]}>
              <Ionicons name="document-text-outline" size={22} color={theme.primary} />
            </View>
          )}
          <View style={styles.fileBody}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={styles.fileMeta}>{file.mime}</Text>
          </View>
          <Pressable onPress={() => removeFile(index)} hitSlop={8} disabled={disabled || submitting}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </Pressable>
        </View>
      ))}

      <Text style={styles.fieldLabel}>Notes (optional)</Text>
      <TextInput
        style={styles.notesInput}
        value={answer.written_notes ?? ""}
        onChangeText={(written_notes) => updateAnswer({ ...answer, written_notes })}
        placeholder="Type steps, calculations, or notes here…"
        placeholderTextColor="#94a3b8"
        multiline
        textAlignVertical="top"
        editable={!disabled && !submitting}
      />

      <Pressable
        style={[
          styles.submitBtn,
          { backgroundColor: theme.primary },
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: NATIVE.secondaryLabel},
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1},
  modeLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadingText: { fontSize: 13, color: NATIVE.secondaryLabel },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NATIVE.separator},
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#f1f5f9" },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"},
  fileBody: { flex: 1, gap: 2 },
  fileName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  fileMeta: { fontSize: 11, color: NATIVE.secondaryLabel },
  notesInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: NATIVE.separator,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    lineHeight: 20},
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4},
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: "600", color: "#ffffff" }})
