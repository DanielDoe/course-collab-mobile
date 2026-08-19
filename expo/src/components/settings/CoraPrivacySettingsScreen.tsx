import { StyleSheet, Text, View } from "react-native"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { CoraPrivacyControls } from "../ai-tutor/CoraPrivacyControls"
import { coraPrivacyVariant, type CoraPrivacySession } from "../../lib/cora-privacy-api"

const HERO_COPY = {
  learner: {
    title: "Privacy & Personalization",
    body:
      "Control how Cora uses your learning context. CourseCollab minimizes personal data sent to external AI providers and does not attach your identity to AI requests merely to personalize a response.",
    capability:
      "Cora picks a capability for each task. You will see Cora, Cora Lite, or Advanced Reasoning — never provider names. Your instructor can allow or cap Advanced Reasoning for this course.",
  },
  faculty: {
    title: "Cora Privacy & Data Use",
    body:
      "Control how Cora Teaching Copilot uses course analytics and teaching context. Student rosters are never sent to external AI providers — only aggregated or pseudonymized data when you enable context.",
    capability:
      "Faculty Cora uses the same minimization pipeline as student Cora. Tool reads stay inside CourseCollab; external model calls receive only what is needed for the task.",
  },
  admin: {
    title: "Cora Privacy & Data Use",
    body:
      "Control how Admin Cora uses institutional summaries. Directory search and support workflows stay pseudonymized in external AI payloads unless an authorized task requires more.",
    capability:
      "Admin Cora inherits your platform permissions. Mutations require confirmation; audit receipts record actions taken on your behalf.",
  },
} as const

export function CoraPrivacySettingsScreen({ session }: { session: CoraPrivacySession }) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const variant = coraPrivacyVariant(session)
  const hero = HERO_COPY[variant]

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Cora privacy" fallbackHref="/settings/privacy-security" />
      <ModuleScreen disableTopInsetAdjustment contentStyle={{ paddingTop: NATIVE.pagePadding }}>
        <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.sheetTitle, styles.heroTitle]}>{hero.title}</Text>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>{hero.body}</Text>
        </View>

        <ModuleSection title="How Cora works">
          <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator, marginBottom: 0 }]}>
            <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>{hero.capability}</Text>
          </View>
        </ModuleSection>

        <CoraPrivacyControls
          session={session}
          variant={variant}
          showShareWithInstructor={variant === "learner"}
        />
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  hero: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
    marginBottom: 8,
  },
  heroTitle: { fontSize: 20, marginBottom: 4 },
})
