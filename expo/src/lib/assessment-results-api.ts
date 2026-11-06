import type { StudentSession } from "./session"
import { studentAuthenticatedRequest } from "./student-api"

export type AiFeedback = {
  score?: number
  status?: string
  statusMessage?: string
  feedback?: string
  suggestions?: string[]
  detailedExplanation?: string
  itemizedIssues?: Array<{ issue?: string; location?: string; fix?: string }>
  criteria?: {
    correctness?: number
    codeQuality?: number
    efficiency?: number
    completeness?: number
    [key: string]: number | undefined
  }
  gradeBreakdown?: {
    reasoning?: string
    strengths?: string[]
    weaknesses?: string[]
    improvements?: string[]
    rubric?: Array<{
      name?: string
      label?: string
      earned?: number
      max?: number
      points?: number
      maxPoints?: number
      score?: number
    }>
    criteria?: {
      [key: string]: number | undefined
    }
  }
  rubric?: Array<{
    name?: string
    label?: string
    earned?: number
    max?: number
    points?: number
    maxPoints?: number
    score?: number
  }>
  requiresManualReview?: boolean
  aiGraded?: boolean
}

export type SampleAnswer = {
  approach: string
  description: string
  code: string
}

export type AssessmentResultQuestion = {
  id?: number
  question_id?: number
  question_order?: number
  question_text?: string
  question_type?: string
  max_points?: number
  points?: number
  points_earned?: number
  is_correct?: boolean
  requires_review?: boolean
  selected_answer?: string | null
  correct_answer?: string | null
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  option_e?: string
  time_spent_seconds?: number | null
  time_limit?: number | null
  ai_feedback?: AiFeedback | null
  answer_data?: unknown
  answer_id?: number
  override_points?: number | null
  section_title?: string
  hint?: string | null
  subquestions?: unknown
  sample_answers?: SampleAnswer[]
  code?: string
  plotImage?: string
  question_media?: unknown
  solution_upload_config?: unknown
  reviewed_at?: string | null
}

/** Drop duplicate result rows that share the same question id or order. */
export function dedupeAssessmentResultQuestions(
  questions: AssessmentResultQuestion[],
): AssessmentResultQuestion[] {
  const seenIds = new Set<string>()
  const seenOrders = new Set<string>()
  const out: AssessmentResultQuestion[] = []
  for (const q of questions) {
    const id = q.question_id ?? q.id
    const order = q.question_order
    if (id != null && seenIds.has(String(id))) continue
    if (order != null && seenOrders.has(String(order))) continue
    if (id != null) seenIds.add(String(id))
    if (order != null) seenOrders.add(String(order))
    out.push(q)
  }
  return out.sort(
    (a, b) => Number(a.question_order ?? 0) - Number(b.question_order ?? 0),
  )
}

export type AssessmentSectionBreakdown = {
  title: string
  earned: number
  max: number
  weightPercent: number
  sectionPercentage: number
}

export type AssessmentAttemptResults = {
  quiz_title?: string
  quiz_id?: number
  assessment_type?: string
  student_name?: string
  score?: number
  total_points?: number
  total_questions?: number
  percentage?: number
  correct_answers?: number
  results_review_locked?: boolean
  questions?: AssessmentResultQuestion[]
  section_breakdown?: AssessmentSectionBreakdown[]
  started_at?: string | null
  completed_at?: string | null
  auto_submitted?: boolean
  violation_reason?: string | null
  should_show_pnd?: boolean
  tab_switch_count?: number
  copy_paste_attempts?: number
  can_continue?: boolean
  pdf_downloaded_at?: string | null
  has_downloaded_pdf?: boolean
  results_finalized?: boolean
  results_finalized_at?: string | null
  results_finalized_by?: string | null
  student_id?: string
  section?: string
}

export const assessmentResultsApi = {
  getAttemptResults: (session: StudentSession, attemptId: number) =>
    studentAuthenticatedRequest<AssessmentAttemptResults>(
      session,
      `/api/student/results/${attemptId}`,
    ),

  markPdfDownloaded: (session: StudentSession, attemptId: number) =>
    studentAuthenticatedRequest<{ success: boolean; pdf_downloaded_at?: string }>(
      session,
      `/api/student/results/${attemptId}/mark-pdf-downloaded`,
      { method: "POST" },
    ),
}
