import { API_BASE_URL } from "../../../constants"
import type { StudentSession } from "../../session"
import type { FacultySession } from "../../session"
import { ApiError } from "../../student-api"
import { mfaTrustRequestHeadersForStudent } from "../../mfa-device-trust"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "../../student-http-cookies"
import type { CoraActivityRow, CoraBalance, CoraCreditPack } from "./types"

type CoraRole = "student" | "instructor"

async function studentAuthHeaders(session: StudentSession): Promise<HeadersInit> {
  const base: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-student-id": session.databaseId,
  }
  if (session.section) base["x-student-session"] = session.section
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForStudent(session)
  Object.assign(base, mergeCookieHeaders(trust.Cookie, jarCookie))
  return base
}

async function instructorAuthHeaders(session: FacultySession): Promise<HeadersInit> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(session.id),
  }
}

async function requestJson<T>(
  path: string,
  headers: HeadersInit,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { ...headers, ...init?.headers },
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
  await persistHttpCookiesFromResponse(url, response.headers)
  return body as T
}

function normalizeBalance(raw: Partial<CoraBalance> & { credits?: number }): CoraBalance {
  const credits = Number(raw.credits ?? 0)
  const coraMode = raw.coraMode === "lite" || credits <= 0 ? "lite" : "premium"
  const month = raw.month ?? {
    creditsUsed: 0,
    interactions: 0,
    agentRuns: 0,
    tokensProcessed: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
  }
  return {
    credits,
    includedBalance: Number(raw.includedBalance ?? 0),
    purchasedBalance: Number(raw.purchasedBalance ?? 0),
    reservedCredits: Number(raw.reservedCredits ?? 0),
    periodKey: String(raw.periodKey ?? ""),
    lifetimeCreditsUsed: Number(raw.lifetimeCreditsUsed ?? 0),
    membershipTier: raw.membershipTier ?? null,
    lowBalanceFraction: Number(raw.lowBalanceFraction ?? 0),
    coraMode,
    isLow: Boolean(raw.isLow),
    month: {
      creditsUsed: Number(month.creditsUsed ?? 0),
      interactions: Number(month.interactions ?? 0),
      agentRuns: Number(month.agentRuns ?? 0),
      tokensProcessed: Number(month.tokensProcessed ?? 0),
      inputTokens: Number(month.inputTokens ?? 0),
      cachedInputTokens: Number(month.cachedInputTokens ?? 0),
      outputTokens: Number(month.outputTokens ?? 0),
      reasoningTokens: Number(month.reasoningTokens ?? 0),
    },
    includedCapHint: raw.includedCapHint != null ? Number(raw.includedCapHint) : undefined,
  }
}

export const coraCreditsApi = {
  getStudentBalance: async (session: StudentSession): Promise<CoraBalance> => {
    const raw = await requestJson<Partial<CoraBalance>>(
      "/api/cora/credits/balance?role=student",
      await studentAuthHeaders(session),
    )
    return normalizeBalance(raw)
  },

  getInstructorBalance: async (session: FacultySession): Promise<CoraBalance> => {
    const raw = await requestJson<Partial<CoraBalance>>(
      "/api/cora/credits/balance?role=instructor",
      await instructorAuthHeaders(session),
    )
    return normalizeBalance(raw)
  },

  getStudentActivity: async (
    session: StudentSession,
    opts?: { limit?: number; offset?: number; page?: number; query?: string },
  ): Promise<import("./types").CoraActivityPage> => {
    const limit = opts?.limit ?? 5
    const params = new URLSearchParams({
      role: "student",
      limit: String(limit),
    })
    if (opts?.page != null) params.set("page", String(opts.page))
    else params.set("offset", String(opts?.offset ?? 0))
    if (opts?.query?.trim()) params.set("q", opts.query.trim())
    const data = await requestJson<{
      activity?: CoraActivityRow[]
      hasMore?: boolean
      nextOffset?: number
      total?: number
      totalPages?: number
      page?: number
      limit?: number
      offset?: number
      query?: string | null
    }>(`/api/cora/usage/activity?${params}`, await studentAuthHeaders(session))
    const activity = Array.isArray(data.activity) ? data.activity : []
    const total = Number(data.total ?? activity.length)
    const pageSize = data.limit ?? limit
    return {
      activity,
      hasMore: Boolean(data.hasMore),
      nextOffset: data.nextOffset ?? (data.offset ?? 0) + activity.length,
      total,
      totalPages: data.totalPages ?? Math.max(1, Math.ceil(total / pageSize) || 1),
      page: data.page ?? 1,
      limit: pageSize,
      offset: data.offset ?? 0,
      query: data.query ?? null,
    }
  },

  getInstructorActivity: async (
    session: FacultySession,
    opts?: { limit?: number; offset?: number; page?: number; query?: string },
  ): Promise<import("./types").CoraActivityPage> => {
    const limit = opts?.limit ?? 5
    const params = new URLSearchParams({
      role: "instructor",
      limit: String(limit),
    })
    if (opts?.page != null) params.set("page", String(opts.page))
    else params.set("offset", String(opts?.offset ?? 0))
    if (opts?.query?.trim()) params.set("q", opts.query.trim())
    const data = await requestJson<{
      activity?: CoraActivityRow[]
      hasMore?: boolean
      nextOffset?: number
      total?: number
      totalPages?: number
      page?: number
      limit?: number
      offset?: number
      query?: string | null
    }>(`/api/cora/usage/activity?${params}`, await instructorAuthHeaders(session))
    const activity = Array.isArray(data.activity) ? data.activity : []
    const total = Number(data.total ?? activity.length)
    const pageSize = data.limit ?? limit
    return {
      activity,
      hasMore: Boolean(data.hasMore),
      nextOffset: data.nextOffset ?? (data.offset ?? 0) + activity.length,
      total,
      totalPages: data.totalPages ?? Math.max(1, Math.ceil(total / pageSize) || 1),
      page: data.page ?? 1,
      limit: pageSize,
      offset: data.offset ?? 0,
      query: data.query ?? null,
    }
  },

  listPacks: async (audience: "student" | "instructor"): Promise<CoraCreditPack[]> => {
    const data = await requestJson<{ packs?: CoraCreditPack[] }>(
      `/api/cora-credits/packs?audience=${audience}`,
      { Accept: "application/json" },
    )
    return Array.isArray(data.packs) ? data.packs : []
  },

  startStudentCheckout: async (
    session: StudentSession,
    packId: string,
  ): Promise<{ redirectUrl: string; sessionId: string; pack: { id: string; credits: number; priceInCents: number } }> => {
    return requestJson(
      "/api/student/cora-credits/checkout",
      await studentAuthHeaders(session),
      {
        method: "POST",
        body: JSON.stringify({
          studentId: Number(session.databaseId) || session.databaseId,
          packId,
          mobile: true,
        }),
      },
    )
  },

  prepareStudentMobilePayment: async (
    session: StudentSession,
    packId: string,
  ): Promise<import("../../membership-payment-api").MobilePaymentSheetResponse & { packId: string; credits: number }> => {
    return requestJson(
      "/api/student/cora-credits/mobile-payment-sheet",
      await studentAuthHeaders(session),
      {
        method: "POST",
        body: JSON.stringify({ studentId: Number(session.databaseId) || session.databaseId, packId }),
      },
    )
  },

  createStudentMobilePaymentIntent: async (
    session: StudentSession,
    options: { packId: string; paymentMethodId: string; shouldSavePaymentMethod: boolean },
  ): Promise<import("../../membership-payment-api").MobilePaymentIntentResponse> => {
    return requestJson(
      "/api/student/cora-credits/mobile-payment-intent",
      await studentAuthHeaders(session),
      {
        method: "POST",
        body: JSON.stringify({
          studentId: Number(session.databaseId) || session.databaseId,
          ...options,
        }),
      },
    )
  },

  startInstructorCheckout: async (
    session: FacultySession,
    packId: string,
  ): Promise<{ redirectUrl: string; sessionId: string; pack: { id: string; credits: number; priceInCents: number } }> => {
    return requestJson(
      "/api/instructor/cora-credits/checkout",
      await instructorAuthHeaders(session),
      {
        method: "POST",
        body: JSON.stringify({ instructorId: session.id, packId, mobile: true }),
      },
    )
  },

  prepareInstructorMobilePayment: async (
    session: FacultySession,
    packId: string,
  ): Promise<import("../../membership-payment-api").MobilePaymentSheetResponse & { packId: string; credits: number }> => {
    return requestJson(
      "/api/instructor/cora-credits/mobile-payment-sheet",
      await instructorAuthHeaders(session),
      {
        method: "POST",
        body: JSON.stringify({ instructorId: session.id, packId }),
      },
    )
  },

  createInstructorMobilePaymentIntent: async (
    session: FacultySession,
    options: { packId: string; paymentMethodId: string; shouldSavePaymentMethod: boolean },
  ): Promise<import("../../membership-payment-api").MobilePaymentIntentResponse> => {
    return requestJson(
      "/api/instructor/cora-credits/mobile-payment-intent",
      await instructorAuthHeaders(session),
      {
        method: "POST",
        body: JSON.stringify({
          instructorId: session.id,
          ...options,
        }),
      },
    )
  },

  confirmPurchase: async (args: {
    sessionId?: string
    paymentIntentId?: string
  }): Promise<void> => {
    await requestJson(
      "/api/cora-credits/confirm-purchase",
      { Accept: "application/json", "Content-Type": "application/json" },
      {
        method: "POST",
        body: JSON.stringify(args),
      },
    )
  },
}

export type { CoraRole }
