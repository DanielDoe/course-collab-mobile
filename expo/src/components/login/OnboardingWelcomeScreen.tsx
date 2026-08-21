import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import {
  completeOnboardingStepAndResolveNext,
  onboardingStepsForPortal,
  type OnboardingStepId,
} from "../../lib/onboarding"
import { navigatePostSignIn, replaceAuthRoute } from "../../lib/navigation-reset"
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
    label: "Terms of Service",
    description: "How you may use CourseCollab",
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
      navigatePostSignIn(router, next)
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
      subtitle="Before your dashboard, we'll walk through legal disclosures, AI settings, and a few preferences. This takes about two minutes."
      scrollable
      footer={
        <LoginButton
          label="Get started"
          icon="arrow-forward"
          onPress={() => void handleContinue()}
          loading={continuing}
        />
      }
    >
      <View style={styles.cards}>
        {steps.map((step, index) => {
          const card = STEP_CARDS[step]
          return (
            <View
              key={step}
              style={[styles.card, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}
            >
              <View style={[styles.iconTile, { backgroundColor: LOGIN.soft }]}>
                <Ionicons name={card.icon} size={20} color={LOGIN.purple} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>
                  {index + 1}. {card.label}
                </Text>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 20 }]}>
                  {card.description}
                </Text>
              </View>
            </View>
          )
        })}
      </View>

      <Pressable
        style={[styles.note, { backgroundColor: LOGIN.fill, borderColor: LOGIN.separator }]}
        accessibilityRole="text"
      >
        <Ionicons name="information-circle-outline" size={18} color={LOGIN.purple} />
        <Text style={[loginType.body, styles.noteText, { color: LOGIN.label }]}>
          You can review Privacy, Terms, and AI disclosures anytime under Settings → Privacy & legal.
        </Text>
      </Pressable>
    </OnboardingShell>
  )
}

const styles = StyleSheet.create({
  cards: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, gap: 4 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteText: { flex: 1, lineHeight: 22 },
})
