import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { AppAlertHost } from '../../context/AppAlertProvider'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type PlaygroundLeaderboardEntry,
  type PlaygroundLeaderboardStats,
  type PlaygroundSession,
  type PlaygroundSessionQuestion} from "../../lib/instructor-api"
import {
  playgroundSessionHasLeaderboard,
  playgroundSessionLabel,
  playgroundSessionPhase,
  playgroundSessionQuestionsEditable,
  playgroundSessionStatusLabel,
  playgroundSessionStatusTone,
  playgroundSessionSubtitle,
  stripQuestionPreview,
} from "../../lib/faculty-playground-utils"
import { APP_BUTTON_RADIUS } from "../../constants/app-button"
import { playgroundLeaderboardFingerprint, playgroundLeaderboardShouldPoll } from "../../lib/playground-leaderboard-utils"
import {
  FACULTY_PLAYGROUND_COLOR,
  formatPlaygroundPasscode,
} from "../../lib/faculty-playground-theme"
import { FacultyPlaygroundLeaderboard } from "./FacultyPlaygroundLeaderboard"
import { FacultySectionCard, FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetNotice,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetSubmitButton,
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC } from "./faculty-sheet-semantics"
import { FacultySignatureTabBar } from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import {
  buildPlaygroundSessionQuestionsPutBody,
  PLAYGROUND_SNAPSHOT_FALLBACK_MESSAGE,
  playgroundSessionQuestionsHaveSnapshotEdits,
} from "../../lib/faculty-playground-session-questions"
import { FacultyPlaygroundQuestionEditorModal } from "./FacultyPlaygroundQuestionEditorModal"

type Scope = { instructorId: number; courseId: number }

type DetailTab = "controls" | "leaderboard" | "questions"

type Props = {
  session: PlaygroundSession | null
  scope: Scope | null
  onClose: () => void
  onUpdated: () => void
}

function ActionButton({
  label,
  icon,
  tone = "primary",
  disabled,
  onPress}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tone?: "primary" | "danger" | "secondary"
  disabled?: boolean
  onPress: () => void
}) {
  const { native, tokens } = useModuleTheme()
  const stylesByTone = {
    primary: { bg: FACULTY_PLAYGROUND_COLOR.action, text: FACULTY_PLAYGROUND_COLOR.actionInk, border: FACULTY_PLAYGROUND_COLOR.action },
    danger: { bg: `${FACULTY_PLAYGROUND_COLOR.danger}14`, text: FACULTY_PLAYGROUND_COLOR.danger, border: `${FACULTY_PLAYGROUND_COLOR.danger}33` },
    secondary: { bg: native.fill, text: native.label, border: native.separator },
  }[tone]

  return (
    <Pressable
      style={({ pressed }) => [
        layoutStyles.actionBtn,
        { backgroundColor: stylesByTone.bg, borderColor: stylesByTone.border },
        (pressed || disabled) && { opacity: 0.7 },
      ]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={16} color={stylesByTone.text} />
      <Text style={[layoutStyles.actionBtnText, { color: stylesByTone.text }]}>{label}</Text>
    </Pressable>
  )
}

export function FacultyPlaygroundSessionDetailModal({
  session,
  scope,
  onClose,
  onUpdated}: Props) {
  useSuppressModuleSearchDock(session != null)
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<DetailTab>("leaderboard")
  const [acting, setActing] = useState(false)
  const [passcode, setPasscode] = useState<string | null>(null)

  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState<PlaygroundLeaderboardEntry[]>([])
  const [leaderboardStats, setLeaderboardStats] = useState<PlaygroundLeaderboardStats | null>(null)
  const [pollLeaderboard, setPollLeaderboard] = useState(false)
  const leaderboardFingerprintRef = useRef("")

  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questions, setQuestions] = useState<PlaygroundSessionQuestion[]>([])
  const [baselineQuestions, setBaselineQuestions] = useState<PlaygroundSessionQuestion[]>([])
  const [draftDuration, setDraftDuration] = useState(10)
  const [questionsDirty, setQuestionsDirty] = useState(false)
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [editingQuestion, setEditingQuestion] = useState<PlaygroundSessionQuestion | null>(null)

  const phase = session ? playgroundSessionPhase(session) : "ended"
  const questionsEditable = playgroundSessionQuestionsEditable(phase)
  const label = session ? playgroundSessionLabel(session) : ""
  const displayPasscode = passcode ?? session?.join_passcode ?? null

  const loadLeaderboard = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!scope || !session) return []
      const silent = options?.silent ?? false
      if (!silent) setLeaderboardLoading(true)

      try {
        const res = await instructorApi.getPlaygroundLeaderboard(scope, session.id)
        const nextEntries = res.leaderboard ?? []
        const nextStats = res.stats ?? null
        const shouldPoll = playgroundLeaderboardShouldPoll(nextEntries, nextStats, session)
        setPollLeaderboard(shouldPoll)
        const fingerprint = playgroundLeaderboardFingerprint(nextEntries, nextStats)
        if (fingerprint !== leaderboardFingerprintRef.current) {
          leaderboardFingerprintRef.current = fingerprint
          setLeaderboard(nextEntries)
          setLeaderboardStats(nextStats)
        }
        if (!silent) setLoadError("")
        return nextEntries
      } catch (err) {
        if (!silent) {
          leaderboardFingerprintRef.current = ""
          setLeaderboard([])
          setLeaderboardStats(null)
          setPollLeaderboard(false)
          setLoadError(err instanceof ApiError ? err.message : "Could not load the leaderboard.")
        }
        return []
      } finally {
        if (!silent) setLeaderboardLoading(false)
      }
    },
    [scope, session],
  )

  const loadQuestions = useCallback(async () => {
    if (!scope || !session) return []
    setQuestionsLoading(true)
    try {
      const res = await instructorApi.getPlaygroundSessionQuestions(scope, session.id)
      const nextQuestions = res.questions ?? []
      setQuestions(nextQuestions)
      setBaselineQuestions(nextQuestions)
      setDraftDuration(res.session?.durationSec ?? session.duration_sec ?? 10)
      setQuestionsDirty(false)
      setLoadError("")
      return nextQuestions
    } catch (err) {
      setQuestions([])
      setBaselineQuestions([])
      setLoadError(err instanceof ApiError ? err.message : "Could not load session questions.")
      return []
    } finally {
      setQuestionsLoading(false)
    }
  }, [scope, session])

  useEffect(() => {
    if (!session) {
      setTab("leaderboard")
      setPasscode(null)
      leaderboardFingerprintRef.current = ""
      setLeaderboard([])
      setLeaderboardStats(null)
      setQuestions([])
      setBaselineQuestions([])
      setQuestionsDirty(false)
      setEditingQuestion(null)
      return
    }
    setPasscode(session.join_passcode ?? null)
    setTab(playgroundSessionHasLeaderboard(session) ? "leaderboard" : "controls")
    void loadLeaderboard()
  }, [session, loadLeaderboard])

  useEffect(() => {
    if (!session || !scope) return
    if (phase !== "live" && phase !== "lobby") return
    if (!pollLeaderboard) return
    const timer = setInterval(() => void loadLeaderboard({ silent: true }), 8000)
    return () => clearInterval(timer)
  }, [session, scope, phase, pollLeaderboard, loadLeaderboard])

  useEffect(() => {
    if (!session || tab !== "questions") return
    void loadQuestions()
  }, [session, tab, loadQuestions])

  async function runAction(
    action: () => Promise<{ joinPasscode?: string; message?: string } | void>,
    successMessage?: string,
  ) {
    if (!scope || !session) return
    setActing(true)
    try {
      const res = await action()
      if (res?.joinPasscode) setPasscode(res.joinPasscode)
      if (successMessage) {
        AppAlert.alert("Success", successMessage, [{ text: "OK" }], { tone: "success", logError: false })
      }
      onUpdated()
    } catch (err) {
      AppAlert.alert(
        "Action failed",
        err instanceof ApiError ? err.message : "Try again.",
        [{ text: "OK" }],
        { tone: "error", feature: "Playground", logError: true },
      )
    } finally {
      setActing(false)
    }
  }

  async function resetSession() {
    if (!scope || !session) return
    setActing(true)
    try {
      leaderboardFingerprintRef.current = ""
      setLeaderboard([])
      setLeaderboardStats(null)
      setPollLeaderboard(false)
      await instructorApi.resetPlaygroundAttempts(scope, session.id)
      await loadLeaderboard()
      AppAlert.alert(
        "Session reset",
        "Scores, attempts, and the leaderboard for this session were cleared. Students can join again.",
        [{ text: "OK" }],
        { tone: "success", logError: false },
      )
      onUpdated()
    } catch (err) {
      await loadLeaderboard()
      AppAlert.alert(
        "Reset failed",
        err instanceof ApiError ? err.message : "Try again.",
        [{ text: "OK" }],
        { tone: "error", feature: "Playground", logError: true },
      )
    } finally {
      setActing(false)
    }
  }

  function confirmDestructive(title: string, message: string, onConfirm: () => void) {
    AppAlert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: onConfirm },
      ],
      { tone: "warning", logError: false },
    )
  }

  async function sharePasscode() {
    if (!displayPasscode || !session) return
    await Share.share({
      message: `Join playground session ${session.session_code}\nPasscode: ${displayPasscode}`})
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const next = index + direction
    if (next < 0 || next >= questions.length) return
    const copy = [...questions]
    const [item] = copy.splice(index, 1)
    copy.splice(next, 0, item)
    setQuestions(copy.map((q, i) => ({ ...q, questionOrder: i + 1 })))
    setQuestionsDirty(true)
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) {
      AppAlert.alert("Cannot remove", "A session needs at least one question.")
      return
    }
    setQuestions((prev) =>
      prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, questionOrder: i + 1 })),
    )
    setQuestionsDirty(true)
  }

  async function saveQuestions() {
    if (!scope || !session) return
    if (!playgroundSessionQuestionsEditable(playgroundSessionPhase(session))) {
      AppAlert.alert("Session is live", "End the live game before editing its questions.")
      return
    }
    setSavingQuestions(true)
    const includeSnapshots = playgroundSessionQuestionsHaveSnapshotEdits(baselineQuestions, questions)
    const sent = questions
    try {
      await instructorApi.updatePlaygroundSessionQuestions(
        scope,
        session.id,
        buildPlaygroundSessionQuestionsPutBody({
          questions,
          durationSec: draftDuration,
          includeSnapshots,
        }),
      )
      onUpdated()
      const loaded = await loadQuestions()
      if (includeSnapshots && playgroundSessionQuestionsHaveSnapshotEdits(sent, loaded)) {
        AppAlert.alert("Saved with limits", PLAYGROUND_SNAPSHOT_FALLBACK_MESSAGE)
      } else {
        AppAlert.alert("Saved", "Session questions updated.")
      }
    } catch (err) {
      if (err instanceof ApiError && err.message === PLAYGROUND_SNAPSHOT_FALLBACK_MESSAGE) {
        onUpdated()
        await loadQuestions()
        AppAlert.alert("Saved with limits", err.message)
      } else {
        AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Try again.")
      }
    } finally {
      setSavingQuestions(false)
    }
  }

  const tabOptions = useMemo(
    () => [
      {
        id: "leaderboard" as const,
        label: "Leaderboard",
        icon: "podium-outline" as const,
        count:
          leaderboard.length > 0
            ? leaderboard.length
            : session?.participant_count && session.participant_count > 0
              ? session.participant_count
              : undefined,
      },
      { id: "controls" as const, label: "Controls", icon: "settings-outline" as const },
      { id: "questions" as const, label: "Questions", icon: "list-outline" as const },
    ],
    [leaderboard.length, session?.participant_count],
  )

  if (!session) return null

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title={label}
          subtitle={playgroundSessionSubtitle(session)}
          onClose={onClose}
          rightSlot={
            <FacultyStatusPill
              label={playgroundSessionStatusLabel(session)}
              tone={playgroundSessionStatusTone(session)}
            />
          }
        />

        <FacultySignatureTabBar tabs={tabOptions} tab={tab} onChange={setTab} scrollable={false} embedded />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          {loadError ? <FacultySheetErrorBanner message={loadError} /> : null}
          {tab === "leaderboard" ? (
            <FacultyPlaygroundLeaderboard
              loading={leaderboardLoading}
              entries={leaderboard}
              stats={leaderboardStats}
            />
          ) : null}

          {tab === "controls" ? (
            <View style={layoutStyles.sectionGap}>
              {displayPasscode ? (
                <FacultySectionCard title="Join passcode" icon="key-outline">
                  <View
                    style={[
                      layoutStyles.passcodeCard,
                      { backgroundColor: native.fill, borderColor: native.separator },
                    ]}
                  >
                    <Text
                      style={[
                        layoutStyles.passcodeValue,
                        { color: FACULTY_PLAYGROUND_COLOR.passcode },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatPlaygroundPasscode(displayPasscode)}
                    </Text>
                    <Pressable
                      style={[layoutStyles.shareBtn, { backgroundColor: FACULTY_PLAYGROUND_COLOR.link }]}
                      onPress={() => void sharePasscode()}
                      accessibilityRole="button"
                      accessibilityLabel="Share code"
                    >
                      <Ionicons name="share-outline" size={16} color="#ffffff" />
                      <Text style={layoutStyles.shareBtnText}>Share code</Text>
                    </Pressable>
                  </View>
                  <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 18 }]}>
                    Students enter this passcode in the playground lobby.
                  </Text>
                </FacultySectionCard>
              ) : null}

              <FacultySectionCard title="Session info" icon="information-circle-outline">
                <View style={layoutStyles.infoGrid}>
                  <FacultySheetStatRow>
                    <FacultySheetStatChip
                      icon="people-outline"
                      label="Participants"
                      value={String(session.participant_count ?? 0)}
                      tone={SHEET_METRIC.people}
                    />
                    <FacultySheetStatChip
                      icon="hourglass-outline"
                      label="Waiting"
                      value={String(session.waiting_count ?? 0)}
                      tone={SHEET_METRIC.pending}
                    />
                  </FacultySheetStatRow>
                  <FacultySheetStatRow>
                    <FacultySheetStatChip
                      icon="help-circle-outline"
                      label="Questions"
                      value={String(session.question_count_actual ?? session.question_count ?? 0)}
                      tone={SHEET_METRIC.info}
                    />
                    <FacultySheetStatChip
                      icon="timer-outline"
                      label="Duration"
                      value={`${session.duration_sec ?? 10}s`}
                      tone={SHEET_METRIC.secondary}
                    />
                  </FacultySheetStatRow>
                </View>
                {session.created_at ? (
                  <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 18 }]}>
                    Created {formatFacultyRelativeTime(session.created_at)}
                  </Text>
                ) : null}
              </FacultySectionCard>

              <FacultySectionCard title="Actions" icon="flash-outline">
                {acting ? <ActivityIndicator color={FACULTY_PLAYGROUND_COLOR.link} /> : null}
                <View style={layoutStyles.actions}>
                  {(session.participant_count ?? 0) > 0 || leaderboard.length > 0 ? (
                    <ActionButton
                      label="Reset session"
                      icon="refresh-circle-outline"
                      tone="secondary"
                      onPress={() =>
                        confirmDestructive(
                          "Reset session?",
                          "Clears all student attempts, scores, and the leaderboard for this session.",
                          () => void resetSession(),
                        )
                      }
                      disabled={acting}
                    />
                  ) : null}
                  {phase === "lobby" ? (
                    <ActionButton
                      label="Start game"
                      icon="play"
                      onPress={() =>
                        void runAction(
                          () => instructorApi.startPlaygroundGame(scope!, session.id),
                          "Game started — students can answer now.",
                        )
                      }
                      disabled={acting}
                    />
                  ) : null}
                  {phase === "lobby" || phase === "live" ? (
                    <ActionButton
                      label="End session"
                      icon="stop-circle-outline"
                      tone="danger"
                      onPress={() =>
                        confirmDestructive("End session?", "Students will be disconnected.", () =>
                          void runAction(
                            () => instructorApi.stopPlaygroundSession(scope!, session.id),
                            "Session ended.",
                          ),
                        )
                      }
                      disabled={acting}
                    />
                  ) : null}
                  {phase === "ended" ? (
                    <>
                      <ActionButton
                        label="Reopen lobby"
                        icon="refresh-outline"
                        onPress={() =>
                          void runAction(
                            () => instructorApi.openPlaygroundLobby(scope!, session.id),
                            "Lobby reopened with a new passcode.",
                          )
                        }
                        disabled={acting}
                      />
                      <ActionButton
                        label="Open to all sections"
                        icon="globe-outline"
                        tone="secondary"
                        onPress={() =>
                          void runAction(
                            () => instructorApi.setPlaygroundAllSessions(scope!, session.id),
                            "Session is now open to all course sections.",
                          )
                        }
                        disabled={acting}
                      />
                      <ActionButton
                        label="Delete session"
                        icon="trash-outline"
                        tone="danger"
                        onPress={() =>
                          confirmDestructive(
                            "Delete session?",
                            "This permanently removes results and questions.",
                            () =>
                              void runAction(async () => {
                                await instructorApi.deletePlaygroundSession(scope!, session.id)
                                onClose()
                              }),
                          )
                        }
                        disabled={acting}
                      />
                    </>
                  ) : null}
                </View>
              </FacultySectionCard>
            </View>
          ) : null}

          {tab === "questions" ? (
            <View style={layoutStyles.sectionGap}>
              {!questionsEditable ? (
                <FacultySheetNotice tone="warning" message="End the live game before editing questions." />
              ) : (
                <View
                  style={[
                    layoutStyles.durationRow,
                    { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                  ]}
                >
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>Question timer</Text>
                  <View style={layoutStyles.durationControls}>
                    <Pressable
                      style={[layoutStyles.durationBtn, { backgroundColor: native.fill }]}
                      onPress={() => {
                        setDraftDuration((d) => Math.max(5, d - 5))
                        setQuestionsDirty(true)
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease question timer"
                    >
                      <Ionicons name="remove" size={18} color={native.label} />
                    </Pressable>
                    <Text style={[type.bodyEmphasis, layoutStyles.durationValue, { color: native.label }]}>
                      {draftDuration}s
                    </Text>
                    <Pressable
                      style={[layoutStyles.durationBtn, { backgroundColor: native.fill }]}
                      onPress={() => {
                        setDraftDuration((d) => Math.min(60, d + 5))
                        setQuestionsDirty(true)
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Increase question timer"
                    >
                      <Ionicons name="add" size={18} color={native.label} />
                    </Pressable>
                  </View>
                </View>
              )}

              <FacultySheetNotice message="Edit changes this session’s copy only. The source Question Bank question is not updated." />
              {questionsLoading ? (
                <ActivityIndicator color={FACULTY_PLAYGROUND_COLOR.link} />
              ) : questions.length === 0 ? (
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", lineHeight: 18 }]}>
                  No questions linked to this session yet.
                </Text>
              ) : (
                questions.map((question, index) => (
                  <View
                    key={question.id}
                    style={[
                      layoutStyles.questionCard,
                      { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
                    ]}
                  >
                    <View style={layoutStyles.questionHead}>
                      <Text style={[type.caption, { color: FACULTY_PLAYGROUND_COLOR.link, fontWeight: "700" }]}>
                        Q{question.questionOrder}
                      </Text>
                      <View style={layoutStyles.questionTags}>
                        <Text
                          style={[
                            layoutStyles.questionTag,
                            { color: native.secondaryLabel, backgroundColor: native.fill },
                          ]}
                        >
                          {question.topic || "General"}
                        </Text>
                        <Text
                          style={[
                            layoutStyles.questionTag,
                            { color: native.secondaryLabel, backgroundColor: native.fill },
                          ]}
                        >
                          {question.difficulty}
                        </Text>
                      </View>
                    </View>
                    <Text style={[type.bodyEmphasis, { color: native.label, lineHeight: 20, fontSize: 14 }]}>
                      {stripQuestionPreview(question.questionText)}
                    </Text>
                    {questionsEditable ? (
                      <View style={layoutStyles.questionActions}>
                        <Pressable
                          style={[layoutStyles.iconBtn, { backgroundColor: native.fill }]}
                          onPress={() => setEditingQuestion(question)}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit session question ${index + 1}`}
                        >
                          <Ionicons name="create-outline" size={16} color={native.label} />
                        </Pressable>
                        <Pressable
                          style={[layoutStyles.iconBtn, { backgroundColor: native.fill }]}
                          onPress={() => moveQuestion(index, -1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Move question ${index + 1} up`}
                        >
                          <Ionicons name="arrow-up" size={16} color={native.label} />
                        </Pressable>
                        <Pressable
                          style={[layoutStyles.iconBtn, { backgroundColor: native.fill }]}
                          onPress={() => moveQuestion(index, 1)}
                          accessibilityRole="button"
                          accessibilityLabel={`Move question ${index + 1} down`}
                        >
                          <Ionicons name="arrow-down" size={16} color={native.label} />
                        </Pressable>
                        <Pressable
                          style={[layoutStyles.iconBtn, { backgroundColor: native.fill }]}
                          onPress={() => removeQuestion(index)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove question ${index + 1}`}
                        >
                          <Ionicons name="trash-outline" size={16} color={FACULTY_PLAYGROUND_COLOR.danger} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))
              )}

              {questionsEditable && questions.length > 0 ? (
                <FacultySheetSubmitButton
                  label="Save question changes"
                  onPress={() => void saveQuestions()}
                  disabled={!questionsDirty || savingQuestions}
                  loading={savingQuestions}
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
      <FacultyPlaygroundQuestionEditorModal
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        onSave={(next) => {
          setQuestions((prev) => prev.map((item) => (item.id === next.id ? next : item)))
          setQuestionsDirty(true)
          setEditingQuestion(null)
        }}
      />
      <AppAlertHost />
    </Modal>
  )
}

const layoutStyles = StyleSheet.create({
  sectionGap: { gap: 16 },
  passcodeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  passcodeValue: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 5,
    lineHeight: 34,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shareBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  infoGrid: { gap: 8 },
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: APP_BUTTON_RADIUS,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnText: { fontSize: 14, fontWeight: "600" },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: APP_BUTTON_RADIUS,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  durationControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  durationBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  durationValue: { minWidth: 42, textAlign: "center" },
  questionCard: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  questionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  questionTags: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  questionTag: {
    fontSize: 10,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  questionActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
})