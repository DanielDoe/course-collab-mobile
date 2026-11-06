import { API_BASE_URL } from "../../constants"

export function buildSyllabusPdfProxyUrl(
  courseId: number,
  opts?: { studentId?: string | null; download?: boolean },
): string {
  const q = new URLSearchParams()
  if (opts?.studentId?.trim()) q.set("studentId", opts.studentId.trim())
  if (opts?.download) q.set("download", "1")
  const qs = q.toString()
  return `${API_BASE_URL}/api/syllabus-pdf/${courseId}${qs ? `?${qs}` : ""}`
}

export function syllabusHasPublishedContent(input: {
  sections?: unknown[]
  pdfUrl?: string | null
  contentMode?: string | null
}): boolean {
  const hasPdf = Boolean(input.pdfUrl?.trim())
  const hasSections = (input.sections?.length ?? 0) > 0
  return hasSections || hasPdf
}

export function syllabusPrefersPdfView(input: {
  sections?: unknown[]
  pdfUrl?: string | null
  contentMode?: string | null
}): boolean {
  const hasPdf = Boolean(input.pdfUrl?.trim())
  if (!hasPdf) return false
  if (input.contentMode === "pdf") return true
  return (input.sections?.length ?? 0) === 0
}
