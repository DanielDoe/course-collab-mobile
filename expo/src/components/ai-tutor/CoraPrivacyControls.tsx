import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleSection } from "../modules/ModuleScreen"
import { CommSectionFooter } from "../faculty/faculty-communication-ui"
import { NativeSwitch } from "../NativeSwitch"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  clearCoraLearningMemory,
  deriveVisibleMemoryFacts,
  loadCoraLocalPreferences,
  removeCoraMemoryFact,
  restoreCoraMemoryFacts,
  saveCoraLocalPreferences,
} from "../../lib/cora-preferences-storage"
import {
  fetchCoraServerPrivacy,
  updateCoraServerPrivacy,
  type CoraServerPrivacySettings,
} from "../../lib/cora-privacy-api"
import {
  MEMORY_TOGGLE_META,
  setAllMemoryToggles,
  type CoraLearningMemory,
  type CoraLocalPrivacyStorage,
} from "../../lib/cora-learning-memory"
import { fetchStudentContext } from "../../lib/student-context-api"
import type { StudentContextPayload } from "../../lib/student-context-api"
import type { GuestSession, StudentSession, SummerSession } from "../../lib/session"

type CoraPrivacySession = StudentSession | SummerSession | GuestSession
import { AppAlert } from "../../lib/app-alert"
import { CoraMemoryManageSheet } from "./CoraMemoryManageSheet"

const CONTEXT_CATEGORIES = [
  "Course enrollment and section",
  "Grades and assessment scores",
  "Upcoming deadlines and calendar events",
  "Topics you struggle with or excel at",
  "Note and flashcard titles (not full content unless attached)",
]

type CoraPrivacyControlsProps = {
  session: CoraPrivacySession
  showAiDataLink?: boolean
}

export function CoraPrivacyControls({ session, showAiDataLink = true }: CoraPrivacyControlsProps) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const router = useRouter()
  const [serverPrivacy, setServerPrivacy] = useState<CoraServerPrivacySettings>({
    personalizedLearning: true,
    useLearningContext: true,
    shareWithInstructor: false,
  })
  const [localPrefs, setLocalPrefs] = useState<CoraLocalPrivacyStorage>({
    localLearningMemory: true,
    memory: {
      "remember-gaps": true,
      "detect-confusion": true,
      "remember-strengths": true,
      "use-course-progress": true,
      "remember-preferences": true,
    },
    clearedMemoryIds: [],
  })
  const [studentContext, setStudentContext] = useState<StudentContextPayload | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    void (async () => {
      const [server, local, ctx] = await Promise.all([
        fetchCoraServerPrivacy(session),
        loadCoraLocalPreferences(session.databaseId),
        session.portal === "student"
          ? fetchStudentContext(session).catch(() => null)
          : Promise.resolve(null),
      ])
      setServerPrivacy(server)
      setLocalPrefs(local)
      setStudentContext(ctx)
    })()
  }, [session])

  const memoryFacts = useMemo(
    () => deriveVisibleMemoryFacts(localPrefs, studentContext),
    [localPrefs, studentContext],
  )

  const updateServer = useCallback(
    (patch: Partial<CoraServerPrivacySettings>) => {
      setServerPrivacy((current) => {
        const next = { ...current, ...patch }
        if (patch.personalizedLearning === false) next.useLearningContext = false
        void updateCoraServerPrivacy(session, patch)
        return next
      })
    },
    [session],
  )

  const persistLocal = useCallback(
    (next: CoraLocalPrivacyStorage) => {
      setLocalPrefs(next)
      void saveCoraLocalPreferences(session.databaseId, next)
    },
    [session.databaseId],
  )

  const updateMemoryToggle = useCallback(
    (id: keyof CoraLearningMemory, value: boolean) => {
      persistLocal({
        ...localPrefs,
        memory: { ...localPrefs.memory, [id]: value },
      })
    },
    [localPrefs, persistLocal],
  )

  const setLocalLearningMemory = useCallback(
    (enabled: boolean) => {
      persistLocal(setAllMemoryToggles(localPrefs, enabled))
    },
    [localPrefs, persistLocal],
  )

  const handleClearMemory = useCallback(async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      AppAlert.alert(
        "Clear Cora learning memory?",
        "This removes the active memory facts Cora is using for personalization on this device. Your toggles stay as they are.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Clear", style: "destructive", onPress: () => resolve(true) },
        ],
      )
    })
    if (!confirmed) return
    setClearing(true)
    try {
      const next = await clearCoraLearningMemory(session.databaseId, studentContext)
      setLocalPrefs(next)
    } finally {
      setClearing(false)
    }
  }, [session.databaseId, studentContext])

  return (
    <>
      <ModuleSection title="Privacy & Personalization">
        <View style={[styles.note, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
            Personalized learning and learning context sync to your CourseCollab account. Teaching-style memory toggles
            below are stored on this device only.
          </Text>
        </View>
        <View style={[styles.toggleRow, { borderBottomColor: native.separator }]}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>Personalized learning</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              Allow Cora to use performance summaries and topic mastery when answering
            </Text>
          </View>
          <NativeSwitch
            value={serverPrivacy.personalizedLearning}
            onValueChange={(v) =>
              updateServer({ personalizedLearning: v, ...(v ? {} : { useLearningContext: false }) })
            }
          />
        </View>
        <View style={[styles.toggleRow, { borderBottomColor: native.separator }]}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>Use learning context</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              Include course progress, calendar, notes titles, and similar authorized context in AI requests
            </Text>
          </View>
          <NativeSwitch
            value={serverPrivacy.useLearningContext}
            disabled={!serverPrivacy.personalizedLearning}
            onValueChange={(v) => updateServer({ useLearningContext: v })}
          />
        </View>
        <View style={[styles.toggleRow, { borderBottomColor: native.separator }]}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>Local learning memory</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              Device-only teaching memory toggles — not the same as chat history on CourseCollab servers
            </Text>
          </View>
          <NativeSwitch value={localPrefs.localLearningMemory} onValueChange={setLocalLearningMemory} />
        </View>
        <View style={[styles.toggleRow, { borderBottomColor: native.separator }]}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>Share with instructor</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              Share summarized Cora activity with your instructor — not full conversations (off by default)
            </Text>
          </View>
          <NativeSwitch
            value={serverPrivacy.shareWithInstructor}
            onValueChange={(v) => updateServer({ shareWithInstructor: v })}
          />
        </View>
        <Pressable
          style={[styles.actionRow, { borderBottomColor: native.separator }]}
          onPress={() => void handleClearMemory()}
          disabled={clearing}
          accessibilityRole="button"
        >
          <Text style={[type.bodyEmphasis, { color: SN.accent }]}>Clear Cora learning memory</Text>
        </Pressable>
        {showAiDataLink ? (
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push("/settings/ai-data" as never)}
            accessibilityRole="button"
          >
            <Text style={[type.bodyEmphasis]}>AI data & privacy</Text>
            <Text style={[type.caption, { color: SN.accent, fontWeight: "600" }]}>Learn more</Text>
          </Pressable>
        ) : null}
      </ModuleSection>

      <ModuleSection title="What learning context may include">
        <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
            When enabled, Cora may use the categories below. CourseCollab sends only what is needed for each request and
            does not attach your name, email, student ID, or other account identifiers to external AI requests for
            personalization alone.
          </Text>
          {CONTEXT_CATEGORIES.map((item) => (
            <Text key={item} style={[type.caption, styles.bullet, { color: SN.secondaryLabel }]}>
              • {item}
            </Text>
          ))}
        </View>
      </ModuleSection>

      <ModuleSection title="Cora memory & personalization (this device)">
        {MEMORY_TOGGLE_META.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.toggleRow,
              index < MEMORY_TOGGLE_META.length - 1 ? { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth } : null,
            ]}
          >
            <View style={styles.toggleCopy}>
              <Text style={[type.bodyEmphasis, styles.toggleTitle]}>{item.label}</Text>
              <Text style={[type.caption, { color: SN.secondaryLabel }]}>{item.description}</Text>
            </View>
            <NativeSwitch
              value={localPrefs.memory[item.id]}
              disabled={!localPrefs.localLearningMemory}
              onValueChange={(v) => updateMemoryToggle(item.id, v)}
            />
          </View>
        ))}
        <Pressable
          style={[styles.manageRow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
          onPress={() => setMemoryOpen(true)}
          accessibilityRole="button"
        >
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>Manage Cora memory</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              See and remove what Cora remembers about you
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </Pressable>
      </ModuleSection>

      <CommSectionFooter>
        Server-synced privacy preferences apply across devices. Local memory and cleared-memory choices stay on this
        device.
      </CommSectionFooter>

      <CoraMemoryManageSheet
        visible={memoryOpen}
        facts={memoryFacts}
        clearedCount={localPrefs.clearedMemoryIds.length}
        onClose={() => setMemoryOpen(false)}
        onRemoveFact={(factId) => {
          void removeCoraMemoryFact(session.databaseId, factId, localPrefs).then(setLocalPrefs)
        }}
        onRestoreAll={() => {
          void restoreCoraMemoryFacts(session.databaseId).then(setLocalPrefs)
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  note: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  hero: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  bullet: { lineHeight: 18, marginLeft: 2 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleCopy: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 15 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
