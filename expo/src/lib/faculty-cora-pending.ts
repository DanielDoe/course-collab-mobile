import * as SecureStore from "./secure-store-client"
import type { DraftQuestionBankItem } from "./question-bank-ai-types"

export type FacultyCoraPendingKind =
  | "question_bank_drafts"
  | "quiz_create"
  | "announcement_draft"
  | "flashcard_topic"
  | "playground_topic"

export type FacultyCoraPendingQuestionBank = {
  kind: "question_bank_drafts"
  drafts: DraftQuestionBankItem[]
  createdAt: string
}

export type FacultyCoraPendingQuizCreate = {
  kind: "quiz_create"
  title?: string
  description?: string
  assessmentType?: string
  createdAt: string
}

export type FacultyCoraPendingAnnouncementDraft = {
  kind: "announcement_draft"
  title: string
  content: string
  createdAt: string
}

export type FacultyCoraPendingFlashcardTopic = {
  kind: "flashcard_topic"
  topicName: string
  createdAt: string
}

export type FacultyCoraPendingPlaygroundTopic = {
  kind: "playground_topic"
  topic: string
  questionCount?: number
  openQuestionsTab?: boolean
  createdAt: string
}

export type FacultyCoraPendingPayload =
  | FacultyCoraPendingQuestionBank
  | FacultyCoraPendingQuizCreate
  | FacultyCoraPendingAnnouncementDraft
  | FacultyCoraPendingFlashcardTopic
  | FacultyCoraPendingPlaygroundTopic

/** SecureStore keys may only use alphanumeric characters, ".", "-", and "_". */
function storageKey(instructorId: number, courseId: number): string {
  return `faculty_cora_pending_${instructorId}_${courseId}`
}

function assertPendingScope(instructorId: number, courseId: number): void {
  if (!Number.isFinite(instructorId) || instructorId <= 0) {
    throw new Error("Cora could not save this action — instructor session is invalid.")
  }
  if (!Number.isFinite(courseId) || courseId <= 0) {
    throw new Error("Select a course before opening a module from Cora.")
  }
}

export async function setFacultyCoraPending(
  instructorId: number,
  courseId: number,
  payload: FacultyCoraPendingPayload,
): Promise<void> {
  assertPendingScope(instructorId, courseId)
  await SecureStore.setItemAsync(storageKey(instructorId, courseId), JSON.stringify(payload))
}

export async function peekFacultyCoraPending(
  instructorId: number,
  courseId: number,
): Promise<FacultyCoraPendingPayload | null> {
  try {
    if (!Number.isFinite(instructorId) || !Number.isFinite(courseId) || courseId <= 0) return null
    const raw = await SecureStore.getItemAsync(storageKey(instructorId, courseId))
    if (!raw) return null
    return JSON.parse(raw) as FacultyCoraPendingPayload
  } catch {
    return null
  }
}

export async function consumeFacultyCoraPending(
  instructorId: number,
  courseId: number,
  expectedKind?: FacultyCoraPendingKind,
): Promise<FacultyCoraPendingPayload | null> {
  const pending = await peekFacultyCoraPending(instructorId, courseId)
  if (!pending) return null
  if (expectedKind && pending.kind !== expectedKind) return null
  await SecureStore.deleteItemAsync(storageKey(instructorId, courseId))
  return pending
}

export async function clearFacultyCoraPending(instructorId: number, courseId: number): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(instructorId, courseId))
}
