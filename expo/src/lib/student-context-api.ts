import type { StudentSession } from "./session"
import { ApiError } from "./student-api"
import { API_BASE_URL } from "../constants"

export type StudentMembershipTier = "Scholar" | "Explorer" | "Trailblazer"

export type StudentAssessmentRow = {
  id: string
  title: string
  type: string
  dueDate?: string | null
  status: string
  score?: number | null
  bestScore?: number | null
  completedAt?: string | null
}

export type StudentGradeBreakdownRow = {
  category: string
  title: string
  score?: string | null
  status?: string | null
  completedAt?: string | null
}

export type StudentKnowledgeGraph = {
  updatedAt: string
  topics: { id: string; label: string; status: string; mastery?: number }[]
  assessments: StudentAssessmentRow[]
  calendar: { id: string; title: string; start: string; eventType?: string | null }[]
  lectures: { id: string; title: string; week?: number | null; status?: string | null }[]
  notifications: { id: number; title: string; isRead: boolean; createdAt: string }[]
  summary: string
}

export type StudentContextPayload = {
  profile?: Record<string, unknown>
  account?: {
    studentDbId: number
    studentCode?: string | null
    fullName?: string | null
    section?: string | null
    courseCode?: string | null
    courseTitle?: string | null
  }
  membership?: {
    tier: StudentMembershipTier
    aiTutorCredits: number
    trialDaysRemaining?: number | null
  }
  grades?: {
    session?: string | null
    totalScore?: number | null
    quizScore?: number | null
    homeworkScore?: number | null
    midtermScore?: number | null
    finalScore?: number | null
    attendanceScore?: number | null
    engagementCredits?: number | null
  }[]
  announcements?: { id: string; title: string; createdAt?: string | null }[]
  flashcardDecks?: { id: string; title: string; cardCount?: number }[]
  digitalNotes?: { id: string; title: string; updatedAt?: string | null }[]
  strugglingTopics?: string[]
  strengths?: string[]
  topicMastery?: { topic: string; mastery: number; status?: string }[]
  calendarEvents?: StudentKnowledgeGraph["calendar"]
  upcomingAssessments?: StudentAssessmentRow[]
  missedDeadlines?: StudentAssessmentRow[]
  /** Completed assessments with scores — live from quizzes + assessment history. */
  assessmentResults?: StudentAssessmentRow[]
  /** On-demand grade breakdown fetched when the student asks about scores. */
  liveGradeBreakdown?: StudentGradeBreakdownRow[]
  knowledgeGraph?: StudentKnowledgeGraph
  summary?: Record<string, number>
  syncedAt?: string
  /** When live platform APIs were queried for this payload. */
  liveLookupAt?: string
}

export async function fetchStudentContext(
  session: StudentSession,
): Promise<StudentContextPayload> {
  const url = `${API_BASE_URL}/api/ai-tutor/student-context`
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-student-id": session.databaseId,
    },
  })

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

  return body as StudentContextPayload
}
