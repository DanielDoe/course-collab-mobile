import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import type { QuestionMedia } from "../../lib/classroom-submission"
import { ASSESSMENT_TYPE_CONFIG, type AssessmentType } from "../../lib/faculty-assessment-utils"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import {
  AI_EVAL_MODES,
  AI_MODEL_OPTIONS,
  ASSESSMENT_CODE_LANGUAGE_OPTIONS,
  CODE_LANGUAGE_NONE,
  QUESTION_AI_LANGUAGE_OPTIONS,
  QUESTION_TYPE_GROUPS,
  QUESTION_TYPES_WITH_AI_LANGUAGE,
  SUPERPOWER_OPTIONS,
  defaultTimeLimit,
  isCircuitQuestionType,
  isMcqStyleType,
  isTextAnswerType,
  questionTypeAbbrev,
  questionTypeLabel} from "../../lib/faculty-quiz-editor-config"
import {
  createBlankQuestion,
  draftQuestionToPreview,
  editorDraftToUpdatePayload,
  quizDetailToEditorDraft,
  type QuizEditorDraft,
  type QuizQuestionDraft} from "../../lib/faculty-quiz-editor-mapper"
import { validateQuizEditorDraft } from "../../lib/faculty-quiz-editor-validation"
import { instructorApi, type InstructorQuiz, type InstructorSession } from "../../lib/instructor-api"
import { FacultyAssessmentAccessPanel } from "./FacultyAssessmentAccessPanel"
import { FacultyAssessmentQuestionPreview } from "./FacultyAssessmentQuestionPreview"
import { FacultyAssessmentSectionsPanel } from "./FacultyAssessmentSectionsPanel"
import { FacultyAssessmentStudentGrantsPanel } from "./FacultyAssessmentStudentGrantsPanel"
import { FacultyAssessmentTimePanel } from "./FacultyAssessmentTimePanel"
import {
  applyExamWideMinutes,
  defaultExamWideTimerSeconds,
  examWideMinuteOptions,
  isExamWideAssessmentType,
  resolveExamWideTimerSeconds,
} from "../../lib/assessment-quiz/exam-wide-timer"
import { NativeSelect } from "../NativeSelect"
import {
  CONCURRENT_STUDENT_OPTIONS,
  CONFIDENCE_THRESHOLD_OPTIONS,
  FacultyDateTimeField,
  GEO_RADIUS_OPTIONS,
  HINT_PENALTY_OPTIONS,
  HOUR_GRANT_OPTIONS,
  POINT_AWARD_OPTIONS,
  RETAKE_LIMIT_OPTIONS,
  secondsSelectOptions,
  STRIKE_COUNT_OPTIONS,
  withCurrentOption,
} from "./FacultyNativePickers"
import {
  EditorChipPicker,
  EditorDivider,
  EditorHeroCard,
  EditorInlineField,
  EditorInlineFields,
  EditorMultiChipPicker,
  EditorNotice,
  EditorSectionCard,
  EditorTextField,
  EditorToggleRow} from "./FacultyAssessmentEditorUi"
import { FacultyModuleTabBar } from "./faculty-module-shell"
import { FACULTY_SHEET_CHIP_RADIUS } from "./faculty-collab-sheet-ui"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Scope = { instructorId: number; courseId: number }

type TabId = "details" | "questions" | "access" | "sections" | "time" | "settings"

const EDITOR_TABS: Array<{
  id: TabId
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "details", label: "Details", icon: "document-text-outline" },
  { id: "questions", label: "Questions", icon: "list-outline" },
  { id: "access", label: "Access", icon: "people-outline" },
  { id: "sections", label: "Sections", icon: "layers-outline" },
  { id: "time", label: "Time", icon: "time-outline" },
  { id: "settings", label: "Settings", icon: "settings-outline" },
]

function previewSnippet(text: string, max = 52): string {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

type Props = {
  quiz: InstructorQuiz | null
  assessmentType: AssessmentType
  scope: Scope | null
  onClose: () => void
  onSaved: () => void
}

function useEditorModalStyles() {
  const { native, tokens, type, cardShadow } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  const styles = useMemo(
    () =>
      StyleSheet.create({
        topBar: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
        },
        topCopy: { flex: 1, minWidth: 0, gap: 2 },
        topTitle: { ...type.bodyEmphasis, fontSize: 16, color: native.label },
        topSub: { ...type.caption, fontWeight: "600", color: native.secondaryLabel },
        saveBtn: {
          backgroundColor: FACULTY_ASSESSMENT_COLOR.action,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
          minWidth: 64,
          alignItems: "center",
        },
        saveBtnDisabled: { opacity: 0.5 },
        saveBtnText: { color: FACULTY_ASSESSMENT_COLOR.actionInk, fontWeight: "600", fontSize: 14 },
        attemptsBanner: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginHorizontal: 16,
          marginBottom: 8,
          padding: 14,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
        },
        attemptsBannerIcon: {
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        },
        attemptsBannerCopy: { flex: 1, gap: 4 },
        attemptsBannerTitle: { fontSize: 14, lineHeight: 20 },
        attemptsBannerText: { lineHeight: 18, fontWeight: "600" },
        tabNavWrap: { paddingHorizontal: 16, paddingBottom: 8 },
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
        errorText: { fontSize: 14, fontWeight: "600", color: tokens.danger, textAlign: "center" },
        retryBtn: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: FACULTY_ASSESSMENT_COLOR.action,
        },
        retryBtnText: { color: FACULTY_ASSESSMENT_COLOR.actionInk, fontWeight: "600" },
        content: { padding: 16, gap: 14 },
        panel: { gap: 14 },
        field: { gap: 6 },
        fieldLabel: {
          fontSize: 11,
          fontWeight: "600",
          color: native.secondaryLabel,
          letterSpacing: 0.4,
        },
        stack: { gap: 10 },
        chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        chipActive: { backgroundColor: linkSoft, borderColor: FACULTY_ASSESSMENT_COLOR.link },
        chipText: { fontSize: 13, fontWeight: "700", color: native.secondaryLabel },
        chipTextActive: { color: FACULTY_ASSESSMENT_COLOR.link },
        selectBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 12,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        selectBtnText: { fontSize: 15, fontWeight: "700", color: native.label },
        typePicker: {
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.secondaryGrouped,
          overflow: "hidden",
        },
        typeGroup: {
          padding: 10,
          gap: 4,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        typeGroupLabel: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        typeOption: { paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
        typeOptionActive: { backgroundColor: linkSoft },
        typeOptionText: { fontSize: 14, fontWeight: "600", color: native.label },
        typeOptionTextActive: { color: FACULTY_ASSESSMENT_COLOR.link, fontWeight: "600" },
        sectionHint: { fontSize: 13, fontWeight: "700", color: native.secondaryLabel },
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
        questionNavCard: {
          backgroundColor: native.secondaryGrouped,
          borderRadius: 16,
          padding: 14,
          gap: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          ...cardShadow,
        },
        questionNavHead: { flexDirection: "row", alignItems: "center", gap: 8 },
        navArrowBtn: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: native.fill,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        navArrowDisabled: { opacity: 0.45 },
        questionNavCenter: { flex: 1, minWidth: 0, gap: 2 },
        questionNavTitle: { fontSize: 14, fontWeight: "600", color: native.label },
        questionNavMeta: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
        questionPills: { flexDirection: "row", gap: 8, alignItems: "center" },
        questionPill: {
          minWidth: 52,
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          alignItems: "center",
          gap: 2,
        },
        questionPillActive: {
          backgroundColor: FACULTY_ASSESSMENT_COLOR.tabActive,
          borderColor: FACULTY_ASSESSMENT_COLOR.tabActive,
        },
        questionPillNum: { fontSize: 13, fontWeight: "600", color: native.label },
        questionPillNumActive: { color: "#ffffff" },
        questionPillType: { fontSize: 10, fontWeight: "700", color: native.tertiaryLabel },
        questionPillTypeActive: { color: "rgba(255,255,255,0.85)" },
        addQuestionPill: {
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: FACULTY_ASSESSMENT_COLOR.link,
          borderStyle: "dashed",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: native.secondaryGrouped,
        },
        questionEditorStack: { gap: 14 },
        questionEditorHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
        },
        questionEditorActions: { flexDirection: "row", alignItems: "center", gap: 10 },
        bankBanner: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
          padding: 10,
          borderRadius: 10,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        bankBannerText: { flex: 1, fontSize: 12, lineHeight: 17, color: native.secondaryLabel, fontWeight: "600" },
        previewBlock: { gap: 8, marginTop: 4 },
        previewLabel: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel },
        emptyQuestions: {
          alignItems: "center",
          padding: 32,
          gap: 10,
          backgroundColor: native.secondaryGrouped,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        emptyQuestionsText: { fontSize: 16, color: native.label, fontWeight: "600" },
        emptyQuestionsSub: {
          fontSize: 13,
          color: native.secondaryLabel,
          fontWeight: "600",
          textAlign: "center",
          lineHeight: 18,
        },
        primaryBtn: {
          backgroundColor: FACULTY_ASSESSMENT_COLOR.action,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
        },
        primaryBtnText: { color: FACULTY_ASSESSMENT_COLOR.actionInk, fontWeight: "600", fontSize: 14 },
        pointsSummary: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 12,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        pointsSummaryLabel: { fontSize: 13, fontWeight: "700", color: native.secondaryLabel },
        pointsSummaryValue: { fontSize: 16, fontWeight: "600", color: FACULTY_ASSESSMENT_COLOR.link },
        pointsSummaryWarn: { color: tokens.warning },
        confirmBackdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(15,23,42,0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          zIndex: 20,
        },
        confirmSheet: {
          width: "100%",
          maxWidth: 340,
          backgroundColor: native.secondaryGrouped,
          borderRadius: 16,
          padding: 20,
          gap: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          ...cardShadow,
        },
        confirmTitle: { fontSize: 17, fontWeight: "600", color: native.label },
        confirmBody: { fontSize: 14, lineHeight: 20, color: native.secondaryLabel, fontWeight: "600" },
        confirmActions: { flexDirection: "row", gap: 10, marginTop: 4 },
        confirmCancelBtn: {
          flex: 1,
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: native.fill,
        },
        confirmCancelText: { fontSize: 14, fontWeight: "600", color: native.secondaryLabel },
        confirmDeleteBtn: {
          flex: 1,
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: native.fill,
          borderWidth: 1,
          borderColor: tokens.danger,
        },
        confirmDeleteText: { fontSize: 14, fontWeight: "600", color: tokens.danger },
      }),
    [native, tokens, type, cardShadow, linkSoft],
  )
  return { styles, native, tokens, type }
}

function TextField(props: Parameters<typeof EditorTextField>[0]) {
  return <EditorTextField {...props} />
}

function ToggleRow(props: Parameters<typeof EditorToggleRow>[0]) {
  return <EditorToggleRow {...props} />
}

function ChipPicker(props: Parameters<typeof EditorChipPicker>[0]) {
  return <EditorChipPicker {...props} />
}

function QuestionTypePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const { styles, native } = useEditorModalStyles()
  const [open, setOpen] = useState(false)
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Question type</Text>
      <Pressable style={styles.selectBtn} onPress={() => setOpen(!open)}>
        <Text style={styles.selectBtnText}>{questionTypeLabel(value)}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={native.secondaryLabel} />
      </Pressable>
      {open ? (
        <View style={styles.typePicker}>
          {QUESTION_TYPE_GROUPS.map((group) => (
            <View key={group.label} style={styles.typeGroup}>
              <Text style={styles.typeGroupLabel}>{group.label}</Text>
              {group.types.map((t) => (
                <Pressable
                  key={t.id}
                  style={[styles.typeOption, value === t.id && styles.typeOptionActive]}
                  onPress={() => {
                    onChange(t.id)
                    setOpen(false)
                  }}
                >
                  <Text style={[styles.typeOptionText, value === t.id && styles.typeOptionTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function McqOptionsEditor({
  question,
  onChange}: {
  question: QuizQuestionDraft
  onChange: (patch: Partial<QuizQuestionDraft>) => void
}) {
  const { styles } = useEditorModalStyles()
  const type = question.question_type.toLowerCase()
  const letters = ["A", "B", "C", "D", "E"] as const
  const optionKeys = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const

  if (type === "true_false") {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Correct answer</Text>
        <View style={styles.chipRow}>
          {[
            { id: "A", label: "True" },
            { id: "B", label: "False" },
          ].map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.chip, question.correct_answer.toUpperCase() === opt.id && styles.chipActive]}
              onPress={() => onChange({ correct_answer: opt.id })}
            >
              <Text
                style={[
                  styles.chipText,
                  question.correct_answer.toUpperCase() === opt.id && styles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.stack}>
      {letters.map((letter, i) => {
        const key = optionKeys[i]
        if (type === "mcq" && i >= 4) return null
        return (
          <TextField
            key={letter}
            label={`Option ${letter}`}
            value={question[key]}
            onChangeText={(v) => onChange({ [key]: v })}
            placeholder={`Option ${letter} text…`}
            multiline
          />
        )
      })}

      {type === "select_all" || type === "multi_output" ? (
        <TextField
          label="Correct answers"
          value={question.correct_answer}
          onChangeText={(v) => onChange({ correct_answer: v })}
          placeholder='["A","C"] or comma-separated letters'
          multiline
        />
      ) : (
        <ChipPicker
          label="Correct option"
          options={letters
            .slice(0, type === "mcq" ? 4 : 5)
            .filter((_, i) => question[optionKeys[i]]?.trim())
            .map((l) => ({ id: l, label: l }))}
          value={question.correct_answer.toUpperCase()}
          onChange={(id) => onChange({ correct_answer: id })}
        />
      )}
    </View>
  )
}

function CircuitFieldsEditor({
  question,
  onChange}: {
  question: QuizQuestionDraft
  onChange: (patch: Partial<QuizQuestionDraft>) => void
}) {
  const { styles } = useEditorModalStyles()
  const spec = question.circuit_spec ?? {}
  const patchSpec = (patch: Record<string, unknown>) =>
    onChange({ circuit_spec: { ...spec, ...patch } })

  const type = question.question_type.toLowerCase()

  return (
    <View style={styles.stack}>
      <Text style={styles.sectionHint}>Engineering / circuit configuration</Text>
      {(type === "circuit_numeric" || type === "circuit_worked_solution") && (
        <>
          <TextField
            label="Expected answer"
            value={String(spec.expectedAnswer ?? question.correct_answer ?? "")}
            onChangeText={(v) => {
              patchSpec({ expectedAnswer: v })
              onChange({ correct_answer: v })
            }}
            placeholder="Numeric or symbolic answer"
          />
          <TextField
            label="Expected unit"
            value={String(spec.expectedUnit ?? "")}
            onChangeText={(v) => patchSpec({ expectedUnit: v })}
            placeholder="e.g. V, A, Ω"
          />
          <TextField
            label="Tolerance"
            value={spec.tolerance != null ? String(spec.tolerance) : ""}
            onChangeText={(v) => patchSpec({ tolerance: v.trim() ? Number(v) : null })}
            placeholder="Absolute tolerance (optional)"
            keyboardType="decimal-pad"
          />
        </>
      )}
      {type === "circuit_fill_equation" && (
        <TextField
          label="Equation slots (JSON)"
          value={
            spec.equationExpected
              ? JSON.stringify(spec.equationExpected, null, 2)
              : ""
          }
          onChangeText={(v) => {
            try {
              patchSpec({ equationExpected: v.trim() ? JSON.parse(v) : {} })
            } catch {
              /* keep typing */
            }
          }}
          placeholder='{"slot1": "R_1/R_2", "slot2": "..."}'
          multiline
        />
      )}
      <TextField
        label="Solution rubric"
        value={String(spec.solutionRubric ?? "")}
        onChangeText={(v) => patchSpec({ solutionRubric: v })}
        placeholder="Grading notes for AI / manual review"
        multiline
      />
      <TextField
        label="Sample solution"
        value={String(spec.sampleSolution ?? "")}
        onChangeText={(v) => patchSpec({ sampleSolution: v })}
        placeholder="Reference worked solution"
        multiline
      />
      <ToggleRow
        label="Require units"
        value={spec.requireUnits === true}
        onValueChange={(v) => patchSpec({ requireUnits: v })}
      />
      <ToggleRow
        label="Allow work upload"
        value={spec.allowWorkUpload === true}
        onValueChange={(v) => patchSpec({ allowWorkUpload: v })}
      />
    </View>
  )
}

function MediaFieldsEditor({
  question,
  scope,
  onChange}: {
  question: QuizQuestionDraft
  scope: Scope
  onChange: (patch: Partial<QuizQuestionDraft>) => void
}) {
  const { styles, tokens } = useEditorModalStyles()
  const [uploading, setUploading] = useState(false)
  const media = question.question_media ?? {
    media_enabled: false,
    media_url: "",
    media_type: "image",
    media_caption: "",
    media_alt_text: "",
    media_placement: "above",
    media_allow_zoom: true}

  const patchMedia = (patch: Partial<QuestionMedia>) => {
    onChange({ question_media: { ...media, ...patch, media_enabled: true } })
  }

  async function pickAndUpload(kind: "image" | "pdf") {
    setUploading(true)
    try {
      let uri = ""
      let name = "diagram.png"
      let type = "image/png"

      if (kind === "pdf") {
        const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true })
        if (result.canceled || !result.assets?.[0]) return
        uri = result.assets[0].uri
        name = result.assets[0].name ?? "diagram.pdf"
        type = "application/pdf"
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          AppAlert.alert("Permission needed", "Allow photo library access to upload diagrams.")
          return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
          preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        })
        if (result.canceled || !result.assets?.[0]) return
        uri = result.assets[0].uri
        name = result.assets[0].fileName ?? "diagram.jpg"
        type = result.assets[0].mimeType ?? "image/jpeg"
        if (/\.heic$|\.heif$/i.test(name) || /heic|heif/i.test(type)) {
          name = name.replace(/\.(heic|heif)$/i, ".jpg")
          type = "image/jpeg"
        }
      }

      const saved = await instructorApi.uploadQuestionMedia(scope, { uri, name, type })
      patchMedia({
        media_url: saved.url,
        media_type: kind === "pdf" ? "pdf" : "image",
        media_enabled: true})
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.stack}>
      <ToggleRow
        label="Attach media"
        value={media.media_enabled === true}
        onValueChange={(v) =>
          onChange({
            question_media: v
              ? { ...media, media_enabled: true }
              : { ...media, media_enabled: false }})
        }
      />
      {media.media_enabled ? (
        <>
          <TextField
            label="Media URL"
            value={media.media_url ?? ""}
            onChangeText={(v) => patchMedia({ media_url: v })}
            placeholder="https://… or upload below"
          />
          <View style={styles.uploadRow}>
            <Pressable
              style={styles.uploadBtn}
              disabled={uploading}
              onPress={() => void pickAndUpload("image")}
              accessibilityRole="button"
              accessibilityLabel="Upload image"
            >
              {uploading ? (
                <ActivityIndicator size="small" color={FACULTY_ASSESSMENT_COLOR.link} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={16} color={FACULTY_ASSESSMENT_COLOR.link} />
                  <Text style={styles.uploadBtnText}>Image</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.uploadBtn}
              disabled={uploading}
              onPress={() => void pickAndUpload("pdf")}
              accessibilityRole="button"
              accessibilityLabel="Upload PDF"
            >
              <Ionicons name="document-outline" size={16} color={FACULTY_ASSESSMENT_COLOR.link} />
              <Text style={styles.uploadBtnText}>PDF</Text>
            </Pressable>
          </View>
          <ChipPicker
            label="Placement"
            options={[
              { id: "above", label: "Above text" },
              { id: "below", label: "Below text" },
              { id: "side_by_side", label: "Side by side" },
            ]}
            value={media.media_placement ?? "above"}
            onChange={(id) => patchMedia({ media_placement: id })}
          />
          <TextField
            label="Caption"
            value={media.media_caption ?? ""}
            onChangeText={(v) => patchMedia({ media_caption: v })}
            placeholder="Optional caption"
          />
          <TextField
            label="Alt text"
            value={media.media_alt_text ?? ""}
            onChangeText={(v) => patchMedia({ media_alt_text: v })}
            placeholder="Accessibility description"
          />
        </>
      ) : null}
    </View>
  )
}

function QuestionEditorPanel({
  question,
  index,
  scope,
  hasAttempts,
  onChange,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown}: {
  question: QuizQuestionDraft
  index: number
  scope: Scope
  hasAttempts: boolean
  onChange: (patch: Partial<QuizQuestionDraft>) => void
  onRequestDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const { styles, native, tokens } = useEditorModalStyles()
  const [showPreview, setShowPreview] = useState(false)
  const type = question.question_type.toLowerCase()
  const isBankLinked = Boolean(question.bank_question_id)
  const isMultiPart = type === "multi_part"
  const isCircuitSubmission = type === "circuit_submission"

  return (
    <View style={styles.questionEditorStack}>
      <EditorSectionCard
        icon="help-circle-outline"
        title={`Question ${index + 1}`}
        subtitle={questionTypeLabel(type)}
      >
        <View style={styles.questionEditorHeader}>
          <View style={styles.questionEditorActions}>
            <Pressable disabled={!canMoveUp} onPress={onMoveUp} hitSlop={8}>
              <Ionicons name="arrow-up-circle-outline" size={22} color={canMoveUp ? FACULTY_ASSESSMENT_COLOR.link : native.tertiaryLabel} />
            </Pressable>
            <Pressable disabled={!canMoveDown} onPress={onMoveDown} hitSlop={8}>
              <Ionicons name="arrow-down-circle-outline" size={22} color={canMoveDown ? FACULTY_ASSESSMENT_COLOR.link : native.tertiaryLabel} />
            </Pressable>
            <Pressable onPress={() => setShowPreview(!showPreview)} hitSlop={8}>
              <Ionicons name={showPreview ? "eye-off-outline" : "eye-outline"} size={22} color={native.secondaryLabel} />
            </Pressable>
            {!hasAttempts ? (
              <Pressable onPress={onRequestDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={22} color="#b91c1c" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {isBankLinked ? (
          <View style={styles.bankBanner}>
            <Ionicons name="library-outline" size={16} color="#92400e" />
            <Text style={styles.bankBannerText}>
              Linked to question bank #{question.bank_question_id}. Some fields may be managed in the bank.
            </Text>
          </View>
        ) : null}

        {(isMultiPart || isCircuitSubmission) && (
          <View style={styles.bankBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" />
            <Text style={styles.bankBannerText}>
              {isMultiPart
                ? "Sub-questions are configured in the question bank. Edit stem, media, points, and timing here."
                : "Upload grading config lives in the question bank. Edit stem, media, and timing here."}
            </Text>
          </View>
        )}

        <QuestionTypePicker
          value={type}
          onChange={(nextType) => {
            onChange({
              question_type: nextType,
              time_limit: defaultTimeLimit(nextType),
              correct_answer: nextType === "true_false" ? "A" : question.correct_answer})
          }}
        />

        <TextField
          label="Question text"
          value={question.question_text}
          onChangeText={(v) => onChange({ question_text: v })}
          placeholder="Enter question stem (LaTeX supported: $V_{out}$, \\[...\\])"
          multiline
        />

        <TextField
          label="Hint"
          value={question.hint}
          onChangeText={(v) => onChange({ hint: v })}
          placeholder="Optional hint shown to students"
          multiline
        />
      </EditorSectionCard>

      <EditorSectionCard icon="speedometer-outline" title="Scoring & timing" subtitle="Points, timer, and proctoring exemption">
        <EditorInlineFields>
          <EditorInlineField>
            <NativeSelect
              label="Points"
              placeholder="1 pts"
              value={String(question.max_points ?? question.points ?? 1)}
              options={withCurrentOption(
                POINT_AWARD_OPTIONS,
                String(question.max_points ?? question.points ?? 1),
                `${question.max_points ?? question.points ?? 1} pts`,
              )}
              onChange={(v) => {
                const n = Number(v)
                onChange({ max_points: Number.isFinite(n) ? n : 1, points: Number.isFinite(n) ? n : 1 })
              }}
            />
          </EditorInlineField>
          <EditorInlineField>
            <NativeSelect
              label="Time"
              placeholder="Default"
              value={question.time_limit != null ? String(question.time_limit) : ""}
              options={[
                { value: "", label: "Default" },
                ...secondsSelectOptions(question.time_limit),
              ]}
              onChange={(v) => onChange({ time_limit: v ? Number(v) : null })}
            />
          </EditorInlineField>
          <EditorInlineField>
            <NativeSelect
              label="Hint penalty"
              placeholder="No penalty"
              value={String(question.hint_penalty ?? 0)}
              options={HINT_PENALTY_OPTIONS}
              onChange={(v) => {
                const n = Number(v)
                onChange({ hint_penalty: Number.isFinite(n) ? n : 0 })
              }}
            />
          </EditorInlineField>
        </EditorInlineFields>

        <ToggleRow
          label="Anti-cheat exempt"
          hint="Skip tab tracking / keystroke playback for this question"
          value={question.anti_cheat_exempt}
          onValueChange={(v) => onChange({ anti_cheat_exempt: v })}
        />

        {QUESTION_TYPES_WITH_AI_LANGUAGE.has(type) && (
          <ChipPicker
            label="AI code language"
            hint="Override the assessment default for this question"
            options={QUESTION_AI_LANGUAGE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            value={question.ai_code_language ?? "__quiz_default__"}
            onChange={(id) =>
              onChange({ ai_code_language: id === "__quiz_default__" ? null : id })
            }
          />
        )}
      </EditorSectionCard>

      {(isTextAnswerType(type) || isMcqStyleType(type) || (isCircuitQuestionType(type) && !isCircuitSubmission)) ? (
        <EditorSectionCard icon="checkmark-circle-outline" title="Answer & grading" subtitle="Correct response and rubric fields">
          {isTextAnswerType(type) && (
            <TextField
              label="Correct answer"
              value={question.correct_answer}
              onChangeText={(v) => onChange({ correct_answer: v })}
              placeholder="Exact answer or JSON array of acceptable answers"
              multiline
            />
          )}

          {isMcqStyleType(type) && <McqOptionsEditor question={question} onChange={onChange} />}

          {isCircuitQuestionType(type) && !isCircuitSubmission && (
            <CircuitFieldsEditor question={question} onChange={onChange} />
          )}
        </EditorSectionCard>
      ) : null}

      <EditorSectionCard icon="image-outline" title="Media & preview" subtitle="Diagrams, PDFs, and live preview">
        <MediaFieldsEditor question={question} scope={scope} onChange={onChange} />

        {showPreview ? (
          <View style={styles.previewBlock}>
            <Text style={styles.previewLabel}>Live preview</Text>
            <FacultyAssessmentQuestionPreview question={draftQuestionToPreview(question)} />
          </View>
        ) : null}
      </EditorSectionCard>
    </View>
  )
}

export function FacultyAssessmentEditorModal({quiz,
  assessmentType,
  scope,
  onClose,
  onSaved}: Props) {
  const { styles: moduleStyles } = useModuleTheme()
  const { styles, native, tokens, type } = useEditorModalStyles()
  const insets = useSafeAreaInsets()
  const config = ASSESSMENT_TYPE_CONFIG[assessmentType]

  const [tab, setTab] = useState<TabId>("questions")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [draft, setDraft] = useState<QuizEditorDraft | null>(null)
  const [dirty, setDirty] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)
  const [sessions, setSessions] = useState<InstructorSession[]>([])

  const load = useCallback(async () => {
    if (!scope || !quiz) return
    setLoading(true)
    setError("")
    try {
      const [detail, sessionData] = await Promise.all([
        instructorApi.getQuiz(scope, quiz.id),
        instructorApi.getSessions(scope, scope.academicTermId ?? undefined),
      ])
      setDraft(quizDetailToEditorDraft(detail))
      setSessions(sessionData.sessions ?? [])
      setSelectedIndex(0)
      setDirty(false)
    } catch (err) {
      setDraft(null)
      setError(err instanceof ApiError ? err.message : "Could not load assessment.")
    } finally {
      setLoading(false)
    }
  }, [scope, quiz])

  useEffect(() => {
    if (!quiz) {
      setDraft(null)
      setDirty(false)
      return
    }
    void load()
  }, [quiz, load])

  const hasAttempts = (draft?.total_attempts ?? quiz?.total_attempts ?? 0) > 0

  const totalPoints = useMemo(() => {
    if (!draft) return 0
    return draft.questions.reduce((sum, q) => sum + (q.max_points ?? q.points ?? 1), 0)
  }, [draft])

  function patchDraft(patch: Partial<QuizEditorDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
    setDirty(true)
  }

  function patchQuestion(index: number, patch: Partial<QuizQuestionDraft>) {
    setDraft((prev) => {
      if (!prev) return prev
      const questions = [...prev.questions]
      questions[index] = { ...questions[index], ...patch }
      return { ...prev, questions }
    })
    setDirty(true)
  }

  function addQuestion() {
    if (hasAttempts) {
      AppAlert.alert("Cannot add questions", "This assessment has student attempts. Duplicate it to add new questions.")
      return
    }
    setDraft((prev) => {
      if (!prev) return prev
      const q = createBlankQuestion(prev.questions.length + 1, assessmentType)
      setSelectedIndex(prev.questions.length)
      return { ...prev, questions: [...prev.questions, q] }
    })
    setDirty(true)
    setTab("questions")
  }

  function requestDeleteQuestion(index: number) {
    if (hasAttempts) return
    setDeleteConfirmIndex(index)
  }

  function confirmDeleteQuestion() {
    if (deleteConfirmIndex == null) return
    const index = deleteConfirmIndex
    setDeleteConfirmIndex(null)
    setDraft((prev) => {
      if (!prev) return prev
      const questions = prev.questions.filter((_, i) => i !== index)
      setSelectedIndex((i) => Math.max(0, Math.min(i, Math.max(0, questions.length - 1))))
      return { ...prev, questions }
    })
    setDirty(true)
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    setDraft((prev) => {
      if (!prev) return prev
      const next = index + dir
      if (next < 0 || next >= prev.questions.length) return prev
      const questions = [...prev.questions]
      ;[questions[index], questions[next]] = [questions[next], questions[index]]
      return { ...prev, questions }
    })
    setSelectedIndex((i) => index + dir)
    setDirty(true)
  }

  function handleClose() {
    if (saving) return
    if (dirty) {
      AppAlert.alert("Discard changes?", "Unsaved edits will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onClose },
      ])
      return
    }
    onClose()
  }

  async function handleSave(notify = false) {
    if (!scope || !quiz || !draft) return
    const validationError = validateQuizEditorDraft(draft, assessmentType)
    if (validationError) {
      AppAlert.alert("Fix required fields", validationError)
      return
    }

    setSaving(true)
    try {
      const payload = editorDraftToUpdatePayload(draft, assessmentType, { sendNotifications: notify })
      const result = await instructorApi.updateQuiz(scope, quiz.id, payload)
      if (result.questionsNotReplaced) {
        AppAlert.alert(
          "Saved with limits",
          result.message ??
            "Quiz settings saved. Question list was not replaced because students have already attempted this assessment.",
        )
      }
      setDirty(false)
      onSaved()
      onClose()
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSaving(false)
    }
  }

  function confirmSave() {
    AppAlert.alert("Save assessment?", "Changes will apply to this assessment.", [
      { text: "Cancel", style: "cancel" },
      { text: "Save", onPress: () => void handleSave(false) },
      {
        text: "Save & notify",
        onPress: () => void handleSave(true)},
    ])
  }

  if (!quiz) return null

  const selectedQuestion = draft?.questions[selectedIndex]

  return (
    <Modal visible={Boolean(quiz)} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[moduleStyles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Close editor"
          >
            <Ionicons name="close" size={24} color={native.label} />
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.topTitle} numberOfLines={1}>
              Edit · {quiz.title}
            </Text>
            <Text style={styles.topSub}>{config.shortLabel}</Text>
          </View>
          <Pressable
            style={[styles.saveBtn, (!draft || saving) && styles.saveBtnDisabled]}
            disabled={!draft || saving}
            onPress={confirmSave}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>

        {hasAttempts ? (
          <View
            style={[
              styles.attemptsBanner,
              {
                backgroundColor: `${tokens.warning}14`,
                borderColor: `${tokens.warning}33`,
              },
            ]}
          >
            <View style={[styles.attemptsBannerIcon, { backgroundColor: native.secondaryGrouped }]}>
              <Ionicons name="lock-closed-outline" size={18} color={tokens.warning} />
            </View>
            <View style={styles.attemptsBannerCopy}>
              <Text style={[type.bodyEmphasis, styles.attemptsBannerTitle, { color: native.label }]}>
                Limited editing
              </Text>
              <Text style={[type.caption, styles.attemptsBannerText, { color: native.secondaryLabel }]}>
                Students have attempted this assessment — you can edit question content but cannot add or remove
                questions.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.tabNavWrap, { backgroundColor: native.groupedBackground }]}>
          <FacultyModuleTabBar
            scrollable
            tab={tab}
            onChange={setTab}
            tabs={EDITOR_TABS.map((item) => ({
              ...item,
              count: item.id === "questions" ? (draft?.questions.length ?? quiz?.question_count ?? 0) : undefined,
            }))}
          />
        </View>

        {loading ? (
          <View style={[moduleStyles.center, styles.center]}>
            <ActivityIndicator size="large" color={FACULTY_ASSESSMENT_COLOR.link} />
          </View>
        ) : error ? (
          <View style={[moduleStyles.center, styles.center]}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : draft ? (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {tab === "details" && (
              <View style={styles.panel}>
                <EditorHeroCard
                  typeLabel={config.shortLabel}
                  questionCount={draft.questions.length}
                  totalPoints={totalPoints}
                  timePerQuestion={draft.time_per_question}
                  showPoints={assessmentType === "final"}
                />

                <EditorSectionCard
                  icon="document-text-outline"
                  title="Basic information"
                  subtitle="Title and description shown to students"
                >
                  <TextField
                    label="Title"
                    value={draft.title}
                    onChangeText={(v) => patchDraft({ title: v })}
                    placeholder="Assessment title"
                  />
                  <TextField
                    label="Description"
                    value={draft.description}
                    onChangeText={(v) => patchDraft({ description: v })}
                    placeholder="Optional description for students"
                    multiline
                  />
                  {(assessmentType === "mid_semester" || assessmentType === "final") && (
                    <TextField
                      label="Coverage"
                      hint="Chapters or lectures covered on this exam"
                      value={draft.coverage}
                      onChangeText={(v) => patchDraft({ coverage: v })}
                      placeholder="e.g. Chapters 1–4, Lectures 5–8"
                      multiline
                    />
                  )}
                </EditorSectionCard>

                <EditorSectionCard
                  icon="time-outline"
                  title="Timing & availability"
                  subtitle={
                    isExamWideAssessmentType(assessmentType)
                      ? "One clock for the whole assessment"
                      : "Default pacing and when students can access"
                  }
                >
                  {isExamWideAssessmentType(assessmentType) ? (
                    <NativeSelect
                      label="Total time"
                      placeholder="1 hour"
                      value={String(
                        Math.max(
                          1,
                          Math.round(
                            (resolveExamWideTimerSeconds(draft.section_config, assessmentType) ??
                              defaultExamWideTimerSeconds(assessmentType)) / 60,
                          ),
                        ),
                      )}
                      options={examWideMinuteOptions(
                        Math.round(
                          (resolveExamWideTimerSeconds(draft.section_config, assessmentType) ??
                            defaultExamWideTimerSeconds(assessmentType)) / 60,
                        ),
                      )}
                      onChange={(v) =>
                        patchDraft({
                          section_config: applyExamWideMinutes(
                            draft.section_config,
                            Number(v) || 60,
                            assessmentType,
                          ),
                        })
                      }
                    />
                  ) : (
                    <NativeSelect
                      label="Default time per question"
                      placeholder="1 minute"
                      value={String(draft.time_per_question)}
                      options={secondsSelectOptions(draft.time_per_question)}
                      onChange={(v) => patchDraft({ time_per_question: Number(v) || 60 })}
                    />
                  )}
                  <FacultyDateTimeField
                    value={draft.available_from}
                    onChange={(available_from) => patchDraft({ available_from })}
                    dateLabel="Available from"
                    timeLabel="From time"
                  />
                  <FacultyDateTimeField
                    value={draft.available_until}
                    onChange={(available_until) => patchDraft({ available_until })}
                    dateLabel="Available until"
                    timeLabel="Until time"
                  />
                </EditorSectionCard>

                <EditorSectionCard
                  icon="school-outline"
                  title="Grading"
                  subtitle="How this assessment affects the course"
                >
                  <ToggleRow
                    label="Counts toward course grade"
                    value={draft.counts_toward_course_grade}
                    onValueChange={(v) => patchDraft({ counts_toward_course_grade: v })}
                  />
                  {assessmentType === "final" ? (
                    <View style={styles.pointsSummary}>
                      <Text style={styles.pointsSummaryLabel}>Total points (must equal 100)</Text>
                      <Text style={[styles.pointsSummaryValue, totalPoints !== 100 && styles.pointsSummaryWarn]}>
                        {totalPoints} / 100
                      </Text>
                    </View>
                  ) : null}
                </EditorSectionCard>

                <EditorSectionCard
                  icon="hourglass-outline"
                  title="Waiting room"
                  subtitle="Limit how many students can take this assessment at once"
                >
                  <NativeSelect
                    label="Max concurrent students"
                    placeholder="Unlimited"
                    value={draft.max_concurrent_students != null ? String(draft.max_concurrent_students) : ""}
                    options={CONCURRENT_STUDENT_OPTIONS}
                    onChange={(v) =>
                      patchDraft({
                        max_concurrent_students: v ? Math.max(1, Number(v) || 30) : null,
                      })
                    }
                  />
                  <EditorNotice
                    tone="info"
                    text="When full, additional students queue until a spot opens. Recommended 20–50 for large exams."
                  />
                </EditorSectionCard>
              </View>
            )}

            {tab === "access" && scope && draft && quiz ? (
              <View style={styles.panel}>
                <FacultyAssessmentAccessPanel
                  scope={scope}
                  sessions={sessions}
                  draft={draft}
                  assessmentLabel={config.shortLabel}
                  onChange={patchDraft}
                />
                <FacultyAssessmentStudentGrantsPanel
                  scope={scope}
                  quizId={quiz.id}
                  assessmentType={assessmentType}
                  assessmentLabel={config.label}
                  rolloverHours={draft.rollover_hours}
                  sessions={sessions}
                  retakeEnabled={draft.retake_enabled}
                />
              </View>
            ) : null}

            {tab === "sections" && draft ? (
              <View style={styles.panel}>
                <FacultyAssessmentSectionsPanel
                  assessmentType={assessmentType}
                  questions={draft.questions}
                  sectionConfig={draft.section_config}
                  onChange={(section_config) => patchDraft({ section_config })}
                />
              </View>
            ) : null}

            {tab === "time" && scope && draft ? (
              <View style={styles.panel}>
                <FacultyAssessmentTimePanel
                  scope={scope}
                  assessmentType={assessmentType}
                  draft={draft}
                  onPatchDraft={patchDraft}
                  onPatchQuestion={patchQuestion}
                />
              </View>
            ) : null}

            {tab === "questions" && (
              <View style={styles.panel}>
                {draft.questions.length > 0 && selectedQuestion ? (
                  <>
                    <View style={styles.questionNavCard}>
                      <View style={styles.questionNavHead}>
                        <Pressable
                          style={[styles.navArrowBtn, selectedIndex === 0 && styles.navArrowDisabled]}
                          disabled={selectedIndex === 0}
                          onPress={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                        >
                          <Ionicons name="chevron-back" size={20} color={selectedIndex === 0 ? native.tertiaryLabel : FACULTY_ASSESSMENT_COLOR.link} />
                        </Pressable>
                        <View style={styles.questionNavCenter}>
                          <Text style={styles.questionNavTitle}>
                            Question {selectedIndex + 1} of {draft.questions.length}
                          </Text>
                          <Text style={styles.questionNavMeta} numberOfLines={1}>
                            {questionTypeLabel(selectedQuestion.question_type)} ·{" "}
                            {selectedQuestion.max_points ?? selectedQuestion.points ?? 1} pts ·{" "}
                            {previewSnippet(selectedQuestion.question_text) || "No text yet"}
                          </Text>
                        </View>
                        <Pressable
                          style={[
                            styles.navArrowBtn,
                            selectedIndex >= draft.questions.length - 1 && styles.navArrowDisabled,
                          ]}
                          disabled={selectedIndex >= draft.questions.length - 1}
                          onPress={() => setSelectedIndex((i) => Math.min(draft.questions.length - 1, i + 1))}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={
                              selectedIndex >= draft.questions.length - 1 ? native.tertiaryLabel : FACULTY_ASSESSMENT_COLOR.link
                            }
                          />
                        </Pressable>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.questionPills}>
                        {draft.questions.map((q, i) => {
                          const active = selectedIndex === i
                          return (
                            <Pressable
                              key={q.id ?? `new-${i}`}
                              style={[styles.questionPill, active && styles.questionPillActive]}
                              onPress={() => setSelectedIndex(i)}
                            >
                              <Text style={[styles.questionPillNum, active && styles.questionPillNumActive]}>
                                {i + 1}
                              </Text>
                              <Text style={[styles.questionPillType, active && styles.questionPillTypeActive]}>
                                {questionTypeAbbrev(q.question_type)}
                              </Text>
                            </Pressable>
                          )
                        })}
                        {!hasAttempts ? (
                          <Pressable style={styles.addQuestionPill} onPress={addQuestion}>
                            <Ionicons name="add" size={18} color={FACULTY_ASSESSMENT_COLOR.link} />
                          </Pressable>
                        ) : null}
                      </ScrollView>
                    </View>
                  </>
                ) : null}

                {selectedQuestion && scope ? (
                  <QuestionEditorPanel
                    question={selectedQuestion}
                    index={selectedIndex}
                    scope={scope}
                    hasAttempts={hasAttempts}
                    onChange={(patch) => patchQuestion(selectedIndex, patch)}
                    onRequestDelete={() => requestDeleteQuestion(selectedIndex)}
                    onMoveUp={() => moveQuestion(selectedIndex, -1)}
                    onMoveDown={() => moveQuestion(selectedIndex, 1)}
                    canMoveUp={selectedIndex > 0}
                    canMoveDown={selectedIndex < draft.questions.length - 1}
                  />
                ) : (
                  <View style={styles.emptyQuestions}>
                    <Ionicons name="help-circle-outline" size={40} color={native.tertiaryLabel} />
                    <Text style={styles.emptyQuestionsText}>No questions yet</Text>
                    <Text style={styles.emptyQuestionsSub}>Add your first question to start building this assessment.</Text>
                    {!hasAttempts ? (
                      <Pressable style={styles.primaryBtn} onPress={addQuestion}>
                        <Text style={styles.primaryBtnText}>Add first question</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </View>
            )}

            {tab === "settings" && (
              <View style={styles.panel}>
                <EditorSectionCard
                  icon="refresh-outline"
                  iconBg="#eff6ff"
                  iconColor="#2563eb"
                  title="Retakes & results"
                  subtitle="Attempt limits and what students see after submitting"
                >
                  <ToggleRow
                    label="Allow retakes"
                    hint="Disabled for mid-semester and final exams"
                    value={draft.retake_enabled}
                    onValueChange={(v) => patchDraft({ retake_enabled: v })}
                    disabled={assessmentType === "mid_semester" || assessmentType === "final"}
                  />
                  {draft.retake_enabled && assessmentType !== "mid_semester" && assessmentType !== "final" ? (
                    <>
                      <NativeSelect
                        label="Retake limit"
                        placeholder="1 retake"
                        value={String(draft.retake_limit)}
                        options={withCurrentOption(
                          RETAKE_LIMIT_OPTIONS,
                          String(draft.retake_limit),
                          `${draft.retake_limit} retakes`,
                        )}
                        onChange={(v) => patchDraft({ retake_limit: Number(v) || 0 })}
                      />
                      <ChipPicker
                        label="Retake policy"
                        options={[
                          { id: "best", label: "Best score" },
                          { id: "latest", label: "Latest" },
                          { id: "average", label: "Average" },
                        ]}
                        value={draft.retake_policy}
                        onChange={(id) => patchDraft({ retake_policy: id })}
                      />
                      <ToggleRow
                        label="Review before retake"
                        value={draft.review_before_retake}
                        onValueChange={(v) => patchDraft({ review_before_retake: v })}
                      />
                      <ToggleRow
                        label="Forfeit retake after viewing report"
                        hint="Students lose remaining retakes once they open their grade report"
                        value={draft.forfeit_retake_on_report_view}
                        onValueChange={(v) => patchDraft({ forfeit_retake_on_report_view: v })}
                      />
                    </>
                  ) : null}
                  <EditorDivider />
                  <ToggleRow
                    label="Lock detailed results review"
                    hint="Students cannot see full question breakdown until you release results"
                    value={draft.lock_student_results_review}
                    onValueChange={(v) => patchDraft({ lock_student_results_review: v })}
                  />
                </EditorSectionCard>

                <EditorSectionCard
                  icon="sparkles-outline"
                  iconBg="#f5f3ff"
                  iconColor="#7c3aed"
                  title="AI grading"
                  subtitle="Code languages, model routing, and strictness"
                >
                  <EditorMultiChipPicker
                    label="Allowed code languages"
                    hint="Choose None/N/A for circuit-only courses with no AI code grading"
                    options={ASSESSMENT_CODE_LANGUAGE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                    values={draft.allowed_ai_code_languages}
                    exclusiveId={CODE_LANGUAGE_NONE}
                    onChange={(langs) =>
                      patchDraft({
                        allowed_ai_code_languages: langs.filter((l) => l !== CODE_LANGUAGE_NONE)})
                    }
                  />
                  <ChipPicker
                    label="Evaluation strictness"
                    options={AI_EVAL_MODES.map((m) => ({ id: m.id, label: m.label }))}
                    value={draft.ai_evaluation_mode}
                    onChange={(id) => patchDraft({ ai_evaluation_mode: id })}
                  />
                  <ChipPicker
                    label="AI model"
                    hint="Smart routing is recommended for most courses"
                    options={AI_MODEL_OPTIONS.map((m) => ({ id: m.id, label: m.label }))}
                    value={draft.ai_model || "auto"}
                    onChange={(id) => patchDraft({ ai_model: id })}
                  />
                  <ToggleRow
                    label="Enable expert fallback (Opus / GPT-5.5)"
                    hint="Escalates low-confidence grades to a stronger model"
                    value={draft.ai_enable_opus_fallback}
                    onValueChange={(v) => patchDraft({ ai_enable_opus_fallback: v })}
                  />
                  {draft.ai_enable_opus_fallback ? (
                    <NativeSelect
                      label="Fallback confidence"
                      placeholder="0.8"
                      value={String(draft.ai_opus_confidence_threshold)}
                      options={withCurrentOption(
                        CONFIDENCE_THRESHOLD_OPTIONS,
                        String(draft.ai_opus_confidence_threshold),
                      )}
                      onChange={(v) => {
                        const n = Number(v)
                        patchDraft({
                          ai_opus_confidence_threshold: Number.isFinite(n)
                            ? Math.max(0.5, Math.min(0.95, n))
                            : 0.8,
                        })
                      }}
                    />
                  ) : null}
                </EditorSectionCard>

                <EditorSectionCard
                  icon="shield-checkmark-outline"
                  iconBg="#fef2f2"
                  iconColor="#b91c1c"
                  title="Anti-cheat & proctoring"
                  subtitle="Monitoring, violations, and keystroke enforcement"
                >
                  {assessmentType === "final" ? (
                    <EditorNotice tone="warn" text="Final exams force strict anti-cheat settings on save." />
                  ) : null}
                  <ToggleRow
                    label="Strict mode"
                    hint="Master switch for proctoring features below"
                    value={draft.strict_mode_enabled}
                    onValueChange={(v) => patchDraft({ strict_mode_enabled: v })}
                    disabled={assessmentType === "final"}
                  />
                  {draft.strict_mode_enabled || assessmentType === "final" ? (
                    <>
                      <ToggleRow
                        label="Block copy / paste"
                        value={draft.block_copy_paste}
                        onValueChange={(v) => patchDraft({ block_copy_paste: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                      <ToggleRow
                        label="Keystroke playback enforcement"
                        value={draft.keystroke_playback_enforced}
                        onValueChange={(v) => patchDraft({ keystroke_playback_enforced: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                      <ToggleRow
                        label="Track tab switches"
                        value={draft.track_tab_switches}
                        onValueChange={(v) => patchDraft({ track_tab_switches: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                      <ToggleRow
                        label="Warn on tab switch"
                        value={draft.warn_on_tab_switch}
                        onValueChange={(v) => patchDraft({ warn_on_tab_switch: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                      <NativeSelect
                        label="Max tab switches"
                        placeholder="3"
                        value={String(draft.max_tab_switches)}
                        options={withCurrentOption(STRIKE_COUNT_OPTIONS, String(draft.max_tab_switches))}
                        onChange={(v) => patchDraft({ max_tab_switches: Number(v) || 0 })}
                      />
                      <ToggleRow
                        label="Auto-submit on violations"
                        value={draft.auto_submit_on_violations}
                        onValueChange={(v) => patchDraft({ auto_submit_on_violations: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                      <ToggleRow
                        label="Track mouse movement"
                        value={draft.track_mouse_movement}
                        onValueChange={(v) => patchDraft({ track_mouse_movement: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                      <ToggleRow
                        label="Detect browser AI tools (Gemini)"
                        value={draft.track_gemini_window}
                        onValueChange={(v) => patchDraft({ track_gemini_window: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                      <NativeSelect
                        label="Max Gemini / AI strikes"
                        placeholder="3"
                        value={String(draft.max_gemini_strikes)}
                        options={withCurrentOption(STRIKE_COUNT_OPTIONS, String(draft.max_gemini_strikes))}
                        onChange={(v) => patchDraft({ max_gemini_strikes: Number(v) || 0 })}
                      />
                      <ToggleRow
                        label="Require fullscreen"
                        value={draft.require_fullscreen}
                        onValueChange={(v) => patchDraft({ require_fullscreen: v })}
                        disabled={assessmentType === "final"}
                        nested
                      />
                    </>
                  ) : null}
                </EditorSectionCard>

                <EditorSectionCard
                  icon="location-outline"
                  iconBg="#fff7ed"
                  iconColor="#ea580c"
                  title="Rollover & proctoring extras"
                  subtitle="Rollover policy, geolocation, and membership superpowers"
                >
                  <ToggleRow
                    label="Rollover deadline extension"
                    hint="Students can request extra time after the due date"
                    value={draft.rollover_enabled}
                    onValueChange={(v) => patchDraft({ rollover_enabled: v })}
                    disabled={assessmentType === "mid_semester" || assessmentType === "final"}
                  />
                  {draft.rollover_enabled &&
                  assessmentType !== "mid_semester" &&
                  assessmentType !== "final" ? (
                    <NativeSelect
                      label="Rollover hours"
                      placeholder="24 hours"
                      value={String(draft.rollover_hours)}
                      options={withCurrentOption(
                        HOUR_GRANT_OPTIONS,
                        String(draft.rollover_hours),
                        `${draft.rollover_hours} hours`,
                      )}
                      onChange={(v) => patchDraft({ rollover_hours: Number(v) || 24 })}
                    />
                  ) : null}
                  <EditorDivider />
                  <ToggleRow
                    label="Require geolocation"
                    hint="Students must be within the radius to start"
                    value={draft.geo_required}
                    onValueChange={(v) => patchDraft({ geo_required: v })}
                  />
                  {draft.geo_required ? (
                    <>
                      <EditorInlineFields>
                        <EditorInlineField>
                          <TextField
                            label="Latitude"
                            value={draft.geo_lat}
                            onChangeText={(v) => patchDraft({ geo_lat: v })}
                            keyboardType="decimal-pad"
                          />
                        </EditorInlineField>
                        <EditorInlineField>
                          <TextField
                            label="Longitude"
                            value={draft.geo_lng}
                            onChangeText={(v) => patchDraft({ geo_lng: v })}
                            keyboardType="decimal-pad"
                          />
                        </EditorInlineField>
                      </EditorInlineFields>
                      <NativeSelect
                        label="Radius"
                        placeholder="100 m"
                        value={String(draft.geo_radius_meters)}
                        options={withCurrentOption(
                          GEO_RADIUS_OPTIONS,
                          String(draft.geo_radius_meters),
                          `${draft.geo_radius_meters} m`,
                        )}
                        onChange={(v) => patchDraft({ geo_radius_meters: Number(v) || 100 })}
                      />
                    </>
                  ) : null}
                  <EditorDivider />
                  <ToggleRow
                    label="Enable membership superpowers"
                    hint="Trailblazer / Explorer perks during the assessment"
                    value={draft.enable_superpowers}
                    onValueChange={(v) =>
                      patchDraft({
                        enable_superpowers: v,
                        allowed_superpowers: v ? draft.allowed_superpowers : []})
                    }
                    disabled={assessmentType === "final"}
                  />
                  {draft.enable_superpowers && assessmentType !== "final" ? (
                    <EditorMultiChipPicker
                      label="Allowed superpowers"
                      hint="Students pick from these at assessment start"
                      options={SUPERPOWER_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                      values={draft.allowed_superpowers}
                      onChange={(ids) => patchDraft({ allowed_superpowers: ids })}
                    />
                  ) : null}
                </EditorSectionCard>
              </View>
            )}
          </ScrollView>
        ) : null}

        {deleteConfirmIndex != null ? (
          <View style={styles.confirmBackdrop}>
            <View style={styles.confirmSheet}>
              <Text style={styles.confirmTitle}>Delete question {deleteConfirmIndex + 1}?</Text>
              <Text style={styles.confirmBody}>
                The question will be removed when you save. This cannot be undone after saving.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable style={styles.confirmCancelBtn} onPress={() => setDeleteConfirmIndex(null)}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmDeleteBtn} onPress={confirmDeleteQuestion}>
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  )
}
