import { StyleSheet, Text, View } from "react-native"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { CoraPrivacyControls } from "./CoraPrivacyControls"
import type { StudentSession } from "../../lib/session"
import type { CoraSectionId } from "../../lib/cora-nav-config"

export function CoraPreferencesTab({
  session,
  onNavigateSection,
}: {
  session: StudentSession
  onNavigateSection: (section: CoraSectionId) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <ModuleScreen contentStyle={{ paddingTop: NATIVE.pagePadding }}>
      <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <Text style={[type.sheetTitle, styles.heroTitle]}>Cora preferences</Text>
        <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
          Manage privacy, personalization, and learning memory for Cora on this device.
        </Text>
      </View>

        <CoraPrivacyControls session={session} />

      <ModuleSection title="Study Plan">
        <View style={[styles.linkRow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.bodyEmphasis]}>Generate study plan</Text>
          <Text
            style={[type.caption, { color: SN.accent, fontWeight: "600" }]}
            onPress={() => onNavigateSection("study-plan")}
          >
            Open Study Plan
          </Text>
        </View>
      </ModuleSection>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
    marginBottom: 8,
  },
  heroTitle: { fontSize: 20, marginBottom: 4 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
