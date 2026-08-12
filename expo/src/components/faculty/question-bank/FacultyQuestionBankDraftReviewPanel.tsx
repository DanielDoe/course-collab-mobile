import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { DraftQuestionBankItem } from "../../../lib/question-bank-ai-types"
import { resolveQuestionBankTypeMeta } from "../../../lib/custom-question-types"
import type { CustomQuestionTypeDraft } from "../../../lib/custom-question-types"
import type { InstructorBankQuestion } from "../../../lib/instructor-api"
import { FacultyQuestionBankDetailContent } from "../FacultyQuestionBankDetailContent"
import { AppButton } from "../../theme/AppButton"
import {
  FacultySheetField,
  FacultySheetTextInput,
} from "../faculty-collab-sheet-ui"
import {
  QuestionBankFlowStepIndicator,
  type QuestionBankFlowStep,
} from "./QuestionBankFlowStepIndicator"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { FACULTY_SHEET_CHIP_RADIUS } from "../faculty-collab-sheet-ui"

function draftAsQuestion(draft: DraftQuestionBankItem): InstructorBankQuestion {
  return {
    id: 0,
    question_text: draft.question_text,
    question_type: draft.question_type,
    difficulty: draft.difficulty,
    topic: draft.topic,
    hint: draft.hint,
    explanation: draft.explanation,
    sample_answer: draft.sample_answer,
    evaluation_mode: draft.evaluation_mode,
    options: draft.options,
    correct_answer: draft.correct_answer,
    answer_guidelines: draft.answer_guidelines,
    subquestions: draft.subquestions,
  }
}

type Props = {
  drafts: DraftQuestionBankItem[]
  selected: Record<string, boolean>
  onSelectedChange: (next: Record<string, boolean>) => void
  onUpdateDraft: (draftId: string, partial: Partial<DraftQuestionBankItem>) => void
  onBack: () => void
  onConfirm: () => void
  saving: boolean
  backLabel?: string
  confirmLabel?: string
  subtitle?: string
  flowSteps?: QuestionBankFlowStep[]
  flowCurrentIndex?: number
  customTypes?: CustomQuestionTypeDraft[]
}

export function FacultyQuestionBankDraftReviewPanel({
  drafts,
  selected,
  onSelectedChange,
  onUpdateDraft,
  onBack,
  onConfirm,
  saving,
  backLabel = "Back",
  confirmLabel,
  subtitle,
  flowSteps,
  flowCurrentIndex,
  customTypes = [],
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_QUESTION_BANK_COLOR.link, tokens.isDark)
  const multi = drafts.length > 1
  const [activeId, setActiveId] = useState(drafts[0]?.draftId ?? "")
  const [showEdit, setShowEdit] = useState(false)

  const activeDraft = drafts.find((d) => d.draftId === activeId) ?? drafts[0]
  const selectedCount = drafts.filter((d) => selected[d.draftId]).length

  if (!activeDraft) return null

  const activeMeta = resolveQuestionBankTypeMeta(activeDraft.question_type, customTypes)
  const resolvedConfirm =
    confirmLabel ?? (multi ? `Create ${selectedCount} question${selectedCount === 1 ? "" : "s"}` : "Create question")

  function toggleAll(value: boolean) {
    onSelectedChange(Object.fromEntries(drafts.map((d) => [d.draftId, value])))
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { borderBottomColor: native.separator }]}>
        <View style={styles.headerCopy}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="eye-outline" size={18} color={FACULTY_QUESTION_BANK_COLOR.link} />
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Preview before creating</Text>
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {subtitle ??
              "This is how students will see the question during a quiz. Edit anything, then confirm."}
          </Text>
        </View>
        {multi ? (
          <View style={styles.multiActions}>
            <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link, fontWeight: "700" }]}>
              {selectedCount} selected
            </Text>
            <Pressable onPress={() => toggleAll(true)}>
              <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link }]}>Select all</Text>
            </Pressable>
            <Pressable onPress={() => toggleAll(false)}>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {flowSteps && flowCurrentIndex != null ? (
        <View style={styles.stepWrap}>
          <QuestionBankFlowStepIndicator steps={flowSteps} currentIndex={flowCurrentIndex} />
        </View>
      ) : null}

      {multi ? (
        <View style={styles.chipRow}>
          {drafts.map((d, idx) => {
            const isActive = d.draftId === activeDraft.draftId
            return (
              <Pressable
                key={d.draftId}
                onPress={() => setActiveId(d.draftId)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? linkSoft : native.secondaryGrouped,
                    borderColor: isActive ? FACULTY_QUESTION_BANK_COLOR.link : native.separator,
                  },
                ]}
              >
                <Text
                  style={[
                    type.caption,
                    { color: isActive ? FACULTY_QUESTION_BANK_COLOR.link : native.label, fontWeight: "600" },
                  ]}
                >
                  Q{idx + 1}
                  {selected[d.draftId] ? " ✓" : ""}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      <View style={[styles.previewBox, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        {multi ? (
          <Pressable
            onPress={() =>
              onSelectedChange({ ...selected, [activeDraft.draftId]: !selected[activeDraft.draftId] })
            }
            style={styles.includeRow}
          >
            <Ionicons
              name={selected[activeDraft.draftId] ? "checkbox" : "square-outline"}
              size={18}
              color={FACULTY_QUESTION_BANK_COLOR.link}
            />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Include in batch</Text>
          </Pressable>
        ) : null}
        <FacultyQuestionBankDetailContent question={draftAsQuestion(activeDraft)} />
      </View>

      <Pressable
        onPress={() => setShowEdit((v) => !v)}
        style={[styles.editToggle, { borderColor: native.separator, backgroundColor: native.tertiaryGrouped }]}
      >
        <Ionicons name="pencil-outline" size={16} color={native.label} />
        <Text style={[type.body, { color: native.label, flex: 1 }]}>Edit question fields</Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>{showEdit ? "Hide" : "Show"}</Text>
      </Pressable>

      {showEdit ? (
        <View style={styles.editFields}>
          <FacultySheetField label="Question text">
            <FacultySheetTextInput
              value={activeDraft.question_text}
              onChangeText={(text) => onUpdateDraft(activeDraft.draftId, { question_text: text })}
              multiline
            />
          </FacultySheetField>

          {activeMeta?.requiresOptions && activeDraft.options.length > 0 ? (
            <FacultySheetField label="Options (one per line)">
              <FacultySheetTextInput
                value={activeDraft.options.join("\n")}
                onChangeText={(text) =>
                  onUpdateDraft(activeDraft.draftId, {
                    options: text.split("\n").map((l) => l.trim()).filter(Boolean),
                  })
                }
                multiline
              />
            </FacultySheetField>
          ) : null}

          <FacultySheetField label="Correct answer">
            <FacultySheetTextInput
              value={
                Array.isArray(activeDraft.correct_answer)
                  ? activeDraft.correct_answer.join(", ")
                  : String(activeDraft.correct_answer)
              }
              onChangeText={(text) => onUpdateDraft(activeDraft.draftId, { correct_answer: text })}
            />
          </FacultySheetField>

          <FacultySheetField label="Hint">
            <FacultySheetTextInput
              value={activeDraft.hint ?? ""}
              onChangeText={(text) => onUpdateDraft(activeDraft.draftId, { hint: text || null })}
            />
          </FacultySheetField>

          <FacultySheetField label="Explanation">
            <FacultySheetTextInput
              value={activeDraft.explanation ?? ""}
              onChangeText={(text) => onUpdateDraft(activeDraft.draftId, { explanation: text || null })}
              multiline
            />
          </FacultySheetField>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton label={backLabel} onPress={onBack} variant="secondary" style={styles.actionFlex} />
        <AppButton
          label={resolvedConfirm}
          onPress={onConfirm}
          variant="primary"
          loading={saving}
          disabled={multi && selectedCount === 0}
          style={styles.actionFlex}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  header: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerCopy: { gap: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  multiActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepWrap: { paddingVertical: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewBox: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  includeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  editFields: { gap: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionFlex: { flex: 1 },
})
