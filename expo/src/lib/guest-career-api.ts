import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import type { GuestSession } from "./session"
import { studentAuthenticatedHeaders } from "./student-api"

// ---------------------------------------------------------------------------
// Types — mirror lib/guest/career/types.ts in the web app (v0-coursecollabv3),
// simplified to the fields the mobile screens render. Keep names aligned.
// ---------------------------------------------------------------------------

export type OpportunityType =
  | "JOB"
  | "INTERNSHIP"
  | "GRADUATE_PROGRAM"
  | "SCHOLARSHIP"
  | "FELLOWSHIP"
  | "RESEARCH"
  | "ACADEMIC_POSITION"
  | "OTHER"

export type ApplicationStatus =
  | "SAVED"
  | "PREPARING"
  | "READY"
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN"

export type ArtifactStatus = "NOT_STARTED" | "DRAFT" | "READY"

export type MatchBand =
  | "NEEDS_ALIGNMENT"
  | "DEVELOPING_MATCH"
  | "STRONG_MATCH"
  | "EXCELLENT_ALIGNMENT"

export type CareerAccessTier = "preview" | "full"

export type ProvenanceRef = {
  sourceSection: string
  sourceText: string
}

export type SkillEvidenceItem = {
  label: string
  level: "EXPLICIT_MATCH" | "SEMANTIC_MATCH" | "PARTIAL" | "NOT_FOUND"
  evidence: ProvenanceRef[]
  guidance?: string
  /** Preview tier — label/evidence withheld until unlock. */
  locked?: boolean
}

export type RequirementCheckItem = {
  label: string
  level: "demonstrated" | "partial" | "not_demonstrated"
  evidence: ProvenanceRef[]
  guidance?: string
  locked?: boolean
}

export type AtsReadabilityFinding = {
  kind: "pass" | "attention"
  message: string
  locked?: boolean
}

export type AtsReadabilityReport = {
  score: number
  findings: AtsReadabilityFinding[]
}

export type MatchDimensionScores = {
  skillsMatch: number
  experienceAlignment: number
  roleTitleAlignment: number
  educationQualifications: number
  keywordCoverage: number
  resumeImpact: number
  atsReadability: number
}

export type CareerAnalysis = {
  id: number
  applicationId: number | null
  overallScore: number
  matchBand: MatchBand
  dimensionScores: MatchDimensionScores
  summary: string
  topImprovements: string[]
  skillEvidence: {
    matched: SkillEvidenceItem[]
    partial: SkillEvidenceItem[]
    notDemonstrated: SkillEvidenceItem[]
  }
  requirements: RequirementCheckItem[]
  atsReadability: AtsReadabilityReport
  createdAt: string
}

export type ResumeProfile = {
  id: number
  isMaster: boolean
  label: string | null
  originalFileName: string | null
  originalFileUrl: string | null
  originalMime: string | null
  parsedText: string
  createdAt: string
  updatedAt: string
}

export type OpportunityProfile = {
  id: number
  type: OpportunityType
  organization: string | null
  title: string
  description: string
  location: string | null
  deadline: string | null
  createdAt: string
  updatedAt: string
}

export type ApplicationWorkspace = {
  id: number
  opportunityId: number
  opportunity: OpportunityProfile
  masterResumeId: number | null
  status: ApplicationStatus
  matchScore: number | null
  matchBand: MatchBand | null
  coverLetterStatus: ArtifactStatus
  interviewPrepStatus: ArtifactStatus
  appliedAt: string | null
  notes: string | null
  latestAnalysisId: number | null
  createdAt: string
  updatedAt: string
}

export type CoverLetter = {
  id: number
  applicationId: number
  body: string
  tone: string
  status: ArtifactStatus
  /** Present when the letter body is gated for preview-tier guests. */
  lockedParagraphCount?: number
  totalParagraphCount?: number
  createdAt: string
  updatedAt: string
}

export type CoverLetterTone = "professional" | "warm"

export type ComplimentaryMatchStatus = {
  limit: number
  used: number
  remaining: number
}

/** Spread into every gated response by the web careerAccessMeta helper. */
export type CareerAccessMeta = {
  accessTier: CareerAccessTier
  upgradeUrl: string
  previewNote: string | null
}

export type CareerIssueCounts = {
  missingSkills?: number
  partialSkills?: number
  atsIssues?: number
} & Record<string, unknown>

export type CareerMatchResponse = CareerAccessMeta & {
  complimentaryResumeMatches?: ComplimentaryMatchStatus
  resumeMatchCreditCost?: number
  creditsCharged?: number
  creditsRemaining?: number
  fromCache: boolean
  issueCounts: CareerIssueCounts | null
  application: ApplicationWorkspace
  analysis: CareerAnalysis
  resume: ResumeProfile
  opportunity: OpportunityProfile
}

export type CareerCoverLetterResponse = CareerAccessMeta & {
  application: ApplicationWorkspace
  resume: ResumeProfile
  opportunity: OpportunityProfile
  coverLetter: CoverLetter
}

/** Mirrors ResumeOptimizeResult in lib/guest/career/optimize-engine.ts. */
export type ResumeOptimizeResult = {
  revisedSummary: string
  keywordAdditions: Array<{ keyword: string; section: string; suggestion: string }>
  bulletRewrites: Array<{ original: string; revised: string; reason: string }>
  skillsToAdd: string[]
  atsFixes: string[]
  revisedResumeText: string
}

export type CareerOptimizeResponse = {
  result: ResumeOptimizeResult
  analysisId: number
  applicationId: number | null
  opportunityTitle: string | null
  organization: string | null
  matchScore: number
  creditsCharged?: number
  creditsRemaining?: number
}

export type CareerResumesResponse = CareerAccessMeta & {
  resumes: ResumeProfile[]
  masterResume: ResumeProfile | null
}

export type CareerScanHistoryItem = {
  id: number
  applicationId: number | null
  overallScore: number
  matchBand: string
  createdAt: string
  opportunityTitle: string | null
  organization: string | null
}

export type CoverLetterHistoryItem = {
  id: number
  applicationId: number
  tone: string
  status: string
  updatedAt: string
  preview: string
  opportunityTitle: string | null
  organization: string | null
}

export type CareerHistoryResponse = {
  scans: CareerScanHistoryItem[]
  coverLetters: CoverLetterHistoryItem[]
}

export type CareerApplicationsResponse = CareerAccessMeta & {
  applications: ApplicationWorkspace[]
}

export type CareerApplicationDetailResponse = CareerAccessMeta & {
  issueCounts: CareerIssueCounts | null
  application: ApplicationWorkspace
  analysis: CareerAnalysis | null
}

// ---------------------------------------------------------------------------
// Gate/error classification — 402 needsCredits, 403 upgrade, 400 needsResume.
// ---------------------------------------------------------------------------

export type CareerGateKind = "credits" | "upgrade" | "resume" | "error"

export type CareerGateInfo = {
  kind: CareerGateKind
  message: string
  creditCost?: number
  creditsAvailable?: number
  complimentary?: ComplimentaryMatchStatus
}

function detailField<T>(details: unknown, key: string): T | undefined {
  if (details && typeof details === "object" && key in details) {
    return (details as Record<string, unknown>)[key] as T
  }
  return undefined
}

/** Turn any thrown error into a renderable notice for the career screens. */
export function classifyCareerError(err: unknown): CareerGateInfo {
  if (err instanceof ApiError) {
    const details = err.details
    if (err.status === 402 || detailField<boolean>(details, "needsCredits") === true) {
      return {
        kind: "credits",
        message: err.message,
        creditCost: detailField<number>(details, "creditCost"),
        creditsAvailable: detailField<number>(details, "creditsAvailable"),
      }
    }
    if (err.status === 403) {
      return {
        kind: "upgrade",
        message: err.message,
        complimentary: detailField<ComplimentaryMatchStatus>(details, "complimentaryResumeMatches"),
      }
    }
    if (detailField<boolean>(details, "needsResume") === true) {
      return { kind: "resume", message: err.message }
    }
    return { kind: "error", message: err.message }
  }
  return { kind: "error", message: err instanceof Error ? err.message : "Something went wrong." }
}

// ---------------------------------------------------------------------------
// Request helpers — same auth pattern as guest-api.ts (query param + header).
// ---------------------------------------------------------------------------

function careerUrl(session: GuestSession, path: string): string {
  const separator = path.includes("?") ? "&" : "?"
  return `${API_BASE_URL}${path}${separator}studentDatabaseId=${encodeURIComponent(session.databaseId)}`
}

async function parseCareerResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      throw new ApiError("Career API returned an invalid response", response.status || 500)
    }
  }
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }
  return body as T
}

async function careerRequest<T>(session: GuestSession, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(careerUrl(session, path), {
    ...init,
    credentials: "include",
    headers: {
      ...(await studentAuthenticatedHeaders(session)),
      ...(init.headers ?? {}),
    },
  })
  return parseCareerResponse<T>(response)
}

function jsonInit(payload: Record<string, unknown>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export type CareerResumeFilePart = {
  uri: string
  name: string
  type: string
}

export type RunCareerMatchInput = {
  opportunityDescription: string
  /** Paste-in résumé text — also updates the master résumé server-side. */
  parsedText?: string
  /** Analyze against the stored master résumé. */
  useMasterResume?: boolean
  opportunityType?: OpportunityType
  organization?: string
  opportunityTitle?: string
}

export const guestCareerApi = {
  runMatch: (session: GuestSession, input: RunCareerMatchInput) =>
    careerRequest<CareerMatchResponse>(
      session,
      "/api/guest/career/match",
      jsonInit({
        studentDatabaseId: session.databaseId,
        opportunityDescription: input.opportunityDescription,
        ...(input.parsedText ? { parsedText: input.parsedText } : {}),
        ...(input.useMasterResume ? { useMasterResume: true } : {}),
        ...(input.opportunityType ? { opportunityType: input.opportunityType } : {}),
        ...(input.organization ? { organization: input.organization } : {}),
        ...(input.opportunityTitle ? { opportunityTitle: input.opportunityTitle } : {}),
      }),
    ),

  generateCoverLetter: (
    session: GuestSession,
    input: {
      opportunityDescription: string
      parsedText?: string
      tone?: CoverLetterTone
      organization?: string
      opportunityTitle?: string
    },
  ) =>
    careerRequest<CareerCoverLetterResponse>(
      session,
      "/api/guest/career/cover-letter",
      jsonInit({
        studentDatabaseId: session.databaseId,
        opportunityDescription: input.opportunityDescription,
        ...(input.parsedText ? { parsedText: input.parsedText } : {}),
        tone: input.tone ?? "professional",
        ...(input.organization ? { organization: input.organization } : {}),
        ...(input.opportunityTitle ? { opportunityTitle: input.opportunityTitle } : {}),
      }),
    ),

  getCoverLetter: (session: GuestSession, applicationId: number) =>
    careerRequest<CareerAccessMeta & { application: ApplicationWorkspace; coverLetter: CoverLetter | null }>(
      session,
      `/api/guest/career/cover-letter?applicationId=${applicationId}`,
    ),

  optimizeResume: (
    session: GuestSession,
    input: { opportunityDescription?: string; applicationId?: number },
  ) =>
    careerRequest<CareerOptimizeResponse>(
      session,
      "/api/guest/career/optimize",
      jsonInit({
        studentDatabaseId: session.databaseId,
        ...(input.opportunityDescription ? { opportunityDescription: input.opportunityDescription } : {}),
        ...(input.applicationId ? { applicationId: input.applicationId } : {}),
      }),
    ),

  getResumes: (session: GuestSession) =>
    careerRequest<CareerResumesResponse>(session, "/api/guest/career/resumes"),

  /** Upload a résumé file (multipart) as the master résumé. */
  uploadMasterResume: async (session: GuestSession, file: CareerResumeFilePart) => {
    const form = new FormData()
    form.append("studentDatabaseId", session.databaseId)
    // React Native FormData file part — { uri, name, type }.
    form.append("file", file as unknown as Blob)
    const response = await fetch(careerUrl(session, "/api/guest/career/resumes"), {
      method: "POST",
      credentials: "include",
      headers: await (async () => {
        const headers = await studentAuthenticatedHeaders(session)
        delete headers["Content-Type"]
        return headers
      })(),
      body: form,
    })
    return parseCareerResponse<{ resume: ResumeProfile }>(response)
  },

  /** Save pasted résumé text as the master résumé (JSON variant). */
  saveMasterResumeText: (session: GuestSession, parsedText: string, label?: string) =>
    careerRequest<{ resume: ResumeProfile }>(
      session,
      "/api/guest/career/resumes",
      jsonInit({
        studentDatabaseId: session.databaseId,
        parsedText,
        ...(label ? { label } : {}),
      }),
    ),

  getHistory: (session: GuestSession) =>
    careerRequest<CareerHistoryResponse>(session, "/api/guest/career/history"),

  listApplications: (session: GuestSession) =>
    careerRequest<CareerApplicationsResponse>(session, "/api/guest/career/applications"),

  getApplicationDetail: (session: GuestSession, applicationId: number) =>
    careerRequest<CareerApplicationDetailResponse>(
      session,
      `/api/guest/career/applications?applicationId=${applicationId}`,
    ),

  /**
   * Update an application's status.
   *
   * NOTE: the web app currently exposes no status-update endpoint
   * (app/api/guest/career/applications/route.ts only implements GET).
   * This PATCH matches the expected contract so mobile lights up when the
   * web adds it; until then it returns 405, which callers surface gracefully.
   */
  updateApplicationStatus: (session: GuestSession, applicationId: number, status: ApplicationStatus) =>
    careerRequest<{ application: ApplicationWorkspace }>(session, "/api/guest/career/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentDatabaseId: session.databaseId,
        applicationId,
        action: "set_status",
        status,
      }),
    }),
}
