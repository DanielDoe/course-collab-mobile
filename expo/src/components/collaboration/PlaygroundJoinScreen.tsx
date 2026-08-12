import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import {
  clearLastPlaygroundClassroomSession,
  clearPlaygroundSessionLock,
  getPlaygroundSessionLock,
  playgroundLockRoute,
  setLastPlaygroundClassroomSession,
  upsertPlaygroundSessionLock,
  type PlaygroundSessionLock,
} from "../../lib/playground-session-lock"
import { isPlaygroundAttemptResumable } from "../../lib/playground-attempt-status"
import {
  PLAYGROUND_ALREADY_JOINED_MESSAGE,
  PLAYGROUND_ALREADY_JOINED_TITLE,
} from "../../lib/playground-join-guard"
import {
  collaborationApi,
  type PlaygroundJoinResult,
  type PlaygroundPracticeSet} from "../../lib/collaboration-api"
import { CollabFlowHeader } from "./collab-nav"
import { CollabSectionTitle } from "./collab-shared"
import { useCollabTheme } from "./collab-module-ui"

type JoinMode = "CLASSROOM" | "PERSONAL"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function parseInitialMode(value: string | string[] | undefined): JoinMode {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.toLowerCase() === "personal" ? "PERSONAL" : "CLASSROOM"
}

function navigateAfterJoin(router: ReturnType<typeof useRouter>, result: PlaygroundJoinResult) {
  if (!result.sessionId || !result.resultId) return
  const params = `sessionId=${result.sessionId}&resultId=${result.resultId}`
  if (result.waitingRoom && !result.gameStarted) {
    router.replace(`/collaboration/playground/waiting?${params}` as never)
  } else {
    router.replace(`/collaboration/playground/game?${params}` as never)
  }
}

type LockOutcome = "clear" | "resume" | "blocked"

async function resolvePlaygroundLock(
  session: StudentSession,
  lock: PlaygroundSessionLock,
): Promise<LockOutcome> {
  try {
    const lobby = await collaborationApi.getPlaygroundLobby(session, lock.sessionId, lock.resultId)
    if (lobby.sessionEnded || lobby.attemptRevoked || !lobby.myResult) {
      await clearPlaygroundSessionLock()
      if (lobby.attemptRevoked) {
        await clearLastPlaygroundClassroomSession(lock.sessionId)
      }
      return "clear"
    }
    const questionCount = lobby.questionCount ?? 0
    if (isPlaygroundAttemptResumable(lobby.myResult, questionCount)) {
      return "resume"
    }
    await clearPlaygroundSessionLock()
    return "blocked"
  } catch {
    await clearPlaygroundSessionLock()
    return "clear"
  }
}

function isPlaygroundAlreadyJoinedError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  if (err.status === 409) return true
  return /already joined|reset attempts/i.test(err.message)
}

function showPlaygroundAlreadyJoinedAlert() {
  AppAlert.alert(
    PLAYGROUND_ALREADY_JOINED_TITLE,
    PLAYGROUND_ALREADY_JOINED_MESSAGE,
    [{ text: "OK", isPreferred: true }],
    { tone: "warning", feature: "playground", logError: false },
  )
}

export function PlaygroundJoinScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ mode?: string }>()
  const [mode, setMode] = useState<JoinMode>(() => parseInitialMode(params.mode))
  const [nickname, setNickname] = useState("")
  const [passcode, setPasscode] = useState("")
  const [practiceSets, setPracticeSets] = useState<PlaygroundPracticeSet[]>([])
  const [selectedPracticeSetId, setSelectedPracticeSetId] = useState<number | null>(null)
  const [allowNicknames, setAllowNicknames] = useState(true)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")
  const [activeLockChecked, setActiveLockChecked] = useState(false)

  useEffect(() => {
    if (!session) {
      setActiveLockChecked(true)
      return
    }
    void (async () => {
      const lock = await getPlaygroundSessionLock()
      setActiveLockChecked(true)
      if (!lock || lock.completed) return
      const outcome = await resolvePlaygroundLock(session, lock)
      if (outcome === "resume") {
        AppAlert.alert(
          "Session in progress",
          "You already have an active playground session. Finish it before joining another.",
          [
            {
              text: "Continue session",
              onPress: () => router.replace(playgroundLockRoute(lock) as never),
            },
          ],
          { cancelable: false },
        )
      } else if (outcome === "blocked") {
        showPlaygroundAlreadyJoinedAlert()
      }
    })()
  }, [router, session])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [policyRes, setsRes] = await Promise.all([
        collaborationApi.getPlaygroundPolicy(session),
        collaborationApi.getPlaygroundPracticeSets(session),
      ])
      setAllowNicknames(policyRes.policy?.allow_student_nicknames !== false)
      const sets = setsRes.practiceSets ?? []
      setPracticeSets(sets)
      setSelectedPracticeSetId((current) => current ?? sets[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load join options.")
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  useEffect(() => {
    setMode(parseInitialMode(params.mode))
  }, [params.mode])

  const selectedPracticeSet = useMemo(
    () => practiceSets.find((set) => set.id === selectedPracticeSetId) ?? null,
    [practiceSets, selectedPracticeSetId],
  )

  const join = async () => {
    if (!session) return

    const existingLock = await getPlaygroundSessionLock()
    if (existingLock && !existingLock.completed) {
      const outcome = await resolvePlaygroundLock(session, existingLock)
      if (outcome === "resume") {
        AppAlert.alert(
          "Session in progress",
          "Leave and rejoin is disabled during active games.",
          [
            {
              text: "Continue session",
              onPress: () => router.replace(playgroundLockRoute(existingLock) as never),
            },
          ],
        )
        return
      }
      if (outcome === "blocked") {
        showPlaygroundAlreadyJoinedAlert()
        return
      }
    }

    if (mode === "CLASSROOM" && passcode.trim().length !== 5) {
      setError("Enter the 5-character passcode from your instructor.")
      return
    }

    if (mode === "PERSONAL" && practiceSets.length > 0 && selectedPracticeSetId == null) {
      setError("Choose a practice session to play.")
      return
    }

    setJoining(true)
    setError("")
    try {
      const result = await collaborationApi.joinPlayground(session, {
        mode,
        passcode: mode === "CLASSROOM" ? passcode.trim().toUpperCase() : undefined,
        nickname: nickname.trim() || undefined,
        practiceSetId:
          mode === "PERSONAL" && selectedPracticeSetId != null ? selectedPracticeSetId : undefined,
      })
      if (result.sessionId && result.resultId) {
        if (mode === "CLASSROOM") {
          await setLastPlaygroundClassroomSession(result.sessionId)
        }
        await upsertPlaygroundSessionLock({
          sessionId: result.sessionId,
          resultId: result.resultId,
          mode,
          startedAt: Date.now(),
          answeredQuestionIds: [],
          lockedIndex: 0,
          completed: false,
        })
      }
      navigateAfterJoin(router, result)
    } catch (err) {
      if (isPlaygroundAlreadyJoinedError(err)) {
        showPlaygroundAlreadyJoinedAlert()
      } else {
        setError(err instanceof ApiError ? err.message : "Could not join playground.")
      }
    } finally {
      setJoining(false)
    }
  }

  if (!session) {
    return (
      <View style={[styles.centered, { backgroundColor: SN.groupedBackground }]}>
        <Text style={[styles.errorText, { color: tokens.danger }]}>
          Sign in as a student to join the playground.
        </Text>
      </View>
    )
  }

  if (loading || !activeLockChecked) {
    return (
      <View style={[styles.centered, { backgroundColor: SN.groupedBackground }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.flex, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader
        title="Join the Game"
        subtitle="Confirm your details, then start playing"
        fallbackHref="/module/playground"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
        <View style={[styles.card, { backgroundColor: SN.secondaryGrouped, borderColor: native.separator }]}>
          <CollabSectionTitle title="Your details" hint="From your enrollment profile" />

          <View style={styles.field}>
            <Text style={[styles.label, { color: native.label }]}>Full name</Text>
            <TextInput
              style={[
                styles.input,
                styles.inputDisabled,
                {
                  backgroundColor: native.fill,
                  color: native.label,
                  borderColor: native.separator,
                },
              ]}
              value={session.name}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: native.label }]}>Student ID</Text>
            <TextInput
              style={[
                styles.input,
                styles.inputDisabled,
                {
                  backgroundColor: native.fill,
                  color: native.label,
                  borderColor: native.separator,
                },
              ]}
              value={session.id}
              editable={false}
            />
          </View>

          {allowNicknames ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: native.label }]}>
                Gaming nickname{" "}
                <Text style={[styles.optional, { color: native.secondaryLabel }]}>(optional)</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: native.secondaryGrouped,
                    color: native.label,
                    borderColor: native.separator,
                  },
                ]}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Leaderboard alias"
                placeholderTextColor={native.tertiaryLabel}
                maxLength={50}
                editable={!joining}
              />
              <Text style={[styles.hint, { color: native.secondaryLabel }]}>
                Use an alias if you prefer not to show your real name.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: SN.secondaryGrouped, borderColor: native.separator }]}>
          <CollabSectionTitle title="Game mode" />

          <View style={styles.modeRow}>
            <Pressable
              style={[
                styles.modeCard,
                { backgroundColor: native.fill, borderColor: native.separator },
                mode === "CLASSROOM" && {
                  borderColor: theme.primary,
                  backgroundColor: theme.soft,
                },
              ]}
              onPress={() => setMode("CLASSROOM")}
              disabled={joining}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={mode === "CLASSROOM" ? theme.primary : native.secondaryLabel}
              />
              <Text
                style={[
                  styles.modeTitle,
                  { color: native.label },
                  mode === "CLASSROOM" && { color: theme.primaryDark },
                ]}
              >
                Classroom battle
              </Text>
              <Text style={[styles.modeSub, { color: native.secondaryLabel }]}>
                Live session with passcode
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeCard,
                { backgroundColor: native.fill, borderColor: native.separator },
                mode === "PERSONAL" && {
                  borderColor: theme.primary,
                  backgroundColor: theme.soft,
                },
              ]}
              onPress={() => setMode("PERSONAL")}
              disabled={joining}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={mode === "PERSONAL" ? theme.primary : native.secondaryLabel}
              />
              <Text
                style={[
                  styles.modeTitle,
                  { color: native.label },
                  mode === "PERSONAL" && { color: theme.primaryDark },
                ]}
              >
                Solo practice
              </Text>
              <Text style={[styles.modeSub, { color: native.secondaryLabel }]}>
                Pick a practice set
              </Text>
            </Pressable>
          </View>
        </View>

        {mode === "CLASSROOM" ? (
          <View style={[styles.card, { backgroundColor: SN.secondaryGrouped, borderColor: native.separator }]}>
            <CollabSectionTitle title="Session passcode" hint="Required for live class games" />
            <TextInput
              style={[
                styles.passcodeInput,
                {
                  color: theme.primaryDark,
                  backgroundColor: SN.groupedBackground,
                  borderColor: native.separator,
                },
              ]}
              value={passcode}
              onChangeText={(v) => setPasscode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
              placeholder="ABCDE"
              placeholderTextColor={native.tertiaryLabel}
              autoCapitalize="characters"
              maxLength={5}
              editable={!joining}
            />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: SN.secondaryGrouped, borderColor: native.separator }]}>
            <CollabSectionTitle
              title="Practice session"
              hint="Choose which playground set to play"
            />
            {practiceSets.length > 0 ? (
              practiceSets.map((set) => {
                const active = set.id === selectedPracticeSetId
                return (
                  <Pressable
                    key={set.id}
                    style={[
                      styles.setRow,
                      { backgroundColor: native.fill, borderColor: native.separator },
                      active && { borderColor: theme.primary, backgroundColor: theme.soft },
                    ]}
                    onPress={() => setSelectedPracticeSetId(set.id)}
                    disabled={joining}
                  >
                    <View style={styles.setBody}>
                      <Text style={[styles.setTitle, { color: native.label }]}>{set.label}</Text>
                      <Text style={[styles.setMeta, { color: native.secondaryLabel }]}>
                        {set.questionCount} questions · {set.durationSec}s each
                      </Text>
                    </View>
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={active ? theme.primary : native.secondaryLabel}
                    />
                  </Pressable>
                )
              })
            ) : (
              <Text style={[styles.hint, { color: native.secondaryLabel }]}>
                No practice sets are available yet. You can still start a quick solo session.
              </Text>
            )}
            {selectedPracticeSet ? (
              <Text style={[styles.selectedHint, { color: theme.primaryDark }]}>
                Selected: {selectedPracticeSet.label}
              </Text>
            ) : null}
          </View>
        )}

        {error ? <Text style={[styles.errorText, { color: tokens.danger }]}>{error}</Text> : null}

        <Pressable
          style={[styles.joinBtn, { backgroundColor: theme.primary }, joining && styles.joinBtnDisabled]}
          onPress={() => void join()}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="game-controller-outline" size={18} color="#ffffff" />
              <Text style={styles.joinBtnText}>Start playing!</Text>
            </>
          )}
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700" },
  optional: { fontWeight: "500" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  inputDisabled: {
    opacity: 0.92,
  },
  hint: { fontSize: 12, lineHeight: 17 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  modeTitle: { fontSize: 13, fontWeight: "600" },
  modeSub: { fontSize: 11, fontWeight: "600" },
  passcodeInput: {
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 8,
    textAlign: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  setBody: { flex: 1, gap: 2 },
  setTitle: { fontSize: 13, fontWeight: "700" },
  setMeta: { fontSize: 11, fontWeight: "600" },
  selectedHint: { fontSize: 12, fontWeight: "700" },
  errorText: { fontSize: 13, fontWeight: "600" },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 15,
  },
  joinBtnDisabled: { opacity: 0.75 },
  joinBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
})
