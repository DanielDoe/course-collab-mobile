import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { CommSectionFooter } from "../faculty/faculty-communication-ui"
import { NativeSwitch } from "../NativeSwitch"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  loadCoraPreferences,
  saveCoraPreferences,
  type CoraLearningMemory,
} from "../../lib/cora-preferences-storage"
import type { StudentSession } from "../../lib/session"
import type { CoraSectionId } from "../../lib/cora-nav-config"

const MEMORY_BULLETS = [
  "Weak topics & frequent mistakes",
  "Preferred explanation style",
  "Coding habits & learning goals",
  "Conversation context across sessions",
]

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
  const [prefs, setPrefs] = useState<CoraLearningMemory>({
    rememberGaps: true,
    detectConfusion: true,
  })

  useEffect(() => {
    void loadCoraPreferences(session.databaseId).then(setPrefs)
  }, [session.databaseId])

  const updatePref = (key: keyof CoraLearningMemory, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    void saveCoraPreferences(session.databaseId, next)
  }

  return (
    <ModuleScreen contentStyle={{ paddingTop: NATIVE.pagePadding }}>
      <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <Text style={[type.sheetTitle, styles.heroTitle]}>Cora Memory</Text>
        <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
          Cora remembers your context so you never repeat yourself.
        </Text>
        {MEMORY_BULLETS.map((bullet) => (
          <Text key={bullet} style={[type.caption, styles.bullet, { color: SN.secondaryLabel }]}>
            • {bullet}
          </Text>
        ))}
      </View>

      <ModuleSection title="How Cora works">
        <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator, marginBottom: 0 }]}>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
            Cora picks a capability for each task. You will see Cora, Cora Lite, or Advanced Reasoning — never provider names. Your instructor can allow or cap Advanced Reasoning for this course.
          </Text>
        </View>
      </ModuleSection>

      <ModuleSection title="Learning Memory">
        <View style={[styles.toggleRow, { borderBottomColor: native.separator }]}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>Remember gaps</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              Track topics you struggle with across sessions
            </Text>
          </View>
          <NativeSwitch value={prefs.rememberGaps} onValueChange={(v) => updatePref("rememberGaps", v)} />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>Detect confusion</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              Adjust explanations when Cora detects misunderstanding
            </Text>
          </View>
          <NativeSwitch value={prefs.detectConfusion} onValueChange={(v) => updatePref("detectConfusion", v)} />
        </View>
      </ModuleSection>

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

      <CommSectionFooter>
        Preferences are saved on this device and passed to Cora chat context when supported.
      </CommSectionFooter>
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
  bullet: { lineHeight: 18, marginLeft: 2 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleCopy: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 15 },
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
