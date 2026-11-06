import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import type { RecommendationRequest, RecommendationMeta } from "./course-info-api"
import { defaultGuestEntitlements, defaultGuestPlans } from "./guest-entitlements-defaults"
import {
  fetchGuestEntitlementsFromProduction,
  fetchGuestHomeCreditsFromProduction,
  guestAsStudentSession,
  isGuestApiUnavailableError,
  parseGuestApiJson,
} from "./guest-entitlements-production"
import type { MobilePaymentIntentResponse, MobilePaymentSheetResponse } from "./membership-payment-api"
import type {
  GuestCheckoutResponse,
  GuestCoraChatMessage,
  GuestCoraChatResponse,
  GuestEntitlements,
  GuestHomeResponse,
  GuestPlansResponse,
  GuestRecommendationBrief,
} from "./guest-types"
import type { GuestSession } from "./session"
import { parseCoraChatMeta } from "./cora/models"
import { applyCoraOutputGate, evaluateCoraSecurityTurn } from "./cora-security"
import { studentAuthenticatedHeaders } from "./student-api"
import {
  studentApi,
  type StudentRecommendationDetail,
  type StudentRecommendationPatchAction,
} from "./student-api"

async function guestRequest<T>(
  session: GuestSession,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const separator = path.includes("?") ? "&" : "?"
  const url = `${API_BASE_URL}${path}${separator}studentDatabaseId=${encodeURIComponent(session.databaseId)}`
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(await studentAuthenticatedHeaders(session)),
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = parseGuestApiJson(text, response.status)
    } catch {
      throw new ApiError("Guest API not available", response.status === 200 ? 404 : response.status, {
        error: "invalid_response",
      })
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

function normalizeEntitlements(raw: Record<string, unknown>): GuestEntitlements {
  const shell = defaultGuestEntitlements()
  const creditsRaw = raw.coraCredits
  const credits =
    creditsRaw && typeof creditsRaw === "object"
      ? {
          available:
            typeof (creditsRaw as Record<string, unknown>).available === "number"
              ? ((creditsRaw as Record<string, unknown>).available as number)
              : shell.coraCredits.available,
          isLow: (creditsRaw as Record<string, unknown>).isLow === true,
        }
      : shell.coraCredits

  return {
    plan: raw.plan === "cora_career" ? "cora_career" : "guest_free",
    capabilities: Array.isArray(raw.capabilities)
      ? (raw.capabilities.filter((item) => typeof item === "string") as GuestEntitlements["capabilities"])
      : shell.capabilities,
    coraCareerLifetime: raw.coraCareerLifetime === true,
    coraCredits: credits,
    flags: {
      ...shell.flags,
      ...(raw.flags && typeof raw.flags === "object" ? (raw.flags as GuestEntitlements["flags"]) : {}),
    },
    nav: {
      ...shell.nav,
      ...(raw.nav && typeof raw.nav === "object" ? (raw.nav as GuestEntitlements["nav"]) : {}),
    },
    planConfig:
      raw.planConfig && typeof raw.planConfig === "object"
        ? (raw.planConfig as GuestEntitlements["planConfig"])
        : shell.planConfig,
  }
}

function normalizeGuestPlansResponse(raw: unknown): GuestPlansResponse {
  const shell = defaultGuestPlans()
  if (!raw || typeof raw !== "object") return shell
  const body = raw as Record<string, unknown>

  const plans = Array.isArray(body.plans)
    ? body.plans
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null
          const plan = entry as Record<string, unknown>
          const id = plan.id === "cora_career" ? ("cora_career" as const) : ("guest_free" as const)
          const shellPlan = shell.plans.find((item) => item.id === id)
          const priceUsd = typeof plan.priceUsd === "number" ? plan.priceUsd : undefined
          const priceLabel =
            typeof plan.priceLabel === "string"
              ? plan.priceLabel
              : priceUsd != null
                ? `$${priceUsd.toFixed(2)} one-time`
                : shellPlan?.priceLabel ?? "$0 · Lifetime"
          const features = Array.isArray(plan.features)
            ? plan.features.filter((item): item is string => typeof item === "string")
            : []
          return {
            id,
            label:
              typeof plan.label === "string"
                ? plan.label
                : typeof plan.name === "string"
                  ? plan.name
                  : shellPlan?.label ?? id,
            priceLabel,
            priceCents:
              typeof plan.priceCents === "number"
                ? plan.priceCents
                : priceUsd != null
                  ? Math.round(priceUsd * 100)
                  : shellPlan?.priceCents,
            description:
              typeof plan.description === "string"
                ? plan.description
                : features.length
                  ? features.join(" · ")
                  : shellPlan?.description,
            coraCreditsIncluded:
              typeof plan.coraCreditsIncluded === "number"
                ? plan.coraCreditsIncluded
                : shellPlan?.coraCreditsIncluded,
            highlight: id === "cora_career",
          }
        })
        .filter((plan): plan is NonNullable<typeof plan> => plan !== null)
    : shell.plans

  const creditPacks = Array.isArray(body.creditPacks)
    ? body.creditPacks
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null
          const pack = entry as Record<string, unknown>
          if (typeof pack.id !== "string") return null
          const priceUsd = typeof pack.priceUsd === "number" ? pack.priceUsd : undefined
          const priceCents =
            typeof pack.priceCents === "number"
              ? pack.priceCents
              : priceUsd != null
                ? Math.round(priceUsd * 100)
                : undefined
          const priceLabel =
            typeof pack.priceLabel === "string"
              ? pack.priceLabel
              : priceCents != null
                ? `$${(priceCents / 100).toFixed(2)}`
                : "$0.00"
          const highlights = Array.isArray(pack.highlights)
            ? pack.highlights.filter((item): item is string => typeof item === "string")
            : undefined
          return {
            id: pack.id,
            label:
              typeof pack.label === "string"
                ? pack.label
                : typeof pack.name === "string"
                  ? pack.name
                  : pack.id,
            credits: typeof pack.credits === "number" ? pack.credits : 0,
            priceLabel,
            priceCents,
            description: typeof pack.description === "string" ? pack.description : undefined,
            popular: pack.popular === true,
            highlights,
          }
        })
        .filter((pack): pack is NonNullable<typeof pack> => pack !== null && pack.credits > 0)
    : shell.creditPacks

  return {
    checkoutEnabled: body.checkoutEnabled !== false,
    plans: plans.length ? plans : shell.plans,
    creditPacks: creditPacks.length ? creditPacks : shell.creditPacks,
  }
}

export const guestApi = {
  getEntitlements: async (session: GuestSession): Promise<GuestEntitlements> => {
    try {
      const payload = await guestRequest<Record<string, unknown>>(session, "/api/guest/entitlements")
      const normalized = normalizeEntitlements(payload)
      if (!payload.coraCredits) {
        const liveCredits = await fetchGuestHomeCreditsFromProduction(session)
        return { ...normalized, coraCredits: liveCredits }
      }
      return normalized
    } catch (err) {
      if (isGuestApiUnavailableError(err)) {
        return fetchGuestEntitlementsFromProduction(session)
      }
      throw err
    }
  },

  getHome: async (session: GuestSession): Promise<GuestHomeResponse> => {
    try {
      const payload = await guestRequest<GuestHomeResponse>(session, "/api/guest/home")
      if (payload.coraCredits) return payload
      const liveCredits = await fetchGuestHomeCreditsFromProduction(session)
      return { ...payload, coraCredits: liveCredits }
    } catch (err) {
      if (isGuestApiUnavailableError(err)) {
        const [requests, productionEntitlements] = await Promise.all([
          guestApi.getRecommendations(session),
          fetchGuestEntitlementsFromProduction(session),
        ])
        return {
          greeting: session.name,
          activeRequestCount: requests.length,
          recentRequests: requests.slice(0, 5).map((item) => ({
            id: item.id,
            purpose: item.purpose,
            status: item.status,
            instructor_name: item.instructor_name,
            course_code: item.course_code,
            deadline: item.deadline,
            updated_at: item.updated_at,
          })),
          plan: productionEntitlements.plan,
          coraCredits: productionEntitlements.coraCredits,
        }
      }
      throw err
    }
  },

  getPlans: async (): Promise<GuestPlansResponse> => {
    try {
      const url = `${API_BASE_URL}/api/guest/cora-career/plans`
      const response = await fetch(url, { headers: { Accept: "application/json" } })
      const text = await response.text()
      let body: unknown = null
      if (text) {
        try {
          body = parseGuestApiJson(text, response.status)
        } catch {
          throw new ApiError("Could not load plans", response.status === 200 ? 404 : response.status)
        }
      }
      if (!response.ok) throw new ApiError("Could not load plans", response.status, body)
      return normalizeGuestPlansResponse(body)
    } catch (err) {
      if (isGuestApiUnavailableError(err)) {
        return defaultGuestPlans()
      }
      if (err instanceof ApiError) throw err
      return defaultGuestPlans()
    }
  },

  startCoraCareerCheckout: (session: GuestSession) =>
    guestRequest<GuestCheckoutResponse>(session, "/api/guest/cora-career/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentDatabaseId: session.databaseId, mobileReturn: true }),
    }),

  prepareCoraCareerMobilePayment: (session: GuestSession) =>
    guestRequest<MobilePaymentSheetResponse>(session, "/api/guest/cora-career/mobile-payment-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentDatabaseId: session.databaseId }),
    }),

  createCoraCareerMobilePaymentIntent: (
    session: GuestSession,
    options: { paymentMethodId: string; shouldSavePaymentMethod: boolean },
  ) =>
    guestRequest<MobilePaymentIntentResponse>(session, "/api/guest/cora-career/mobile-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentDatabaseId: session.databaseId,
        ...options,
      }),
    }),

  startCreditPackCheckout: (session: GuestSession, packId: string) =>
    guestRequest<GuestCheckoutResponse>(session, "/api/guest/cora-credits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentDatabaseId: session.databaseId, packId, mobileReturn: true }),
    }),

  prepareCreditPackMobilePayment: (
    session: GuestSession,
    packId: string,
  ): Promise<MobilePaymentSheetResponse & { packId: string; credits: number }> =>
    guestRequest(session, "/api/guest/cora-credits/mobile-payment-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentDatabaseId: session.databaseId, packId }),
    }),

  createCreditPackMobilePaymentIntent: (
    session: GuestSession,
    options: { packId: string; paymentMethodId: string; shouldSavePaymentMethod: boolean },
  ): Promise<MobilePaymentIntentResponse> =>
    guestRequest(session, "/api/guest/cora-credits/mobile-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentDatabaseId: session.databaseId,
        ...options,
      }),
    }),

  sendCoraChat: (
    session: GuestSession,
    payload: {
      message: string
      conversationHistory: GuestCoraChatMessage[]
      requestId?: number
    },
  ) =>
    Promise.resolve().then(() => {
      const security = evaluateCoraSecurityTurn({
        actor: "career",
        message: payload.message,
        history: payload.conversationHistory,
      })
      if (security.action !== "allow" && security.reply) {
        return {
          content: applyCoraOutputGate(security.reply, "career"),
        } satisfies GuestCoraChatResponse
      }
      return guestRequest<GuestCoraChatResponse>(session, "/api/guest/cora/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentDatabaseId: session.databaseId,
          message: payload.message,
          conversationHistory: payload.conversationHistory,
          requestId: payload.requestId,
        }),
      }).then((raw) => {
        const meta = parseCoraChatMeta(raw as unknown as Record<string, unknown>)
        return {
          ...raw,
          content: applyCoraOutputGate(raw.content ?? "", "career"),
          toolCalls: undefined,
          profile: meta.profile,
          publicMode: meta.publicMode,
          routing: meta.routing,
          ...(meta.ui ? { ui: meta.ui } : {}),
        }
      })
    }),

  getProfile: async (session: GuestSession) => {
    try {
      return await guestRequest<{ student?: Record<string, unknown>; profile?: Record<string, unknown> }>(
        session,
        "/api/guest/profile",
      )
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        return studentApi.getProfile(guestAsStudentSession(session))
      }
      throw err
    }
  },

  updateProfile: async (session: GuestSession, payload: { fullName: string; email: string }) => {
    try {
      return await guestRequest(session, "/api/guest/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentDatabaseId: session.databaseId,
          fullName: payload.fullName,
          email: payload.email,
        }),
      })
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        return guestApi.updateProfileViaStudent(session, payload)
      }
      throw err
    }
  },

  updateProfileViaStudent: (session: GuestSession, payload: { fullName: string; email: string }) =>
    studentApi.updateProfile(guestAsStudentSession(session), payload),

  getRecommendationBrief: async (session: GuestSession, requestId: number) => {
    try {
      return (await studentApi.getRecommendationBrief(
        guestAsStudentSession(session),
        requestId,
      )) as { brief?: GuestRecommendationBrief | null }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return { brief: null }
      throw err
    }
  },

  saveRecommendationBrief: (
    session: GuestSession,
    requestId: number,
    fields: Partial<Pick<GuestRecommendationBrief, "highlights" | "achievements" | "goals" | "context">>,
  ) =>
    studentApi.saveRecommendationBrief(guestAsStudentSession(session), requestId, fields) as Promise<{
      brief?: GuestRecommendationBrief
      creditFree?: boolean
    }>,

  generateRecommendationBrief: (session: GuestSession, requestId: number) =>
    studentApi.generateRecommendationBrief(guestAsStudentSession(session), requestId) as Promise<{
      brief?: GuestRecommendationBrief
      creditFree?: boolean
    }>,

  getRecommendations: async (session: GuestSession) => {
    const data = await studentApi.getRecommendations(guestAsStudentSession(session))
    return (data.requests ?? []) as RecommendationRequest[]
  },

  getRecommendationMeta: (session: GuestSession) =>
    studentApi.getRecommendationMeta(guestAsStudentSession(session)) as Promise<RecommendationMeta>,

  createRecommendation: (
    session: GuestSession,
    payload: {
      courseId: number
      instructorId: number
      purpose: string
      deadline?: string
      studentRequestDescription?: string
      purposeOtherDetail?: string
      recipientName?: string
      recipientOrganization?: string
      recipientAddress?: string
      letterIsSpecific?: boolean
    },
  ) => studentApi.createRecommendation(guestAsStudentSession(session), payload),

  getRecommendationDetail: (session: GuestSession, requestId: number) =>
    studentApi.getRecommendationDetail(guestAsStudentSession(session), requestId),

  saveRecommendationQuestionnaire: (
    session: GuestSession,
    requestId: number,
    fields: Record<string, unknown> = {},
  ) => studentApi.saveRecommendationQuestionnaire(guestAsStudentSession(session), requestId, fields),

  generateRecommendationDrafts: (session: GuestSession, requestId: number) =>
    studentApi.generateRecommendationDrafts(guestAsStudentSession(session), requestId),

  selectRecommendationDraft: (session: GuestSession, requestId: number, draftId: number) =>
    studentApi.selectRecommendationDraft(guestAsStudentSession(session), requestId, draftId),

  submitRecommendationLetter: (session: GuestSession, requestId: number, letterText: string) =>
    studentApi.submitRecommendationLetter(guestAsStudentSession(session), requestId, letterText),

  markRecommendationDownloaded: (session: GuestSession, requestId: number) =>
    studentApi.markRecommendationDownloaded(guestAsStudentSession(session), requestId),

  patchRecommendationRequestDetails: (
    session: GuestSession,
    requestId: number,
    body: Record<string, unknown> = {},
  ) => studentApi.patchRecommendationRequestDetails(guestAsStudentSession(session), requestId, body),

  withdrawRecommendation: (session: GuestSession, requestId: number) =>
    studentApi.withdrawRecommendation(guestAsStudentSession(session), requestId),

  patchRecommendation: (
    session: GuestSession,
    requestId: number,
    action: StudentRecommendationPatchAction,
    body: Record<string, unknown> = {},
  ) => studentApi.patchRecommendation(guestAsStudentSession(session), requestId, action, body),

  changePassword: (session: GuestSession, currentPassword: string, newPassword: string) =>
    studentApi.changePassword(guestAsStudentSession(session), currentPassword, newPassword),
}

export type { StudentRecommendationDetail, StudentRecommendationPatchAction }
