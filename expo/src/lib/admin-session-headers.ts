import { ApiError } from "./api"
import { studentHttpCookieHeader } from "./student-http-cookies"
import {
  headersHaveStudentSessionProof,
  STUDENT_REFRESH_HEADER,
} from "./student-session-proof"

function refreshTokenFromCookieHeader(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)cc_refresh=([^;]+)/i)
  const token = match?.[1]?.trim()
  return token || undefined
}

/** Admin claim + refresh/MFA proof. `x-admin-id` is never enough. */
export async function adminAuthenticatedHeaders(
  adminId: string | number,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-admin-id": String(adminId),
  }
  const jarCookie = await studentHttpCookieHeader()
  if (jarCookie) headers.Cookie = jarCookie
  const refresh = refreshTokenFromCookieHeader(jarCookie)
  if (refresh) headers[STUDENT_REFRESH_HEADER] = refresh
  if (!headersHaveStudentSessionProof(headers)) {
    throw new ApiError("Admin authentication required", 401)
  }
  return headers
}
