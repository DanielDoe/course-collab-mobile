import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useFocusEffect, useRouter } from "expo-router"
import { useBlockStackBackWhile } from "../navigation/ModuleNestedBackHandler"
import { useModuleContentTopPadding } from "../../context/ChromeInsetContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { CORA_NAME } from "../../lib/cora-constants"
import { StudentThemedLocked } from "../student/student-themed-hero"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import {
  aiTutorApi,
  type AiTutorCredits,
  type AiTutorRecommendation,
  type AiTutorStats,
  type ChatMessage,
  type CoraImportedProblem,
  type CoraProgressDetailed,
  type TopicMasteryItem,
} from "../../lib/ai-tutor-api"
import { CoraSolveTab } from "./CoraSolveTab"
import { CoraWorkspaceTab } from "./CoraWorkspaceTab"
import { CoraLearnTab } from "./CoraLearnTab"
import { CoraCodeTab } from "./CoraCodeTab"
import { CoraInsightsTab } from "./CoraInsightsTab"
import { CoraStudyPlanTab } from "./CoraStudyPlanTab"
import { CoraToolsTab } from "./CoraToolsTab"
import { CoraPreferencesTab } from "./CoraPreferencesTab"
import { CoraOverlayShell } from "../cora/CoraOverlayShell"
import { useCora } from "../cora/CoraProvider"
import { CoraImmersiveChat } from "./CoraImmersiveChat"
import { CoraToolFlowSheet } from "./CoraToolFlowSheet"
import { StudentCoraContextProvider } from "../../context/StudentCoraContextProvider"
import { useStudentCoraContext } from "../../hooks/useStudentCoraContext"
import { StudentCoraHubView } from "./StudentCoraHubView"
import { hasNavAccess } from "../../constants/student-nav"
import type { StudentSession } from "../../lib/session"
import { CORA_TOOLS, isCoraPrimaryTab, type CoraSectionId } from "../../lib/cora-nav-config"
import type { StudentCoraCapability, StudentCoraCapabilityId } from "../../lib/student-cora-config"
import {
  studentCapabilityChatFlow,
  studentCapabilityDefaultPrompt,
  studentCapabilityToolFlowId,
} from "../../lib/student-cora-capability-flow"
import { studentCoraCapability } from "../../lib/student-cora-config"
import {
  buildStudentCoraTodayRecommendations,
  CORA_TODAY_LINK_CHAT,
  CORA_TODAY_LINK_PREPARE_EXAM,
  CORA_TODAY_LINK_STUDY_PLAN,
  CORA_TODAY_LINK_SUMMARIZE,
} from "../../lib/student-cora-today-recommendations"
import {
  deleteWorkspaceConversation,
  getWorkspaceConversations,
  syncWorkspaceConversations,
} from "../../lib/cora-api"
import { loadLocalCoraChatSession, syncCoraChatHistory } from "../../lib/cora-chat-hydration"
import {
  mergeConversationThreads,
  threadToWorkspaceConversation,
  workspaceConversationToThread,
  type WorkspaceConversation,
} from "../../lib/cora-workspace-conversations"
import {
  attachImportedQuestionToMessage,
} from "../../lib/cora-import-recovery"
import { parseThreadTimestamp } from "../../lib/cora-conversation-stats"
import { buildMessageForApi, buildProblemContextForApi } from "../../lib/cora-composer-attachments"
import {
  appendUserMessageVersion,
  applyUserMessageVersion,
  getActiveUserVersion,
  getActiveUserVersionIndex,
  getUserMessageVersions,
  rebuildThreadAfterVersionChange,
  saveAssistantOnActiveVersion,
} from "../../lib/cora-message-versions"
import { loadCoraPreferences } from "../../lib/cora-preferences-storage"
import type { CoraLearningMemory } from "../../lib/cora-preferences-storage"
import type { StudentContextPayload } from "../../lib/student-context-api"
import { loadCoraStudentContext } from "../../lib/cora-student-context-loader"
import { enrichStudentContextForMessage } from "../../lib/student-cora-platform-lookup"
import { formatStudentContextForPrompt } from "../../lib/format-student-context-for-prompt"
import {
  CALENDAR_ASSISTANT_PROMPT,
  EXAM_COUNTDOWN_PROMPT,
  STUDY_PLAN_GENERATION_PROMPT,
  WEEKLY_REVIEW_PROMPT,
  flowToChatConfig,
  type CoraChatFlow,
} from "../../lib/cora-study-plan-flows"
import type { CoraToolFlowId, CoraToolLaunchPayload } from "../../lib/cora-tool-flows"
import { coraToolFlowToRbac } from "../../lib/cora-rbac"
import { isCoraAccessDeniedError } from "../../lib/cora-rbac/guard"
import { prepareCoraRequest } from "../../lib/cora-rbac/prepare-request"
import { setCachedToolResult } from "../../lib/cora-tool-results-cache"
import {
  getToolThreadId,
  getToolThreadTitle,
  isToolThreadId,
} from "../../lib/cora-tool-threads"
import { automateStudyPlan, exportWorkspaceToNotes } from "../../lib/cora-api"
import { courseInfoApi } from "../../lib/course-info-api"
import { syncStudySessionReminders } from "../../lib/calendar/study-session-reminders"
import {
  AI_TUTOR_CONTEXT_WINDOW,
  archiveThread,
  buildThread,
  countExchanges,
  createThreadId,
  deriveThreadTitle,
  exchangesRemaining,
  findStudentCoraThreadForCapability,
  getMaxExchangesForTier,
  isStorableChatMessage,
  isThreadAtExchangeLimit,
  permanentlyDeleteThread,
  renameThread,
  restoreThread,
  saveSessionPrefs,
  saveThread,
  upsertActiveThreads,
  type AiTutorChatThread,
} from "../../lib/ai-tutor-chat-storage"

type PrimaryTab = "home" | "workspace" | "solve"

function showExchangeLimitAlert(maxExchanges: number, onNewChat: () => void) {
  AppAlert.alert(
    "Start a new chat",
    `This conversation reached the ${maxExchanges}-exchange limit for your plan. Long threads can reduce answer quality. Start a new chat to continue.`,
    [
      { text: "Not now", style: "cancel" },
      { text: "New chat", onPress: onNewChat },
    ],
  )
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function AiTutorScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const lockedTopPad = useModuleContentTopPadding(24)
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("home")
  const [immersiveChatOpen, setImmersiveChatOpen] = useState(false)
  const { setWorkspaceImmersive, overlaySection, setOverlaySection } = useCora()
  const [stats, setStats] = useState<AiTutorStats | null>(null)
  const [topicMastery, setTopicMastery] = useState<TopicMasteryItem[]>([])
  const [progressDetailed, setProgressDetailed] = useState<CoraProgressDetailed | null>(null)
  const [recommendations, setRecommendations] = useState<AiTutorRecommendation[]>([])
  const [credits, setCredits] = useState<AiTutorCredits | null>(null)
  const [learningMemory, setLearningMemory] = useState<CoraLearningMemory>({
    rememberGaps: true,
    detectConfusion: true,
  })
  const [studentContext, setStudentContext] = useState<StudentContextPayload | null>(null)
  const studentContextRef = useRef<StudentContextPayload | null>(null)
  const [chatFlow, setChatFlow] = useState<CoraChatFlow | null>(null)
  const [capabilityToolFlow, setCapabilityToolFlow] = useState<CoraToolFlowId | null>(null)
  const pendingAutoSendRef = useRef<string | null>(null)
  const pendingCapabilityRef = useRef<StudentCoraCapabilityId | null>(null)
  const pendingToolCacheRef = useRef<CoraToolLaunchPayload | null>(null)
  const chatFlowRef = useRef<CoraChatFlow | null>(null)
  chatFlowRef.current = chatFlow
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [threads, setThreads] = useState<AiTutorChatThread[]>([])
  const [archivedThreads, setArchivedThreads] = useState<AiTutorChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const [chatHydrated, setChatHydrated] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySyncing, setHistorySyncing] = useState(false)
  const threadsRef = useRef(threads)
  threadsRef.current = threads
  const archivedThreadsRef = useRef(archivedThreads)
  archivedThreadsRef.current = archivedThreads
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editingMessageIdRef = useRef<string | null>(null)

  const hasAccess = membershipTierLoaded && hasNavAccess(membershipTier, "Explorer")
  const {
    status: coraContextStatus,
    setupStep: coraSetupStep,
    context: coraContext,
    capabilities: coraCapabilities,
    error: coraContextError,
    retrySetup: retryCoraSetup,
    refreshContextIfStale,
  } = useStudentCoraContext({ session, enabled: Boolean(session && hasAccess) })
  const coraContextReady = coraContextStatus === "ready"
  const showCoraSetupOverlay = coraContextStatus === "loading" || coraContextStatus === "running"
  const coraCourseLabel = useMemo(() => {
    if (coraContext) {
      return [coraContext.courseCode, coraContext.courseTitle].filter(Boolean).join(" · ")
    }
    return session?.courseCode
  }, [coraContext, session?.courseCode])
  const maxExchanges = getMaxExchangesForTier(membershipTier)
  const exchangeCount = countExchanges(messages)
  const remainingExchanges = exchangesRemaining(messages, maxExchanges)
  const atExchangeLimit = isThreadAtExchangeLimit(messages, maxExchanges)
  const nearExchangeLimit = !atExchangeLimit && remainingExchanges <= 2

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort()
  }, [])

  const handleStreamAborted = useCallback((assistantId: string) => {
    streamAbortRef.current = null
    setStreaming(false)
    setStreamingMessageId(null)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && !m.content.trim() ? { ...m, content: "Stopped." } : m,
      ),
    )
  }, [])

  const creditsLabel = credits?.isUnlimited
    ? "Unlimited credits"
    : credits
      ? `${credits.credits} credits remaining`
      : "Loading credits…"

  const todayRecommendations = useMemo(
    () =>
      buildStudentCoraTodayRecommendations({
        payload: coraContext?.payload ?? studentContext,
        apiRecommendations: recommendations,
        stats,
        progress: progressDetailed,
      }),
    [coraContext?.payload, studentContext, recommendations, stats, progressDetailed],
  )

  useEffect(() => {
    if (!coraContext?.payload) return
    setStudentContext(coraContext.payload)
    studentContextRef.current = coraContext.payload
  }, [coraContext])

  useEffect(() => {
    setWorkspaceImmersive(immersiveChatOpen)
    return () => setWorkspaceImmersive(false)
  }, [immersiveChatOpen, setWorkspaceImmersive])

  useEffect(() => {
    return () => {
      setOverlaySection(null)
    }
  }, [setOverlaySection])

  const enterImmersiveChat = useCallback(() => {
    setOverlaySection(null)
    setImmersiveChatOpen(true)
  }, [setOverlaySection])

  const exitImmersiveChat = useCallback(() => {
    setImmersiveChatOpen(false)
  }, [])

  const closeNestedCoraUi = useCallback(() => {
    if (immersiveChatOpen) {
      exitImmersiveChat()
      return
    }
    if (overlaySection) {
      setOverlaySection(null)
    }
  }, [immersiveChatOpen, overlaySection, exitImmersiveChat, setOverlaySection])

  useBlockStackBackWhile(Boolean(immersiveChatOpen || overlaySection), closeNestedCoraUi)

  const resolveCoraPlatformContext = useCallback(async (message?: string) => {
    if (!session) {
      return { ctx: null as StudentContextPayload | null, block: undefined as string | undefined }
    }
    try {
      let ctx = await loadCoraStudentContext(session)
      if (message?.trim()) {
        ctx = await enrichStudentContextForMessage(session, ctx, message)
      }
      studentContextRef.current = ctx
      setStudentContext(ctx)
      return { ctx, block: formatStudentContextForPrompt(ctx) }
    } catch {
      const ctx = studentContextRef.current ?? studentContext
      return { ctx, block: ctx ? formatStudentContextForPrompt(ctx) : undefined }
    }
  }, [session, studentContext])

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!session) return
    if (!options?.silent) setLoading(true)
    try {
      const [statsRes, creditsRes, recsRes, prefs, contextResRaw, progressRes] = await Promise.all([
        aiTutorApi.getStats(session),
        aiTutorApi.getCredits(session),
        aiTutorApi.getRecommendations(session),
        loadCoraPreferences(session.databaseId),
        aiTutorApi.getStudentContext(session).catch(() => null),
        aiTutorApi.getProgressDetailed(session),
      ])
      let contextRes = contextResRaw
      if (coraContext?.payload) {
        contextRes = coraContext.payload
      } else {
        try {
          contextRes = await loadCoraStudentContext(session)
        } catch {
          /* keep partial context from getStudentContext */
        }
      }
      setStats(statsRes.stats)
      setTopicMastery(statsRes.topicMastery ?? [])
      setProgressDetailed(progressRes)
      setCredits(creditsRes)
      setRecommendations(recsRes.recommendations ?? [])
      setLearningMemory(prefs)
      if (contextRes) {
        setStudentContext(contextRes)
        studentContextRef.current = contextRes
      }
    } catch {
      /* non-fatal */
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [session, coraContext?.payload])

  const initialFocusLoadDoneRef = useRef(false)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    void loadData().finally(() => setLoading(false))
  }, [session, loadData])

  useFocusEffect(
    useCallback(() => {
      if (!session || !hasAccess || immersiveChatOpen || overlaySection) return
      if (!initialFocusLoadDoneRef.current) {
        initialFocusLoadDoneRef.current = true
        void refreshContextIfStale()
        return
      }
      void (async () => {
        await refreshContextIfStale()
        await loadData({ silent: true })
      })()
    }, [session, hasAccess, immersiveChatOpen, overlaySection, refreshContextIfStale, loadData]),
  )

  useEffect(() => {
    if (!session) return
    let cancelled = false

    const hydrate = async () => {
      const local = await loadLocalCoraChatSession(session.databaseId)
      if (cancelled) return

      const hasLocalHistory = local.threads.length > 0 || local.archivedThreads.length > 0

      setThreads(local.threads)
      setArchivedThreads(local.archivedThreads)
      if (isCoraPrimaryTab(local.activeTab)) setPrimaryTab(local.activeTab)
      else setOverlaySection(local.activeTab)
      if (local.activeThreadId) {
        const thread = local.threads.find((t) => t.id === local.activeThreadId)
        if (thread) {
          setActiveThreadId(thread.id)
          setMessages(thread.messages)
        }
      }

      setChatHydrated(true)
      setHistoryLoading(!hasLocalHistory)
      setHistorySyncing(true)

      try {
        const synced = await syncCoraChatHistory(session, local)
        if (cancelled) return

        setThreads(synced.threads)
        setArchivedThreads(synced.archivedThreads)

        if (synced.activeThreadId && synced.activeMessages) {
          setActiveThreadId(synced.activeThreadId)
          setMessages(synced.activeMessages)
        }
      } catch {
        /* local cache remains usable */
      } finally {
        if (!cancelled) {
          setHistoryLoading(false)
          setHistorySyncing(false)
        }
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [session])

  const scheduleRemoteSync = useCallback(
    (nextThreads: AiTutorChatThread[]) => {
      if (!session) return
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => {
        const payload = nextThreads.map(threadToWorkspaceConversation)
        void syncWorkspaceConversations(session, payload).catch(() => {
          /* best-effort cloud sync */
        })
      }, 800)
    },
    [session],
  )

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [])

  const persistTab = useCallback(
    (tab: CoraSectionId) => {
      if (!session || !chatHydrated) return
      void saveSessionPrefs(session.databaseId, { activeThreadId, activeTab: tab })
    },
    [session, activeThreadId, chatHydrated],
  )

  useEffect(() => {
    if (!session || !chatHydrated) return
    persistTab(primaryTab)
  }, [session, primaryTab, chatHydrated, persistTab])

  const applyPendingCapability = useCallback((thread: AiTutorChatThread): AiTutorChatThread => {
    if (thread.capabilityId || !pendingCapabilityRef.current) return thread
    const capabilityId = pendingCapabilityRef.current
    pendingCapabilityRef.current = null
    return { ...thread, capabilityId }
  }, [])

  const flushThreadSave = useCallback(
    async (msgs: ChatMessage[], customTitle?: string) => {
      if (!session || !activeThreadId) return
      const meaningful = msgs.filter(isStorableChatMessage)
      if (meaningful.length === 0) return
      const existing = threadsRef.current.find((t) => t.id === activeThreadId)
      let thread = applyPendingCapability(buildThread(activeThreadId, msgs, existing))
      if (customTitle?.trim()) {
        thread = { ...thread, title: customTitle.trim(), titleIsCustom: true }
      }
      const next = await saveThread(session.databaseId, thread)
      setThreads(next)
      scheduleRemoteSync(next)
    },
    [session, activeThreadId, scheduleRemoteSync, applyPendingCapability],
  )

  useEffect(() => {
    if (!session || streaming || !activeThreadId || !chatHydrated) return
    const meaningful = messages.filter(isStorableChatMessage)
    if (meaningful.length === 0) return

    const timer = setTimeout(() => {
      const existing = threadsRef.current.find((t) => t.id === activeThreadId)
      const thread = applyPendingCapability(buildThread(activeThreadId, messages, existing))
      void saveThread(session.databaseId, thread).then((next) => {
        setThreads(next)
        scheduleRemoteSync(next)
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [session, messages, activeThreadId, streaming, chatHydrated, scheduleRemoteSync, applyPendingCapability])

  const navigateSection = useCallback(
    (section: CoraSectionId) => {
      if (section === "home") {
        setOverlaySection(null)
        setImmersiveChatOpen(false)
        setPrimaryTab("home")
        persistTab("home")
        return
      }
      if (section === "workspace" || section === "solve") {
        setImmersiveChatOpen(false)
        setPrimaryTab(section)
        setOverlaySection(section)
        persistTab(section)
        return
      }
      setImmersiveChatOpen(false)
      setOverlaySection(section)
      persistTab(section)
    },
    [persistTab, setOverlaySection],
  )

  const openWorkspacePrompt = useCallback(
    (prompt: string) => {
      setInput(prompt)
      setPrimaryTab("workspace")
      setOverlaySection(null)
      enterImmersiveChat()
      persistTab("workspace")
    },
    [persistTab, enterImmersiveChat, setOverlaySection],
  )

  const exitCora = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/dashboard" as never)
  }, [router])

  const onRefresh = useCallback(async () => {
    if (!session) return
    setRefreshing(true)
    await refreshContextIfStale(true)
    await loadData()
    try {
      const remoteRaw = await getWorkspaceConversations(session)
      const remote = (remoteRaw as WorkspaceConversation[]).map(workspaceConversationToThread)
      const archivedIds = new Set(archivedThreadsRef.current.map((thread) => thread.id))
      const merged = mergeConversationThreads(remote, threadsRef.current, archivedIds)
      setThreads(merged)
      await upsertActiveThreads(session.databaseId, merged)
      if (activeThreadId) {
        const active = merged.find((t) => t.id === activeThreadId)
        if (active) setMessages(active.messages)
      }
    } catch {
      /* keep current threads */
    }
    setRefreshing(false)
  }, [loadData, session, activeThreadId, refreshContextIfStale])

  const prepareNewChat = useCallback(async () => {
    if (streaming || !session) return
    if (messages.length > 0 && activeThreadId) {
      const existing = threads.find((t) => t.id === activeThreadId)
      const thread = buildThread(activeThreadId, messages, existing)
      const next = await saveThread(session.databaseId, thread)
      setThreads(next)
      scheduleRemoteSync(next)
    }
    setMessages([])
    setActiveThreadId(null)
    setInput("")
    await saveSessionPrefs(session.databaseId, { activeThreadId: null })
  }, [streaming, session, messages, activeThreadId, threads, scheduleRemoteSync])

  const runStudyPlanAutomation = useCallback(
    async (threadMessages: ChatMessage[]) => {
      if (!session) return
      const exportMessages = threadMessages
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        const result = await automateStudyPlan(session, exportMessages, {
          title: "My Study Plan",
          reminderMinutes: 30,
        })

        if (result.error) {
          AppAlert.alert("Study plan saved partially", result.error)
          return
        }

        try {
          const end = new Date()
          end.setDate(end.getDate() + 21)
          const events = await courseInfoApi.getCalendarEvents(session, {
            startDate: new Date(),
            endDate: end,
          })
          const studyEvents = events.filter(
            (e) =>
              e.event_type === "study_session" ||
              e.event_type === "ai_reminder" ||
              e.title?.startsWith("Practice Hub:") ||
              e.title?.startsWith("Flashcards:"),
          )
          const reminderSync = await syncStudySessionReminders(studyEvents)
          const deckCount = result.flashcardDecks?.length ?? 0
          const quizCount = result.practiceQuizzes?.length ?? 0
          const resourceNote =
            deckCount > 0 || quizCount > 0
              ? `\n\n• ${deckCount} flashcard deck${deckCount === 1 ? "" : "s"}\n• ${quizCount} Practice Hub quiz${quizCount === 1 ? "" : "zes"}`
              : ""
          const localNote =
            reminderSync.scheduled > 0
              ? `\n\n${reminderSync.scheduled} local reminder${reminderSync.scheduled === 1 ? "" : "s"} scheduled on this device.`
              : reminderSync.permissionGranted
                ? ""
                : "\n\nEnable notifications in Settings for on-device study reminders."

          AppAlert.alert(
            "Study plan ready",
            `${result.message ?? "Saved to My Notes and calendar."}${resourceNote}${localNote}`,
            [
              { text: "OK", style: "default" },
              {
                text: "Flashcards",
                onPress: () => router.push("/module/flashcards" as never),
              },
              {
                text: "Practice",
                onPress: () => router.push("/module/practice" as never),
              },
            ],
          )
        } catch {
          AppAlert.alert(
            "Study plan ready",
            result.message ?? "Saved to My Notes and calendar. Push reminders will arrive before each session.",
          )
        }
      } catch (err) {
        AppAlert.alert(
          "Could not fully automate",
          err instanceof Error ? err.message : "Try saving to notes manually from the chat menu.",
          [
            { text: "OK", style: "cancel" },
            {
              text: "Save to Notes only",
              onPress: () => {
                void exportWorkspaceToNotes(session, exportMessages).then((noteResult) => {
                  if (!noteResult.error) {
                    AppAlert.alert("Saved", noteResult.message ?? "Study plan saved to My Notes.")
                  }
                })
              },
            },
          ],
        )
      }
    },
    [session, router],
  )

  const sendMessage = async (
    text: string,
    meta?: Pick<ChatMessage, "importedQuestion" | "importedQuestionLabel">,
  ) => {
    if (!session || streaming) return
    if (!text.trim() && !meta?.importedQuestion) return

    if (isThreadAtExchangeLimit(messages, maxExchanges)) {
      showExchangeLimitAlert(maxExchanges, () => void prepareNewChat())
      return
    }

    if (!membershipTierLoaded) return
    if (!hasNavAccess(membershipTier, "Explorer")) {
      AppAlert.alert("Upgrade required", `${CORA_NAME} requires Explorer or Trailblazer membership.`, [
        { text: "Cancel", style: "cancel" },
        { text: "View plans", onPress: () => router.push("/membership" as never) },
      ])
      return
    }

    if (credits && !credits.isUnlimited && credits.credits <= 0) {
      AppAlert.alert("No credits left", `You've used your weekly ${CORA_NAME} credits. Upgrade or wait for reset.`)
      return
    }

    let threadId = activeThreadId
    if (!threadId) {
      threadId = createThreadId()
      setActiveThreadId(threadId)
    }

    const editingId = editingMessageIdRef.current
    editingMessageIdRef.current = null
    const editingIndex = editingId ? messages.findIndex((m) => m.id === editingId) : -1

    let userMsg: ChatMessage
    let baseMessages: ChatMessage[]

    if (editingIndex >= 0) {
      const existing = messages[editingIndex]
      userMsg = appendUserMessageVersion(existing, {
        content: text.trim(),
        importedQuestion: meta?.importedQuestion,
        importedQuestionLabel: meta?.importedQuestionLabel,
      })
      baseMessages = messages.slice(0, editingIndex).concat(userMsg)
    } else {
      userMsg = {
        id: `${Date.now()}`,
        role: "user",
        content: text.trim(),
        ...meta,
      }
      baseMessages = [...messages, userMsg]
    }

    const assistantId = `${Date.now() + 1}`
    setMessages([...baseMessages, { id: assistantId, role: "assistant", content: "" }])
    setInput("")
    setStreaming(true)
    setStreamingMessageId(assistantId)

    const history = baseMessages
      .slice(-AI_TUTOR_CONTEXT_WINDOW)
      .map((m) => ({
        role: m.role,
        content: m.role === "user" ? buildMessageForApi(m) : m.content,
      }))

    const apiMessage = buildMessageForApi(userMsg)
    const problemContext = userMsg.importedQuestion
      ? buildProblemContextForApi(userMsg.importedQuestion)
      : null

    const activeFlow = chatFlowRef.current
    const chatConfig = activeFlow ? flowToChatConfig(activeFlow) : undefined
    const { ctx: platformContext } = await resolveCoraPlatformContext(apiMessage)

    let prepared
    try {
      prepared = prepareCoraRequest({
        session,
        tool: "chat",
        prompt: apiMessage,
        membershipTier,
      })
    } catch (err) {
      setStreaming(false)
      setStreamingMessageId(null)
      setMessages(baseMessages)
      if (isCoraAccessDeniedError(err)) {
        AppAlert.alert("Not allowed", err.message)
        return
      }
      throw err
    }

    streamAbortRef.current?.abort()
    const streamController = new AbortController()
    streamAbortRef.current = streamController

    await aiTutorApi.streamMessage(
      session,
      apiMessage,
      history,
      {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          )
        },
        onDone: () => {
          streamAbortRef.current = null
          setStreaming(false)
          setStreamingMessageId(null)
          void loadData()
          setMessages((current) => {
            const withVersion = (() => {
              const assistantIdx = current.findIndex((m) => m.id === assistantId)
              if (assistantIdx <= 0) return current
              const userIdx = assistantIdx - 1
              const user = current[userIdx]
              const assistant = current[assistantIdx]
              if (user?.role !== "user" || assistant?.role !== "assistant") return current
              const updatedUser = saveAssistantOnActiveVersion(user, assistant.content)
              return current.map((m, i) => (i === userIdx ? updatedUser : m))
            })()
            const toolPayload = pendingToolCacheRef.current
            if (toolPayload) {
              pendingToolCacheRef.current = null
              const assistant = withVersion.find((m) => m.id === assistantId)
              if (assistant?.content.trim()) {
                void setCachedToolResult(toolPayload.cacheKey, assistant.content, {
                  sourceLabel: toolPayload.sourceLabel,
                  courseId: session.courseId,
                })
              }
            }
            void flushThreadSave(withVersion, toolPayload?.threadTitle)
            if (activeFlow === "study_plan") {
              setChatFlow(null)
            }
            return withVersion
          })
        },
        onError: (err) => {
          streamAbortRef.current = null
          setStreaming(false)
          setStreamingMessageId(null)
          const message =
            err.includes("data:") || err.includes("Streaming unavailable")
              ? `${CORA_NAME} couldn't complete that request. Please try again.`
              : err
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || message } : m)),
          )
        },
        onAborted: () => handleStreamAborted(assistantId),
      },
      {
        problemContext,
        studentContext: platformContext,
        useAgent: true,
        learningMemory,
        chatConfig,
        prepared,
        signal: streamController.signal,
      },
    )
  }

  const regenerateLastResponse = useCallback(async () => {
    if (!session || streaming) return

    const lastAssistantIndex = [...messages]
      .map((m, i) => ({ m, i }))
      .reverse()
      .find(({ m }) => m.role === "assistant")?.i
    if (lastAssistantIndex == null || lastAssistantIndex < 0) return

    const priorMessages = messages.slice(0, lastAssistantIndex)
    const lastUser = [...priorMessages].reverse().find((m) => m.role === "user" && m.content.trim())
    if (!lastUser) return

    if (isThreadAtExchangeLimit(priorMessages, maxExchanges)) {
      showExchangeLimitAlert(maxExchanges, () => void prepareNewChat())
      return
    }

    const assistantId = `${Date.now() + 1}`
    setMessages([...priorMessages, { id: assistantId, role: "assistant", content: "" }])
    setStreaming(true)
    setStreamingMessageId(assistantId)

    const history = priorMessages
      .slice(-AI_TUTOR_CONTEXT_WINDOW)
      .map((m) => ({
        role: m.role,
        content: m.role === "user" ? buildMessageForApi(m) : m.content,
      }))

    const apiMessage = buildMessageForApi(lastUser)
    const problemContext = lastUser.importedQuestion
      ? buildProblemContextForApi(lastUser.importedQuestion)
      : null
    const { ctx: platformContext } = await resolveCoraPlatformContext(apiMessage)

    let prepared
    try {
      prepared = prepareCoraRequest({
        session,
        tool: "chat",
        prompt: apiMessage,
        membershipTier,
      })
    } catch (err) {
      setStreaming(false)
      setStreamingMessageId(null)
      setMessages(priorMessages)
      if (isCoraAccessDeniedError(err)) {
        AppAlert.alert("Not allowed", err.message)
        return
      }
      throw err
    }

    streamAbortRef.current?.abort()
    const streamController = new AbortController()
    streamAbortRef.current = streamController

    await aiTutorApi.streamMessage(
      session,
      apiMessage,
      history,
      {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          )
        },
        onDone: () => {
          streamAbortRef.current = null
          setStreaming(false)
          setStreamingMessageId(null)
          void loadData()
          setMessages((current) => {
            void flushThreadSave(current)
            return current
          })
        },
        onError: (err) => {
          streamAbortRef.current = null
          setStreaming(false)
          setStreamingMessageId(null)
          const message =
            err.includes("data:") || err.includes("Streaming unavailable")
              ? `${CORA_NAME} couldn't complete that request. Please try again.`
              : err
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || message } : m)),
          )
        },
        onAborted: () => handleStreamAborted(assistantId),
      },
      {
        problemContext,
        studentContext: platformContext,
        useAgent: true,
        learningMemory,
        prepared,
        signal: streamController.signal,
      },
    )
  }, [session, streaming, messages, loadData, flushThreadSave, maxExchanges, prepareNewChat, learningMemory, resolveCoraPlatformContext, membershipTier, handleStreamAborted])

  const editUserMessage = useCallback(
    (message: ChatMessage) => {
      if (streaming) return
      const index = messages.findIndex((entry) => entry.id === message.id)
      if (index < 0) return

      let updatedUser = message
      const assistantAfter = messages[index + 1]
      if (assistantAfter?.role === "assistant" && assistantAfter.content.trim()) {
        updatedUser = saveAssistantOnActiveVersion(message, assistantAfter.content)
      }

      editingMessageIdRef.current = message.id
      setMessages(
        messages.slice(0, index + 1).map((entry, i) => (i === index ? updatedUser : entry)),
      )
      setInput(getActiveUserVersion(updatedUser).content)
      setChatFlow(null)
    },
    [streaming, messages, setInput],
  )

  const navigateUserMessageVersion = useCallback(
    (message: ChatMessage, direction: "prev" | "next") => {
      if (streaming) return
      const index = messages.findIndex((m) => m.id === message.id)
      if (index < 0) return
      const versions = getUserMessageVersions(message)
      if (versions.length <= 1) return
      const current = getActiveUserVersionIndex(message)
      const nextIndex = direction === "prev" ? current - 1 : current + 1
      if (nextIndex < 0 || nextIndex >= versions.length) return
      const updatedUser = applyUserMessageVersion(message, nextIndex)
      setMessages(rebuildThreadAfterVersionChange(messages, index, updatedUser))
    },
    [streaming, messages],
  )

  const reattachImportToMessage = useCallback(
    async (message: ChatMessage, problem: CoraImportedProblem, label: string) => {
      if (!session || !activeThreadId) return
      const index = messages.findIndex((entry) => entry.id === message.id)
      if (index < 0) return

      const updatedUser = attachImportedQuestionToMessage(message, problem, label)
      const nextMessages = messages.map((entry, entryIndex) => (entryIndex === index ? updatedUser : entry))
      setMessages(nextMessages)
      await flushThreadSave(nextMessages)
    },
    [session, activeThreadId, messages, flushThreadSave],
  )

  const branchFromMessage = useCallback(
    async (message: ChatMessage) => {
      if (streaming || !session) return
      if (messages.length > 0 && activeThreadId) {
        const existing = threads.find((t) => t.id === activeThreadId)
        const thread = buildThread(activeThreadId, messages, existing)
        const next = await saveThread(session.databaseId, thread)
        setThreads(next)
        scheduleRemoteSync(next)
      }
      setMessages([])
      setActiveThreadId(null)
      setInput(`Continue from this ${message.role === "assistant" ? "Cora answer" : "message"}:\n\n${message.content}`)
      enterImmersiveChat()
    },
    [streaming, session, messages, activeThreadId, threads, scheduleRemoteSync, enterImmersiveChat],
  )

  const resumeThread = useCallback(
    (thread: AiTutorChatThread) => {
      if (streaming) return
      setMessages(thread.messages)
      setActiveThreadId(thread.id)
      if (session) {
        void saveSessionPrefs(session.databaseId, { activeThreadId: thread.id, activeTab: "workspace" })
      }
    },
    [streaming, session],
  )

  const handleNewConversation = useCallback(async () => {
    await prepareNewChat()
    enterImmersiveChat()
  }, [prepareNewChat, enterImmersiveChat])

  const handleOpenThread = useCallback(
    (thread: AiTutorChatThread) => {
      resumeThread(thread)
      enterImmersiveChat()
    },
    [resumeThread, enterImmersiveChat],
  )

  const handleNewFromChat = useCallback(() => {
    if (streaming) return
    if (messages.length === 0) {
      void prepareNewChat()
      return
    }
    AppAlert.alert("Start new conversation?", "Your current chat will be saved to history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New chat",
        onPress: () => void prepareNewChat(),
      },
    ])
  }, [streaming, messages.length, prepareNewChat])

  const openWorkspaceWithNewChat = useCallback(
    async (prompt: string, flow: CoraChatFlow | null = null, autoSend = true) => {
      if (streaming || !session) return
      try {
        const ctx = await loadCoraStudentContext(session)
        setStudentContext(ctx)
        studentContextRef.current = ctx
      } catch {
        /* use cached context */
      }
      await prepareNewChat()
      setChatFlow(flow)
      setInput(prompt)
      setPrimaryTab("workspace")
      setOverlaySection(null)
      enterImmersiveChat()
      persistTab("workspace")
      if (autoSend) pendingAutoSendRef.current = prompt
    },
    [streaming, session, prepareNewChat, enterImmersiveChat, persistTab, setOverlaySection],
  )

  const handleCapabilityAction = useCallback(
    (capability: StudentCoraCapability, prompt?: string) => {
      if (prompt?.trim()) {
        const existing = findStudentCoraThreadForCapability(
          threadsRef.current,
          archivedThreadsRef.current,
          capability.id,
        )
        if (existing) {
          setMessages(existing.messages)
          setActiveThreadId(existing.id)
          if (session) {
            void saveSessionPrefs(session.databaseId, {
              activeThreadId: existing.id,
              activeTab: "workspace",
            })
          }
          enterImmersiveChat()
          return
        }
        pendingCapabilityRef.current = capability.id
        openWorkspacePrompt(prompt.trim())
        return
      }

      const toolFlowId = studentCapabilityToolFlowId(capability.id)
      if (toolFlowId) {
        setCapabilityToolFlow(toolFlowId)
        return
      }

      const chatFlowConfig = studentCapabilityChatFlow(capability.id)
      if (chatFlowConfig) {
        pendingCapabilityRef.current = capability.id
        void openWorkspaceWithNewChat(chatFlowConfig.prompt, chatFlowConfig.flow)
        return
      }

      if (capability.section === "code" && !hasNavAccess(membershipTier, "Trailblazer")) {
        router.push("/membership" as never)
        return
      }

      if (capability.toolId) {
        const tool = CORA_TOOLS.find((item) => item.id === capability.toolId)
        if (tool?.workspacePrompt) {
          pendingCapabilityRef.current = capability.id
          openWorkspacePrompt(tool.workspacePrompt)
          return
        }
        if (tool?.route) {
          router.push(tool.route as never)
          return
        }
      }

      pendingCapabilityRef.current = capability.id
      void openWorkspaceWithNewChat(studentCapabilityDefaultPrompt(capability), null)
    },
    [
      membershipTier,
      openWorkspacePrompt,
      openWorkspaceWithNewChat,
      router,
      session,
      enterImmersiveChat,
    ],
  )

  const handleTodayRecommendationPress = useCallback(
    (rec: AiTutorRecommendation) => {
      switch (rec.link) {
        case CORA_TODAY_LINK_PREPARE_EXAM:
          handleCapabilityAction(studentCoraCapability("prepare-exam"))
          return true
        case CORA_TODAY_LINK_STUDY_PLAN:
          handleCapabilityAction(studentCoraCapability("create-study-plan"))
          return true
        case CORA_TODAY_LINK_SUMMARIZE:
          handleCapabilityAction(studentCoraCapability("summarize-lecture"))
          return true
        case CORA_TODAY_LINK_CHAT:
          handleNewConversation()
          return true
        default:
          return false
      }
    },
    [handleCapabilityAction, handleNewConversation],
  )

  const persistCurrentThreadIfNeeded = useCallback(async () => {
    if (!session || !activeThreadId || messages.length === 0) return
    if (isToolThreadId(activeThreadId)) return
    const meaningful = messages.filter(isStorableChatMessage)
    if (meaningful.length === 0) return
    const existing = threadsRef.current.find((t) => t.id === activeThreadId)
    const thread = buildThread(activeThreadId, messages, existing)
    const next = await saveThread(session.databaseId, thread)
    setThreads(next)
    scheduleRemoteSync(next)
  }, [session, activeThreadId, messages, scheduleRemoteSync])

  const launchToolFlow = useCallback(
    async (payload: CoraToolLaunchPayload) => {
      if (streaming || !session) return
      if (!membershipTierLoaded) return
      if (!hasNavAccess(membershipTier, "Explorer")) {
        AppAlert.alert("Upgrade required", `${CORA_NAME} requires Explorer or Trailblazer membership.`, [
          { text: "Cancel", style: "cancel" },
          { text: "View plans", onPress: () => router.push("/membership" as never) },
        ])
        return
      }
      if (credits && !credits.isUnlimited && credits.credits <= 0) {
        AppAlert.alert("No credits left", `You've used your weekly ${CORA_NAME} credits. Upgrade or wait for reset.`)
        return
      }

      const toolThreadId = getToolThreadId(payload.toolId)
      if (!toolThreadId) return

      try {
        const ctx = await loadCoraStudentContext(session)
        setStudentContext(ctx)
        studentContextRef.current = ctx
      } catch {
        /* use cached context */
      }

      await persistCurrentThreadIfNeeded()

      const existingToolThread = threadsRef.current.find((t) => t.id === toolThreadId)
      const priorMessages = existingToolThread?.messages ?? []

      if (isThreadAtExchangeLimit(priorMessages, maxExchanges)) {
        showExchangeLimitAlert(maxExchanges, () => {
          /* tool threads stay dedicated — start a regular workspace chat instead */
          void prepareNewChat().then(() => enterImmersiveChat())
        })
        return
      }

      setChatFlow(null)
      setPrimaryTab("workspace")
      setOverlaySection(null)
      enterImmersiveChat()
      persistTab("workspace")
      setActiveThreadId(toolThreadId)

      const userMsg: ChatMessage = {
        id: `${Date.now()}`,
        role: "user",
        content: payload.sourceLabel
          ? `${payload.userMessage}\n\n— ${payload.sourceLabel}`
          : payload.userMessage,
      }

      if (payload.cachedResult?.trim()) {
        const assistantMsg: ChatMessage = {
          id: `${Date.now() + 1}`,
          role: "assistant",
          content: payload.cachedResult.trim(),
        }
        const msgs = [...priorMessages, userMsg, assistantMsg]
        setMessages(msgs)
        let thread = buildThread(toolThreadId, msgs, existingToolThread)
        if (!existingToolThread) {
          thread = {
            ...thread,
            title: getToolThreadTitle(payload.toolId),
            titleIsCustom: true,
          }
        }
        const next = await saveThread(session.databaseId, thread)
        setThreads(next)
        scheduleRemoteSync(next)
        return
      }

      pendingToolCacheRef.current = payload
      const assistantId = `${Date.now() + 1}`
      const baseMessages = [...priorMessages, userMsg]
      setMessages([...baseMessages, { id: assistantId, role: "assistant", content: "" }])
      setInput("")
      setStreaming(true)
      setStreamingMessageId(assistantId)

      const apiMessage = payload.contextBlock.trim()
        ? `${payload.contextBlock}\n\n---\n\nStudent request:\n${payload.userMessage}`
        : payload.userMessage

      const history = baseMessages
        .slice(-AI_TUTOR_CONTEXT_WINDOW)
        .map((m) => ({
          role: m.role,
          content: m.role === "user" ? m.content : m.content,
        }))

      const { ctx: platformContext } = await resolveCoraPlatformContext(apiMessage)

      let prepared
      try {
        prepared = prepareCoraRequest({
          session,
          tool: coraToolFlowToRbac(payload.toolId),
          prompt: apiMessage,
          membershipTier,
        })
      } catch (err) {
        setStreaming(false)
        setStreamingMessageId(null)
        pendingToolCacheRef.current = null
        if (isCoraAccessDeniedError(err)) {
          AppAlert.alert("Not allowed", err.message)
          return
        }
        throw err
      }

      streamAbortRef.current?.abort()
      const streamController = new AbortController()
      streamAbortRef.current = streamController

      await aiTutorApi.streamMessage(
        session,
        apiMessage,
        history,
        {
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            )
          },
          onDone: () => {
            streamAbortRef.current = null
            setStreaming(false)
            setStreamingMessageId(null)
            void loadData()
            setMessages((current) => {
              const toolPayload = pendingToolCacheRef.current
              const assistant = current.find((m) => m.id === assistantId)
              if (toolPayload && assistant?.content.trim()) {
                pendingToolCacheRef.current = null
                void setCachedToolResult(toolPayload.cacheKey, assistant.content, {
                  sourceLabel: toolPayload.sourceLabel,
                  courseId: session.courseId,
                })
              }
              const isNewToolThread = !existingToolThread
              void flushThreadSave(
                current,
                isNewToolThread ? getToolThreadTitle(payload.toolId) : undefined,
              )
              return current
            })
          },
          onError: (err) => {
            streamAbortRef.current = null
            setStreaming(false)
            setStreamingMessageId(null)
            pendingToolCacheRef.current = null
            const message =
              err.includes("data:") || err.includes("Streaming unavailable")
                ? `${CORA_NAME} couldn't complete that request. Please try again.`
                : err
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || message } : m)),
            )
          },
          onAborted: () => handleStreamAborted(assistantId),
        },
        {
          studentContext: platformContext,
          useAgent: true,
          learningMemory,
          prepared,
          signal: streamController.signal,
        },
      )
    },
    [
      streaming,
      session,
      membershipTierLoaded,
      membershipTier,
      credits,
      router,
      maxExchanges,
      persistCurrentThreadIfNeeded,
      prepareNewChat,
      enterImmersiveChat,
      persistTab,
      setOverlaySection,
      scheduleRemoteSync,
      loadData,
      flushThreadSave,
      learningMemory,
      resolveCoraPlatformContext,
      handleStreamAborted,
    ],
  )

  useEffect(() => {
    if (!immersiveChatOpen || streaming || !pendingAutoSendRef.current) return
    const prompt = pendingAutoSendRef.current
    pendingAutoSendRef.current = null
    void sendMessage(prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto send when immersive chat opens
  }, [immersiveChatOpen, streaming, chatFlow])

  const handleArchiveThread = useCallback(
    async (threadId: string) => {
      if (!session) return
      const { threads: next, archivedThreads: nextArchived } = await archiveThread(
        session.databaseId,
        threadId,
      )
      setThreads(next)
      setArchivedThreads(nextArchived)
      scheduleRemoteSync(next)
      if (activeThreadId === threadId) {
        setMessages([])
        setActiveThreadId(null)
      }
    },
    [session, activeThreadId, scheduleRemoteSync],
  )

  const handleRenameThread = useCallback(
    async (threadId: string, title: string) => {
      if (!session) return
      const { threads: next, archivedThreads: nextArchived } = await renameThread(
        session.databaseId,
        threadId,
        title,
      )
      setThreads(next)
      setArchivedThreads(nextArchived)
      scheduleRemoteSync(next)
    },
    [session, scheduleRemoteSync],
  )

  const handleRestoreThread = useCallback(
    async (threadId: string) => {
      if (!session) return
      const { threads: next, archivedThreads: nextArchived } = await restoreThread(
        session.databaseId,
        threadId,
      )
      setThreads(next)
      setArchivedThreads(nextArchived)
      scheduleRemoteSync(next)
    },
    [session, scheduleRemoteSync],
  )

  const handlePermanentlyDeleteThread = useCallback(
    async (threadId: string) => {
      if (!session) return
      const { threads: next, archivedThreads: nextArchived } = await permanentlyDeleteThread(
        session.databaseId,
        threadId,
      )
      setThreads(next)
      setArchivedThreads(nextArchived)
      scheduleRemoteSync(next)
      void deleteWorkspaceConversation(session, threadId).catch(() => {
        /* best-effort remote delete */
      })
      if (activeThreadId === threadId) {
        setMessages([])
        setActiveThreadId(null)
      }
    },
    [session, activeThreadId, scheduleRemoteSync],
  )

  const openInsightsChat = useCallback(() => {
    setOverlaySection(null)
    setPrimaryTab("workspace")
    enterImmersiveChat()
  }, [enterImmersiveChat, setOverlaySection])

  const openInsightsSolve = useCallback(() => {
    setOverlaySection(null)
    setPrimaryTab("solve")
  }, [setOverlaySection])

  const openInsightsStudyPlan = useCallback(() => {
    setOverlaySection("study-plan")
  }, [setOverlaySection])

  const closeOverlay = useCallback(() => setOverlaySection(null), [setOverlaySection])

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.caption, styles.muted, { color: SN.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  if (!membershipTierLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator color={tokens.accent} size="large" />
        <Text style={[type.caption, styles.muted, { marginTop: 12, color: SN.secondaryLabel }]}>Loading membership…</Text>
      </View>
    )
  }

  if (!hasAccess) {
    return (
      <StudentThemedLocked
        icon="sparkles"
        subtitle={`Unlock ${CORA_NAME} with Explorer or Trailblazer membership.`}
        paddingTop={lockedTopPad}
        onUpgrade={() => router.push("/membership" as never)}
      />
    )
  }

  const activeThread =
    threads.find((t) => t.id === activeThreadId) ??
    archivedThreads.find((t) => t.id === activeThreadId)
  const conversationTitle =
    activeThread?.title ??
    (messages.length > 0 ? deriveThreadTitle(messages.filter(isStorableChatMessage)) : null)

  const studentFirstName = session.name.split(" ")[0] ?? "there"

  const renderOverlaySection = () => {
    if (!overlaySection) return null
    switch (overlaySection) {
      case "workspace":
        return (
          <CoraWorkspaceTab
            historyLoading={historyLoading}
            historySyncing={historySyncing}
            threads={threads}
            archivedThreads={archivedThreads}
            maxExchanges={maxExchanges}
            onNewConversation={handleNewConversation}
            onOpenThread={handleOpenThread}
            onRenameThread={(threadId, title) => void handleRenameThread(threadId, title)}
            onArchiveThread={(threadId) => void handleArchiveThread(threadId)}
            onRestoreThread={(threadId) => void handleRestoreThread(threadId)}
            onPermanentlyDeleteThread={(threadId) => void handlePermanentlyDeleteThread(threadId)}
          />
        )
      case "solve":
        return <CoraSolveTab session={session} />
      case "learn":
        return (
          <CoraLearnTab
            session={session}
            onLaunchToolFlow={(payload) => void launchToolFlow(payload)}
          />
        )
      case "code":
        return (
          <CoraCodeTab
            membershipTier={membershipTier}
            onOpenWorkspacePrompt={openWorkspacePrompt}
            onClose={closeOverlay}
          />
        )
      case "insights":
        return (
          <CoraInsightsTab
            stats={stats}
            topicMastery={topicMastery}
            progress={progressDetailed}
            loading={loading}
            onClose={closeOverlay}
            onOpenChat={openInsightsChat}
            onOpenSolve={openInsightsSolve}
            onOpenStudyPlan={openInsightsStudyPlan}
          />
        )
      case "study-plan":
        return (
          <CoraStudyPlanTab
            onGeneratePlan={() =>
              void openWorkspaceWithNewChat(STUDY_PLAN_GENERATION_PROMPT, "study_plan")
            }
            onOpenCalendarAssistant={() =>
              void openWorkspaceWithNewChat(CALENDAR_ASSISTANT_PROMPT, "calendar_assistant")
            }
            onWeeklyReview={() =>
              void openWorkspaceWithNewChat(WEEKLY_REVIEW_PROMPT, "weekly_review")
            }
            onExamCountdown={() =>
              void openWorkspaceWithNewChat(EXAM_COUNTDOWN_PROMPT, "exam_countdown")
            }
            onClose={closeOverlay}
          />
        )
      case "tools":
        return (
          <CoraToolsTab
            session={session}
            messages={messages}
            onLaunchToolFlow={(payload) => void launchToolFlow(payload)}
          />
        )
      case "preferences":
        return <CoraPreferencesTab session={session} onNavigateSection={navigateSection} />
      default:
        return null
    }
  }

  return (
    <StudentCoraContextProvider context={coraContext} capabilities={coraCapabilities}>
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        {!immersiveChatOpen && !overlaySection ? (
          <>
            <StudentCoraHubView
              session={session}
              creditsLabel={creditsLabel}
              recommendations={todayRecommendations}
              loading={loading}
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              onExit={exitCora}
              onOpenChat={handleNewConversation}
              onExploreSection={navigateSection}
              onCapabilityAction={handleCapabilityAction}
              onTodayRecommendationPress={handleTodayRecommendationPress}
              contextReady={coraContextReady}
              showSetupOverlay={showCoraSetupOverlay}
              setupStep={coraSetupStep}
              courseLabel={coraCourseLabel}
              focusLabel={coraContext?.focusLabel}
              capabilities={coraCapabilities}
              contextError={coraContextError}
              onRetrySetup={retryCoraSetup}
            />
            {session ? (
              <CoraToolFlowSheet
                visible={capabilityToolFlow != null}
                toolId={capabilityToolFlow}
                session={session}
                onClose={() => setCapabilityToolFlow(null)}
                onLaunch={(payload) => {
                  setCapabilityToolFlow(null)
                  void launchToolFlow(payload)
                }}
              />
            ) : null}
          </>
        ) : null}

      {!immersiveChatOpen && overlaySection ? (
        <CoraOverlayShell onBack={closeOverlay}>
          {renderOverlaySection()}
        </CoraOverlayShell>
      ) : null}

      {immersiveChatOpen ? (
        <CoraImmersiveChat
          session={session}
          studentFirstName={studentFirstName}
          chatHydrated={chatHydrated}
          historyLoading={historyLoading}
          historySyncing={historySyncing}
          messages={messages}
          input={input}
          setInput={setInput}
          streaming={streaming}
          streamingMessageId={streamingMessageId}
          atExchangeLimit={atExchangeLimit}
          nearExchangeLimit={nearExchangeLimit}
          remainingExchanges={remainingExchanges}
          exchangeCount={exchangeCount}
          maxExchanges={maxExchanges}
          conversationTitle={conversationTitle}
          threadCreatedAt={activeThread?.createdAt ?? parseThreadTimestamp(activeThreadId)}
          threadUpdatedAt={activeThread?.updatedAt ?? null}
          credits={credits}
          threads={threads}
          archivedThreads={archivedThreads}
          activeThreadId={activeThreadId}
          onOpenThread={handleOpenThread}
          onRenameThread={(threadId, title) => void handleRenameThread(threadId, title)}
          onArchiveThread={(threadId) => void handleArchiveThread(threadId)}
          onRestoreThread={(threadId) => void handleRestoreThread(threadId)}
          onDeleteThread={(threadId) => void handlePermanentlyDeleteThread(threadId)}
          onSend={(text, meta) => void sendMessage(text, meta)}
          onStop={stopStreaming}
          onRegenerate={() => void regenerateLastResponse()}
          onBranchChat={(message) => void branchFromMessage(message)}
          onEditUserMessage={editUserMessage}
          onReattachImport={(message, problem, label) => void reattachImportToMessage(message, problem, label)}
          onNavigateUserMessageVersion={navigateUserMessageVersion}
          onBack={exitImmersiveChat}
          onNewFromChat={handleNewFromChat}
        />
      ) : null}
      </View>
    </StudentCoraContextProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { lineHeight: 20 },
})
