import type { DraftQuestionBankItem } from "./question-bank-ai-types"

/** Server insert payload — client-only `draftId` must not be forwarded. */
export type QuestionBankBulkCreateItem = Omit<DraftQuestionBankItem, "draftId">

export function toQuestionBankBulkCreateItem(draft: DraftQuestionBankItem): QuestionBankBulkCreateItem {
  const { draftId: _draftId, ...item } = draft
  return item
}

export function toQuestionBankBulkCreatePayload(drafts: DraftQuestionBankItem[]): QuestionBankBulkCreateItem[] {
  return drafts.map(toQuestionBankBulkCreateItem)
}

export function validateQuestionBankDraftsForCreate(drafts: DraftQuestionBankItem[]): string | null {
  if (!drafts.length) return "Select at least one question."
  const invalid = drafts.find((d) => !String(d.question_text ?? "").trim())
  if (invalid) return "Every selected question needs question text."
  return null
}
