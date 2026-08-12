import { useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { isMultiSelectType } from "../assessments/assessment-question-detail"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import type { QuestionMedia } from "../../lib/classroom-submission"
import {
  getPreviewOptions,
  getSolutionUploadMeta,
  isCircuitSubmissionType,
  isCodePreviewType,
  isFillBlankType,
  isMultiPartType,
  parseMultiPartItems,
  previewInteractionHint,
  previewTypeLabel,
  type PreviewQuestion,
} from "../../lib/faculty-assessment-preview"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import { FacultySheetTextInput, FACULTY_SHEET_CHIP_RADIUS } from "./faculty-collab-sheet-ui"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

function usePreviewStyles() {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: native.secondaryGrouped,
          borderRadius: 16,
          padding: 16,
          gap: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
        badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
        badge: {
          backgroundColor: linkSoft,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        badgeMuted: { backgroundColor: native.fill },
        badgeText: { fontSize: 11, fontWeight: "600", color: tokens.success, textTransform: "capitalize" },
        badgeTextMuted: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel },
        questionBody: { paddingHorizontal: 2, paddingVertical: 4 },
        hintBox: {
          flexDirection: "row",
          gap: 8,
          backgroundColor: `${tokens.warning}14`,
          borderRadius: 10,
          padding: 10,
          borderWidth: 1,
          borderColor: `${tokens.warning}33`,
        },
        hintContent: { flex: 1 },
        interactionHint: { fontSize: 12, fontWeight: "600", color: native.tertiaryLabel, lineHeight: 17 },
        stack: { gap: 10 },
        option: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: native.separator,
          backgroundColor: native.fill,
        },
        optionSelected: { borderColor: FACULTY_ASSESSMENT_COLOR.link, backgroundColor: linkSoft },
        optionMain: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10, minWidth: 0 },
        optionLetter: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          alignItems: "center",
          justifyContent: "center",
        },
        optionLetterSelected: {
          backgroundColor: FACULTY_ASSESSMENT_COLOR.tabActive,
          borderColor: FACULTY_ASSESSMENT_COLOR.tabActive,
        },
        optionLetterText: { fontSize: 13, fontWeight: "600", color: native.label },
        optionLetterTextSelected: { color: "#ffffff" },
        optionTextWrap: { flex: 1, minWidth: 0 },
        textInput: {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          borderRadius: 12,
          padding: 12,
          minHeight: 52,
          fontSize: 15,
          fontWeight: "600",
          color: native.label,
          backgroundColor: native.fill,
          textAlignVertical: "top",
        },
        codeInput: { fontFamily: "Menlo", fontSize: 13 },
        genericInput: { gap: 6 },
        genericInputLabel: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        partCard: {
          gap: 8,
          padding: 12,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.fill,
        },
        partLabel: { fontSize: 13, fontWeight: "600", color: native.label },
        partInput: {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          borderRadius: 10,
          padding: 10,
          minHeight: 44,
          fontSize: 14,
          color: native.tertiaryLabel,
          backgroundColor: native.secondaryGrouped,
        },
        submitPanel: {
          gap: 10,
          padding: 12,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.fill,
        },
        submitInstructionsWrap: { minWidth: 0 },
        submitInstructions: { fontSize: 13, lineHeight: 19, color: native.secondaryLabel, fontWeight: "600" },
        uploadRow: { flexDirection: "row", gap: 8 },
        uploadBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          borderStyle: "dashed",
        },
        uploadBtnText: { fontSize: 13, fontWeight: "700", color: FACULTY_ASSESSMENT_COLOR.link },
        uploadMeta: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        notesInput: {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          borderRadius: 10,
          padding: 10,
          minHeight: 64,
          fontSize: 14,
          color: native.tertiaryLabel,
          backgroundColor: native.secondaryGrouped,
          textAlignVertical: "top",
        },
        codeToolbar: { flexDirection: "row", alignItems: "center", gap: 6 },
        codeLang: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel, letterSpacing: 0.5 },
        codeEditor: {
          minHeight: 160,
          borderWidth: 1,
          borderColor: "#1e293b",
          borderRadius: 10,
          padding: 12,
          fontFamily: "Menlo",
          fontSize: 13,
          lineHeight: 20,
          color: "#e2e8f0",
          backgroundColor: "#0f172a",
          textAlignVertical: "top",
        },
        plotBlock: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 20,
          borderRadius: 10,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          borderStyle: "dashed",
          backgroundColor: native.secondaryGrouped,
        },
        plotHint: { fontSize: 13, fontWeight: "600", color: native.tertiaryLabel },
        previewFooter: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingTop: 4,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: native.separator,
        },
        previewFooterText: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel, flex: 1 },
      }),
    [native, tokens, type, linkSoft],
  )
}

export function FacultyAssessmentQuestionPreview({ question }: { question: PreviewQuestion }) {
  const styles = usePreviewStyles()
  const { tokens, native } = useModuleTheme()
  const type = (question.question_type ?? "").toLowerCase()
  const isMulti = isMultiSelectType(type)
  const isFill = isFillBlankType(type)
  const isCode = isCodePreviewType(type)
  const isCircuit = isCircuitSubmissionType(type)
  const isMultiPart = isMultiPartType(type)
  const options = getPreviewOptions(question)
  const uploadMeta = getSolutionUploadMeta(question)
  const multiParts = parseMultiPartItems(question)

  const [selectedLetter, setSelectedLetter] = useState("")
  const [selectedLetters, setSelectedLetters] = useState<string[]>([])
  const [showHint, setShowHint] = useState(false)

  const media = question.question_media as QuestionMedia | null | undefined
  const points = question.max_points ?? question.points

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{previewTypeLabel(type, options.length > 0)}</Text>
          </View>
          {points != null ? (
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={styles.badgeTextMuted}>{points} pts</Text>
            </View>
          ) : null}
        </View>
        {question.hint ? (
          <Pressable onPress={() => setShowHint(!showHint)} hitSlop={8}>
            <Ionicons name="bulb-outline" size={22} color={showHint ? tokens.warning : native.tertiaryLabel} />
          </Pressable>
        ) : null}
      </View>

      {media ? <QuestionMediaView media={media} embedded /> : null}

      {question.question_text?.trim() ? (
        <View style={styles.questionBody}>
          <QuestionContentWebView text={question.question_text} embedded />
        </View>
      ) : null}

      {showHint && question.hint ? (
        <View style={styles.hintBox}>
          <Ionicons name="bulb-outline" size={14} color={tokens.warning} />
          <View style={styles.hintContent}>
            <QuestionContentWebView text={question.hint} embedded compact />
          </View>
        </View>
      ) : null}

      <Text style={styles.interactionHint}>{previewInteractionHint(type)}</Text>

      {isMultiPart && multiParts.length > 0 ? (
        <View style={styles.stack}>
          {multiParts.map((part, index) => (
            <View key={`${part.label}-${index}`} style={styles.partCard}>
              <Text style={styles.partLabel}>{part.label}</Text>
              {part.text ? <QuestionContentWebView text={part.text} embedded compact /> : null}
              <FacultySheetTextInput
                style={styles.partInput}
                placeholder="Student answer…"
                editable={false}
                multiline
              />
            </View>
          ))}
        </View>
      ) : isCircuit ? (
        <CircuitSubmissionPreview meta={uploadMeta} />
      ) : isCode ? (
        <CodeSubmissionPreview language={question.ai_code_language ?? undefined} type={type} />
      ) : isFill ? (
        <FacultySheetTextInput
          style={[styles.textInput, type === "fill_code" && styles.codeInput]}
          placeholder={type === "fill_code" ? "// Fill in the missing code…" : "Type your answer…"}
          editable={false}
          multiline
        />
      ) : options.length > 0 ? (
        options.map(({ letter, text }) => {
          const selected = isMulti ? selectedLetters.includes(letter) : selectedLetter === letter
          return (
            <Pressable
              key={letter}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => {
                if (isMulti) {
                  setSelectedLetters((prev) =>
                    prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter],
                  )
                } else {
                  setSelectedLetter(letter)
                }
              }}
            >
              <View style={styles.optionMain}>
                <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}>
                  <Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>{letter}</Text>
                </View>
                <View style={styles.optionTextWrap}>
                  <QuestionContentWebView text={text} embedded compact />
                </View>
              </View>
              {selected ? (
                <Ionicons name={isMulti ? "checkbox" : "checkmark-circle"} size={20} color={FACULTY_ASSESSMENT_COLOR.link} />
              ) : isMulti ? (
                <Ionicons name="square-outline" size={20} color={native.separator} />
              ) : null}
            </Pressable>
          )
        })
      ) : (
        <View style={styles.genericInput}>
          <Text style={styles.genericInputLabel}>Response area</Text>
          <FacultySheetTextInput style={styles.textInput} placeholder="Student response…" editable={false} multiline />
        </View>
      )}

      <View style={styles.previewFooter}>
        <Ionicons name="eye-outline" size={14} color={native.secondaryLabel} />
        <Text style={styles.previewFooterText}>Preview mode — nothing is submitted or graded</Text>
      </View>
    </View>
  )
}

function CircuitSubmissionPreview({ meta }: { meta: ReturnType<typeof getSolutionUploadMeta> }) {
  const styles = usePreviewStyles()
  const maxFiles = meta?.max_files ?? 10
  return (
    <View style={styles.submitPanel}>
      {meta?.submission_instructions ? (
        <View style={styles.submitInstructionsWrap}>
          <QuestionContentWebView text={meta.submission_instructions} embedded compact />
        </View>
      ) : (
        <Text style={styles.submitInstructions}>
          Upload clear photos or PDFs of your circuit diagram and calculations.
        </Text>
      )}
      <View style={styles.uploadRow}>
        <View style={styles.uploadBtn}>
          <Ionicons name="camera-outline" size={18} color={FACULTY_ASSESSMENT_COLOR.link} />
          <Text style={styles.uploadBtnText}>Take photo</Text>
        </View>
        <View style={styles.uploadBtn}>
          <Ionicons name="document-outline" size={18} color={FACULTY_ASSESSMENT_COLOR.link} />
          <Text style={styles.uploadBtnText}>Upload file</Text>
        </View>
      </View>
      <Text style={styles.uploadMeta}>Up to {maxFiles} files · PDF or image</Text>
      <FacultySheetTextInput style={styles.notesInput} placeholder="Written notes (optional)…" editable={false} multiline />
    </View>
  )
}

function CodeSubmissionPreview({ language, type }: { language?: string; type: string }) {
  const styles = usePreviewStyles()
  const { native } = useModuleTheme()
  const needsPlot = type === "code_write_plot"
  return (
    <View style={styles.submitPanel}>
      <View style={styles.codeToolbar}>
        <Ionicons name="code-slash-outline" size={16} color={native.secondaryLabel} />
        <Text style={styles.codeLang}>{language?.toUpperCase() ?? "CODE"}</Text>
      </View>
      <FacultySheetTextInput
        style={styles.codeEditor}
        placeholder={`// ${language ?? "solution"}.cpp\n// Write your complete solution here…`}
        editable={false}
        multiline
        scrollEnabled={false}
      />
      {needsPlot ? (
        <View style={styles.plotBlock}>
          <Ionicons name="image-outline" size={20} color={native.tertiaryLabel} />
          <Text style={styles.plotHint}>Attach plot / graph output</Text>
        </View>
      ) : null}
    </View>
  )
}
