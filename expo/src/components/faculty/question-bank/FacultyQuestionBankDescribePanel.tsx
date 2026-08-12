import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../../lib/api"
import type { CustomQuestionTypeDraft } from "../../../lib/custom-question-types"
import { resolveQuestionBankTypeMeta } from "../../../lib/custom-question-types"
import type { DraftQuestionBankItem } from "../../../lib/question-bank-ai-types"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { AppButton } from "../../theme/AppButton"
import { FacultySheetField, FacultySheetSelectButton, FacultySheetTextInput } from "../faculty-collab-sheet-ui"
import { FacultyGroupedFilterSheet } from "../faculty-module-shell"
import { FacultyQuestionBankDraftReviewPanel } from "./FacultyQuestionBankDraftReviewPanel"
import { QuestionBankFlowStepIndicator } from "./QuestionBankFlowStepIndicator"
import { BANK_DIFFICULTY_OPTIONS } from "../../../lib/faculty-question-bank-utils"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_SHEET_CHIP_RADIUS } from "../faculty-collab-sheet-ui"

const DESCRIBE_FLOW_STEPS = [
  { id: "describe", label: "Describe question" },
  { id: "preview", label: "Preview & create" },
] as const

type Props = {
  questionType: string
  customTypes?: CustomQuestionTypeDraft[]
  onSuccess: () => void
}

export function FacultyQuestionBankDescribePanel({
  questionType,
  customTypes = [],
  onSuccess,
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_QUESTION_BANK_COLOR.link, tokens.isDark)
  const { scope } = useFacultyScope()
  const meta = resolveQuestionBankTypeMeta(questionType, customTypes)

  const [step, setStep] = useState<"describe" | "preview">("describe")
  const [description, setDescription] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState("medium")
  const [draft, setDraft] = useState<DraftQuestionBankItem | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [difficultyOpen, setDifficultyOpen] = useState(false)

  useEffect(() => {
    setStep("describe")
    setDescription("")
    setCorrectAnswer("")
    setTopic("")
    setDifficulty("medium")
    setDraft(null)
  }, [questionType])

  async function handleGenerate() {
    if (!scope) return
    if (!description.trim()) {
      AppAlert.alert("Describe the question", "Tell AI what you want students to answer.")
      return
    }
    if (!correctAnswer.trim()) {
      AppAlert.alert("Correct answer required", "Tell AI which answer should be correct.")
      return
    }
    if (!topic.trim()) {
      AppAlert.alert("Topic required", "Enter a topic for this question.")
      return
    }

    setGenerating(true)
    try {
      const res = await instructorApi.generateQuestionBankDraft(scope, {
        questionType,
        description,
        correctAnswer,
        topic,
        difficulty: difficulty as "easy" | "medium" | "hard",
      })
      setDraft(res.draft)
      setStep("preview")
    } catch (err) {
      AppAlert.alert("Generation failed", err instanceof ApiError ? err.message : "Could not generate question.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleConfirm() {
    if (!scope || !draft) return
    setSaving(true)
    try {
      await instructorApi.bulkCreateQuestionBankQuestions(scope, [draft])
      onSuccess()
    } catch (err) {
      AppAlert.alert("Could not create question", err instanceof ApiError ? err.message : "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  if (step === "preview" && draft) {
    return (
      <FacultyQuestionBankDraftReviewPanel
        drafts={[draft]}
        selected={{ [draft.draftId]: true }}
        onSelectedChange={() => {}}
        onUpdateDraft={(id, partial) => {
          if (id === draft.draftId) setDraft({ ...draft, ...partial })
        }}
        onBack={() => setStep("describe")}
        onConfirm={() => void handleConfirm()}
        saving={saving}
        backLabel="Edit description"
        confirmLabel="Create question"
        flowSteps={[...DESCRIBE_FLOW_STEPS]}
        flowCurrentIndex={1}
        customTypes={customTypes}
      />
    )
  }

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: linkSoft }]}>
          <Ionicons name="sparkles-outline" size={20} color={FACULTY_QUESTION_BANK_COLOR.link} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Describe to AI</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            Tell us what you want and the correct answer — AI builds the full question for preview.
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: linkSoft }]}>
          <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link, fontWeight: "700" }]}>
            {meta?.label ?? questionType}
          </Text>
        </View>
      </View>

      <QuestionBankFlowStepIndicator steps={[...DESCRIBE_FLOW_STEPS]} currentIndex={0} />

      <FacultySheetField label="Topic">
        <FacultySheetTextInput value={topic} onChangeText={setTopic} placeholder="e.g. AC Power" />
      </FacultySheetField>

      <FacultySheetField label="Difficulty">
        <FacultySheetSelectButton
          value={BANK_DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)?.label ?? difficulty}
          onPress={() => setDifficultyOpen(true)}
        />
      </FacultySheetField>

      <FacultySheetField label="Describe the question">
        <FacultySheetTextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ask students to find total resistance of three resistors in series..."
          multiline
        />
      </FacultySheetField>

      <FacultySheetField label="Correct answer you want">
        <FacultySheetTextInput
          value={correctAnswer}
          onChangeText={setCorrectAnswer}
          placeholder={
            meta?.requiresOptions
              ? "e.g. 12 Ω (option B)"
              : "e.g. 12 Ω — or the model answer summary"
          }
          multiline
        />
      </FacultySheetField>

      <AppButton
        label={generating ? "Generating preview…" : "Generate & preview"}
        onPress={() => void handleGenerate()}
        variant="primary"
        loading={generating}
        icon="sparkles-outline"
      />

      <FacultyGroupedFilterSheet
        visible={difficultyOpen}
        title="Difficulty"
        groups={[
          {
            id: "difficulty",
            title: "Difficulty",
            value: difficulty,
            options: BANK_DIFFICULTY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
          },
        ]}
        onSelect={(_groupId, value) => {
          setDifficulty(value)
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
})
