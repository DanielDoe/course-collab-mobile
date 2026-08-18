import { getStoredSession } from "./session"
import type { StudentSession } from "./session"
import { ApiError, studentAuthenticatedRequest } from "./student-api"

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

async function requireStoredStudentSession(): Promise<StudentSession> {
  const stored = await getStoredSession()
  if (!stored || stored.portal !== "student") {
    throw new ApiError("Student authentication required", 401)
  }
  return stored
}

export const assessmentIssuesApi = {
  list: (session: StudentSession, assessmentType: string, status: "open" | "closed") => {
    const params = new URLSearchParams({
      status,
      studentId: session.id,
      assessmentType,
      studentDatabaseId: session.databaseId})
    if (session.courseId != null) params.set("courseId", String(session.courseId))
    return studentAuthenticatedRequest<{ issues: AssessmentIssue[] }>(
      session,
      `/api/student/issues?${params}`,
    )
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
    studentAuthenticatedRequest<{ issue: AssessmentIssue }>(session, "/api/student/issues", {
      method: "POST",
      body: JSON.stringify({
        quizId: payload.quizId,
        quizTitle: payload.quizTitle,
        questionNumber: payload.questionNumber ?? null,
        description: payload.description,
        reporterName: session.name,
        reporterId: session.id,
        assessmentType: payload.assessmentType})}),

  getComments: async (issueId: number) => {
    const session = await requireStoredStudentSession()
    return studentAuthenticatedRequest<{ comments: IssueComment[] }>(
      session,
      `/api/student/issues/${issueId}/comments`,
    )
  },

  addComment: (session: StudentSession, issueId: number, commentText: string) =>
    studentAuthenticatedRequest<{ comment: IssueComment }>(
      session,
      `/api/student/issues/${issueId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({
          commenterName: session.name,
          commenterId: session.id,
          commenterRole: "student",
          commentText})})}
