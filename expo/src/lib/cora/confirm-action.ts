import { API_BASE_URL } from "../../constants"
import { ApiError } from "../api"
import { apiErrorMessage } from "../http-errors"
import type { InstructorScope } from "../instructor-content-api"
import type { StudentSession } from "../session"
import type { PreparedCoraRequest } from "../cora-rbac/prepare-request"
import { recordActivityFromConfirmResult } from "./activity-store"
import type { CoraActionProposal, CoraConfirmActionResult } from "./types"

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
  const result = parsed as CoraConfirmActionResult
  await recordActivityFromConfirmResult(result, "faculty", scope.courseId)
  return result
}

/** Confirm a student Cora proposal. */
export async function confirmStudentCoraAction(
  session: StudentSession,
  proposal: CoraActionProposal,
): Promise<CoraConfirmActionResult> {
  const url = `${API_BASE_URL}/api/cora/actions/confirm?studentDatabaseId=${encodeURIComponent(session.databaseId)}`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-student-id": session.databaseId,
    },
    body: JSON.stringify({ proposal }),
  })
  const parsed = await parseJson(response)
  if (!response.ok) {
    const message = apiErrorMessage(parsed, response.status)
    throw new ApiError(message, response.status, parsed)
  }
  const result = parsed as CoraConfirmActionResult
  await recordActivityFromConfirmResult(result, "student", session.courseId)
  return result
}
