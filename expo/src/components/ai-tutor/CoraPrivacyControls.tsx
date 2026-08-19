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
  coraPrivacyStorageKey,
  type CoraPrivacySession,
  type CoraServerPrivacySettings,
} from "../../lib/cora-privacy-api"
import {
  ADMIN_CONTEXT_CATEGORIES,
  ADMIN_MEMORY_TOGGLE_META,
  FACULTY_CONTEXT_CATEGORIES,
  FACULTY_MEMORY_TOGGLE_META,
  LEARNER_CONTEXT_CATEGORIES,
  MEMORY_TOGGLE_META,
  setAllMemoryToggles,
  type CoraLearningMemory,
  type CoraLocalPrivacyStorage,
} from "../../lib/cora-learning-memory"
import { fetchStudentContext } from "../../lib/student-context-api"
import type { StudentContextPayload } from "../../lib/student-context-api"
import type { StudentSession } from "../../lib/session"
import { AppAlert } from "../../lib/app-alert"
import { CoraMemoryManageSheet } from "./CoraMemoryManageSheet"

const CONTEXT_COPY = {
  learner: {
    personalizedTitle: "Personalized learning",
    personalizedBody: "Allow Cora to use performance summaries and topic mastery when answering",
    contextTitle: "Use learning context",
    contextBody: "Include course progress, calendar, notes titles, and similar authorized context in AI requests",
    localMemoryTitle: "Local learning memory",
    localMemoryBody: "Device-only teaching memory toggles — not the same as chat history on CourseCollab servers",
    syncNote:
      "Server-synced privacy preferences apply across devices. Local memory and cleared-memory choices stay on this device.",
    contextSection: "What learning context may include",
    contextIntro:
      "When enabled, Cora may use the categories below. CourseCollab sends only what is needed for each request and does not attach your name, email, student ID, or other account identifiers to external AI requests for personalization alone.",
    memorySection: "Cora memory & personalization (this device)",
  },
  faculty: {
    personalizedTitle: "Personalized teaching assistance",
    personalizedBody: "Allow Cora to use course analytics and teaching patterns when answering",
    contextTitle: "Use course & analytics context",
    contextBody: "Include aggregated assessment, attendance, and practice trends in AI requests — never student names",
    localMemoryTitle: "Local teaching memory",
    localMemoryBody: "Device-only teaching memory toggles — not the same as Cora chat history on CourseCollab servers",
    syncNote:
      "Server-synced Cora privacy preferences apply across devices. Local teaching memory stays on this device.",
    contextSection: "What teaching context may include",
    contextIntro:
      "When enabled, Cora may use the categories below. External AI payloads stay aggregated or pseudonymized — no student names, emails, or roster exports.",
    memorySection: "Cora teaching memory (this device)",
  },
  admin: {
    personalizedTitle: "Personalized operations assistance",
    personalizedBody: "Allow Cora to use institutional summaries when answering admin questions",
    contextTitle: "Use institutional context",
    contextBody: "Include authorized aggregates and pseudonymized directory matches — never bulk PII in model payloads",
    localMemoryTitle: "Local admin memory",
    localMemoryBody: "Device-only workflow memory toggles — separate from audit logs and chat history on servers",
    syncNote:
      "Server-synced Cora privacy preferences apply across devices. Local admin memory stays on this device.",
    contextSection: "What institutional context may include",
    contextIntro:
      "When enabled, Cora may use the categories below. Admin Cora follows the same minimization rules: no names, emails, or internal IDs in external AI requests unless required for an authorized task.",
    memorySection: "Cora workflow memory (this device)",
  },
} as const

type CoraPrivacyControlsProps = {
  session: CoraPrivacySession
  variant?: "learner" | "faculty" | "admin"
  showAiDataLink?: boolean
  showShareWithInstructor?: boolean
}

export function CoraPrivacyControls({
  session,
  variant: variantProp,
  showAiDataLink = true,
  showShareWithInstructor = true,
}: CoraPrivacyControlsProps) {
  const variant =
    variantProp ??
    (session.portal === "faculty" ? "faculty" : session.portal === "admin" ? "admin" : "learner")
  const copy = CONTEXT_COPY[variant]
  const memoryMeta =
    variant === "faculty"
      ? FACULTY_MEMORY_TOGGLE_META
      : variant === "admin"
        ? ADMIN_MEMORY_TOGGLE_META
        : MEMORY_TOGGLE_META
  const contextCategories =
    variant === "faculty"
      ? FACULTY_CONTEXT_CATEGORIES
      : variant === "admin"
        ? ADMIN_CONTEXT_CATEGORIES
        : LEARNER_CONTEXT_CATEGORIES
  const storageKey = coraPrivacyStorageKey(session)
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
        loadCoraLocalPreferences(storageKey),
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
      void saveCoraLocalPreferences(storageKey, next)
    },
    [storageKey],
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
      const next = await clearCoraLearningMemory(storageKey, studentContext)
      setLocalPrefs(next)
    } finally {
      setClearing(false)
    }
  }, [storageKey, studentContext])

  return (
    <>
      <ModuleSection title="Privacy & Personalization">
        <View style={[styles.note, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>
            {copy.syncNote}
          </Text>
        </View>
        <View style={[styles.toggleRow, { borderBottomColor: native.separator }]}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>{copy.personalizedTitle}</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>{copy.personalizedBody}</Text>
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
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>{copy.contextTitle}</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>{copy.contextBody}</Text>
          </View>
          <NativeSwitch
            value={serverPrivacy.useLearningContext}
            disabled={!serverPrivacy.personalizedLearning}
            onValueChange={(v) => updateServer({ useLearningContext: v })}
          />
        </View>
        <View style={[styles.toggleRow, { borderBottomColor: native.separator }]}>
          <View style={styles.toggleCopy}>
            <Text style={[type.bodyEmphasis, styles.toggleTitle]}>{copy.localMemoryTitle}</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>{copy.localMemoryBody}</Text>
          </View>
          <NativeSwitch value={localPrefs.localLearningMemory} onValueChange={setLocalLearningMemory} />
        </View>
        {showShareWithInstructor && variant === "learner" ? (
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
        ) : null}
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

      <ModuleSection title={copy.contextSection}>
        <View style={[styles.hero, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 20 }]}>{copy.contextIntro}</Text>
          {contextCategories.map((item) => (
            <Text key={item} style={[type.caption, styles.bullet, { color: SN.secondaryLabel }]}>
              • {item}
            </Text>
          ))}
        </View>
      </ModuleSection>

      <ModuleSection title={copy.memorySection}>
        {memoryMeta.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.toggleRow,
              index < memoryMeta.length - 1 ? { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth } : null,
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

      <CommSectionFooter>{copy.syncNote}</CommSectionFooter>

      <CoraMemoryManageSheet
        visible={memoryOpen}
        facts={memoryFacts}
        clearedCount={localPrefs.clearedMemoryIds.length}
        onClose={() => setMemoryOpen(false)}
        onRemoveFact={(factId) => {
          void removeCoraMemoryFact(storageKey, factId, localPrefs).then(setLocalPrefs)
        }}
        onRestoreAll={() => {
          void restoreCoraMemoryFacts(storageKey).then(setLocalPrefs)
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
