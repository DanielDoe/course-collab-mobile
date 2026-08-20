import * as SecureStore from "./secure-store-client"
import { syncAppearanceSetupFromServer } from "./appearance-setup"
import { resolveFacultyPostLoginRoute } from "./faculty-post-login"
import { sessionNeedsPasswordChange } from "./navigation-reset"
import type { AppSession } from "./session"

export type OnboardingStepId =
  | "welcome"
  | "terms"
  | "privacy"
  | "ai-disclosure"
  | "cora"
  | "appearance"

export type OnboardingRoute =
  | "/onboarding-welcome"
  | "/onboarding-terms"
  | "/onboarding-privacy"
  | "/onboarding-ai-disclosure"
  | "/onboarding-cora"
  | "/appearance-setup"
  | "/dashboard"
  | "/faculty-select-course"
  | "/change-password"

export const ONBOARDING_AUTH_ROUTES = new Set<string>([
  "/onboarding-welcome",
  "/onboarding-terms",
  "/onboarding-privacy",
  "/onboarding-ai-disclosure",
  "/onboarding-cora",
])

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

export async function isOnboardingStepComplete(
  session: AppSession,
  step: OnboardingStepId,
): Promise<boolean> {
  if (step === "appearance") {
    if (session.portal !== "student") return true
    return syncAppearanceSetupFromServer(session)
  }
  try {
    return (await SecureStore.getItemAsync(onboardingStepStorageKey(session, step))) === "true"
  } catch {
    return false
  }
}

export async function markOnboardingStepComplete(
  session: AppSession,
  step: OnboardingStepId,
): Promise<void> {
  if (step === "appearance") return
  try {
    await SecureStore.setItemAsync(onboardingStepStorageKey(session, step), "true")
  } catch {
    /* ignore */
  }
}

export function onboardingStepsForPortal(portal: AppSession["portal"]): OnboardingStepId[] {
  switch (portal) {
    case "student":
      return ["welcome", "terms", "privacy", "ai-disclosure", "cora", "appearance"]
    case "guest":
    case "summer":
      return ["welcome", "terms", "privacy", "ai-disclosure", "cora"]
    case "faculty":
    case "admin":
      return ["welcome", "terms", "privacy", "ai-disclosure"]
    default:
      return []
  }
}

export function onboardingStepToRoute(step: OnboardingStepId): OnboardingRoute {
  switch (step) {
    case "welcome":
      return "/onboarding-welcome"
    case "terms":
      return "/onboarding-terms"
    case "privacy":
      return "/onboarding-privacy"
    case "ai-disclosure":
      return "/onboarding-ai-disclosure"
    case "cora":
      return "/onboarding-cora"
    case "appearance":
      return "/appearance-setup"
  }
}

export function onboardingStepMeta(session: AppSession, currentStep: OnboardingStepId) {
  const steps = onboardingStepsForPortal(session.portal)
  const stepIndex = Math.max(0, steps.indexOf(currentStep))
  return {
    steps,
    stepIndex,
    totalSteps: steps.length,
    progress: steps.length > 0 ? (stepIndex + 1) / steps.length : 1,
  }
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
