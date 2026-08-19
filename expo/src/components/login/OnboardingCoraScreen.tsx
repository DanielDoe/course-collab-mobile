import { useCallback, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { NativeSwitch } from "../NativeSwitch"
import { useSession } from "../../context/SessionProvider"
import {
  completeOnboardingStepAndResolveNext,
  isLearnerPortal,
} from "../../lib/onboarding"
import {
  fetchCoraServerPrivacy,
  updateCoraServerPrivacy,
  type CoraServerPrivacySettings,
} from "../../lib/cora-privacy-api"
import { loadCoraLocalPreferences, saveCoraLocalPreferences } from "../../lib/cora-preferences-storage"
import { setAllMemoryToggles, type CoraLocalPrivacyStorage } from "../../lib/cora-learning-memory"
import { navigatePostSignIn, replaceAuthRoute } from "../../lib/navigation-reset"
import { NATIVE } from "../../constants/faculty-native-theme"
import { LoginButton } from "./LoginButton"
import { OnboardingShell } from "./onboarding-ui"
import { useLoginTheme } from "./login-theme"

function OnboardingToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
}: {
  title: string
  description: string
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
}) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={[styles.toggleRow, { borderBottomColor: LOGIN.separator }]}>
      <View style={styles.toggleCopy}>
        <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>{title}</Text>
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 20 }]}>
          {description}
        </Text>
      </View>
      <NativeSwitch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  )
}

export function OnboardingCoraScreen() {
  const router = useRouter()
  const { session } = useSession()
  const { LOGIN, loginType } = useLoginTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    if (!session) {
      replaceAuthRoute(router, "/login")
      return
    }
    if (!isLearnerPortal(session)) {
      void (async () => {
        const next = await completeOnboardingStepAndResolveNext(session, "cora")
        navigatePostSignIn(router, next)
      })()
      return
    }

    void (async () => {
      const [server, local] = await Promise.all([
        fetchCoraServerPrivacy(session),
        loadCoraLocalPreferences(session.databaseId),
      ])
      setServerPrivacy(server)
      setLocalPrefs(local)
      setLoading(false)
    })()
  }, [router, session])

  const updateServer = useCallback(
    (patch: Partial<CoraServerPrivacySettings>) => {
      if (!session || !isLearnerPortal(session)) return
      setServerPrivacy((current) => {
        const next = { ...current, ...patch }
        if (patch.personalizedLearning === false) next.useLearningContext = false
        void updateCoraServerPrivacy(session, patch)
        return next
      })
    },
    [session],
  )

  const setLocalLearningMemory = useCallback(
    (enabled: boolean) => {
      if (!session || !isLearnerPortal(session)) return
      const next = setAllMemoryToggles(localPrefs, enabled)
      setLocalPrefs(next)
      void saveCoraLocalPreferences(session.databaseId, next)
    },
    [localPrefs, session],
  )

  async function handleContinue() {
    if (!session || !isLearnerPortal(session)) return
    setSaving(true)
    try {
      const next = await completeOnboardingStepAndResolveNext(session, "cora")
      navigatePostSignIn(router, next)
    } finally {
      setSaving(false)
    }
  }

  if (!session || !isLearnerPortal(session)) return null

  return (
    <OnboardingShell
      session={session}
      stepId="cora"
      pillLabel="Cora AI"
      icon="sparkles"
      title="Cora privacy & personalization"
      subtitle="Choose how Cora uses your learning context. You can change these anytime in Settings."
      scrollable
      footer={
        <LoginButton
          label="Save & continue"
          icon="arrow-forward"
          onPress={() => void handleContinue()}
          loading={saving}
          disabled={loading}
        />
      }
    >
      <View style={[styles.card, { backgroundColor: LOGIN.grouped, borderColor: LOGIN.separator }]}>
        <View style={[styles.callout, { backgroundColor: LOGIN.fill, borderColor: LOGIN.separator }]}>
          <Ionicons name="information-circle-outline" size={18} color={LOGIN.purple} />
          <Text style={[loginType.body, styles.calloutText, { color: LOGIN.label }]}>
            Cora is CourseCollab&apos;s AI assistant. These settings control personalization — not whether you can use
            Cora at all.
          </Text>
        </View>

        {loading ? (
          <Text style={[loginType.info, { color: LOGIN.secondaryLabel, padding: 14 }]}>Loading preferences…</Text>
        ) : (
          <>
            <OnboardingToggleRow
              title="Personalized learning"
              description="Allow Cora to use performance summaries and topic mastery when answering."
              value={serverPrivacy.personalizedLearning}
              onValueChange={(v) =>
                updateServer({ personalizedLearning: v, ...(v ? {} : { useLearningContext: false }) })
              }
            />
            <OnboardingToggleRow
              title="Use learning context"
              description="Include course progress, calendar, and similar authorized context in AI requests."
              value={serverPrivacy.useLearningContext}
              disabled={!serverPrivacy.personalizedLearning}
              onValueChange={(v) => updateServer({ useLearningContext: v })}
            />
            <OnboardingToggleRow
              title="Local learning memory"
              description="Device-only teaching memory — separate from chat history on CourseCollab servers."
              value={localPrefs.localLearningMemory}
              onValueChange={setLocalLearningMemory}
            />
            <View style={[styles.toggleRow, styles.toggleRowLast]}>
              <View style={styles.toggleCopy}>
                <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>Share with instructor</Text>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 20 }]}>
                  Share summarized Cora activity with your instructor — off by default.
                </Text>
              </View>
              <NativeSwitch
                value={serverPrivacy.shareWithInstructor}
                onValueChange={(v) => updateServer({ shareWithInstructor: v })}
              />
            </View>
          </>
        )}
      </View>

      <Pressable style={[styles.linkRow]} accessibilityRole="button" disabled>
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 20, textAlign: "center" }]}>
          Full AI & Data disclosure was shown in the previous step. Manage detailed memory toggles later in Settings →
          Cora privacy.
        </Text>
      </Pressable>
    </OnboardingShell>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  callout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    margin: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  calloutText: { flex: 1, lineHeight: 22 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleCopy: { flex: 1, gap: 4 },
  linkRow: { paddingHorizontal: 4 },
})
