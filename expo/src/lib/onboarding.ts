import * as SecureStore from "./secure-store-client"
import { syncAppearanceSetupFromServer } from "./appearance-setup"
import { resolveFacultyPostLoginRoute } from "./faculty-post-login"
import { sessionNeedsPasswordChange } from "./navigation-reset"
import type { AppSession } from "./session"
import {
  isLegalConsentStep,
  LEGAL_CONSENT_STEPS,
  onboardingStepsForPortal,
  onboardingStepToRoute,
  type OnboardingRoute,
  type OnboardingStepId,
} from "./onboarding-logic"

export type { LegalConsentStepId, OnboardingRoute, OnboardingStepId } from "./onboarding-logic"
export {
  canonicalizeOnboardingStep,
  isLegalConsentStep,
  LEGAL_CONSENT_STEPS,
  ONBOARDING_AUTH_ROUTES,
  onboardingStepMeta,
  onboardingStepsForPortal,
  onboardingStepToRoute,
} from "./onboarding-logic"

function onboardingUserKey(session: AppSession): string {
  switch (session.portal) {
    case "faculty":
      return `faculty_${session.id}`
    case "admin":
      return `admin_${session.id}`
    default:
      return `${session.portal}_${session.databaseId}`
  }
}

export function onboardingStepStorageKey(session: AppSession, step: OnboardingStepId): string {
  return `cc_onboarding_${onboardingUserKey(session)}_${step}_v1`
}

async function isStoredOnboardingFlag(session: AppSession, step: OnboardingStepId): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(onboardingStepStorageKey(session, step))) === "true"
  } catch {
    return false
  }
}

export async function isOnboardingStepComplete(
  session: AppSession,
  step: OnboardingStepId,
): Promise<boolean> {
  if (step === "appearance") {
    if (session.portal !== "student") return true
    return syncAppearanceSetupFromServer(session)
  }
  if (isLegalConsentStep(step)) {
    const flags = await Promise.all(
      LEGAL_CONSENT_STEPS.map((legalStep) => isStoredOnboardingFlag(session, legalStep)),
    )
    return flags.every(Boolean)
  }
  return isStoredOnboardingFlag(session, step)
}

export async function markOnboardingStepComplete(
  session: AppSession,
  step: OnboardingStepId,
): Promise<void> {
  if (step === "appearance") return
  const steps = isLegalConsentStep(step) ? LEGAL_CONSENT_STEPS : [step]
  await Promise.all(
    steps.map(async (legalStep) => {
      try {
        await SecureStore.setItemAsync(onboardingStepStorageKey(session, legalStep), "true")
      } catch {
        /* ignore */
      }
    }),
  )
}

export async function resolveNextOnboardingRoute(session: AppSession): Promise<OnboardingRoute | null> {
  const steps = onboardingStepsForPortal(session.portal)
  for (const step of steps) {
    const done = await isOnboardingStepComplete(session, step)
    if (!done) return onboardingStepToRoute(step)
  }
  return null
}

export async function resolvePostLoginRoute(session: AppSession): Promise<OnboardingRoute> {
  if (sessionNeedsPasswordChange(session)) {
    return "/change-password"
  }

  const onboardingRoute = await resolveNextOnboardingRoute(session)
  if (onboardingRoute) return onboardingRoute

  if (session.portal === "faculty") {
    return resolveFacultyPostLoginRoute(session)
  }

  return "/dashboard"
}

export async function completeOnboardingStepAndResolveNext(
  session: AppSession,
  step: OnboardingStepId,
): Promise<OnboardingRoute> {
  await markOnboardingStepComplete(session, step)
  const next = await resolveNextOnboardingRoute(session)
  if (next) return next
  if (session.portal === "faculty") {
    return resolveFacultyPostLoginRoute(session)
  }
  return "/dashboard"
}

export function isLearnerPortal(session: AppSession): session is AppSession & {
  portal: "student" | "guest" | "summer"
} {
  return session.portal === "student" || session.portal === "guest" || session.portal === "summer"
}
