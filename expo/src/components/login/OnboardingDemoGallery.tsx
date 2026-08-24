import type { ReactNode } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AI_AND_DATA } from "../../content/legal/ai-and-data"
import { PRIVACY_POLICY } from "../../content/legal/privacy-policy"
import { TERMS_OF_SERVICE } from "../../content/legal/terms-of-service"
import type { StudentSession } from "../../lib/session"
import { onboardingStepMeta } from "../../lib/onboarding"
import { NativeSwitch } from "../NativeSwitch"
import {
  OnboardingAcceptFooter,
  OnboardingLegalContent,
  OnboardingShell,
} from "./onboarding-ui"
import { useLoginTheme } from "./login-theme"

/** Static mock — demo gallery only, no auth required. */
export const ONBOARDING_DEMO_SESSION: StudentSession = {
  portal: "student",
  id: "DEMO",
  name: "Alex Johnson",
  section: "P01",
  databaseId: "onboarding-demo",
  courseCode: "ECE 2202",
  courseTitle: "ECE 2202",
  expiresAt: Date.now() + 86_400_000,
}

function DemoFrame({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={styles.frameWrap}>
      <Text style={[loginType.fieldLabel, styles.frameLabel, { color: LOGIN.secondaryLabel }]}>
        {label}
      </Text>
      <View style={[styles.phoneFrame, { borderColor: LOGIN.separator, backgroundColor: LOGIN.canvas }]}>
        {children}
      </View>
    </View>
  )
}

function DemoWelcome() {
  const { LOGIN, loginType } = useLoginTheme()
  const session = ONBOARDING_DEMO_SESSION
  const steps = [
    { icon: "document-text-outline" as const, label: "Terms & Policies", description: "Terms of Service, Privacy Policy, and AI Use & Data — one acceptance" },
    { icon: "sparkles" as const, label: "Cora Settings", description: "Choose your AI personalization preferences" },
    { icon: "color-palette-outline" as const, label: "Appearance", description: "Pick your theme and light or dark mode" },
  ]

  return (
    <OnboardingShell
      session={session}
      stepId="welcome"
      pillLabel="Getting started"
      icon="hand-left-outline"
      title="Welcome, Alex"
      subtitle="Before your dashboard, we'll walk through legal agreements, AI settings, and a few preferences."
      scrollable={false}
      footer={<View style={[styles.demoCta, { backgroundColor: LOGIN.purple }]}>
        <Text style={[loginType.button, { color: "#fff" }]}>Get started →</Text>
      </View>}
    >
      <View style={styles.cards}>
        {steps.map((step, index) => (
          <View
            key={step.label}
            style={[styles.card, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}
          >
            <View style={[styles.iconTile, { backgroundColor: LOGIN.soft }]}>
              <Ionicons name={step.icon} size={18} color={LOGIN.purple} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>
                {index + 1}. {step.label}
              </Text>
              <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 18 }]}>
                {step.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingShell>
  )
}

function DemoLegal() {
  const session = ONBOARDING_DEMO_SESSION
  const { stepIndex, totalSteps, progress } = onboardingStepMeta(session, "terms")
  const { LOGIN, loginType } = useLoginTheme()
  const documents = [TERMS_OF_SERVICE, PRIVACY_POLICY, AI_AND_DATA]

  return (
    <View style={[styles.legalDemo, { backgroundColor: LOGIN.canvas }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { backgroundColor: LOGIN.separator }]}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: LOGIN.purple }]} />
        </View>
        <Text style={[styles.progressLabel, { color: LOGIN.secondaryLabel }]}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
      </View>
      <View style={styles.legalHeader}>
        <View style={[styles.pill, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
          <Ionicons name="document-text-outline" size={12} color={LOGIN.purple} />
          <Text style={[styles.pillText, { color: LOGIN.purple }]}>Legal</Text>
        </View>
        <Text style={[loginType.heroTitle, styles.legalTitle]}>Terms & Policies</Text>
        <Text style={[loginType.heroSubtitle, styles.legalSubtitle]}>
          Please read the Terms of Service, Privacy Policy, and AI Use & Data disclosure. One acceptance covers all three.
        </Text>
      </View>
      <View style={styles.legalScrollHost}>
        <ScrollView style={styles.legalScroll} nestedScrollEnabled showsVerticalScrollIndicator>
          {documents.map((document) => (
            <OnboardingLegalContent key={document.title} document={document} showTitle />
          ))}
        </ScrollView>
      </View>
      <View style={[styles.footerPreview, { borderTopColor: LOGIN.separator }]}>
        <OnboardingAcceptFooter
          agreeLabel="I have read and agree to the Terms of Service, Privacy Policy, and AI Use & Data disclosure"
          continueLabel="Accept & continue"
          checked
          onToggleCheck={() => {}}
          onContinue={() => {}}
        />
      </View>
    </View>
  )
}

function DemoCora() {
  const session = ONBOARDING_DEMO_SESSION
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <OnboardingShell
      session={session}
      stepId="cora"
      pillLabel="Cora AI"
      icon="sparkles"
      title="Cora privacy & personalization"
      subtitle="Choose how Cora uses your learning context."
      scrollable={false}
      footer={
        <View style={[styles.demoCta, { backgroundColor: LOGIN.purple }]}>
          <Text style={[loginType.button, { color: "#fff" }]}>Save & continue →</Text>
        </View>
      }
    >
      <View style={[styles.coraCard, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}>
        {[
          ["Personalized learning", "Performance summaries and topic mastery", true],
          ["Use learning context", "Course progress, calendar, and notes titles", true],
          ["Local learning memory", "Device-only teaching memory", true],
          ["Share with instructor", "Summarized activity — off by default", false],
        ].map(([title, desc, on]) => (
          <View key={title as string} style={[styles.toggleRow, { borderBottomColor: LOGIN.separator }]}>
            <View style={styles.toggleCopy}>
              <Text style={[loginType.stepLabel, { color: LOGIN.label, fontSize: 14 }]}>{title as string}</Text>
              <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 18 }]}>{desc as string}</Text>
            </View>
            <NativeSwitch value={on as boolean} onValueChange={() => {}} />
          </View>
        ))}
      </View>
    </OnboardingShell>
  )
}

function DemoAppearance() {
  const session = ONBOARDING_DEMO_SESSION
  const { LOGIN, loginType } = useLoginTheme()
  const { stepIndex, totalSteps, progress } = onboardingStepMeta(session, "appearance")

  return (
    <View style={[styles.appearanceDemo, { backgroundColor: LOGIN.canvas }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { backgroundColor: LOGIN.separator }]}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: LOGIN.purple }]} />
        </View>
        <Text style={[styles.progressLabel, { color: LOGIN.secondaryLabel }]}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
      </View>
      <View style={styles.legalHeader}>
        <View style={[styles.pill, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
          <Ionicons name="color-palette-outline" size={12} color={LOGIN.purple} />
          <Text style={[styles.pillText, { color: LOGIN.purple }]}>Personalize CourseCollab</Text>
        </View>
        <Text style={[loginType.heroTitle, styles.legalTitle]}>Welcome, Alex</Text>
        <Text style={[loginType.heroSubtitle, styles.legalSubtitle]}>
          Pick a theme and light or dark mode.
        </Text>
      </View>
      <Text style={[loginType.fieldLabel, { color: LOGIN.secondaryLabel, marginBottom: 8 }]}>Appearance Mode</Text>
      <View style={styles.modeRow}>
        {["Light", "Dark", "System"].map((mode, i) => (
          <View
            key={mode}
            style={[
              styles.modeChip,
              {
                borderColor: i === 0 ? LOGIN.purple : LOGIN.separator,
                backgroundColor: i === 0 ? LOGIN.soft : LOGIN.grouped,
              },
            ]}
          >
            <Text style={[loginType.info, { color: i === 0 ? LOGIN.purple : LOGIN.secondaryLabel, fontWeight: "600" }]}>
              {mode}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.themeGrid}>
        {[
          { name: "Cougar Crimson", color: "#C8102E" },
          { name: "Ocean", color: "#0077B6" },
          { name: "Midnight", color: "#1E293B" },
        ].map((theme, i) => (
          <View
            key={theme.name}
            style={[
              styles.themeCard,
              {
                borderColor: i === 0 ? theme.color : LOGIN.separator,
                backgroundColor: LOGIN.grouped,
              },
            ]}
          >
            <View style={[styles.themeSwatch, { backgroundColor: theme.color }]} />
            <Text style={[loginType.info, { color: LOGIN.label, fontWeight: "600" }]}>{theme.name}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.demoCta, { backgroundColor: LOGIN.purple, marginTop: 12 }]}>
        <Text style={[loginType.button, { color: "#fff" }]}>Continue to dashboard →</Text>
      </View>
    </View>
  )
}

export function OnboardingDemoGallery() {
  const insets = useSafeAreaInsets()
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: LOGIN.canvas }}
      contentContainerStyle={[styles.gallery, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.galleryBanner, { backgroundColor: LOGIN.soft, borderColor: LOGIN.softBorder }]}>
        <Ionicons name="images-outline" size={18} color={LOGIN.purple} />
        <Text style={[loginType.body, { color: LOGIN.purple, fontWeight: "600", flex: 1 }]}>
          Onboarding flow preview — static demo for design confirmation
        </Text>
      </View>

      <DemoFrame label="1 · Welcome">
        <DemoWelcome />
      </DemoFrame>

      <DemoFrame label="2 · Terms & Policies">
        <DemoLegal />
      </DemoFrame>

      <DemoFrame label="3 · Cora Settings">
        <DemoCora />
      </DemoFrame>

      <DemoFrame label="4 · Appearance → Dashboard">
        <DemoAppearance />
      </DemoFrame>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  gallery: { paddingHorizontal: 16, gap: 28 },
  galleryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  frameWrap: { gap: 8 },
  frameLabel: { paddingHorizontal: 4, letterSpacing: 0.3 },
  phoneFrame: {
    height: 640,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  cards: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, gap: 2 },
  demoCta: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  legalDemo: { flex: 1 },
  progressTrack: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 4 },
  progressBar: { height: 4, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  progressLabel: { fontSize: 11, fontWeight: "600" },
  legalHeader: { alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: 11, fontWeight: "600" },
  legalTitle: { fontSize: 22, lineHeight: 28, textAlign: "center" },
  legalSubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 8 },
  legalScrollHost: { flex: 1, minHeight: 0 },
  legalScroll: { flex: 1, paddingHorizontal: 16 },
  footerPreview: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  coraCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleCopy: { flex: 1, gap: 2 },
  appearanceDemo: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  modeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeGrid: { flexDirection: "row", gap: 8 },
  themeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    padding: 8,
    gap: 6,
  },
  themeSwatch: { height: 48, borderRadius: 8 },
})
