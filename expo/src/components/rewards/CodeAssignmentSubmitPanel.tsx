import { useState } from "react"
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { useStudentSubmissionLayout } from "../../lib/circuit-submission-layout"
import { rewardsApi } from "../../lib/rewards-api"
import { circuitSubmissionUi as ui } from "../assessments/circuit-submission-ui"

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
  onSubmitted,
}: Props) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const { codeFieldHeight, largeUpload, plotPreviewHeight } = useStudentSubmissionLayout()
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
          mediaTypes: ["images"],
        })

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
        plotImage: plotBase64 ?? undefined,
      })
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
      <Text style={[styles.fieldLabel, { color: SN.secondaryLabel }]}>Code</Text>
      <TextInput
        style={[
          styles.codeInput,
          {
            borderColor: tokens.border,
            backgroundColor: tokens.background,
            color: tokens.text,
            height: codeFieldHeight,
            minHeight: codeFieldHeight,
          },
        ]}
        value={code}
        onChangeText={setCode}
        placeholder="// Paste or type your C++ solution"
        placeholderTextColor={SN.secondaryLabel}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
        editable={!disabled && !submitting}
      />

      <Text style={[styles.fieldLabel, { color: SN.secondaryLabel }]}>Plot / output (optional)</Text>
      <View style={ui.photoRow}>
        <Pressable
          style={[
            ui.actionBtn,
            largeUpload ? ui.uploadDropZone : ui.actionBtnPrimary,
            ui.actionBtnHalf,
            { borderColor: tokens.border, backgroundColor: tokens.background },
          ]}
          onPress={() => pickPlot(true)}
          disabled={disabled || submitting}
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
          onPress={() => pickPlot(false)}
          disabled={disabled || submitting}
        >
          <Ionicons name="images-outline" size={largeUpload ? 26 : 18} color={tokens.accent} />
          <Text style={[styles.actionLabel, largeUpload && styles.actionLabelLarge, { color: tokens.text }]}>
            Upload image
          </Text>
        </Pressable>
      </View>

      {plotUri ? (
        <View style={styles.plotWrap}>
          <Image
            source={{ uri: plotUri }}
            style={[styles.plotImage, { height: plotPreviewHeight }]}
            resizeMode="contain"
          />
          <Pressable onPress={() => { setPlotUri(null); setPlotBase64(null) }}>
            <Text style={[styles.removePlot, { color: tokens.danger }]}>Remove plot</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.submitBtn,
          { backgroundColor: tokens.accent },
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
  fieldLabel: { fontSize: 12, fontWeight: "700" },
  actionLabel: { fontSize: 13, fontWeight: "600" },
  actionLabelLarge: { fontSize: 15 },
  codeInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    fontFamily: "Menlo",
    lineHeight: 20,
  },
  plotWrap: { gap: 6 },
  plotImage: { width: "100%", borderRadius: 12, backgroundColor: "#f1f5f9" },
  removePlot: { fontSize: 13, fontWeight: "700" },
  submitBtn: {
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
})
