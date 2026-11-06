import { instructorApi } from "./instructor-api"
import { instructorFlashcardsApi } from "./instructor-content-api"
import { automateStudyPlan, exportWorkspaceToNotes } from "./cora-api"
import { submitCoraGithubFix } from "./cora-github-api"
import type { InstructorScope } from "./instructor-content-api"
import type { FacultySession, StudentSession } from "./session"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"
import {
  createEnvelope,
  validateCreationEnvelope,
  type CoraCreationEnvelope,
  type CoraCreationKind,
  type CoraCreationPayloadByKind,
} from "./cora-creation-schemas"
import { ingestFacultyDocument } from "./cora-document-ingest"
import type { DraftQuestionBankItem } from "./question-bank-ai-types"

export type CoraMigrationResult = {
  kind: CoraCreationKind
  success: boolean
  message: string
  /** Created entity IDs for follow-up navigation. */
  ids?: {
    questionIds?: number[]
    quizId?: number
    announcementId?: number
    deckId?: number
    noteId?: number
    pullRequestUrl?: string
    jobId?: number
  }
  /** Drafts awaiting instructor review before publish. */
  drafts?: DraftQuestionBankItem[]
  navigateTo?: string
}

export type CoraMigrationContext =
  | { role: "faculty"; scope: InstructorScope; session: FacultySession; prepared?: PreparedCoraRequest }
  | { role: "student"; session: StudentSession; prepared?: PreparedCoraRequest }

/** Run a validated creation envelope against CourseCollab APIs (the "migration script"). */
export async function runCoraMigration(
  ctx: CoraMigrationContext,
  envelope: CoraCreationEnvelope,
): Promise<CoraMigrationResult> {
  const validation = validateCreationEnvelope(envelope)
  if (!validation.ok) {
    return { kind: envelope.kind, success: false, message: validation.error }
  }

  switch (envelope.kind) {
    case "question_bank_bulk":
      return runQuestionBankBulk(ctx, envelope.payload as CoraCreationPayloadByKind["question_bank_bulk"])
    case "question_bank_from_document":
      return runQuestionBankFromDocument(
        ctx,
        envelope.payload as CoraCreationPayloadByKind["question_bank_from_document"],
      )
    case "quiz_from_bank":
      return runQuizFromBank(ctx, envelope.payload as CoraCreationPayloadByKind["quiz_from_bank"], "quiz")
    case "homework_from_bank":
      return runQuizFromBank(ctx, envelope.payload as CoraCreationPayloadByKind["homework_from_bank"], "homework")
    case "announcement":
      return runAnnouncement(ctx, envelope.payload as CoraCreationPayloadByKind["announcement"])
    case "flashcard_deck_from_bank":
      return runFlashcardDeckFromBank(
        ctx,
        envelope.payload as CoraCreationPayloadByKind["flashcard_deck_from_bank"],
      )
    case "study_plan_automation":
      return runStudyPlanAutomation(ctx, envelope.payload as CoraCreationPayloadByKind["study_plan_automation"])
    case "export_note":
      return runExportNote(ctx, envelope.payload as CoraCreationPayloadByKind["export_note"])
    case "github_fix_pr":
      return runGithubFix(ctx, envelope.payload as CoraCreationPayloadByKind["github_fix_pr"])
    default:
      return {
        kind: envelope.kind,
        success: false,
        message: `Migration not implemented for ${String(envelope.kind)}.`,
      }
  }
}

function facultyScope(ctx: CoraMigrationContext): InstructorScope | null {
  return ctx.role === "faculty" ? ctx.scope : null
}

async function runQuestionBankBulk(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["question_bank_bulk"],
): Promise<CoraMigrationResult> {
  const scope = facultyScope(ctx)
  if (!scope) return { kind: "question_bank_bulk", success: false, message: "Faculty scope required." }

  if (payload.autoPublish) {
    const res = await instructorApi.bulkCreateQuestionBankQuestions(scope, payload.drafts)
    return {
      kind: "question_bank_bulk",
      success: true,
      message: `Added ${res.createdCount} question${res.createdCount === 1 ? "" : "s"} to your bank.`,
      ids: { questionIds: res.questionIds },
      navigateTo: "/module/question-bank",
    }
  }

  return {
    kind: "question_bank_bulk",
    success: true,
    message: `${payload.drafts.length} draft question${payload.drafts.length === 1 ? "" : "s"} ready for review.`,
    drafts: payload.drafts,
    navigateTo: "/module/question-bank",
  }
}

async function runQuestionBankFromDocument(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["question_bank_from_document"],
): Promise<CoraMigrationResult> {
  const scope = facultyScope(ctx)
  if (!scope) return { kind: "question_bank_from_document", success: false, message: "Faculty scope required." }

  const ingested = await ingestFacultyDocument(scope, payload.file, {
    intent: "extract_questions",
    spec: payload.spec,
    prepared: ctx.role === "faculty" ? ctx.prepared : undefined,
  })

  if (!ingested.drafts.length) {
    return {
      kind: "question_bank_from_document",
      success: false,
      message: ingested.message ?? "No questions could be extracted from this document.",
    }
  }

  if (payload.autoPublish) {
    const res = await instructorApi.bulkCreateQuestionBankQuestions(scope, ingested.drafts)
    return {
      kind: "question_bank_from_document",
      success: true,
      message: `Extracted and saved ${res.createdCount} question${res.createdCount === 1 ? "" : "s"} from ${payload.file.name}.`,
      ids: { questionIds: res.questionIds },
      navigateTo: "/module/question-bank",
    }
  }

  return {
    kind: "question_bank_from_document",
    success: true,
    message: ingested.message ?? `Extracted ${ingested.drafts.length} questions from ${payload.file.name}.`,
    drafts: ingested.drafts,
    navigateTo: "/module/question-bank",
  }
}

async function runQuizFromBank(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["quiz_from_bank"],
  defaultType: "quiz" | "homework",
): Promise<CoraMigrationResult> {
  const scope = facultyScope(ctx)
  if (!scope) return { kind: "quiz_from_bank", success: false, message: "Faculty scope required." }

  const homeworkPayload =
    defaultType === "homework"
      ? (payload as CoraCreationPayloadByKind["homework_from_bank"])
      : null

  const res = await instructorApi.createQuizFromBank(scope, {
    title: payload.title,
    description: payload.description ?? null,
    question_ids: payload.questionIds,
    assessment_type: payload.assessmentType ?? defaultType,
    time_limit: payload.timeLimit,
    available_from: homeworkPayload?.availableFrom ?? null,
    available_until: homeworkPayload?.availableUntil ?? null,
  })

  const modulePath =
    (payload.assessmentType ?? defaultType) === "homework" ? "/module/homework" : "/module/quizzes"

  return {
    kind: defaultType === "homework" ? "homework_from_bank" : "quiz_from_bank",
    success: true,
    message: `Created ${payload.title} with ${res.questions_added ?? payload.questionIds.length} questions.`,
    ids: { quizId: res.quiz_id },
    navigateTo: modulePath,
  }
}

async function runAnnouncement(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["announcement"],
): Promise<CoraMigrationResult> {
  const scope = facultyScope(ctx)
  if (!scope) return { kind: "announcement", success: false, message: "Faculty scope required." }

  const res = await instructorApi.createAnnouncement(scope, {
    title: payload.title,
    content: payload.content,
    pinned: payload.pinned,
  })

  return {
    kind: "announcement",
    success: true,
    message: `Published announcement "${payload.title}".`,
    ids: { announcementId: Number(res.id) },
    navigateTo: "/module/announcements",
  }
}

async function runFlashcardDeckFromBank(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["flashcard_deck_from_bank"],
): Promise<CoraMigrationResult> {
  const scope = facultyScope(ctx)
  if (!scope) return { kind: "flashcard_deck_from_bank", success: false, message: "Faculty scope required." }

  const res = await instructorFlashcardsApi.generateFromBank(scope, {
    topicName: payload.topicName,
    session: payload.session ?? null,
    deckId: payload.deckId ?? null,
    maxCards: payload.maxCards,
  })

  return {
    kind: "flashcard_deck_from_bank",
    success: true,
    message: `Created flashcard deck for ${payload.topicName} (${res.cardsAdded} cards).`,
    ids: { deckId: res.deckId },
    navigateTo: "/module/flashcards",
  }
}

async function runStudyPlanAutomation(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["study_plan_automation"],
): Promise<CoraMigrationResult> {
  if (ctx.role !== "student") {
    return { kind: "study_plan_automation", success: false, message: "Student session required." }
  }

  const res = await automateStudyPlan(ctx.session, payload.messages, {
    title: payload.title,
    reminderMinutes: payload.reminderMinutes,
  })

  if (res.error) {
    return { kind: "study_plan_automation", success: false, message: res.error }
  }

  return {
    kind: "study_plan_automation",
    success: true,
    message: res.message ?? "Study plan automation completed.",
    ids: { noteId: res.noteId },
    navigateTo: res.href ?? "/module/calendar",
  }
}

async function runExportNote(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["export_note"],
): Promise<CoraMigrationResult> {
  if (ctx.role !== "student") {
    return { kind: "export_note", success: false, message: "Student session required." }
  }

  const res = await exportWorkspaceToNotes(ctx.session, payload.messages)
  if (res.error) {
    return { kind: "export_note", success: false, message: res.error }
  }

  return {
    kind: "export_note",
    success: true,
    message: res.message ?? "Saved to My Notes.",
    ids: { noteId: res.noteId },
    navigateTo: res.noteId ? `/notes/${res.noteId}` : "/module/notes",
  }
}

async function runGithubFix(
  ctx: CoraMigrationContext,
  payload: CoraCreationPayloadByKind["github_fix_pr"],
): Promise<CoraMigrationResult> {
  // Opening a pull request against the product repo is a platform-admin action.
  // The server enforces this; refusing here keeps Cora from promising a student
  // a fix it cannot submit.
  if (ctx.role === "student") {
    return {
      kind: "github_fix_pr",
      success: false,
      message: "Submitting code fixes is not available from a student account.",
    }
  }

  const scope = facultyScope(ctx)
  const res = await submitCoraGithubFix({
    scope: scope ?? undefined,
    session: ctx.role === "faculty" ? ctx.session : undefined,
    prepared: ctx.prepared,
    payload,
  })

  if (!res.success) {
    return { kind: "github_fix_pr", success: false, message: res.message }
  }

  return {
    kind: "github_fix_pr",
    success: true,
    message: res.message,
    ids: { pullRequestUrl: res.pullRequestUrl },
    navigateTo: res.pullRequestUrl,
  }
}

/** Convenience: build envelope + run in one call. */
export async function runCoraCreation<K extends CoraCreationKind>(
  ctx: CoraMigrationContext,
  kind: K,
  label: string,
  payload: CoraCreationPayloadByKind[K],
): Promise<CoraMigrationResult> {
  return runCoraMigration(ctx, createEnvelope(kind, label, payload))
}
