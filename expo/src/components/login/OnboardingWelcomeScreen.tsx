import { useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import {
  completeOnboardingStepAndResolveNext,
  onboardingStepsForPortal,
  type OnboardingStepId,
} from "../../lib/onboarding"
import { advanceAuthOnboarding, replaceAuthRoute } from "../../lib/navigation-reset"
import { LoginButton } from "./LoginButton"
import { OnboardingShell } from "./onboarding-ui"
import { useLoginTheme } from "./login-theme"

const STEP_CARDS: Record<
  OnboardingStepId,
  { icon: keyof typeof Ionicons.glyphMap; label: string; description: string }
> = {
  welcome: {
    icon: "sparkles-outline",
    label: "Welcome",
    description: "A quick overview before you start",
  },
  terms: {
    icon: "document-text-outline",
    label: "Terms & Policies",
    description: "Terms of Service, Privacy Policy, and AI Use & Data — one acceptance",
  },
  privacy: {
    icon: "shield-checkmark-outline",
    label: "Privacy Policy",
    description: "How we collect and protect your data",
  },
  "ai-disclosure": {
    icon: "hardware-chip-outline",
    label: "AI Use Disclosure",
    description: "How Cora and AI features work",
  },
  cora: {
    icon: "sparkles",
    label: "Cora Settings",
    description: "Choose your AI personalization preferences",
  },
  appearance: {
    icon: "color-palette-outline",
    label: "Appearance",
    description: "Pick your theme and light or dark mode",
  },
}

export function OnboardingWelcomeScreen() {
  const router = useRouter()
  const { session } = useSession()
  const { LOGIN, loginType } = useLoginTheme()
  const [continuing, setContinuing] = useState(false)

  const steps = useMemo(() => {
    if (!session) return []
    return onboardingStepsForPortal(session.portal).filter((step) => step !== "welcome")
  }, [session])

  const firstName = useMemo(() => {
    if (!session) return null
    const name = "name" in session ? session.name?.trim() : null
    if (!name) return null
    return name.split(/\s+/)[0]
  }, [session])

  useEffect(() => {
    if (!session) replaceAuthRoute(router, "/login")
  }, [router, session])

  async function handleContinue() {
    if (!session) return
    setContinuing(true)
    try {
      const next = await completeOnboardingStepAndResolveNext(session, "welcome")
      advanceAuthOnboarding(router, next)
    } finally {
      setContinuing(false)
    }
  }

  if (!session) return null

  return (
    <OnboardingShell
      session={session}
      stepId="welcome"
      pillLabel="Getting started"
      icon="hand-left-outline"
      title={firstName ? `Welcome, ${firstName}` : "Welcome to CourseCollab"}
      subtitle="Legal agreements, AI settings, and a few preferences — about two minutes."
      compact
      scrollable={steps.length > 4}
      footer={
        <View style={styles.footerStack}>
          <View style={[styles.note, { backgroundColor: LOGIN.fill, borderColor: LOGIN.separator }]}>
            <Ionicons name="information-circle-outline" size={16} color={LOGIN.purple} />
            <Text style={[loginType.info, styles.noteText, { color: LOGIN.secondaryLabel }]}>
              Review Privacy, Terms, and AI disclosures anytime under Settings → Privacy & legal.
            </Text>
          </View>
          <LoginButton
            label="Get started"
            icon="arrow-forward"
            onPress={() => void handleContinue()}
            loading={continuing}
          />
        </View>
      }
    >
      <View style={styles.section}>
        <Text style={[loginType.fieldLabel, styles.sectionLabel, { color: LOGIN.secondaryLabel }]}>
          What&apos;s next
        </Text>
        <View style={[styles.checklist, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}>
          {steps.map((step, index) => {
            const card = STEP_CARDS[step]
            const last = index === steps.length - 1
            return (
              <View
                key={step}
                style={[
                  styles.checklistRow,
                  !last && { borderBottomColor: LOGIN.separator, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.iconTile, { backgroundColor: LOGIN.soft }]}>
                  <Ionicons name={card.icon} size={18} color={LOGIN.purple} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>
                    {index + 1}. {card.label}
                  </Text>
                  <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 18 }]}>
                    {card.description}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    </OnboardingShell>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionLabel: { paddingHorizontal: 2 },
  checklist: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, gap: 2 },
  footerStack: { gap: 10, width: "100%" },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteText: { flex: 1, lineHeight: 18 },
})
