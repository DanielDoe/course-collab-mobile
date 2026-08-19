import { StyleSheet, Text, View } from "react-native"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { CoraPrivacyControls } from "../ai-tutor/CoraPrivacyControls"
import type { GuestSession, StudentSession, SummerSession } from "../../lib/session"

export function CoraPrivacySettingsScreen({
  session,
}: {
  session: StudentSession | SummerSession | GuestSession
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Cora privacy" fallbackHref="/settings/privacy-security" />
      <ModuleScreen disableTopInsetAdjustment contentStyle={{ paddingTop: NATIVE.pagePadding }}>
        <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.sheetTitle, styles.heroTitle]}>Privacy & Personalization</Text>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
            Control how Cora uses your learning context. CourseCollab minimizes personal data sent to external AI
            providers and does not attach your identity to AI requests merely to personalize a response.
          </Text>
        </View>

        <ModuleSection title="How Cora works">
          <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator, marginBottom: 0 }]}>
            <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
              Cora picks a capability for each task. You will see Cora, Cora Lite, or Advanced Reasoning — never provider
              names. Your instructor can allow or cap Advanced Reasoning for this course.
            </Text>
          </View>
        </ModuleSection>

        <CoraPrivacyControls session={session} />
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
