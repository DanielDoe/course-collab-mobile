import { AppAlert } from './app-alert'

import type { Router } from "expo-router"
import { facultyCoraApi, type FacultyCoraChatAction } from "./faculty-cora-api"
import type { InstructorScope } from "./instructor-content-api"
import type { FacultySession, StudentSession } from "./session"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"
import type { CoraMessageMenuActionId } from "./cora-message-actions"
import type { CoraToolFlowId } from "./cora-tool-flows"
import { runCoraCreation, type CoraMigrationContext, type CoraMigrationResult } from "./cora-migrations"
import { defaultPdfGenerationRequest } from "./question-bank-ai-types"
import { ingestFacultyDocument, type CoraIngestFile } from "./cora-document-ingest"
import { setFacultyCoraPending } from "./faculty-cora-pending"
import {
  facultyCoraAssessmentModuleRoute,
  facultyCoraModuleRoute,
} from "./faculty-cora-config"
import {
  facultyActionToRbac,
  prepareCoraRequest,
  recordCoraError,
  recordCoraSuccess,
  isCoraAccessDeniedError,
} from "./cora-rbac"
import { exportWorkspaceToNotes } from "./cora-api"
import type { ChatMessage } from "./ai-tutor-api"
import type { DraftQuestionBankItem } from "./question-bank-ai-types"

export type CoraToolRunResult =
  | { mode: "prompt"; prompt: string }
  | { mode: "migration"; result: CoraMigrationResult }
  | { mode: "drafts"; drafts: DraftQuestionBankItem[]; message: string }
  | { mode: "attach-text"; text: string; label: string }
  | { mode: "navigate"; path: string; message?: string }
  | { mode: "noop" }

export type FacultyToolRunnerDeps = {
  scope: InstructorScope
  session: FacultySession
  router: Router
  onClose?: () => void
  onDraftsReady?: (drafts: DraftQuestionBankItem[]) => void
}

export type StudentToolRunnerDeps = {
  session: StudentSession
  router: Router
  messages: ChatMessage[]
}

function facultyCtx(deps: FacultyToolRunnerDeps, prepared?: PreparedCoraRequest): CoraMigrationContext {
  return { role: "faculty", scope: deps.scope, session: deps.session, prepared }
}

function navigateFacultyModule(deps: FacultyToolRunnerDeps, path: string): void {
  deps.onClose?.()
  deps.router.push(path as never)
}

function requireCourseId(scope: InstructorScope): number {
  if (scope.courseId == null || scope.courseId <= 0) {
    throw new Error("Select a course before opening a module from Cora.")
  }
  return scope.courseId
}

export async function runFacultyDocumentIngest(
  deps: FacultyToolRunnerDeps,
  file: CoraIngestFile,
  prompt?: string,
  prepared?: PreparedCoraRequest,
): Promise<CoraToolRunResult> {
  try {
    if (!prepared) {
      prepared = prepareCoraRequest({
        session: deps.session,
        scope: deps.scope,
        tool: "generate_questions",
        prompt: prompt ?? file.name,
      })
    }

    const ingested = await ingestFacultyDocument(deps.scope, file, {
      intent: "extract_questions",
      spec: {
        ...defaultPdfGenerationRequest(),
        topic: prompt?.trim().slice(0, 120) || file.name.replace(/\.[^.]+$/, ""),
        additionalInstructions: prompt ?? "",
      },
      prompt,
      prepared,
    })

    if (!ingested.drafts.length) {
      if (ingested.extractedText?.trim()) {
        recordCoraSuccess(prepared, { prompt: file.name, response: "extracted text" })
        return {
          mode: "attach-text",
          text: ingested.extractedText.trim(),
          label: file.name,
        }
      }
      AppAlert.alert("No questions found", ingested.message ?? "Could not extract questions from this file.")
      return { mode: "noop" }
    }

    recordCoraSuccess(prepared, { prompt: file.name, response: `${ingested.drafts.length} drafts` })
    deps.onDraftsReady?.(ingested.drafts)
    return {
      mode: "drafts",
      drafts: ingested.drafts,
      message: ingested.message ?? `Extracted ${ingested.drafts.length} questions.`,
    }
  } catch (err) {
    if (prepared) recordCoraError(prepared, file.name)
    AppAlert.alert("Upload failed", err instanceof Error ? err.message : "Could not process document.")
    return { mode: "noop" }
  }
}

export async function runFacultyChatAction(
  deps: FacultyToolRunnerDeps,
  action: FacultyCoraChatAction,
): Promise<CoraToolRunResult> {
  let prepared: PreparedCoraRequest | undefined
  try {
    prepared = prepareCoraRequest({
      session: deps.session,
      scope: deps.scope,
      tool: facultyActionToRbac(action.kind),
      prompt: String(action.payload.prompt ?? action.label),
    })
  } catch (err) {
    AppAlert.alert("Not allowed", isCoraAccessDeniedError(err) ? err.message : "Cora cannot run that action.")
    return { mode: "noop" }
  }

  switch (action.kind) {
    case "generate_questions": {
      const prompt = String(action.payload.prompt ?? "").trim()
      const courseId = requireCourseId(deps.scope)
      const res = await facultyCoraApi.generateQuestions(deps.scope, { prompt }, { prepared })
      recordCoraSuccess(prepared, { prompt, response: `${res.drafts.length} drafts` })
      await setFacultyCoraPending(deps.scope.instructorId, courseId, {
        kind: "question_bank_drafts",
        drafts: res.drafts,
        createdAt: new Date().toISOString(),
      })
      navigateFacultyModule(deps, facultyCoraModuleRoute("question-bank"))
      return { mode: "drafts", drafts: res.drafts, message: `${res.drafts.length} drafts ready.` }
    }
    case "open_quiz_create": {
      const assessmentType = String(action.payload.assessmentType ?? "quiz")
      const courseId = requireCourseId(deps.scope)
      const title = String(action.payload.title ?? "New quiz from Cora").trim() || "New quiz from Cora"
      await setFacultyCoraPending(deps.scope.instructorId, courseId, {
        kind: "quiz_create",
        title,
        description: String(action.payload.prompt ?? action.payload.description ?? ""),
        assessmentType,
        createdAt: new Date().toISOString(),
      })
      const path = facultyCoraAssessmentModuleRoute(assessmentType)
      navigateFacultyModule(deps, path)
      return { mode: "navigate", path, message: "Opening quiz editor…" }
    }
    case "open_module": {
      const moduleId = String(
        action.payload.moduleId ?? action.payload.module ?? action.payload.targetModule ?? "",
      ).trim()
      if (!moduleId) {
        throw new Error("No module was specified for this action.")
      }

      const courseId = deps.scope.courseId
      if (courseId != null && courseId > 0) {
        const pendingKind = String(action.payload.pendingKind ?? "")
        const createdAt = new Date().toISOString()
        if (pendingKind === "announcement_draft") {
          await setFacultyCoraPending(deps.scope.instructorId, courseId, {
            kind: "announcement_draft",
            title: String(action.payload.title ?? "Course announcement"),
            content: String(action.payload.content ?? ""),
            createdAt,
          })
        } else if (pendingKind === "flashcard_topic") {
          await setFacultyCoraPending(deps.scope.instructorId, courseId, {
            kind: "flashcard_topic",
            topicName: String(action.payload.topicName ?? action.payload.topic ?? ""),
            createdAt,
          })
        } else if (pendingKind === "playground_topic") {
          await setFacultyCoraPending(deps.scope.instructorId, courseId, {
            kind: "playground_topic",
            topic: String(action.payload.topic ?? ""),
            questionCount: Number(action.payload.questionCount ?? 10),
            openQuestionsTab: Boolean(action.payload.openQuestionsTab),
            createdAt,
          })
        }
      }

      const path = facultyCoraModuleRoute(moduleId)
      navigateFacultyModule(deps, path)
      return { mode: "navigate", path }
    }
    case "schedule_automation": {
      const jobType =
        action.payload.jobType === "post_lecture_flashcards"
          ? "post_lecture_flashcards"
          : "weekly_announcement"
      const res = await facultyCoraApi.scheduleAutomation(
        deps.scope,
        {
          jobType,
          payload: {
            notes: String(action.payload.notes ?? ""),
            topic: String(action.payload.topic ?? "Course update"),
          },
          runInHours: Number(action.payload.runInHours ?? 24),
        },
        { prepared },
      )
      recordCoraSuccess(prepared, { prompt: action.label, response: `job ${res.job.id}` })
      AppAlert.alert(
        "Automation scheduled",
        `Job #${res.job.id} will run ${new Date(res.job.runAt).toLocaleString()}.`,
      )
      return { mode: "noop" }
    }
    default:
      return { mode: "noop" }
  }
}

export async function publishFacultyQuestionDrafts(
  deps: FacultyToolRunnerDeps,
  drafts: DraftQuestionBankItem[],
): Promise<CoraMigrationResult> {
  return runCoraCreation(facultyCtx(deps), "question_bank_bulk", "Question bank import", {
    drafts,
    autoPublish: true,
  })
}

export async function runStudentMessageTool(
  deps: StudentToolRunnerDeps,
  actionId: CoraMessageMenuActionId,
  message: ChatMessage,
  onSend: (text: string) => void,
): Promise<CoraToolRunResult> {
  switch (actionId) {
    case "save-note": {
      const result = await exportWorkspaceToNotes(deps.session, [{ role: message.role, content: message.content }])
      if (result.error) {
        AppAlert.alert("Could not save", result.error)
        return { mode: "noop" }
      }
      AppAlert.alert("Saved to My Notes", result.message ?? "Added to your notes.", [
        ...(result.noteId
          ? [{ text: "Open note", onPress: () => deps.router.push(`/notes/${result.noteId}` as never) }]
          : []),
        { text: "OK", style: "cancel" as const },
      ])
      return {
        mode: "migration",
        result: {
          kind: "export_note",
          success: true,
          message: result.message ?? "Saved.",
          ids: { noteId: result.noteId },
          navigateTo: result.noteId ? `/notes/${result.noteId}` : undefined,
        },
      }
    }
    case "create-flashcards":
      onSend("Create flashcards from this answer. Use question on the front and concise answers on the back.")
      return { mode: "prompt", prompt: "create-flashcards" }
    default:
      return { mode: "noop" }
  }
}

export function coraToolFlowUsesApi(toolId: CoraToolFlowId): boolean {
  return toolId === "export-notes"
}
