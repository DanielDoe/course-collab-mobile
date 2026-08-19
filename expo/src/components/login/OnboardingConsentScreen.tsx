import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import type { LegalDocumentId } from "../../content/legal/types"
import { useSession } from "../../context/SessionProvider"
import { useLegalDocument } from "../../hooks/useLegalDocument"
import {
  completeOnboardingStepAndResolveNext,
  type OnboardingStepId,
} from "../../lib/onboarding"
import { navigatePostSignIn, replaceAuthRoute } from "../../lib/navigation-reset"
import { OnboardingLegalStepLayout } from "./onboarding-ui"

type ConsentConfig = {
  stepId: OnboardingStepId
  docId: LegalDocumentId
  pillLabel: string
  title: string
  subtitle: string
  icon: "document-text-outline" | "shield-checkmark-outline" | "hardware-chip-outline"
  agreeLabel: string
  continueLabel: string
}

const CONSENT_CONFIG: Record<"terms" | "privacy" | "ai-disclosure", ConsentConfig> = {
  terms: {
    stepId: "terms",
    docId: "terms",
    pillLabel: "Legal",
    title: "Terms of Service",
    subtitle: "Please read and accept the terms that govern your use of CourseCollab.",
    icon: "document-text-outline",
    agreeLabel: "I have read and agree to the Terms of Service",
    continueLabel: "Accept & continue",
  },
  privacy: {
    stepId: "privacy",
    docId: "privacy",
    pillLabel: "Privacy",
    title: "Privacy Policy",
    subtitle: "Learn how CourseCollab collects, uses, and protects your information.",
    icon: "shield-checkmark-outline",
    agreeLabel: "I have read and acknowledge the Privacy Policy",
    continueLabel: "Accept & continue",
  },
  "ai-disclosure": {
    stepId: "ai-disclosure",
    docId: "ai-and-data",
    pillLabel: "AI disclosure",
    title: "AI Use & Data",
    subtitle: "Understand how Cora and other AI features process your course context.",
    icon: "hardware-chip-outline",
    agreeLabel: "I have read and acknowledge the AI Use & Data disclosure",
    continueLabel: "Accept & continue",
  },
}

type OnboardingConsentScreenProps = {
  kind: keyof typeof CONSENT_CONFIG
}

export function OnboardingConsentScreen({ kind }: OnboardingConsentScreenProps) {
  const router = useRouter()
  const { session } = useSession()
  const config = CONSENT_CONFIG[kind]
  const { document, loading, error, source, refresh } = useLegalDocument(config.docId)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!session) replaceAuthRoute(router, "/login")
  }, [router, session])

  async function handleAccept() {
    if (!session) return
    setAccepting(true)
    try {
      const next = await completeOnboardingStepAndResolveNext(session, config.stepId)
      navigatePostSignIn(router, next)
    } finally {
      setAccepting(false)
    }
  }

  if (!session) return null

  return (
    <OnboardingLegalStepLayout
      session={session}
      stepId={config.stepId}
      pillLabel={config.pillLabel}
      title={config.title}
      subtitle={config.subtitle}
      icon={config.icon}
      document={document}
      loading={loading}
      error={error}
      source={source}
      onRetry={refresh}
      agreeLabel={config.agreeLabel}
      continueLabel={config.continueLabel}
      onAccept={() => void handleAccept()}
      accepting={accepting}
    />
  )
}
