import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { useLegalDocument } from "../../hooks/useLegalDocument"
import { completeOnboardingStepAndResolveNext } from "../../lib/onboarding"
import { advanceAuthOnboarding, replaceAuthRoute } from "../../lib/navigation-reset"
import { OnboardingLegalStepLayout } from "./onboarding-ui"

export function OnboardingConsentScreen() {
  const router = useRouter()
  const { session } = useSession()
  const terms = useLegalDocument("terms")
  const privacy = useLegalDocument("privacy")
  const ai = useLegalDocument("ai-and-data")
  const [accepting, setAccepting] = useState(false)

  const documents = useMemo(
    () => [terms.document, privacy.document, ai.document],
    [terms.document, privacy.document, ai.document],
  )
  const loading = terms.loading || privacy.loading || ai.loading
  const error = terms.error ?? privacy.error ?? ai.error
  const source = useMemo(() => {
    const sources = [terms.source, privacy.source, ai.source]
    if (sources.includes("fallback")) return "fallback" as const
    if (sources.includes("cache")) return "cache" as const
    if (sources.every((value) => value === "network")) return "network" as const
    return sources.find((value) => value != null) ?? null
  }, [terms.source, privacy.source, ai.source])

  const refreshTerms = terms.refresh
  const refreshPrivacy = privacy.refresh
  const refreshAi = ai.refresh
  const refresh = useCallback(() => {
    refreshTerms()
    refreshPrivacy()
    refreshAi()
  }, [refreshTerms, refreshPrivacy, refreshAi])

  useEffect(() => {
    if (!session) replaceAuthRoute(router, "/login")
  }, [router, session])

  async function handleAccept() {
    if (!session) return
    setAccepting(true)
    try {
      const next = await completeOnboardingStepAndResolveNext(session, "terms")
      advanceAuthOnboarding(router, next)
    } finally {
      setAccepting(false)
    }
  }

  if (!session) return null

  return (
    <OnboardingLegalStepLayout
      session={session}
      stepId="terms"
      pillLabel="Legal"
      title="Terms & Policies"
      subtitle="Please read the Terms of Service, Privacy Policy, and AI Use & Data disclosure. One acceptance covers all three."
      icon="document-text-outline"
      documents={documents}
      loading={loading}
      error={error}
      source={source}
      onRetry={refresh}
      agreeLabel="I have read and agree to the Terms of Service, Privacy Policy, and AI Use & Data disclosure"
      continueLabel="Accept & continue"
      onAccept={() => void handleAccept()}
      accepting={accepting}
    />
  )
}
