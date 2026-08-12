import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { apiErrorMessage, isApiRouteMissingError } from "./http-errors"
import type { InstructorScope } from "./instructor-content-api"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"
import { instructorApi } from "./instructor-api"
import {
  defaultPdfGenerationRequest,
  type DraftQuestionBankItem,
  type QuestionBankPdfGenerationRequest,
} from "./question-bank-ai-types"
import { facultyCoraApi } from "./faculty-cora-api"

export type CoraDocumentIntent = "extract_questions" | "extract_content" | "analyze_assessment"

export type CoraIngestFile = {
  uri: string
  name: string
  type: string
  size?: number
}

export type CoraDocumentIngestResult = {
  drafts: DraftQuestionBankItem[]
  message?: string
  meta?: Record<string, unknown>
  /** Raw extracted text when question extraction is not the goal. */
  extractedText?: string
}

const PDF_MIME = "application/pdf"
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const DOC_MIME = "application/msword"

export function isPdfFile(name: string, mimeType: string): boolean {
  return mimeType === PDF_MIME || name.toLowerCase().endsWith(".pdf")
}

export function isDocxFile(name: string, mimeType: string): boolean {
  const lower = name.toLowerCase()
  return (
    mimeType === DOCX_MIME ||
    mimeType === DOC_MIME ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  )
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}

export function isCoraIngestibleDocument(name: string, mimeType: string): boolean {
  return isPdfFile(name, mimeType) || isDocxFile(name, mimeType) || isImageFile(mimeType)
}

function shouldUseFacultyIngestFallback(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  if (isApiRouteMissingError(err.status, err.message)) return true
  const message = err.message.toLowerCase()
  if (message.includes("student")) return true
  return err.status === 401 || err.status === 403 || err.status === 400 || err.status >= 500
}

export async function ingestFacultyDocument(
  scope: InstructorScope,
  file: CoraIngestFile,
  options: {
    intent: CoraDocumentIntent
    spec?: QuestionBankPdfGenerationRequest
    prompt?: string
    prepared?: PreparedCoraRequest
  },
): Promise<CoraDocumentIngestResult> {
  if (isPdfFile(file.name, file.type)) {
    return ingestPdf(scope, file, options)
  }
  if (isDocxFile(file.name, file.type)) {
    return ingestOfficeDocument(scope, file, options)
  }
  if (isImageFile(file.type)) {
    return ingestImage(scope, file, options)
  }

  throw new ApiError(
    `${file.name} is not a supported document type. Upload PDF, Word, or image files.`,
    400,
  )
}

async function ingestPdf(
  scope: InstructorScope,
  file: CoraIngestFile,
  options: {
    intent: CoraDocumentIntent
    spec?: QuestionBankPdfGenerationRequest
    prompt?: string
    prepared?: PreparedCoraRequest
  },
): Promise<CoraDocumentIngestResult> {
  const spec = options.spec ?? {
    ...defaultPdfGenerationRequest(),
    topic: options.prompt?.trim().slice(0, 120) || "Uploaded document",
    additionalInstructions: options.prompt ?? "",
  }

  try {
    const res = await instructorApi.generateQuestionBankFromPdf(scope, file, spec)
    return {
      drafts: res.questions ?? [],
      message: `Extracted ${res.questions?.length ?? 0} questions from PDF (${res.meta?.pageCount ?? "?"} pages).`,
      meta: res.meta as Record<string, unknown> | undefined,
    }
  } catch (err) {
    if (shouldUseFacultyIngestFallback(err)) {
      return ingestViaCoraTool(scope, file, options)
    }
    throw err
  }
}

async function ingestOfficeDocument(
  scope: InstructorScope,
  file: CoraIngestFile,
  options: {
    intent: CoraDocumentIntent
    prompt?: string
    prepared?: PreparedCoraRequest
  },
): Promise<CoraDocumentIngestResult> {
  return ingestViaCoraTool(scope, file, options)
}

async function ingestImage(
  scope: InstructorScope,
  file: CoraIngestFile,
  options: {
    intent: CoraDocumentIntent
    prompt?: string
    prepared?: PreparedCoraRequest
  },
): Promise<CoraDocumentIngestResult> {
  try {
    const uploaded = await instructorApi.uploadQuestionMedia(scope, file)
    const mediaUrl = uploaded.url
    const res = await facultyCoraApi.generateQuestions(
      scope,
      {
        prompt:
          options.prompt ??
          `Extract assessment questions from the attached figure (${file.name}). Return structured question bank drafts.`,
        count: 5,
      },
      { prepared: options.prepared },
    )
    const drafts = res.drafts.map((draft) => ({
      ...draft,
      source_note: mediaUrl ? `${draft.source_note ?? ""} [media:${mediaUrl}]`.trim() : draft.source_note,
    }))
    return {
      drafts,
      message: `Extracted ${drafts.length} questions from ${file.name}.`,
      meta: { mediaUrl },
    }
  } catch (err) {
    if (shouldUseFacultyIngestFallback(err)) {
      return ingestViaCoraTool(scope, file, options)
    }
    throw err
  }
}

async function ingestViaCoraTool(
  scope: InstructorScope,
  file: CoraIngestFile,
  options: {
    intent: CoraDocumentIntent
    prompt?: string
    prepared?: PreparedCoraRequest
  },
): Promise<CoraDocumentIngestResult> {
  const res = await facultyCoraApi.ingestDocument(
    scope,
    file,
    {
      intent: options.intent,
      prompt: options.prompt,
    },
    { prepared: options.prepared },
  )

  return {
    drafts: res.drafts ?? [],
    extractedText: res.extractedText,
    message: res.message,
    meta: res.meta,
  }
}

/** Multipart upload helper for Cora document routes. */
export async function uploadCoraDocumentMultipart<T>(
  path: string,
  scope: InstructorScope,
  file: CoraIngestFile,
  fields: Record<string, string>,
  rbac?: { prepared?: PreparedCoraRequest },
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const form = new FormData()
  form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value)
  }
  if (rbac?.prepared) {
    form.append("coraAccess", JSON.stringify(rbac.prepared.accessBody.coraAccess))
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-instructor-id": String(scope.instructorId),
  }
  if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

  const response = await fetch(url, { method: "POST", headers, body: form })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  if (!response.ok) {
    throw new ApiError(apiErrorMessage(body, response.status), response.status, body)
  }
  return body as T
}
