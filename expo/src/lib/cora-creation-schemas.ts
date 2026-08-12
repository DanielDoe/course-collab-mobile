import type { DraftQuestionBankItem, QuestionBankPdfGenerationRequest } from "./question-bank-ai-types"
import { defaultPdfGenerationRequest, validatePdfGenerationRequest } from "./question-bank-ai-types"

/** Canonical creation kinds Cora can materialize via migration scripts. */
export type CoraCreationKind =
  | "question_bank_bulk"
  | "question_bank_from_document"
  | "quiz_from_bank"
  | "homework_from_bank"
  | "announcement"
  | "flashcard_deck_from_bank"
  | "study_plan_automation"
  | "export_note"
  | "github_fix_pr"

export type CoraCreationSchemaVersion = 1

export type CoraCreationEnvelope<T extends CoraCreationKind = CoraCreationKind> = {
  schemaVersion: CoraCreationSchemaVersion
  kind: T
  label: string
  createdAt: string
  payload: CoraCreationPayloadByKind[T]
}

export type CoraCreationPayloadByKind = {
  question_bank_bulk: {
    drafts: DraftQuestionBankItem[]
    autoPublish?: boolean
  }
  question_bank_from_document: {
    file: { uri: string; name: string; type: string }
    spec: QuestionBankPdfGenerationRequest
    autoPublish?: boolean
  }
  quiz_from_bank: {
    title: string
    description?: string | null
    questionIds: number[]
    assessmentType?: "quiz" | "homework" | "midterm" | "final"
    timeLimit?: number
  }
  homework_from_bank: {
    title: string
    description?: string | null
    questionIds: number[]
    timeLimit?: number
    availableFrom?: string | null
    availableUntil?: string | null
  }
  announcement: {
    title: string
    content: string
    pinned?: boolean
  }
  flashcard_deck_from_bank: {
    topicName: string
    session?: string | null
    deckId?: number | null
    maxCards?: number
  }
  study_plan_automation: {
    messages: { role: string; content: string }[]
    title?: string
    reminderMinutes?: number
  }
  export_note: {
    messages: { role: string; content: string }[]
  }
  github_fix_pr: {
    title: string
    description: string
    branchName?: string
    files: { path: string; content: string }[]
    labels?: string[]
    linkedIssue?: number
  }
}

export function createEnvelope<K extends CoraCreationKind>(
  kind: K,
  label: string,
  payload: CoraCreationPayloadByKind[K],
): CoraCreationEnvelope<K> {
  return {
    schemaVersion: 1,
    kind,
    label,
    createdAt: new Date().toISOString(),
    payload,
  }
}

export function validateCreationEnvelope(
  envelope: CoraCreationEnvelope,
): { ok: true } | { ok: false; error: string } {
  if (envelope.schemaVersion !== 1) {
    return { ok: false, error: `Unsupported schema version ${envelope.schemaVersion}.` }
  }

  switch (envelope.kind) {
    case "question_bank_bulk": {
      const p = envelope.payload as CoraCreationPayloadByKind["question_bank_bulk"]
      if (!p.drafts?.length) return { ok: false, error: "At least one draft question is required." }
      return { ok: true }
    }
    case "question_bank_from_document": {
      const p = envelope.payload as CoraCreationPayloadByKind["question_bank_from_document"]
      if (!p.file?.uri) return { ok: false, error: "Document file is required." }
      const specError = validatePdfGenerationRequest(p.spec ?? defaultPdfGenerationRequest())
      if (specError) return { ok: false, error: specError }
      return { ok: true }
    }
    case "quiz_from_bank":
    case "homework_from_bank": {
      const p = envelope.payload as CoraCreationPayloadByKind["quiz_from_bank"]
      if (!p.title?.trim()) return { ok: false, error: "Assessment title is required." }
      if (!p.questionIds?.length) return { ok: false, error: "Select at least one bank question." }
      return { ok: true }
    }
    case "announcement": {
      const p = envelope.payload as CoraCreationPayloadByKind["announcement"]
      if (!p.title?.trim() || !p.content?.trim()) {
        return { ok: false, error: "Announcement title and content are required." }
      }
      return { ok: true }
    }
    case "flashcard_deck_from_bank": {
      const p = envelope.payload as CoraCreationPayloadByKind["flashcard_deck_from_bank"]
      if (!p.topicName?.trim()) return { ok: false, error: "Flashcard topic is required." }
      return { ok: true }
    }
    case "study_plan_automation":
    case "export_note": {
      const p = envelope.payload as CoraCreationPayloadByKind["study_plan_automation"]
      if (!p.messages?.length) return { ok: false, error: "Conversation messages are required." }
      return { ok: true }
    }
    case "github_fix_pr": {
      const p = envelope.payload as CoraCreationPayloadByKind["github_fix_pr"]
      if (!p.title?.trim() || !p.description?.trim()) {
        return { ok: false, error: "PR title and description are required." }
      }
      if (!p.files?.length) return { ok: false, error: "At least one file change is required." }
      return { ok: true }
    }
    default:
      return { ok: false, error: `Unknown creation kind: ${String(envelope.kind)}` }
  }
}
