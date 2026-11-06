import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { useStudentSubmissionLayout } from "../../lib/circuit-submission-layout"
import {
  assessmentCodeLanguageLabel,
  resolveAssessmentCodeLanguage,
  type AssessmentCodeLanguage,
} from "../../lib/assessment-code-editor"
import { AssessmentCodeEditor } from "./AssessmentCodeEditor"
import { circuitSubmissionUi as ui } from "./circuit-submission-ui"

type Props = {
  code: string
  onCodeChange: (next: string) => void
  plotImage?: string
  onPlotImageChange?: (next: string) => void
  requiresPlot?: boolean
  disabled?: boolean
  editorHeight?: number
  onEditorFocus?: () => void
  onEditorBlur?: () => void
  questionType?: string
  questionText?: string
  language?: AssessmentCodeLanguage
  blockPaste?: boolean
  editorKey?: string | number
}

export function CodeWriteAnswerPanel({
  code,
  onCodeChange,
  plotImage,
  onPlotImageChange,
  requiresPlot,
  disabled,
  editorHeight,
  onEditorFocus,
  onEditorBlur,
  questionType,
  questionText,
  language,
  blockPaste,
  editorKey,
}: Props) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const { codeFieldHeight, largeUpload, plotPreviewHeight } = useStudentSubmissionLayout()
  const fieldHeight = editorHeight ?? codeFieldHeight
  const editorLanguage = language ?? resolveAssessmentCodeLanguage(questionType, questionText)

  async function pickPlot(fromCamera: boolean) {
    if (!onPlotImageChange) return
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Camera access", "Allow camera access to attach your plot screenshot.")
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Photos access", "Allow photo library access to attach your plot.")
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
    if (!asset.base64) {
      AppAlert.alert("Could not attach plot", "Try another photo or take a new screenshot.")
      return
    }
    const mime = asset.mimeType ?? "image/jpeg"
    onPlotImageChange(`data:${mime};base64,${asset.base64}`)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: SN.secondaryLabel }]}>Your code</Text>
        <Text style={[styles.langChip, { color: tokens.accent, backgroundColor: hexToRgba(tokens.accent, 0.12) }]}>
          {assessmentCodeLanguageLabel(editorLanguage)}
        </Text>
      </View>
      <AssessmentCodeEditor
        key={editorKey ?? editorLanguage}
        value={code}
        onChange={onCodeChange}
        language={editorLanguage}
        disabled={disabled}
        blockPaste={blockPaste}
        height={fieldHeight}
        onFocus={onEditorFocus}
        onBlur={onEditorBlur}
      />

      {requiresPlot ? (
        <>
          <Text style={[styles.fieldLabel, { color: SN.secondaryLabel }]}>Plot output</Text>
          <Text style={[styles.hint, { color: SN.secondaryLabel }]}>
            Run your code, then attach the plot screenshot. AI will grade your source and figure together.
          </Text>
          {plotImage ? (
            <View style={styles.plotWrap}>
              <Image
                source={{ uri: plotImage }}
                style={[styles.plotImage, { height: plotPreviewHeight, backgroundColor: tokens.background }]}
                resizeMode="contain"
                accessibilityLabel="Attached plot preview"
              />
              <Pressable
                onPress={() => onPlotImageChange?.("")}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Remove plot"
              >
                <Text style={[styles.removePlot, { color: tokens.danger }]}>Remove plot</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={ui.photoRow}>
            <Pressable
              style={[
                ui.actionBtn,
                largeUpload ? ui.uploadDropZone : ui.actionBtnPrimary,
                ui.actionBtnHalf,
                { borderColor: tokens.border, backgroundColor: tokens.background },
              ]}
              onPress={() => void pickPlot(true)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Take plot photo"
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
              onPress={() => void pickPlot(false)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Upload plot image"
            >
              <Ionicons name="images-outline" size={largeUpload ? 26 : 18} color={tokens.accent} />
              <Text style={[styles.actionLabel, largeUpload && styles.actionLabelLarge, { color: tokens.text }]}>
                Upload image
              </Text>
            </Pressable>
          </View>

          {plotImage ? null : (
            <View
              style={[
                styles.missingPlot,
                {
                  backgroundColor: hexToRgba(tokens.warning, tokens.isDark ? 0.16 : 0.1),
                  borderColor: hexToRgba(tokens.warning, tokens.isDark ? 0.32 : 0.22),
                },
              ]}
            >
              <Ionicons name="image-outline" size={16} color={tokens.warning} />
              <Text style={[styles.missingPlotText, { color: tokens.warning }]}>
                Attach your plot before submitting this question.
              </Text>
            </View>
          )}
        </>
      ) : null}

      <View
        style={[
          styles.note,
          {
            backgroundColor: hexToRgba(tokens.accent, tokens.isDark ? 0.16 : 0.08),
            borderColor: hexToRgba(tokens.accent, tokens.isDark ? 0.28 : 0.18),
          },
        ]}
      >
        <Ionicons name="sparkles-outline" size={16} color={tokens.accent} />
        <Text style={[styles.noteText, { color: tokens.text }]}>
          Submit to get a provisional AI grade. Your instructor can still review and adjust the score.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 12, fontWeight: "700" },
  langChip: {
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hint: { fontSize: 12, lineHeight: 17, marginTop: -4 },
  actionLabel: { fontSize: 13, fontWeight: "600" },
  actionLabelLarge: { fontSize: 15 },
  plotWrap: { gap: 6 },
  plotImage: { width: "100%", borderRadius: 12 },
  removePlot: { fontSize: 13, fontWeight: "700" },
  missingPlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  missingPlotText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 16 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
})
