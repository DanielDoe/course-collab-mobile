import { useState } from "react"
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { rewardsApi } from "../../lib/rewards-api"
import { useRewardsTheme } from "./rewards-shared"

type Props = {
  session: StudentSession
  assignmentId: number
  title: string
  disabled?: boolean
  onSubmitted: () => void
}

export function CodeAssignmentSubmitPanel({
  session,
  assignmentId,
  title,
  disabled,
  onSubmitted}: Props) {
  const theme = useRewardsTheme()
  const [code, setCode] = useState("")
  const [plotUri, setPlotUri] = useState<string | null>(null)
  const [plotBase64, setPlotBase64] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function pickPlot(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Camera access", "Allow camera access to attach a plot screenshot.")
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Photos access", "Allow photo library access to attach a plot.")
        return
      }
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.75, base64: true })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.75,
          base64: true,
          mediaTypes: ["images"]})

    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setPlotUri(asset.uri)
    if (asset.base64) {
      const mime = asset.mimeType ?? "image/jpeg"
      setPlotBase64(`data:${mime};base64,${asset.base64}`)
    }
  }

  async function handleSubmit() {
    if (!code.trim() || code.trim().length < 10) {
      AppAlert.alert("Code required", "Enter your complete solution (at least 10 characters).")
      return
    }
    setSubmitting(true)
    try {
      const result = await rewardsApi.submitClassroomCode(session, {
        submissionId: assignmentId,
        code: code.trim(),
        description: title,
        plotImage: plotBase64 ?? undefined})
      AppAlert.alert(
        "Submitted",
        result.message ??
          (result.autoApproved
            ? `${result.pointsAwarded ?? ""} points recorded.`
            : "Your code was submitted for grading."),
      )
      onSubmitted()
    } catch (err) {
      AppAlert.alert("Submit failed", err instanceof ApiError ? err.message : "Could not submit code.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>Code</Text>
      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={setCode}
        placeholder="// Paste or type your C++ solution"
        placeholderTextColor="#94a3b8"
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
        editable={!disabled && !submitting}
      />

      <Text style={styles.fieldLabel}>Plot / output (optional)</Text>
      <View style={styles.modeRow}>
        <Pressable style={[styles.modeBtn, { backgroundColor: theme.soft, borderColor: theme.softBorder }]} onPress={() => pickPlot(true)} disabled={disabled || submitting}>
          <Ionicons name="camera-outline" size={20} color={theme.primary} />
          <Text style={[styles.modeLabel, { color: theme.primaryDark }]}>Take photo</Text>
        </Pressable>
        <Pressable style={[styles.modeBtn, { backgroundColor: theme.soft, borderColor: theme.softBorder }]} onPress={() => pickPlot(false)} disabled={disabled || submitting}>
          <Ionicons name="images-outline" size={20} color={theme.primary} />
          <Text style={[styles.modeLabel, { color: theme.primaryDark }]}>Upload image</Text>
        </Pressable>
      </View>
      {plotUri ? (
        <View style={styles.plotWrap}>
          <Image source={{ uri: plotUri }} style={styles.plotImage} resizeMode="contain" />
          <Pressable onPress={() => { setPlotUri(null); setPlotBase64(null) }}>
            <Text style={styles.removePlot}>Remove plot</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.submitBtn,
          { backgroundColor: theme.primary },
          (disabled || submitting || !code.trim()) && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={disabled || submitting || !code.trim()}
      >
        <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit code"}</Text>
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
  codeInput: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: NATIVE.separator,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    fontFamily: "Menlo",
    color: "#0f172a",
    backgroundColor: "#f8fafc"},
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1},
  modeLabel: { fontSize: 11, fontWeight: "700" },
  plotWrap: { gap: 6 },
  plotImage: { width: "100%", height: 180, borderRadius: 999, backgroundColor: "#f1f5f9" },
  removePlot: { fontSize: 13, fontWeight: "700", color: "#dc2626" },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"},
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: "600", color: "#ffffff" }})
