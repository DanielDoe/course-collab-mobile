import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { apiErrorMessage, isApiRouteMissingError } from "./http-errors"
import type { InstructorScope } from "./instructor-content-api"
import type { FacultySession, StudentSession } from "./session"
import type { PreparedCoraRequest } from "./cora-rbac/prepare-request"
import type { CoraCreationPayloadByKind } from "./cora-creation-schemas"

export type CoraGithubFixPayload = CoraCreationPayloadByKind["github_fix_pr"]

export type CoraGithubFixResult = {
  success: boolean
  message: string
  pullRequestUrl?: string
  pullRequestNumber?: number
  branchName?: string
}

type SubmitArgs = {
  scope?: InstructorScope
  session?: FacultySession
  studentSession?: StudentSession
  prepared?: PreparedCoraRequest
  payload: CoraGithubFixPayload
}

/**
 * Submit a Cora-generated code fix to GitHub via the CourseCollab backend.
 * Backend creates a branch, commits files, opens a PR, and triggers deploy preview when configured.
 */
export async function submitCoraGithubFix(args: SubmitArgs): Promise<CoraGithubFixResult> {
  const url = `${API_BASE_URL}/api/cora/github/submit-fix`
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  if (args.scope?.instructorId != null) {
    headers["x-instructor-id"] = String(args.scope.instructorId)
  }
  if (args.scope?.courseId != null) {
    headers["x-course-id"] = String(args.scope.courseId)
  }
  if (args.studentSession?.databaseId) {
    headers["x-student-id"] = args.studentSession.databaseId
  }

  let body: Record<string, unknown> = {
    title: args.payload.title,
    description: args.payload.description,
    branchName: args.payload.branchName,
    files: args.payload.files,
    labels: args.payload.labels,
    linkedIssue: args.payload.linkedIssue,
  }
  if (args.prepared) {
    body = { ...body, ...args.prepared.accessBody }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
    const text = await response.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { error: text }
      }
    }
    if (!response.ok) {
      throw new ApiError(apiErrorMessage(parsed, response.status), response.status, parsed)
    }

    const res = parsed as {
      success?: boolean
      message?: string
      pullRequestUrl?: string
      pullRequestNumber?: number
      branchName?: string
    }

    return {
      success: res.success ?? true,
      message: res.message ?? "Pull request submitted for review.",
      pullRequestUrl: res.pullRequestUrl,
      pullRequestNumber: res.pullRequestNumber,
      branchName: res.branchName,
    }
  } catch (err) {
    if (err instanceof ApiError && isApiRouteMissingError(err.status, err.message)) {
      return {
        success: false,
        message:
          "GitHub fix submission is not enabled on this server yet. Ask your admin to configure /api/cora/github/submit-fix.",
      }
    }
    if (err instanceof ApiError) {
      return { success: false, message: err.message }
    }
    return { success: false, message: "Could not submit GitHub fix." }
  }
}

/** Check whether GitHub integration is available for Cora code fixes. */
export async function getCoraGithubStatus(scope?: InstructorScope): Promise<{ enabled: boolean }> {
  const url = `${API_BASE_URL}/api/cora/github/status`
  const headers: Record<string, string> = { Accept: "application/json" }
  if (scope?.instructorId != null) headers["x-instructor-id"] = String(scope.instructorId)

  try {
    const response = await fetch(url, { headers })
    if (!response.ok) return { enabled: false }
    const body = (await response.json()) as { enabled?: boolean }
    return { enabled: Boolean(body.enabled) }
  } catch {
    return { enabled: false }
  }
}
