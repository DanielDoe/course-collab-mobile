import { API_BASE_URL } from "../constants"
import type { InstructorLecture } from "./instructor-api"
import type { StudentSession } from "./session"
import { studentAuthenticatedHeaders } from "./student-api"

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

/** Merge viewer/content payload deck URLs onto a list lecture (content uses camelCase). */
export function mergeLectureDeckFromContent(
  lecture: InstructorLecture,
  content: Record<string, unknown>,
): InstructorLecture {
  const nested =
    content.lecture && typeof content.lecture === "object"
      ? (content.lecture as InstructorLecture)
      : null
  const pdfUrl =
    stringField(content.pdfUrl) ??
    stringField(content.pdf_url) ??
    nested?.pdf_url ??
    lecture.pdf_url ??
    null
  const documentUrl =
    stringField(content.document_url) ??
    stringField(content.originalFileUrl) ??
    stringField(content.original_file_url) ??
    nested?.document_url ??
    lecture.document_url ??
    null
  return { ...lecture, ...nested, pdf_url: pdfUrl, document_url: documentUrl }
}

export function resolveLectureDeckUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `${API_BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`
}

export function buildAuthenticatedDeckSource(
  url: string | null | undefined,
  scope?: { instructorId: number; courseId?: number | null },
): { uri: string; headers?: Record<string, string> } | null {
  const uri = resolveLectureDeckUrl(url)
  if (!uri) return null

  if (!scope || !uri.startsWith(API_BASE_URL)) {
    return { uri }
  }

  const headers: Record<string, string> = {
    "x-instructor-id": String(scope.instructorId),
  }
  if (scope.courseId != null) {
    headers["x-course-id"] = String(scope.courseId)
  }
  return { uri, headers }
}

export async function buildStudentAuthenticatedDeckSource(
  url: string | null | undefined,
  session: StudentSession,
): Promise<{ uri: string; headers?: Record<string, string> } | null> {
  const uri = resolveLectureDeckUrl(url)
  if (!uri) return null

  if (uri.startsWith(API_BASE_URL)) {
    return {
      uri,
      headers: await studentAuthenticatedHeaders(session),
    }
  }

  return { uri }
}
