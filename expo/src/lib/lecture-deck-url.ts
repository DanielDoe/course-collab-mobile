import { API_BASE_URL } from "../constants"

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

export function buildStudentAuthenticatedDeckSource(
  url: string | null | undefined,
  session: { databaseId: string },
): { uri: string; headers?: Record<string, string> } | null {
  const uri = resolveLectureDeckUrl(url)
  if (!uri) return null

  if (uri.startsWith(API_BASE_URL)) {
    return {
      uri,
      headers: { "x-student-id": session.databaseId },
    }
  }

  return { uri }
}
