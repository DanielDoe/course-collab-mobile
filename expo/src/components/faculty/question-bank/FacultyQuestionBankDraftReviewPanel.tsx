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
import { KeyboardAwareForm } from "../../ui/KeyboardAwareForm"

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
  /** When true (Cora modal), this panel owns scrolling and the sticky footer. */
  fillHeight?: boolean
  /** False when the faculty course scope is missing — confirm must not silently no-op. */
  confirmReady?: boolean
}

export function FacultyQuestionBankDraftReviewPanel({
  drafts,
  selected,
  onSelectedChange,
  onUpdateDraft,
  onBack,
  onConfirm,
  saving,
  backLabel = "Cancel",
  confirmLabel,
  subtitle,
  flowSteps,
  flowCurrentIndex,
  customTypes = [],
  fillHeight = false,
  confirmReady = true,
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_QUESTION_BANK_COLOR.link, tokens.isDark)
  const [editingId, setEditingId] = useState<string | null>(null)

  const selectedCount = drafts.filter((d) => selected[d.draftId]).length
  const resolvedConfirm =
    confirmLabel ??
    (selectedCount === 1 ? "Add 1 Question" : `Add ${selectedCount} Questions`)

  function toggleAll(value: boolean) {
    onSelectedChange(Object.fromEntries(drafts.map((d) => [d.draftId, value])))
  }

  const footer = (
    <View style={styles.actions}>
      <AppButton label={backLabel} onPress={onBack} variant="secondary" style={styles.actionFlex} />
      <AppButton
        label={saving ? "Adding…" : resolvedConfirm}
        onPress={onConfirm}
        variant="primary"
        loading={saving}
        disabled={selectedCount === 0 || saving || !confirmReady}
        style={styles.actionFlex}
      />
    </View>
  )

  const body = (
    <>
      <View style={[styles.header, { borderBottomColor: native.separator }]}>
        <View style={styles.headerCopy}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="eye-outline" size={18} color={FACULTY_QUESTION_BANK_COLOR.link} />
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Preview before creating</Text>
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {subtitle ?? "Review Cora-generated questions before adding them to your bank."}
          </Text>
        </View>
        <View style={styles.multiActions}>
          <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link, fontWeight: "700" }]}>
            {selectedCount} selected
          </Text>
          <Pressable onPress={() => toggleAll(true)} accessibilityRole="button" accessibilityLabel="Select all">
            <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link }]}>Select all</Text>
          </Pressable>
          <Pressable onPress={() => toggleAll(false)} accessibilityRole="button" accessibilityLabel="Clear selection">
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {flowSteps && flowCurrentIndex != null ? (
        <View style={styles.stepWrap}>
          <QuestionBankFlowStepIndicator steps={flowSteps} currentIndex={flowCurrentIndex} />
        </View>
      ) : null}

      <View style={styles.cardList}>
        {drafts.map((draft, idx) => {
          const included = Boolean(selected[draft.draftId])
          const editing = editingId === draft.draftId
          const meta = resolveQuestionBankTypeMeta(draft.question_type, customTypes)
          return (
            <View
              key={draft.draftId}
              style={[
                styles.previewBox,
                { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
              ]}
            >
              <View style={styles.cardHead}>
                <Text style={[type.caption, { color: FACULTY_QUESTION_BANK_COLOR.link, fontWeight: "700" }]}>
                  Q{idx + 1}
                </Text>
                <View style={styles.cardTags}>
                  <Text style={[styles.tag, { backgroundColor: linkSoft, color: FACULTY_QUESTION_BANK_COLOR.link }]}>
                    {meta?.label ?? draft.question_type}
                  </Text>
                  {draft.topic ? (
                    <Text style={[styles.tag, { backgroundColor: native.fill, color: native.secondaryLabel }]}>
                      {draft.topic}
                    </Text>
                  ) : null}
                  <Text style={[styles.tag, { backgroundColor: native.fill, color: native.secondaryLabel }]}>
                    {draft.difficulty}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() =>
                  onSelectedChange({ ...selected, [draft.draftId]: !included })
                }
                style={styles.includeRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: included }}
              >
                <Ionicons
                  name={included ? "checkbox" : "square-outline"}
                  size={18}
                  color={FACULTY_QUESTION_BANK_COLOR.link}
                />
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  {included ? "Included in batch" : "Include in batch"}
                </Text>
              </Pressable>

              <FacultyQuestionBankDetailContent question={draftAsQuestion(draft)} />

              <Pressable
                onPress={() => setEditingId(editing ? null : draft.draftId)}
                style={[styles.editToggle, { borderColor: native.separator, backgroundColor: native.tertiaryGrouped }]}
              >
                <Ionicons name="pencil-outline" size={16} color={native.label} />
                <Text style={[type.body, { color: native.label, flex: 1 }]}>Edit</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>{editing ? "Hide" : "Show"}</Text>
              </Pressable>

              {editing ? (
                <View style={styles.editFields}>
                  <FacultySheetField label="Question text">
                    <FacultySheetTextInput
                      value={draft.question_text}
                      onChangeText={(text) => onUpdateDraft(draft.draftId, { question_text: text })}
                      multiline
                    />
                  </FacultySheetField>
                  {meta?.requiresOptions && draft.options.length > 0 ? (
                    <FacultySheetField label="Options (one per line)">
                      <FacultySheetTextInput
                        value={draft.options.join("\n")}
                        onChangeText={(text) =>
                          onUpdateDraft(draft.draftId, {
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
                        Array.isArray(draft.correct_answer)
                          ? draft.correct_answer.join(", ")
                          : String(draft.correct_answer)
                      }
                      onChangeText={(text) => onUpdateDraft(draft.draftId, { correct_answer: text })}
                    />
                  </FacultySheetField>
                  <FacultySheetField label="Explanation">
                    <FacultySheetTextInput
                      value={draft.explanation ?? ""}
                      onChangeText={(text) => onUpdateDraft(draft.draftId, { explanation: text || null })}
                      multiline
                    />
                  </FacultySheetField>
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
      {fillHeight ? null : <View style={{ paddingTop: 12 }}>{footer}</View>}
    </>
  )

  if (!fillHeight) return body

  return (
    <KeyboardAwareForm
      extraBottomPadding={24}
      footer={footer}
      style={styles.fill}
      contentContainerStyle={styles.fillContent}
    >
      {body}
    </KeyboardAwareForm>
  )
}

const styles = StyleSheet.create({
  header: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerCopy: { gap: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  multiActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepWrap: { paddingVertical: 8 },
  cardList: { gap: 12, paddingTop: 12 },
  previewBox: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1, justifyContent: "flex-end" },
  tag: {
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
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
  actions: { flexDirection: "row", gap: 10 },
  actionFlex: { flex: 1 },
  fill: { flex: 1 },
  fillContent: { paddingHorizontal: 16, paddingTop: 8 },
})
