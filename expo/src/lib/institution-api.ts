import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { extractApiErrorMessage } from "./api-error-message"
import { assertProductionHttpsUrl, createApiAbortSignal } from "./http"
import { mfaTrustRequestHeadersForInstructor } from "./mfa-device-trust"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { getStoredRefreshToken } from "./refresh-token-store"
import { STUDENT_REFRESH_HEADER } from "./student-session-proof"

export type InstitutionMe = {
  id: number
  name: string
  role: string
}

export type InstitutionAnalyticsSection =
  | "overview"
  | "engagement"
  | "learning"
  | "ai_assistance"
  | "independent"
  | "cognitive"
  | "assessment"
  | "interventions"
  | "student_success"
  | "feedback"
  | "equity"
  | "data_quality"
  | "research"
  | "questions"

export const INSTITUTION_ANALYTICS_SECTIONS: Array<{ id: InstitutionAnalyticsSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "questions", label: "Research Questions" },
  { id: "engagement", label: "Engagement" },
  { id: "learning", label: "Learning" },
  { id: "ai_assistance", label: "AI Assistance" },
  { id: "independent", label: "Independent Performance" },
  { id: "cognitive", label: "Cognitive Engagement" },
  { id: "assessment", label: "Assessment" },
  { id: "feedback", label: "Feedback" },
  { id: "interventions", label: "Interventions" },
  { id: "student_success", label: "Student Success" },
  { id: "equity", label: "Equity" },
  { id: "data_quality", label: "Data Quality" },
  { id: "research", label: "Research" },
]

const SECTION_TABS: Record<InstitutionAnalyticsSection, string[]> = {
  overview: ["overview"],
  questions: ["questions"],
  engagement: ["engagement"],
  learning: ["learning"],
  ai_assistance: ["cora"],
  independent: ["independent"],
  cognitive: ["cognitive"],
  assessment: ["assessments"],
  feedback: ["feedback"],
  interventions: ["interventions"],
  student_success: ["student_success"],
  equity: ["equity"],
  data_quality: ["data_quality"],
  research: ["research"],
}

async function institutionHeaders(): Promise<Record<string, string>> {
  const refresh = await getStoredRefreshToken()
  const jar = await studentHttpCookieHeader()
  const mfa = await mfaTrustRequestHeadersForInstructor()
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...mergeCookieHeaders(jar, mfa),
  }
  if (refresh) headers[STUDENT_REFRESH_HEADER] = refresh
  return headers
}

async function institutionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  assertProductionHttpsUrl(url)
  const headers = await institutionHeaders()
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    credentials: "include",
    signal: createApiAbortSignal(),
  })
  await persistHttpCookiesFromResponse(res)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(extractApiErrorMessage(body, res.status), res.status, body)
  }
  return res.json() as Promise<T>
}

export async function fetchInstitutionMe(): Promise<InstitutionMe | null> {
  try {
    const body = await institutionFetch<{
      institutionId?: number
      institutionName?: string
      role?: string
    }>("/api/institution/me")
    if (!body.institutionId) return null
    return {
      id: body.institutionId,
      name: body.institutionName ?? "Institution",
      role: body.role ?? "institution_admin",
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export async function fetchInstitutionAnalyticsTab(
  tab: string,
  params: { preset?: string; courseId?: number; organizationUnitId?: number } = {},
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ tab, preset: params.preset ?? "last_30_days" })
  if (params.courseId) qs.set("courseId", String(params.courseId))
  if (params.organizationUnitId) qs.set("organizationUnitId", String(params.organizationUnitId))
  return institutionFetch(`/api/institution/analytics?${qs.toString()}`)
}

export async function fetchInstitutionAnalyticsSection(
  section: InstitutionAnalyticsSection,
  preset = "last_30_days",
): Promise<Record<string, unknown>> {
  const tabs = SECTION_TABS[section]
  const results = await Promise.all(tabs.map((tab) => fetchInstitutionAnalyticsTab(tab, { preset })))
  const payload: Record<string, unknown> = {}
  tabs.forEach((tab, i) => {
    payload[tab] = results[i]
  })
  return payload
}

export async function fetchInstitutionCoraModule(): Promise<Record<string, unknown>> {
  return institutionFetch("/api/institution/cora")
}

export async function fetchInstitutionAnalyticsFilters(): Promise<{
  courses: Array<{ id: number; code: string; name: string }>
  organizationUnits: Array<{ id: number; name: string }>
  instructors: Array<{ id: number; name: string }>
}> {
  return institutionFetch("/api/institution/analytics/filters")
}
