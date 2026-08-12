import { API_BASE_URL } from "../constants"
import type { StudentSession } from "./session"

type PdfFileRef = { pdf_url?: string | null; file_url?: string | null }

type PdfRequestRef = {
  latest_pdf_url?: string | null
  status?: string | null
}

/** True when the backend has finalized letter file metadata (or terminal download states). */
export function hasRecommendationLetterPdf(
  files?: PdfFileRef[] | null,
  request?: PdfRequestRef | null,
): boolean {
  if (files?.some((file) => file.pdf_url || file.file_url)) return true
  if (request?.latest_pdf_url) return true
  return ["finalized", "downloaded"].includes(String(request?.status ?? ""))
}

export function buildRecommendationPdfApiPath(requestId: number, studentId: string | number): string {
  return `/api/student/recommendations/${requestId}/pdf?studentId=${encodeURIComponent(String(studentId))}`
}

/** Authenticated PDF source for WebView preview and file download. */
export function buildRecommendationPdfSource(
  session: Pick<StudentSession, "databaseId">,
  requestId: number,
): { uri: string; headers: Record<string, string> } {
  const path = buildRecommendationPdfApiPath(requestId, session.databaseId)
  return {
    uri: `${API_BASE_URL}${path}`,
    headers: { "x-student-id": String(session.databaseId) },
  }
}
