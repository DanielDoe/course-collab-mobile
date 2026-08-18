import { API_BASE_URL } from "../../constants"
import { ApiError } from "../api"
import { apiErrorMessage } from "../http-errors"
import type { InstructorScope } from "../instructor-content-api"
import type { StudentSession } from "../session"
import type { PreparedCoraRequest } from "../cora-rbac/prepare-request"
import { studentAuthenticatedRequest } from "../student-api"
import { recordActivityFromConfirmResult } from "./activity-store"
import type { CoraActionProposal, CoraConfirmActionResult } from "./types"

function confirmFailureMessage(result: CoraConfirmActionResult): string {
  if (result.error === "in_progress") {
    return result.message || "This action is already being confirmed. Try again in a moment."
  }
  if (result.error === "replay") {
    return result.message || "This action was already completed."
  }
  return result.message
}

function normalizeConfirmResult(parsed: unknown): CoraConfirmActionResult {
  const result = parsed as CoraConfirmActionResult
  if (result.success) return result
  return { ...result, message: confirmFailureMessage(result) }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

/** Confirm a faculty Cora proposal via CourseCollab service layer. */
export async function confirmFacultyCoraAction(
  scope: InstructorScope,
  proposal: CoraActionProposal,
  options?: { prepared?: PreparedCoraRequest },
): Promise<CoraConfirmActionResult> {
  const url = `${API_BASE_URL}/api/instructor/cora/actions/confirm`
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
  }
  if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

  let body: Record<string, unknown> = { proposal }
  if (options?.prepared) {
    body = { ...body, ...options.prepared.accessBody }
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  const parsed = await parseJson(response)
  if (!response.ok) {
    const message = apiErrorMessage(parsed, response.status)
    throw new ApiError(message, response.status, parsed)
  }
  const result = normalizeConfirmResult(parsed)
  await recordActivityFromConfirmResult(result, "faculty", scope.courseId)
  return result
}

/** Confirm a student Cora proposal. Session cookies + MFA trust required — never header-only. */
export async function confirmStudentCoraAction(
  session: StudentSession,
  proposal: CoraActionProposal,
): Promise<CoraConfirmActionResult> {
  const path = `/api/cora/actions/confirm?studentDatabaseId=${encodeURIComponent(session.databaseId)}`
  const parsed = await studentAuthenticatedRequest<unknown>(session, path, {
    method: "POST",
    body: JSON.stringify({ proposal }),
  })
  const result = normalizeConfirmResult(parsed)
  await recordActivityFromConfirmResult(result, "student", session.courseId)
  return result
}

/** Confirm an admin Cora proposal. */
export async function confirmAdminCoraAction(
  adminId: string | number,
  proposal: CoraActionProposal,
  options?: { institutionId?: number | null },
): Promise<CoraConfirmActionResult> {
  const url = `${API_BASE_URL}/api/admin/cora/actions/confirm`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-admin-id": String(adminId),
    },
    body: JSON.stringify({
      proposal,
      ...(options?.institutionId != null ? { institutionId: options.institutionId } : {}),
    }),
  })
  const parsed = await parseJson(response)
  if (!response.ok) {
    const message = apiErrorMessage(parsed, response.status)
    throw new ApiError(message, response.status, parsed)
  }
  const result = normalizeConfirmResult(parsed)
  await recordActivityFromConfirmResult(result, "admin", null)
  return result
}
