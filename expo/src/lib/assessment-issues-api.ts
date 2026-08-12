import { API_BASE_URL } from "../constants"
import type { StudentSession } from "./session"
import { ApiError } from "./student-api"

export type AssessmentIssue = {
  id: number
  quiz_id: number
  quiz_title: string
  question_number: number | null
  description: string
  status: "open" | "closed"
  reporter_name: string
  reporter_id: string
  created_at: string
  comment_count?: number
}

export type IssueComment = {
  id: number
  commenter_name: string
  commenter_role: "student" | "admin" | string
  comment_text: string
  created_at: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, init)
  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }
  return body as T
}

export const assessmentIssuesApi = {
  list: (session: StudentSession, assessmentType: string, status: "open" | "closed") => {
    const params = new URLSearchParams({
      status,
      studentId: session.id,
      assessmentType,
      studentDatabaseId: session.databaseId})
    if (session.courseId != null) params.set("courseId", String(session.courseId))
    return request<{ issues: AssessmentIssue[] }>(`/api/student/issues?${params}`)
  },

  create: (
    session: StudentSession,
    payload: {
      quizId: number
      quizTitle: string
      questionNumber?: number | null
      description: string
      assessmentType: string
    },
  ) =>
    request<{ issue: AssessmentIssue }>("/api/student/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId: payload.quizId,
        quizTitle: payload.quizTitle,
        questionNumber: payload.questionNumber ?? null,
        description: payload.description,
        reporterName: session.name,
        reporterId: session.id,
        assessmentType: payload.assessmentType})}),

  getComments: (issueId: number) =>
    request<{ comments: IssueComment[] }>(`/api/student/issues/${issueId}/comments`),

  addComment: (session: StudentSession, issueId: number, commentText: string) =>
    request<{ comment: IssueComment }>(`/api/student/issues/${issueId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commenterName: session.name,
        commenterId: session.id,
        commenterRole: "student",
        commentText})})}
