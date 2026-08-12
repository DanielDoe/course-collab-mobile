import { API_BASE_URL } from "../constants"
import type { SurveyFormState } from "../constants/course-evaluation-survey"
import { ApiError } from "./student-api"
import type { StudentSession } from "./session"

export type CourseEvaluationProof = {
  id: number
  url: string
  file_name?: string | null
  mime?: string | null
  uploaded_at?: string | null
}

export type CourseEvaluationStatus = "draft" | "pending" | "approved" | "rejected" | string

export type CourseEvaluation = {
  id: number
  course_rating: number
  platform_helpfulness?: number | null
  favorite_features?: string[] | null
  favorite_features_other?: string | null
  feature_to_improve?: string | null
  feature_to_improve_other?: string | null
  improvement_suggestions: string
  instructor_clarity?: number | null
  workload?: string | null
  ai_tutor_usage?: string | null
  nps_score?: number | null
  missing_features?: string | null
  self_assessed_letter_grade?: string | null
  status: CourseEvaluationStatus
  instructor_note?: string | null
  submitted_at?: string | null
  reviewed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  proofs?: CourseEvaluationProof[]
}

export type CourseEvaluationGetResponse = {
  success?: boolean
  evaluation: CourseEvaluation | null
  engagementCreditsOnApproval?: number
}

export type PendingProofFile = {
  uri: string
  name: string
  mime: string
}

export type CourseEvaluationSubmitPayload = {
  survey: SurveyFormState
  selfAssessedGrade: string
  files: PendingProofFile[]
}

function studentAuthHeaders(session: StudentSession): Record<string, string> {
  return {
    Accept: "application/json",
    "x-student-id": session.databaseId,
    "x-student-session": session.section,
  }
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function errorMessage(body: unknown, status: number): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error
  }
  return `Request failed (${status})`
}

export function evaluationToSurvey(e: CourseEvaluation): SurveyFormState {
  return {
    overallExperience: e.course_rating || 0,
    platformHelpfulness: e.platform_helpfulness || 0,
    favoriteFeatures: e.favorite_features ?? [],
    favoriteFeaturesOther: e.favorite_features_other || "",
    featureToImprove: e.feature_to_improve || "",
    featureToImproveOther: e.feature_to_improve_other || "",
    openFeedback: e.improvement_suggestions || "",
    instructorClarity: e.instructor_clarity || 0,
    workload: e.workload || "",
    aiTutorUsage: e.ai_tutor_usage || "",
    npsScore: e.nps_score ?? null,
    missingFeatures: e.missing_features || "",
  }
}

export function resolveProofUrl(url: string): string {
  if (!url) return url
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file:")) return url
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`
}

export const courseEvaluationApi = {
  get: async (session: StudentSession): Promise<CourseEvaluationGetResponse> => {
    const qs = new URLSearchParams({
      studentId: session.databaseId,
      session: session.section || "ALL",
    })
    const url = `${API_BASE_URL}/api/student/course-evaluation?${qs.toString()}`
    const response = await fetch(url, {
      method: "GET",
      headers: studentAuthHeaders(session),
    })
    const body = await parseJsonBody(response)
    if (!response.ok) {
      throw new ApiError(errorMessage(body, response.status), response.status, body)
    }
    const data = (body ?? {}) as CourseEvaluationGetResponse
    return {
      success: data.success ?? true,
      evaluation: data.evaluation ?? null,
      engagementCreditsOnApproval: data.engagementCreditsOnApproval ?? 50,
    }
  },

  submit: async (
    session: StudentSession,
    payload: CourseEvaluationSubmitPayload,
  ): Promise<{ evaluation: CourseEvaluation; proofs?: CourseEvaluationProof[] }> => {
    const { survey, selfAssessedGrade, files } = payload
    const form = new FormData()
    form.append("studentId", session.databaseId)
    form.append("session", session.section || "ALL")
    form.append("overallExperience", String(survey.overallExperience))
    form.append("platformHelpfulness", String(survey.platformHelpfulness))
    for (const feature of survey.favoriteFeatures) {
      form.append("favoriteFeatures", feature)
    }
    if (survey.favoriteFeaturesOther.trim()) {
      form.append("favoriteFeaturesOther", survey.favoriteFeaturesOther.trim())
    }
    form.append("featureToImprove", survey.featureToImprove)
    if (survey.featureToImproveOther.trim()) {
      form.append("featureToImproveOther", survey.featureToImproveOther.trim())
    }
    form.append("openFeedback", survey.openFeedback.trim())
    form.append("selfAssessedLetterGrade", selfAssessedGrade)
    if (survey.instructorClarity > 0) {
      form.append("instructorClarity", String(survey.instructorClarity))
    }
    if (survey.workload) form.append("workload", survey.workload)
    if (survey.aiTutorUsage) form.append("aiTutorUsage", survey.aiTutorUsage)
    if (survey.npsScore != null) form.append("npsScore", String(survey.npsScore))
    if (survey.missingFeatures.trim()) {
      form.append("missingFeatures", survey.missingFeatures.trim())
    }
    for (const file of files) {
      form.append("files", {
        uri: file.uri,
        name: file.name,
        type: file.mime,
      } as unknown as Blob)
    }

    const url = `${API_BASE_URL}/api/student/course-evaluation`
    const response = await fetch(url, {
      method: "POST",
      headers: studentAuthHeaders(session),
      body: form,
    })
    const body = await parseJsonBody(response)
    if (!response.ok) {
      throw new ApiError(errorMessage(body, response.status), response.status, body)
    }
    const data = body as {
      evaluation?: CourseEvaluation
      proofs?: CourseEvaluationProof[]
    }
    if (!data.evaluation) {
      throw new ApiError("Submit succeeded but no evaluation was returned.", response.status, body)
    }
    return { evaluation: data.evaluation, proofs: data.proofs }
  },
}
