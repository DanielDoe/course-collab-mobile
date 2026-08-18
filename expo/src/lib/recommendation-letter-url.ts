import { API_BASE_URL } from "../constants"
import { instructorAuthenticatedHeaders } from "./instructor-api"
import { studentAuthenticatedHeaders } from "./student-api"
import type { StudentAuthSession } from "./student-session-proof"

type PdfFileRef = { pdf_url?: string | null; file_url?: string | null }

type PdfRequestRef = {
  latest_pdf_url?: string | null
  status?: string | null
  final_letter_text?: string | null
}

export type RecommendationPdfSource = {
  uri: string
  headers?: Record<string, string>
}

/** True when the backend has finalized letter file metadata (or terminal download states). */
export function hasRecommendationLetterPdf(
  files?: PdfFileRef[] | null,
  request?: PdfRequestRef | null,
): boolean {
  if (files?.some((file) => file.pdf_url || file.file_url)) return true
  if (request?.latest_pdf_url) return true
  if (String(request?.final_letter_text ?? "").trim()) return true
  return ["finalized", "downloaded"].includes(String(request?.status ?? ""))
}

/** Instructor can preview letterhead PDF once the request is approved and letter text exists. */
export function instructorCanPreviewRecommendationLetter(
  request?: PdfRequestRef | null,
  editedText?: string,
): boolean {
  if (String(request?.status ?? "") === "requested") return false
  if (String(request?.status ?? "") === "rejected") return false
  const text = (editedText ?? request?.final_letter_text ?? "").trim()
  return text.length > 0
}

export function buildRecommendationPdfApiPath(requestId: number, studentId: string | number): string {
  return `/api/student/recommendations/${requestId}/pdf?studentId=${encodeURIComponent(String(studentId))}`
}

/** Authenticated PDF source for WebView preview and file download. */
export async function buildRecommendationPdfSource(
  session: StudentAuthSession,
  requestId: number,
): Promise<RecommendationPdfSource> {
  const path = buildRecommendationPdfApiPath(requestId, session.databaseId)
  return {
    uri: `${API_BASE_URL}${path}`,
    headers: await studentAuthenticatedHeaders(session),
  }
}

/** Instructor letterhead PDF — generated on demand from saved final_letter_text. */
export async function buildInstructorRecommendationPdfSource(
  scope: { instructorId: number; courseId?: number },
  requestId: number,
): Promise<RecommendationPdfSource> {
  return {
    uri: `${API_BASE_URL}/api/instructor/recommendations/${requestId}/pdf`,
    headers: await instructorAuthenticatedHeaders(scope),
  }
}
