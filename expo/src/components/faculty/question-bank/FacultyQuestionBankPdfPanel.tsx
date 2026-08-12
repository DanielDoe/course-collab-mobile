import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import * as DocumentPicker from "expo-document-picker"
import { ApiError } from "../../../lib/api"
import {
  defaultPdfGenerationRequest,
  PDF_GENERATION_SUPPORTED_TYPES,
  validatePdfGenerationRequest,
  type DraftQuestionBankItem,
  type QuestionBankPdfGenerationRequest,
} from "../../../lib/question-bank-ai-types"
import { builtInTypeMeta } from "../../../lib/custom-question-types"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { AppButton } from "../../theme/AppButton"
import { FacultySheetField, FacultySheetSelectButton, FacultySheetTextInput } from "../faculty-collab-sheet-ui"
import { FacultyGroupedFilterSheet } from "../faculty-module-shell"
import { NativeSwitch } from "../../NativeSwitch"
import { FacultyQuestionBankDraftReviewPanel } from "./FacultyQuestionBankDraftReviewPanel"
import { QuestionBankFlowStepIndicator } from "./QuestionBankFlowStepIndicator"
import { BANK_DIFFICULTY_OPTIONS } from "../../../lib/faculty-question-bank-utils"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_SHEET_CHIP_RADIUS } from "../faculty-collab-sheet-ui"

const PDF_FLOW_STEPS = [
  { id: "upload", label: "Upload slides" },
  { id: "settings", label: "Generation settings" },
  { id: "review", label: "Review & create" },
] as const

type Props = {
  questionType: string
  onSuccess: () => void
}

type PickedPdf = { uri: string; name: string; size?: number }

export function FacultyQuestionBankPdfPanel({ questionType, onSuccess }: Props) {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_QUESTION_BANK_COLOR.link, tokens.isDark)
  const { scope } = useFacultyScope()
  const meta = builtInTypeMeta(questionType)
  const supported = PDF_GENERATION_SUPPORTED_TYPES.includes(
    questionType as (typeof PDF_GENERATION_SUPPORTED_TYPES)[number],
  )

  const [step, setStep] = useState<"configure" | "preview">("configure")
  const [spec, setSpec] = useState<QuestionBankPdfGenerationRequest>(() =>
    defaultPdfGenerationRequest(questionType),
  )
  const [pdfFile, setPdfFile] = useState<PickedPdf | null>(null)
  const [drafts, setDrafts] = useState<DraftQuestionBankItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [difficultyOpen, setDifficultyOpen] = useState(false)

  useEffect(() => {
    setStep("configure")
    setPdfFile(null)
    setDrafts([])
    setSelected({})
    setSpec(defaultPdfGenerationRequest(questionType))
  }, [questionType])

  function patch(partial: Partial<QuestionBankPdfGenerationRequest>) {
    setSpec((prev) => ({ ...prev, ...partial, questionType }))
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setPdfFile({ uri: asset.uri, name: asset.name ?? "slides.pdf", size: asset.size })
  }

  function flowIndex(): number {
    if (step === "preview") return 2
    return pdfFile ? 1 : 0
  }

  async function handleGenerate() {
    if (!scope || !pdfFile) return
    const req = { ...spec, questionType }
    const err = validatePdfGenerationRequest(req)
    if (err) {
      AppAlert.alert("Check form", err)
      return
    }

    setGenerating(true)
    try {
      const res = await instructorApi.generateQuestionBankFromPdf(
        scope,
        { uri: pdfFile.uri, name: pdfFile.name, type: "application/pdf" },
        req,
      )
      const items = res.questions ?? []
      setDrafts(items)
      setSelected(Object.fromEntries(items.map((q) => [q.draftId, true])))
      setStep("preview")
    } catch (err) {
      AppAlert.alert("Generation failed", err instanceof ApiError ? err.message : "Could not generate from PDF.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!scope) return
    const toSave = drafts.filter((d) => selected[d.draftId])
    if (toSave.length === 0) {
      AppAlert.alert("Nothing selected", "Select at least one question.")
      return
    }
    setSaving(true)
    try {
      await instructorApi.bulkCreateQuestionBankQuestions(scope, toSave)
      onSuccess()
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save questions.")
    } finally {
      setSaving(false)
    }
  }

  if (!supported) {
    return (
      <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <Text style={[type.body, { color: native.secondaryLabel }]}>
          PDF generation is not available for this question type yet. Choose a supported type (MCQ, T/F, select-all,
          fill-blank, multi-part, or code types).
        </Text>
      </View>
    )
  }

  if (step === "preview" && drafts.length > 0) {
    return (
      <FacultyQuestionBankDraftReviewPanel
        drafts={drafts}
        selected={selected}
        onSelectedChange={setSelected}
        onUpdateDraft={(id, partial) =>
          setDrafts((prev) => prev.map((d) => (d.draftId === id ? { ...d, ...partial } : d)))
        }
        onBack={() => setStep("configure")}
        onConfirm={() => void handleSave()}
        saving={saving}
        backLabel="Back to settings"
        flowSteps={[...PDF_FLOW_STEPS]}
        flowCurrentIndex={2}
      />
    )
  }

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: linkSoft }]}>
          <Ionicons name="document-text-outline" size={20} color={FACULTY_QUESTION_BANK_COLOR.link} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>From PDF slides</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            Upload lecture slides — AI generates draft questions for review.
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: linkSoft }]}>
          <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link, fontWeight: "700" }]}>
            {meta?.label ?? questionType}
          </Text>
        </View>
      </View>

      <QuestionBankFlowStepIndicator steps={[...PDF_FLOW_STEPS]} currentIndex={flowIndex()} />

      <Pressable
        onPress={() => void pickPdf()}
        style={[styles.uploadBox, { borderColor: native.separator, backgroundColor: native.tertiaryGrouped }]}
      >
        <Ionicons name="cloud-upload-outline" size={28} color={FACULTY_QUESTION_BANK_COLOR.link} />
        {pdfFile ? (
          <>
            <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
              {pdfFile.name}
            </Text>
            {pdfFile.size ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {(pdfFile.size / 1024).toFixed(1)} KB
              </Text>
            ) : null}
            <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link }]}>Tap to replace PDF</Text>
          </>
        ) : (
          <>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Upload slide deck PDF</Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Max 25 MB</Text>
          </>
        )}
      </Pressable>

      <FacultySheetField label="Topic">
        <FacultySheetTextInput value={spec.topic} onChangeText={(text) => patch({ topic: text })} placeholder="e.g. Week 3 — Op amps" />
      </FacultySheetField>

      <FacultySheetField label="Difficulty">
        <FacultySheetSelectButton
          value={BANK_DIFFICULTY_OPTIONS.find((o) => o.value === spec.difficulty)?.label ?? spec.difficulty}
          onPress={() => setDifficultyOpen(true)}
        />
      </FacultySheetField>

      <FacultySheetField label="Number of questions">
        <FacultySheetTextInput
          value={String(spec.questionCount)}
          onChangeText={(text) => patch({ questionCount: Number(text) || 1 })}
          keyboardType="number-pad"
        />
      </FacultySheetField>

      <View style={styles.switchRow}>
        <Text style={[type.body, { color: native.label }]}>Include hints</Text>
        <NativeSwitch value={spec.includeHint} onValueChange={(v) => patch({ includeHint: v })} />
      </View>
      <View style={styles.switchRow}>
        <Text style={[type.body, { color: native.label }]}>Include explanations</Text>
        <NativeSwitch value={spec.includeExplanation} onValueChange={(v) => patch({ includeExplanation: v })} />
      </View>

      <FacultySheetField label="Additional instructions (optional)">
        <FacultySheetTextInput
          value={spec.additionalInstructions}
          onChangeText={(text) => patch({ additionalInstructions: text })}
          placeholder="Focus on definitions, avoid proofs..."
          multiline
        />
      </FacultySheetField>

      <AppButton
        label={generating ? "Generating drafts…" : "Generate draft questions"}
        onPress={() => void handleGenerate()}
        variant="primary"
        loading={generating}
        disabled={!pdfFile}
        icon="sparkles-outline"
      />

      <FacultyGroupedFilterSheet
        visible={difficultyOpen}
        title="Difficulty"
        groups={[
          {
            id: "difficulty",
            title: "Difficulty",
            value: spec.difficulty,
            options: BANK_DIFFICULTY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          },
        ]}
        onSelect={(_groupId, value) => {
          patch({ difficulty: value as QuestionBankPdfGenerationRequest["difficulty"] })
          setDifficultyOpen(false)
        }}
        onClose={() => setDifficultyOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  header: { gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerCopy: { gap: 4 },
  badge: { alignSelf: "flex-start", borderRadius: FACULTY_SHEET_CHIP_RADIUS, paddingHorizontal: 10, paddingVertical: 4 },
  uploadBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    padding: 24,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
})
