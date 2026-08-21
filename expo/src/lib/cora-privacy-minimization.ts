import type { StudentContextPayload } from "./student-context-api"
import type { CoraServerPrivacySettings } from "./cora-privacy-api"

/** Profile keys that must not be forwarded to external AI providers. */
const PII_PROFILE_KEYS = new Set([
  "email",
  "phone",
  "phoneNumber",
  "mobile",
  "address",
  "street",
  "city",
  "state",
  "zip",
  "postalCode",
  "password",
  "token",
  "authToken",
  "accessToken",
  "refreshToken",
  "studentId",
  "studentCode",
  "studentNumber",
  "studentDbId",
  "databaseId",
  "accountId",
  "userId",
  "fullName",
  "firstName",
  "lastName",
  "displayName",
  "name",
  "username",
  "ssn",
  "dateOfBirth",
  "dob",
  "paymentMethod",
  "cardNumber",
])

export type ExternalAiContextLevel = "none" | "minimal" | "learning"

/** Resolve how much student context may be included in an external AI request. */
export function resolveExternalAiContextLevel(
  privacy: Pick<CoraServerPrivacySettings, "personalizedLearning" | "useLearningContext">,
): ExternalAiContextLevel {
  if (!privacy.personalizedLearning || !privacy.useLearningContext) return "none"
  return "learning"
}

/** Strip known PII keys from a generic profile object. */
export function redactProfileForExternalAi(
  profile: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!profile) return undefined
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(profile)) {
    if (PII_PROFILE_KEYS.has(key)) continue
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = redactProfileForExternalAi(value as Record<string, unknown>)
      if (nested && Object.keys(nested).length > 0) next[key] = nested
      continue
    }
    next[key] = value
  }
  return Object.keys(next).length > 0 ? next : undefined
}

function minimalAccountContext(
  account: StudentContextPayload["account"] | ExternalAiStudentContext["account"],
): Pick<NonNullable<StudentContextPayload["account"]>, "section" | "courseCode" | "courseTitle"> | undefined {
  if (!account) return undefined
  return {
    section: account.section ?? null,
    courseCode: account.courseCode ?? null,
    courseTitle: account.courseTitle ?? null,
  }
}

function privacyFlags(privacy?: Partial<CoraServerPrivacySettings>) {
  return {
    personalized: privacy?.personalizedLearning !== false,
    learningContext: privacy?.useLearningContext !== false,
  }
}

export type ExternalAiStudentContext = Omit<StudentContextPayload, "account"> & {
  account?: Pick<
    NonNullable<StudentContextPayload["account"]>,
    "section" | "courseCode" | "courseTitle"
  >
}

/**
 * Minimize student context before it may reach an external AI provider.
 * Aligned with v0-coursecollabv3/lib/cora/privacy/ai-data-minimization.ts
 */
export function minimizeStudentContextForExternalAi(
  context: StudentContextPayload | ExternalAiStudentContext | null | undefined,
  level: ExternalAiContextLevel = "learning",
  privacy?: Partial<CoraServerPrivacySettings>,
): ExternalAiStudentContext | null {
  if (!context || level === "none") return null

  const { personalized, learningContext } = privacyFlags(privacy)

  if (level === "minimal") {
    return {
      account: minimalAccountContext(context.account),
      syncedAt: context.syncedAt,
    }
  }

  return {
    profile: learningContext && personalized ? redactProfileForExternalAi(context.profile) : undefined,
    account: minimalAccountContext(context.account),
    membership: personalized ? context.membership : undefined,
    grades: learningContext && personalized ? context.grades : undefined,
    announcements: learningContext ? context.announcements?.map((a) => ({
      id: a.id,
      title: a.title,
      createdAt: a.createdAt,
    })) : undefined,
    flashcardDecks: learningContext
      ? context.flashcardDecks?.map((d) => ({ id: d.id, title: d.title, cardCount: d.cardCount }))
      : undefined,
    digitalNotes: learningContext
      ? context.digitalNotes?.map((n) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt }))
      : undefined,
    strugglingTopics: learningContext && personalized ? context.strugglingTopics : undefined,
    strengths: learningContext && personalized ? context.strengths : undefined,
    topicMastery: learningContext && personalized ? context.topicMastery : undefined,
    calendarEvents: learningContext ? context.calendarEvents : undefined,
    upcomingAssessments: learningContext ? context.upcomingAssessments : undefined,
    missedDeadlines: learningContext ? context.missedDeadlines : undefined,
    assessmentResults: learningContext ? context.assessmentResults : undefined,
    liveGradeBreakdown: learningContext && personalized ? context.liveGradeBreakdown : undefined,
    knowledgeGraph:
      learningContext && personalized && context.knowledgeGraph
        ? {
            updatedAt: context.knowledgeGraph.updatedAt,
            topics: context.knowledgeGraph.topics,
            assessments: context.knowledgeGraph.assessments,
            calendar: context.knowledgeGraph.calendar,
            lectures: context.knowledgeGraph.lectures,
            notifications: [],
            summary: context.knowledgeGraph.summary,
          }
        : undefined,
    summary: learningContext && personalized ? context.summary : undefined,
    syncedAt: context.syncedAt,
    liveLookupAt: context.liveLookupAt,
  }
}

/** Random non-identifying identifier for provider-side conversation/session routing. */
export function createPseudonymousAiSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cora_${crypto.randomUUID()}`
  }
  return `cora_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PHONE_RE = /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g
const BEARER_RE = /\b(?:Bearer\s+)?[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
const INTERNAL_ID_RE = /\b(?:student|user|account|instructor|faculty|admin)[_\s-]?id\s*[:=]\s*\d+\b/gi

/** Redact common PII patterns from free text before external model calls. */
export function redactPiiFromText(text: string): string {
  if (!text) return text
  return text
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .replace(BEARER_RE, "[redacted-token]")
    .replace(INTERNAL_ID_RE, "[redacted-id]")
}

export type ExternalAiChatMessage = {
  role: string
  content: string
  tool_calls?: unknown
  tool_call_id?: string
  name?: string
}

/** Redact PII; preserve tool_calls / tool_call_id for agent multi-round chats. */
export function sanitizeMessagesForExternalAi(
  messages: ExternalAiChatMessage[],
): ExternalAiChatMessage[] {
  return messages.map((m) => {
    const next: ExternalAiChatMessage = {
      role: m.role,
      content: typeof m.content === "string" ? redactPiiFromText(m.content) : m.content,
    }
    if (m.tool_calls != null) next.tool_calls = m.tool_calls
    if (typeof m.tool_call_id === "string" && m.tool_call_id) next.tool_call_id = m.tool_call_id
    if (typeof m.name === "string" && m.name) next.name = m.name
    return next
  })
}
