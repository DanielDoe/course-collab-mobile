import type { LoginPortal } from "../constants/portals"

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

/** Legacy per-document flags still written together as one legal acceptance. */
export const LEGAL_CONSENT_STEPS = ["terms", "privacy", "ai-disclosure"] as const

export type LegalConsentStepId = (typeof LEGAL_CONSENT_STEPS)[number]

export function isLegalConsentStep(step: OnboardingStepId): step is LegalConsentStepId {
  return (LEGAL_CONSENT_STEPS as readonly string[]).includes(step)
}

/** Privacy and AI screens now live on the combined terms route. */
export function canonicalizeOnboardingStep(step: OnboardingStepId): OnboardingStepId {
  return isLegalConsentStep(step) ? "terms" : step
}

export function onboardingStepsForPortal(portal: LoginPortal): OnboardingStepId[] {
  switch (portal) {
    case "student":
      return ["welcome", "terms", "cora", "appearance"]
    case "guest":
    case "summer":
      return ["welcome", "terms", "cora"]
    case "faculty":
    case "admin":
      return ["welcome", "terms"]
    default:
      return []
  }
}

export function onboardingStepToRoute(step: OnboardingStepId): OnboardingRoute {
  switch (canonicalizeOnboardingStep(step)) {
    case "welcome":
      return "/onboarding-welcome"
    case "terms":
      return "/onboarding-terms"
    case "cora":
      return "/onboarding-cora"
    case "appearance":
      return "/appearance-setup"
    default:
      return "/onboarding-terms"
  }
}

export function onboardingStepMeta(
  session: { portal: LoginPortal },
  currentStep: OnboardingStepId,
) {
  const steps = onboardingStepsForPortal(session.portal)
  const stepIndex = Math.max(0, steps.indexOf(canonicalizeOnboardingStep(currentStep)))
  return {
    steps,
    stepIndex,
    totalSteps: steps.length,
    progress: steps.length > 0 ? (stepIndex + 1) / steps.length : 1,
  }
}
