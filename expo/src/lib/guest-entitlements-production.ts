import { ApiError } from "./api"
import { coraCreditsApi } from "./cora/credits/api"
import { defaultGuestEntitlements } from "./guest-entitlements-defaults"
import {
  GUEST_CORA_CAREER_LIFETIME_CREDITS,
  GUEST_FREE_STARTER_CORA_CREDITS,
} from "./guest-membership-config"
import type { GuestEntitlements, GuestCapability } from "./guest-types"
import type { GuestSession, StudentSession } from "./session"

const GUEST_CAREER_CAPABILITIES: GuestCapability[] = [
  "recommendations.request",
  "recommendations.view",
  "recommendations.brief",
  "messages.send",
  "cora.career.chat",
  "cora.career.resume",
  "cora.career.interview",
  "cora.career.personal_statement",
  "cora.career.application_plan",
]

export function guestAsStudentSession(session: GuestSession): StudentSession {
  return {
    portal: "student",
    id: session.id,
    name: session.name,
    databaseId: session.databaseId,
    section: "GUEST",
    expiresAt: session.expiresAt,
    email: session.email,
    authIdentifier: session.authIdentifier,
  }
}

function inferGuestPlanFromBalance(includedCapHint: number | undefined): {
  plan: GuestEntitlements["plan"]
  coraCareerLifetime: boolean
  capabilities: GuestCapability[]
  creditsIncluded: number
} {
  const cap = includedCapHint ?? GUEST_FREE_STARTER_CORA_CREDITS
  const hasCareerLifetime = cap >= GUEST_CORA_CAREER_LIFETIME_CREDITS
  if (hasCareerLifetime) {
    return {
      plan: "cora_career",
      coraCareerLifetime: true,
      capabilities: GUEST_CAREER_CAPABILITIES,
      creditsIncluded: GUEST_CORA_CAREER_LIFETIME_CREDITS,
    }
  }
  const shell = defaultGuestEntitlements()
  return {
    plan: "guest_free",
    coraCareerLifetime: false,
    capabilities: shell.capabilities,
    creditsIncluded: cap,
  }
}

/** Live entitlements from production when `/api/guest/entitlements` is not deployed yet. */
export async function fetchGuestEntitlementsFromProduction(
  session: GuestSession,
): Promise<GuestEntitlements> {
  const shell = defaultGuestEntitlements()
  const balance = await coraCreditsApi.getStudentBalance(guestAsStudentSession(session))
  const inferred = inferGuestPlanFromBalance(balance.includedCapHint)

  return {
    ...shell,
    plan: inferred.plan,
    capabilities: inferred.capabilities,
    coraCareerLifetime: inferred.coraCareerLifetime,
    coraCredits: {
      available: balance.credits,
      isLow: balance.isLow,
    },
    planConfig: {
      ...shell.planConfig,
      coraCreditsIncluded: inferred.creditsIncluded,
    },
  }
}

export async function fetchGuestHomeCreditsFromProduction(
  session: GuestSession,
): Promise<GuestEntitlements["coraCredits"]> {
  const balance = await coraCreditsApi.getStudentBalance(guestAsStudentSession(session))
  return {
    available: balance.credits,
    isLow: balance.isLow,
  }
}

export function isGuestApiUnavailableError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 405 || err.status === 502)
}

export function parseGuestApiJson(text: string, status: number): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error("Guest API returned HTML")
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new Error("Guest API returned invalid JSON")
  }
}
