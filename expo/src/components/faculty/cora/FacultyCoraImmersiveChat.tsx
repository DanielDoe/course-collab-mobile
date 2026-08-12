import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import * as Haptics from "expo-haptics"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { readAsStringAsync } from "expo-file-system/legacy"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../../lib/themed-module-theme"
import { useKpiGridCardStyle } from "../../../lib/responsive-layout"
import { hexToRgba } from "../../../constants/app-themes"
import { NATIVE } from "../../../constants/faculty-native-theme"
import type { ChatMessage } from "../../../lib/ai-tutor-api"
import type { FacultySession } from "../../../lib/session"
import type { InstructorScope } from "../../../lib/instructor-content-api"
import { useFacultyCoraContext } from "../../../context/FacultyCoraContextProvider"
import { resolveFacultyCoraCapability } from "../../../lib/faculty-cora-context-store"
import type { FacultyCoraCapabilityId } from "../../../lib/faculty-cora-config"
import { facultyCoraApi, type FacultyCoraChatAction } from "../../../lib/faculty-cora-api"
import {
  FACULTY_CORA_COLOR,
  facultyCoraChatCanvas,
  facultyCoraChatSolidCanvas,
  facultyCoraChatStarterCardStyle,
} from "../../../lib/faculty-cora-theme"
import { getThemedCoraChatBubblePalette } from "../../ai-tutor/cora-chat-bubble-theme"
import {
  activateFacultyCoraThread,
  archiveFacultyCoraThread,
  buildFacultyCoraThread,
  createFacultyCoraThreadId,
  deleteFacultyCoraThread,
  findFacultyCoraThreadForCapability,
  loadLocalFacultyCoraChatSession,
  syncFacultyCoraChatSession,
  renameFacultyCoraThread,
  restoreFacultyCoraThread,
  saveFacultyCoraThread,
  type FacultyCoraChatThread,
} from "../../../lib/faculty-cora-chat-storage"
import type { CoraIntentId } from "../../../lib/cora-intents"
import { isCoraIngestibleDocument } from "../../../lib/cora-document-ingest"
import {
  runFacultyChatAction,
  runFacultyDocumentIngest,
} from "../../../lib/cora-tool-runner"
import type { DraftQuestionBankItem } from "../../../lib/question-bank-ai-types"
import { FacultyCoraQuestionBankDraftModal } from "./FacultyCoraQuestionBankDraftModal"
import { ApiError } from "../../../lib/api"
import {
  facultyCapabilityToRbac,
  isCoraAccessDeniedError,
  prepareCoraRequest,
  recordCoraError,
  recordCoraSuccess,
} from "../../../lib/cora-rbac"
import { useCoraVoiceDictation } from "../../../hooks/use-cora-voice-dictation"
import { CoraChatBubble } from "../../ai-tutor/CoraChatBubble"
import { CoraWorkspaceComposer } from "../../ai-tutor/CoraWorkspaceComposer"
import { CoraMessageOptionsSheet } from "../../ai-tutor/CoraMessageOptionsSheet"
import {
  CoraUserMessageContextMenu,
  type CoraUserMessageMenuAction,
  type UserMessageAnchor,
} from "../../ai-tutor/CoraUserMessageContextMenu"
import { CoraUserMessageSelectSheet } from "../../ai-tutor/CoraUserMessageSelectSheet"
import { CoraCodeToolSheet } from "../../ai-tutor/CoraComposerToolSheets"
import type { CoraMessageMenuActionId } from "../../../lib/cora-message-actions"
import {
  buildWorkspaceSendText,
  buildMessageForApi,
  isLikelyTextFile,
  type CoraComposerAttachment,
} from "../../../lib/cora-composer-attachments"
import type { CoraImportedProblem } from "../../../lib/cora-api"
import { attachImportedQuestionToMessage } from "../../../lib/cora-import-recovery"
import {
  buildImproveComposerPrompt,
  resolveImproveImportHint,
  type FacultyCoraImportHint,
} from "../../../lib/faculty-cora-question-import"
import { findFacultyAttachmentAction, type FacultyCoraAttachmentActionId } from "../../../lib/faculty-cora-composer-actions"
import {
  buildFacultyCoraIntentStarter,
  facultyCoraIntentCapability,
} from "../../../lib/faculty-cora-composer-intents"
import type { CoraToolRunResult } from "../../../lib/cora-tool-runner"
import { FacultyCoraImportCourseSheet } from "./FacultyCoraImportCourseSheet"
import { CoraBrand } from "../../cora/CoraBrand"
import { CoraChatAmbientLayer } from "../../cora/CoraChatAmbientLayer"
import { FacultyCoraComposerAttachMenu } from "./FacultyCoraComposerAttachMenu"
import { CoraChatSideNav, type CoraHistoryThreadItem } from "../../cora/CoraChatHistorySheet"
import { CoraChatMenuButton } from "../../cora/CoraChatMenuButton"
import { CoraChatCloseButton } from "../../cora/CoraChatCloseButton"
import { CoraEdgeBackSwipe } from "../../cora/CoraEdgeBackSwipe"

type AssistantMessage = ChatMessage & { actions?: FacultyCoraChatAction[] }

type Props = {
  scope: InstructorScope
  session: FacultySession
  capabilityId?: FacultyCoraCapabilityId
  initialPrompt?: string
  initialImportHint?: FacultyCoraImportHint
  /** When true (default), open a fresh welcome screen instead of resuming the last thread. */
  startFresh?: boolean
  onClose: () => void
}

function nextChatMessageId(): string {
  return `fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function FacultyCoraStarterCard({
  prompt,
  cardStyle,
  isDark,
  onPick,
}: {
  prompt: string
  cardStyle: ReturnType<typeof facultyCoraChatStarterCardStyle>
  isDark: boolean
  onPick: (prompt: string) => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const cardLayout = useKpiGridCardStyle("47%")
  const press = useSharedValue(1)
  const select = useSharedValue(0)
  const defaultBorder = isDark ? hexToRgba("#FFFFFF", 0.12) : hexToRgba("#3C3C43", 0.12)
  const selectedBg = isDark ? hexToRgba("#FFFFFF", 0.1) : hexToRgba("#000000", 0.04)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (1 + select.value * 0.025) }],
  }))

  const selectionOverlayStyle = useAnimatedStyle(() => ({
    opacity: select.value,
  }))

  const handlePress = () => {
    select.value = withSpring(1, { damping: 14, stiffness: 340 })
    press.value = withSpring(1.02, { damping: 12, stiffness: 280 })
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTimeout(() => onPick(prompt), 180)
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        press.value = withSpring(0.965, { damping: 18, stiffness: 420 })
      }}
      onPressOut={() => {
        if (select.value < 0.5) {
          press.value = withSpring(1, { damping: 14, stiffness: 320 })
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={prompt}
      style={[styles.goalCard, cardLayout, cardStyle, { borderColor: defaultBorder }, animatedStyle]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.goalCardSelection,
          { backgroundColor: selectedBg },
          selectionOverlayStyle,
        ]}
      />
      <Text
        style={[
          type.caption,
          {
            color: native.label,
            lineHeight: 18,
            fontWeight: "500",
          },
        ]}
        numberOfLines={3}
      >
        {prompt}
      </Text>
    </AnimatedPressable>
  )
}

function FacultyNewChatWelcome({
  instructorFirstName,
  prompts,
  improveMode = false,
  onPickPrompt,
  onImportFromCourse,
}: {
  instructorFirstName: string
  prompts: string[]
  improveMode?: boolean
  onPickPrompt: (prompt: string) => void
  onImportFromCourse?: () => void
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const native = useThemedNative()
  const cardStyle = facultyCoraChatStarterCardStyle(tokens.isDark, native.separator)

  return (
    <View style={styles.welcomeWrap}>
      <Text style={[type.caption, { color: SN.secondaryLabel, textAlign: "center" }]}>
        Hey {instructorFirstName} — I&apos;m
      </Text>
      <CoraBrand size="lg" />
      <Text style={[type.caption, styles.welcomeSub, { color: SN.secondaryLabel }]}>
        {improveMode
          ? "Import a quiz or bank question, then tell me how to refine it."
          : "Your teaching copilot. Pick a starter or ask anything about your course."}
      </Text>
      {improveMode && onImportFromCourse ? (
        <Pressable
          onPress={onImportFromCourse}
          style={[styles.importHeroBtn, { backgroundColor: `${FACULTY_CORA_COLOR.link}14`, borderColor: `${FACULTY_CORA_COLOR.link}33` }]}
        >
          <Ionicons name="library-outline" size={18} color={FACULTY_CORA_COLOR.link} />
          <Text style={[type.bodyEmphasis, { color: FACULTY_CORA_COLOR.link }]}>Import from course</Text>
        </Pressable>
      ) : null}
      <View style={styles.goalGrid}>
        {prompts.map((prompt) => (
          <FacultyCoraStarterCard
            key={prompt}
            prompt={prompt}
            cardStyle={cardStyle}
            isDark={tokens.isDark}
            onPick={onPickPrompt}
          />
        ))}
      </View>
    </View>
  )
}

function FacultyActionChips({
  actions,
  actionKey,
  accent,
  accentSoft,
  onRun,
}: {
  actions: FacultyCoraChatAction[]
  actionKey: string | null
  accent: string
  accentSoft: string
  onRun: (action: FacultyCoraChatAction) => void
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.actionRow}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={() => void onRun(action)}
          disabled={actionKey != null}
          style={[
            styles.actionChip,
            {
              backgroundColor: accentSoft,
              borderColor: native.separator,
              opacity: actionKey === action.id ? 0.6 : 1,
            },
          ]}
        >
          {actionKey === action.id ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <>
              <Ionicons name="open-outline" size={14} color={accent} />
              <Text style={[type.caption, { color: accent, fontWeight: "700" }]}>{action.label}</Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  )
}

export function FacultyCoraImmersiveChat({
  scope,
  session,
  capabilityId,
  initialPrompt,
  initialImportHint,
  startFresh = true,
  onClose,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const listRef = useRef<FlatList>(null)

  const { context, capabilities } = useFacultyCoraContext()
  const [activeCapabilityId, setActiveCapabilityId] = useState<FacultyCoraCapabilityId>(
    capabilityId ?? "assistant",
  )
  const [modeSheetOpen, setModeSheetOpen] = useState(false)
  const capability = resolveFacultyCoraCapability(activeCapabilityId, context)
  const welcomePrompts = capability.examplePrompts.slice(0, 4)
  const instructorFirstName = session.name.split(" ")[0] ?? "there"

  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState(initialPrompt ?? "")
  const [sending, setSending] = useState(false)
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [pasteContentOpen, setPasteContentOpen] = useState(false)
  const [importCourseOpen, setImportCourseOpen] = useState(false)
  const [reattachTargetMessageId, setReattachTargetMessageId] = useState<string | null>(null)
  const [importHint, setImportHint] = useState<FacultyCoraImportHint | null>(initialImportHint ?? null)
  const [importedQuestion, setImportedQuestion] = useState<CoraImportedProblem | null>(null)
  const [importedQuestionLabel, setImportedQuestionLabel] = useState<string | null>(null)
  const improveGoalRef = useRef(initialImportHint?.improveGoal)
  const improvePromptRef = useRef(initialPrompt ?? "")
  const importOpenedRef = useRef(false)
  const [attachments, setAttachments] = useState<CoraComposerAttachment[]>([])
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)
  const [feedbackById, setFeedbackById] = useState<Record<string, "up" | "down">>({})
  const [userMenuMessage, setUserMenuMessage] = useState<ChatMessage | null>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<UserMessageAnchor | null>(null)
  const [userMenuSentAt, setUserMenuSentAt] = useState<string | null>(null)
  const [selectTextContent, setSelectTextContent] = useState<string | null>(null)
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [draftModalDrafts, setDraftModalDrafts] = useState<DraftQuestionBankItem[]>([])
  const sentInitialRef = useRef(false)
  const createdAtRef = useRef(new Date().toISOString())
  const sendAbortRef = useRef<AbortController | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [threads, setThreads] = useState<FacultyCoraChatThread[]>([])
  const [archivedThreads, setArchivedThreads] = useState<FacultyCoraChatThread[]>([])
  const [sideNavOpen, setSideNavOpen] = useState(false)
  const [chatHydrated, setChatHydrated] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySyncing, setHistorySyncing] = useState(false)
  const messagesRef = useRef<AssistantMessage[]>([])
  const threadIdRef = useRef<string | null>(null)

  messagesRef.current = messages
  threadIdRef.current = threadId

  useEffect(() => {
    if (capabilityId) setActiveCapabilityId(capabilityId)
  }, [capabilityId])

  const persistActiveThread = useCallback(async () => {
    const id = threadIdRef.current
    const courseId = scope.courseId
    if (!id || !courseId) return

    const storable = messagesRef.current.filter((message) => message.content.trim() || message.importedQuestion)
    if (storable.length === 0) return

    const existingThread =
      threads.find((thread) => thread.id === id) ?? archivedThreads.find((thread) => thread.id === id)

    const thread = buildFacultyCoraThread(id, storable, activeCapabilityId, {
      createdAt: createdAtRef.current,
      capabilityId: activeCapabilityId,
      title: existingThread?.title ?? capability.label,
      titleIsCustom: existingThread?.titleIsCustom,
    })
    await saveFacultyCoraThread(scope.instructorId, courseId, thread, scope)
    setThreads((prev) => {
      const without = prev.filter((item) => item.id !== thread.id)
      return [thread, ...without].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    })
  }, [activeCapabilityId, archivedThreads, scope, threads])

  const applyLoadedSession = useCallback(
    (
      loaded: Awaited<ReturnType<typeof loadLocalFacultyCoraChatSession>>,
      fresh: boolean,
    ) => {
      if (fresh) {
        const newId = createFacultyCoraThreadId()
        setThreadId(newId)
        createdAtRef.current = new Date().toISOString()
        setMessages([])
        sentInitialRef.current = false
        setActiveCapabilityId("assistant")
        if (scope.courseId) {
          void activateFacultyCoraThread(scope.instructorId, scope.courseId, null)
        }
        return
      }

      const resumeCapability = capabilityId ?? "assistant"
      const threadToOpen =
        loaded.activeThread ??
        findFacultyCoraThreadForCapability(
          loaded.threads,
          loaded.archivedThreads,
          resumeCapability,
        )

      if (threadToOpen) {
        setMessages(threadToOpen.messages)
        setThreadId(threadToOpen.id)
        createdAtRef.current = threadToOpen.createdAt
        setActiveCapabilityId(threadToOpen.capabilityId ?? resumeCapability)
        sentInitialRef.current = !initialPrompt?.trim()
        if (scope.courseId) {
          void activateFacultyCoraThread(scope.instructorId, scope.courseId, threadToOpen.id)
        }
        return
      }

      const newId = createFacultyCoraThreadId()
      setThreadId(newId)
      createdAtRef.current = new Date().toISOString()
      setMessages([])
      setActiveCapabilityId(resumeCapability)
      sentInitialRef.current = false
      if (scope.courseId) {
        void activateFacultyCoraThread(scope.instructorId, scope.courseId, null)
      }
    },
    [capabilityId, initialPrompt, scope.courseId, scope.instructorId],
  )

  useEffect(() => {
    if (!scope.courseId) {
      const id = createFacultyCoraThreadId()
      setThreadId(id)
      setChatHydrated(true)
      return
    }

    let cancelled = false

    void (async () => {
      const local = await loadLocalFacultyCoraChatSession(scope.instructorId, scope.courseId!)
      if (cancelled) return

      const hasLocalHistory = local.threads.length > 0 || local.archivedThreads.length > 0
      setThreads(local.threads)
      setArchivedThreads(local.archivedThreads)
      applyLoadedSession(local, startFresh)
      setChatHydrated(true)
      setHistoryLoading(!hasLocalHistory)
      setHistorySyncing(true)

      try {
        const synced = await syncFacultyCoraChatSession(
          scope.instructorId,
          scope.courseId!,
          scope,
          local,
        )
        if (cancelled) return

        setThreads(synced.threads)
        setArchivedThreads(synced.archivedThreads)

        const activeId = threadIdRef.current
        if (activeId) {
          const updated =
            synced.threads.find((thread) => thread.id === activeId) ??
            synced.archivedThreads.find((thread) => thread.id === activeId)
          if (updated && updated.messages.length >= messagesRef.current.length) {
            setMessages(updated.messages)
          }
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false)
          setHistorySyncing(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyLoadedSession, scope, startFresh])

  const resetToNewThread = useCallback(async () => {
    await persistActiveThread()
    const newId = createFacultyCoraThreadId()
    createdAtRef.current = new Date().toISOString()
    sentInitialRef.current = true
    setThreadId(newId)
    setMessages([])
    setInput("")
    setAttachments([])
    setFeedbackById({})
    setPendingAssistantId(null)
    setActiveCapabilityId("assistant")
    if (scope.courseId) {
      await activateFacultyCoraThread(scope.instructorId, scope.courseId, null)
    }
    setSideNavOpen(false)
  }, [persistActiveThread, scope.courseId, scope.instructorId])

  const startNewConversation = useCallback(() => {
    if (sending) return
    if (messages.length === 0) {
      void resetToNewThread()
      return
    }
    AppAlert.alert("Start new conversation?", "Your current chat will be saved to history.", [
      { text: "Cancel", style: "cancel" },
      { text: "New chat", onPress: () => void resetToNewThread() },
    ])
  }, [messages.length, resetToNewThread, sending])

  const openThread = useCallback(
    async (thread: FacultyCoraChatThread) => {
      void persistActiveThread()
      setThreadId(thread.id)
      setMessages(thread.messages)
      createdAtRef.current = thread.createdAt
      sentInitialRef.current = true
      if (thread.capabilityId) setActiveCapabilityId(thread.capabilityId)
      if (scope.courseId) {
        await activateFacultyCoraThread(scope.instructorId, scope.courseId, thread.id)
      }
      setSideNavOpen(false)
    },
    [persistActiveThread, scope.courseId, scope.instructorId],
  )

  const openHistoryThread = useCallback(
    (item: CoraHistoryThreadItem) => {
      const thread =
        threads.find((entry) => entry.id === item.id) ??
        archivedThreads.find((entry) => entry.id === item.id)
      if (thread) void openThread(thread)
    },
    [archivedThreads, openThread, threads],
  )

  const handleRenameThread = useCallback(
    async (targetId: string, title: string) => {
      if (!scope.courseId) return
      const next = await renameFacultyCoraThread(
        scope.instructorId,
        scope.courseId,
        targetId,
        title,
        scope,
      )
      setThreads(next.threads)
      setArchivedThreads(next.archivedThreads)
    },
    [scope],
  )

  const handleArchiveThread = useCallback(
    async (targetId: string) => {
      if (!scope.courseId) return
      const next = await archiveFacultyCoraThread(scope.instructorId, scope.courseId, targetId, scope)
      setThreads(next.threads)
      setArchivedThreads(next.archivedThreads)
      if (threadIdRef.current === targetId) {
        await resetToNewThread()
      }
    },
    [resetToNewThread, scope],
  )

  const handleRestoreThread = useCallback(
    async (targetId: string) => {
      if (!scope.courseId) return
      const next = await restoreFacultyCoraThread(scope.instructorId, scope.courseId, targetId, scope)
      setThreads(next.threads)
      setArchivedThreads(next.archivedThreads)
    },
    [scope],
  )

  const deleteThread = useCallback(
    async (targetId: string) => {
      if (!scope.courseId) return
      const next = await deleteFacultyCoraThread(scope.instructorId, scope.courseId, targetId, scope)
      setThreads(next.threads)
      setArchivedThreads(next.archivedThreads)
      if (threadIdRef.current === targetId) {
        await resetToNewThread()
      }
    },
    [resetToNewThread, scope],
  )

  const historyThreads: CoraHistoryThreadItem[] = useMemo(
    () =>
      threads.map(({ id, title, preview, updatedAt, capabilityId: threadCapabilityId }) => {
        if (!threadCapabilityId) {
          return { id, title, preview, updatedAt }
        }
        const cap = resolveFacultyCoraCapability(threadCapabilityId, context)
        return {
          id,
          title,
          preview,
          updatedAt,
          capabilityBadge: {
            label: cap.label,
          },
        }
      }),
    [context, threads],
  )

  const historyArchivedThreads: CoraHistoryThreadItem[] = useMemo(
    () =>
      archivedThreads.map(({ id, title, preview, updatedAt, capabilityId: threadCapabilityId }) => {
        if (!threadCapabilityId) {
          return { id, title, preview, updatedAt }
        }
        const cap = resolveFacultyCoraCapability(threadCapabilityId, context)
        return {
          id,
          title,
          preview,
          updatedAt,
          capabilityBadge: {
            label: cap.label,
          },
        }
      }),
    [archivedThreads, context],
  )

  useEffect(() => {
    return () => {
      void persistActiveThread()
    }
  }, [persistActiveThread])

  const toolRunnerDeps = useMemo(
    () => ({
      scope,
      session,
      router,
      onClose,
      onDraftsReady: (drafts: DraftQuestionBankItem[]) => {
        setDraftModalDrafts(drafts)
        setDraftModalOpen(true)
      },
    }),
    [onClose, router, scope, session],
  )

  const showWelcome = messages.length === 0 && !sending
  const chatFocused =
    messages.length > 0 || sending || attachMenuOpen || pasteContentOpen || draftModalOpen
  const welcomeCanvas = facultyCoraChatCanvas(tokens.isDark)
  const solidCanvas = facultyCoraChatSolidCanvas(tokens.isDark)
  const focusProgress = useSharedValue(chatFocused ? 1 : 0)

  useEffect(() => {
    focusProgress.value = withTiming(chatFocused ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    })
  }, [chatFocused, focusProgress])

  const headerWelcomeMaxOpacity = tokens.isDark ? 0.92 : 0.94

  const welcomeOverlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - focusProgress.value,
  }))

  const headerWelcomeOverlayStyle = useAnimatedStyle(() => ({
    opacity: (1 - focusProgress.value) * headerWelcomeMaxOpacity,
  }))

  const headerSolidBg = hexToRgba(solidCanvas, tokens.isDark ? 0.96 : 0.98)

  const bubblePalette = useMemo(() => {
    if (!chatFocused) return undefined
    return getThemedCoraChatBubblePalette(tokens)
  }, [chatFocused, tokens])

  const headerHeight = insets.top + 56
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant" && m.content)?.id ?? null
  const conversationTitle = capability.label

  const handleVoiceTranscript = useCallback((text: string) => setInput(text), [])
  const { listening, toggleListening } = useCoraVoiceDictation(handleVoiceTranscript)

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)
  }, [])

  const prevMessageCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length
      scrollToEnd()
    }
  }, [messages.length, scrollToEnd])

  const handleListContentSizeChange = useCallback(() => {
    if (sending || pendingAssistantId) scrollToEnd()
  }, [pendingAssistantId, scrollToEnd, sending])

  const stopGeneration = useCallback(() => {
    sendAbortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      const finalText = buildWorkspaceSendText({ input: trimmed, attachments, importedQuestion })
      if (!finalText.trim() && !importedQuestion) return
      if (sending) return

      setInput("")
      setAttachments([])
      const userMsg: ChatMessage = {
        id: nextChatMessageId(),
        role: "user",
        content: finalText,
        importedQuestion: importedQuestion ?? undefined,
        importedQuestionLabel: importedQuestionLabel ?? undefined,
      }
      const apiText = buildMessageForApi(userMsg).replace("Student request:", "Instructor request:")
      const thinkingId = nextChatMessageId()
      const draft = [...messages, userMsg, { id: thinkingId, role: "assistant" as const, content: "" }]
      setMessages(draft)
      setPendingAssistantId(thinkingId)
      setSending(true)
      setImportedQuestion(null)
      setImportedQuestionLabel(null)

      sendAbortRef.current?.abort()
      const streamController = new AbortController()
      sendAbortRef.current = streamController

      let prepared
      try {
        prepared = prepareCoraRequest({
          session,
          scope,
          tool: activeCapabilityId ? facultyCapabilityToRbac(activeCapabilityId) : "chat",
          prompt: apiText,
        })
      } catch (err) {
        sendAbortRef.current = null
        setSending(false)
        setPendingAssistantId(null)
        setMessages([
          ...draft.slice(0, -1),
          {
            id: thinkingId,
            role: "assistant",
            content: isCoraAccessDeniedError(err)
              ? err.message
              : "Cora is not available for this action.",
          },
        ])
        return
      }

      try {
        const res = await facultyCoraApi.sendMessage(
          scope,
          {
            message: apiText,
            capabilityId: activeCapabilityId,
            conversationHistory: messages,
          },
          { prepared, signal: streamController.signal },
        )

        if (res.rbacBlocked || res.restricted) {
          recordCoraError(prepared, finalText)
          setMessages([
            ...draft.slice(0, -1),
            {
              id: thinkingId,
              role: "assistant",
              content:
                res.blockReason ??
                "That request is outside Cora's teaching permissions for your account.",
            },
          ])
          return
        }

        recordCoraSuccess(prepared, { prompt: apiText, response: res.reply })
        setMessages([
          ...draft.slice(0, -1),
          {
            id: thinkingId,
            role: "assistant",
            content: res.reply,
            actions: res.actions ?? [],
          },
        ])
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === thinkingId && !m.content.trim() ? { ...m, content: "Stopped." } : m,
            ),
          )
          return
        }
        if (prepared) recordCoraError(prepared, finalText)
        const fallback =
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again or open the related module directly."
        setMessages([...draft.slice(0, -1), { id: thinkingId, role: "assistant", content: fallback }])
      } finally {
        sendAbortRef.current = null
        setSending(false)
        setPendingAssistantId(null)
        scrollToEnd()
        void persistActiveThread()
      }
    },
    [activeCapabilityId, attachments, importedQuestion, importedQuestionLabel, messages, persistActiveThread, scope, sending, session, scrollToEnd],
  )

  useEffect(() => {
    if (!chatHydrated) return
    const text = initialPrompt?.trim()
    if (!text || sentInitialRef.current) return
    sentInitialRef.current = true
    improvePromptRef.current = text
    if (activeCapabilityId === "improve") {
      improveGoalRef.current = initialImportHint?.improveGoal ?? resolveImproveImportHint(text).improveGoal
    }
    void sendMessage(text)
  }, [activeCapabilityId, chatHydrated, initialImportHint?.improveGoal, initialPrompt, sendMessage])

  useEffect(() => {
    if (!chatHydrated || importOpenedRef.current) return
    if (!initialImportHint?.openOnMount || activeCapabilityId !== "improve") return
    importOpenedRef.current = true
    setImportHint(initialImportHint)
    setImportCourseOpen(true)
  }, [activeCapabilityId, chatHydrated, initialImportHint])

  const switchToCapability = useCallback(
    async (nextCapabilityId: FacultyCoraCapabilityId) => {
      if (nextCapabilityId === activeCapabilityId) return

      await persistActiveThread()

      const capabilityThread = findFacultyCoraThreadForCapability(
        threads,
        archivedThreads,
        nextCapabilityId,
      )

      if (capabilityThread) {
        setThreadId(capabilityThread.id)
        setMessages(capabilityThread.messages)
        createdAtRef.current = capabilityThread.createdAt
        sentInitialRef.current = true
        if (scope.courseId) {
          await activateFacultyCoraThread(scope.instructorId, scope.courseId, capabilityThread.id)
        }
      } else {
        const newId = createFacultyCoraThreadId()
        setThreadId(newId)
        setMessages([])
        createdAtRef.current = new Date().toISOString()
        sentInitialRef.current = false
        if (scope.courseId) {
          await activateFacultyCoraThread(scope.instructorId, scope.courseId, null)
        }
      }

      setActiveCapabilityId(nextCapabilityId)
      setInput("")
      setAttachments([])
      setFeedbackById({})
      setPendingAssistantId(null)
    },
    [
      activeCapabilityId,
      archivedThreads,
      persistActiveThread,
      scope.courseId,
      scope.instructorId,
      threads,
    ],
  )

  const runAction = useCallback(
    async (action: FacultyCoraChatAction) => {
      if (action.kind === "import_from_course") {
        setImportHint({
          sourceKey: action.payload.sourceKey ? String(action.payload.sourceKey) : undefined,
          containerHint: action.payload.containerHint ? String(action.payload.containerHint) : undefined,
          improveGoal: action.payload.improveGoal ? String(action.payload.improveGoal) : improveGoalRef.current,
        })
        if (action.payload.improveGoal) {
          improveGoalRef.current = String(action.payload.improveGoal)
        }
        setImportCourseOpen(true)
        return
      }

      setActionKey(action.id)
      try {
        await runFacultyChatAction(toolRunnerDeps, action)
      } catch (err) {
        AppAlert.alert(
          "Action failed",
          err instanceof Error ? err.message : "Could not open that module. Try again from the drawer.",
        )
      } finally {
        setActionKey(null)
      }
    },
    [toolRunnerDeps],
  )

  const openImportCourse = useCallback((hint?: FacultyCoraImportHint | null) => {
    if (hint) setImportHint(hint)
    setImportCourseOpen(true)
  }, [])

  const handleImportedQuestion = useCallback(
    (problem: CoraImportedProblem, label: string) => {
      if (reattachTargetMessageId) {
        setMessages((prev) =>
          prev.map((entry) =>
            entry.id === reattachTargetMessageId
              ? attachImportedQuestionToMessage(entry, problem, label)
              : entry,
          ),
        )
        setReattachTargetMessageId(null)
        void persistActiveThread()
        return
      }

      setImportedQuestion(problem)
      setImportedQuestionLabel(label)
      setInput(
        buildImproveComposerPrompt(
          improveGoalRef.current,
          improvePromptRef.current || initialPrompt,
          label,
        ),
      )
    },
    [initialPrompt, persistActiveThread, reattachTargetMessageId],
  )

  const sendPromptNow = (prompt: string) => {
    void sendMessage(prompt)
  }

  const applyIngestResult = useCallback((result: CoraToolRunResult) => {
    if (result.mode === "attach-text") {
      setAttachments((prev) => [
        ...prev,
        {
          id: `ingest-${Date.now()}`,
          name: result.label,
          mimeType: "text/plain",
          kind: "text",
          text: result.text.slice(0, 50_000),
        },
      ])
      if (!input.trim()) {
        setInput("Review this uploaded content for my course and suggest next steps.")
      }
      return
    }
    if (result.mode === "prompt") {
      sendPromptNow(result.prompt)
    }
  }, [input])

  const requireCourseSelected = useCallback((): boolean => {
    if (scope.courseId != null) return true
    AppAlert.alert("Select a course", "Choose a course in the header before using Cora teaching tools.")
    return false
  }, [scope.courseId])

  const handleComposerSend = () => {
    void sendMessage(input)
  }

  const handleAttachment = async (actionId: FacultyCoraAttachmentActionId) => {
    if (!requireCourseSelected()) return

    const item = findFacultyAttachmentAction(actionId)
    if (item?.opensSheet === "paste-content") {
      setPasteContentOpen(true)
      return
    }
    if (item?.opensSheet === "import-course") {
      openImportCourse(importHint)
      return
    }

    switch (actionId) {
      case "upload-files": {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true })
        if (result.canceled) return
        for (const asset of result.assets) {
          const mimeType = asset.mimeType ?? "application/octet-stream"
          const file = { uri: asset.uri, name: asset.name, type: mimeType, size: asset.size }
          if (isCoraIngestibleDocument(asset.name, mimeType)) {
            try {
              const ingested = await runFacultyDocumentIngest(
                toolRunnerDeps,
                file,
                input.trim() || undefined,
              )
              applyIngestResult(ingested)
            } catch (err) {
              AppAlert.alert(
                "Upload failed",
                err instanceof Error ? err.message : "Could not process this document.",
              )
            }
            continue
          }
          if (mimeType.startsWith("image/")) {
            try {
              const ingested = await runFacultyDocumentIngest(toolRunnerDeps, file)
              if (ingested.mode === "noop") {
                setAttachments((prev) => [
                  ...prev,
                  { id: asset.uri, name: asset.name, mimeType, kind: "image", size: asset.size },
                ])
              } else {
                applyIngestResult(ingested)
              }
            } catch {
              setAttachments((prev) => [
                ...prev,
                { id: asset.uri, name: asset.name, mimeType, kind: "image", size: asset.size },
              ])
            }
            continue
          }
          if (isLikelyTextFile(asset.name, mimeType)) {
            try {
              const text = (await readAsStringAsync(asset.uri)).slice(0, 50_000)
              setAttachments((prev) => [
                ...prev,
                { id: asset.uri, name: asset.name, mimeType, kind: "text", text, size: asset.size },
              ])
            } catch {
              AppAlert.alert("Could not read file", `Unable to read ${asset.name}.`)
            }
            continue
          }
          AppAlert.alert(
            "Unsupported file",
            `${asset.name} is not supported yet. Upload PDF, Word, images, or text files.`,
          )
        }
        return
      }
      case "upload-photos": {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          AppAlert.alert("Photos access needed", "Allow photo access to attach images.")
          return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
        })
        if (result.canceled) return
        const asset = result.assets[0]
        const file = {
          uri: asset.uri,
          name: asset.fileName ?? "photo.jpg",
          type: asset.mimeType ?? "image/jpeg",
          size: asset.fileSize,
        }
        try {
          const ingested = await runFacultyDocumentIngest(toolRunnerDeps, file)
          if (ingested.mode === "noop") {
            setAttachments((prev) => [
              ...prev,
              {
                id: asset.uri,
                name: file.name,
                mimeType: file.type,
                kind: "image",
                size: file.size,
              },
            ])
          } else {
            applyIngestResult(ingested)
          }
        } catch {
          setAttachments((prev) => [
            ...prev,
            {
              id: asset.uri,
              name: file.name,
              mimeType: file.type,
              kind: "image",
              size: file.size,
            },
          ])
        }
      }
    }
  }

  const handleIntent = (intentId: CoraIntentId) => {
    if (!requireCourseSelected()) return
    const capabilityForIntent = facultyCoraIntentCapability(intentId)
    if (capabilityForIntent) setActiveCapabilityId(capabilityForIntent)
    const prompt = buildFacultyCoraIntentStarter(intentId, context)
    if (!prompt) return
    sendPromptNow(prompt)
  }

  const handleMessageAction = async (actionId: CoraMessageMenuActionId, message: ChatMessage) => {
    switch (actionId) {
      case "copy": {
        const { copyToClipboard } = await import("../../../lib/copy-to-clipboard")
        await copyToClipboard(message.content)
        return
      }
      case "regenerate": {
        const lastUser = [...messages].reverse().find((m) => m.role === "user")
        if (lastUser) void sendMessage(lastUser.content)
        return
      }
      case "explain-simpler":
        void sendMessage("Explain that answer in simpler terms for teaching context.")
        return
      case "double-check":
        void sendMessage("Double-check the previous answer for accuracy against my course context.")
        return
      case "create-flashcards":
        void sendMessage("Create flashcards from this answer for my students.")
        return
      case "report-concern":
        AppAlert.alert(
          "Report a concern",
          "Flag this response for review. Reports help improve Cora safety and accuracy for teaching.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Submit report",
              style: "destructive",
              onPress: () => AppAlert.alert("Report submitted", "Thanks — we logged this response for review."),
            },
          ],
        )
        return
      case "branch-chat":
      case "save-note":
        return
    }
  }

  const handleUserMessageMenuAction = async (action: CoraUserMessageMenuAction, message: ChatMessage) => {
    switch (action) {
      case "copy": {
        const { copyToClipboard } = await import("../../../lib/copy-to-clipboard")
        await copyToClipboard(message.content)
        return
      }
      case "edit":
        setInput(message.content)
        return
      case "reattach-import":
        setReattachTargetMessageId(message.id)
        setImportCourseOpen(true)
        return
      case "select-text":
        setSelectTextContent(message.content)
        return
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: solidCanvas }]}>
      <CoraEdgeBackSwipe onBack={onClose} topInset={insets.top + 56} />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: welcomeCanvas }, welcomeOverlayStyle]}
      />
      <CoraChatAmbientLayer isDark={tokens.isDark} visible={!chatFocused} />
      <View
        style={[
          styles.headerHost,
          {
            paddingTop: insets.top,
            backgroundColor: headerSolidBg,
            borderBottomColor: native.separator,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: welcomeCanvas },
            headerWelcomeOverlayStyle,
          ]}
        />
        <View style={styles.headerRow}>
          <CoraChatMenuButton active={sideNavOpen} onPress={() => setSideNavOpen((open) => !open)} />
          <View style={styles.headerCopy}>
            <Text style={[type.bodyEmphasis, styles.headerTitle, { color: native.label }]} numberOfLines={1}>
              {conversationTitle}
            </Text>
          </View>
          <CoraChatCloseButton onPress={onClose} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.list}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight + 8 },
          showWelcome && styles.listWelcome,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        onContentSizeChange={handleListContentSizeChange}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.35 })
          }, 100)
        }}
        ListHeaderComponent={
          showWelcome ? (
            <FacultyNewChatWelcome
              instructorFirstName={instructorFirstName}
              prompts={welcomePrompts}
              improveMode={activeCapabilityId === "improve"}
              onImportFromCourse={() => openImportCourse(importHint ?? initialImportHint ?? null)}
              onPickPrompt={(prompt) => {
                improvePromptRef.current = prompt
                if (activeCapabilityId === "improve") {
                  const hint = resolveImproveImportHint(prompt)
                  improveGoalRef.current = hint.improveGoal
                  setImportHint(hint)
                }
                sendPromptNow(prompt)
              }}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <View
            style={
              highlightMessageId === item.id
                ? [
                    styles.highlightWrap,
                    { backgroundColor: hexToRgba(SN.accent, 0.08), borderColor: hexToRgba(SN.accent, 0.2) },
                  ]
                : undefined
            }
          >
            <CoraChatBubble
              message={item}
              isStreaming={pendingAssistantId === item.id}
              isLast={index === messages.length - 1}
              bubblePalette={bubblePalette}
              feedback={feedbackById[item.id] ?? null}
              thinkingContext={
                item.role === "assistant" && pendingAssistantId === item.id && !item.content
                  ? { hasImportedQuestion: false }
                  : undefined
              }
              onFeedback={(msg, vote) => setFeedbackById((prev) => ({ ...prev, [msg.id]: vote }))}
              onOpenMenu={(msg) => setMenuMessage(msg)}
              onLongPressUserMessage={(msg, anchor) => {
                setUserMenuMessage(msg)
                setUserMenuAnchor(anchor)
                setUserMenuSentAt(new Date().toISOString())
              }}
              suppressWhileMenuOpen={userMenuMessage?.id === item.id}
              onNavigateUserMessageVersion={() => {}}
            />
            {item.role === "assistant" && item.actions?.length ? (
              <FacultyActionChips
                actions={item.actions}
                actionKey={actionKey}
                accent={FACULTY_CORA_COLOR.link}
                accentSoft={`${FACULTY_CORA_COLOR.link}18`}
                onRun={runAction}
              />
            ) : null}
          </View>
        )}
      />

        <View style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <CoraWorkspaceComposer
            value={input}
            onChangeText={setInput}
            onSend={handleComposerSend}
            onStop={stopGeneration}
            canSend={!!(input.trim() || attachments.length > 0 || importedQuestion) && !sending}
            streaming={sending}
            disabled={false}
            hasMessages={messages.length > 0}
            hideLearningGoals
            modePill={{
              label: capability.label,
              onPress: () => setModeSheetOpen(true),
            }}
            placeholder={
              activeCapabilityId === "improve"
                ? importedQuestion
                  ? "Describe how to improve this question…"
                  : "Import a question or describe what to improve…"
                : messages.length > 0
                  ? "Ask a follow-up…"
                  : "Ask Cora about your course…"
            }
            attachAccessibilityLabel="Add files and teaching tools"
            onOpenAttachMenu={() => setAttachMenuOpen(true)}
            onToggleVoice={() => void toggleListening(input)}
            listening={listening}
            attachments={attachments}
            onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((item) => item.id !== id))}
            importedQuestion={importedQuestion}
            importedQuestionLabel={importedQuestionLabel}
            onClearImportedQuestion={() => {
              setImportedQuestion(null)
              setImportedQuestionLabel(null)
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <CoraChatSideNav
        visible={sideNavOpen}
        threads={historyThreads}
        archivedThreads={historyArchivedThreads}
        activeThreadId={threadId}
        historyLoading={historyLoading}
        historySyncing={historySyncing}
        onClose={() => setSideNavOpen(false)}
        onNewChat={startNewConversation}
        onOpenThread={openHistoryThread}
        onRenameThread={(id, title) => void handleRenameThread(id, title)}
        onArchiveThread={(id) => void handleArchiveThread(id)}
        onRestoreThread={(id) => void handleRestoreThread(id)}
        onDeleteThread={(id) => void deleteThread(id)}
      />
      <FacultyCoraComposerAttachMenu
        visible={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onAttachment={(actionId) => void handleAttachment(actionId)}
        onIntent={handleIntent}
      />
      <Modal visible={modeSheetOpen} animationType="slide" transparent onRequestClose={() => setModeSheetOpen(false)}>
        <Pressable style={styles.modeSheetBackdrop} onPress={() => setModeSheetOpen(false)}>
          <Pressable
            style={[styles.modeSheet, { backgroundColor: native.secondaryGrouped }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.modeSheetHandle, { backgroundColor: native.separator }]} />
            <Text style={[type.bodyEmphasis, styles.modeSheetTitle]}>AI mode</Text>
            <Text style={[type.caption, styles.modeSheetHint, { color: SN.secondaryLabel }]}>
              Choose how Cora should help in this conversation.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {capabilities.map((item) => {
                const active = item.id === activeCapabilityId
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setModeSheetOpen(false)
                      void switchToCapability(item.id)
                    }}
                    style={({ pressed }) => [
                      styles.modeSheetRow,
                      {
                        backgroundColor: active ? SN.accentSoft : "transparent",
                        borderColor: active ? hexToRgba(SN.accent, 0.35) : native.separator,
                        opacity: pressed ? NATIVE.pressedOpacity : 1,
                      },
                    ]}
                  >
                    <Text style={styles.modeSheetEmoji}>{item.emoji}</Text>
                    <View style={styles.modeSheetRowCopy}>
                      <Text style={[type.bodyEmphasis]}>{item.label}</Text>
                      <Text style={[type.caption, { color: SN.secondaryLabel }]} numberOfLines={1}>
                        {item.tagline}
                      </Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={SN.accent} /> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <CoraCodeToolSheet
        visible={pasteContentOpen}
        title="Paste content"
        hint="Paste rubric text, a syllabus excerpt, question wording, or notes for Cora to work with."
        buttonLabel="Add to chat"
        onClose={() => setPasteContentOpen(false)}
        onSubmit={(content) => {
          setPasteContentOpen(false)
          setAttachments((prev) => [
            ...prev,
            {
              id: `paste-${Date.now()}`,
              name: "Pasted content",
              mimeType: "text/plain",
              kind: "text",
              text: content.slice(0, 50_000),
            },
          ])
          if (!input.trim()) {
            setInput("Review the following course content and help me with it.")
          }
        }}
      />
      <FacultyCoraImportCourseSheet
        visible={importCourseOpen}
        scope={scope}
        hint={importHint}
        onClose={() => {
          setImportCourseOpen(false)
          setReattachTargetMessageId(null)
        }}
        onImportProblem={handleImportedQuestion}
      />
      <CoraMessageOptionsSheet
        visible={menuMessage != null}
        message={menuMessage}
        isLastAssistant={menuMessage?.id === lastAssistantId}
        onClose={() => setMenuMessage(null)}
        onAction={(actionId, message) => void handleMessageAction(actionId, message)}
      />
      <CoraUserMessageContextMenu
        visible={userMenuMessage != null && userMenuAnchor != null}
        message={userMenuMessage}
        anchor={userMenuAnchor}
        sentAt={userMenuSentAt ?? undefined}
        onClose={() => {
          setUserMenuMessage(null)
          setUserMenuAnchor(null)
          setUserMenuSentAt(null)
        }}
        onAction={(action, message) => void handleUserMessageMenuAction(action, message)}
      />
      <CoraUserMessageSelectSheet
        visible={selectTextContent != null}
        content={selectTextContent ?? ""}
        onClose={() => setSelectTextContent(null)}
      />
      <FacultyCoraQuestionBankDraftModal
        visible={draftModalOpen}
        drafts={draftModalDrafts}
        onClose={() => setDraftModalOpen(false)}
        onSaved={() => {
          setDraftModalOpen(false)
          void sendMessage("Draft questions were saved to your question bank.")
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  keyboardShell: { flex: 1 },
  headerHost: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    minHeight: 56,
    zIndex: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, alignItems: "center", paddingHorizontal: 8, minWidth: 0 },
  headerTitle: { fontSize: 16, maxWidth: "100%", textAlign: "center" },
  modeSheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modeSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: NATIVE.pagePadding,
    paddingBottom: 28,
    maxHeight: "72%",
  },
  modeSheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 14,
  },
  modeSheetTitle: {
    textAlign: "center",
    marginBottom: 4,
  },
  modeSheetHint: {
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
  },
  modeSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  modeSheetEmoji: {
    fontSize: 22,
    width: 28,
    textAlign: "center",
  },
  modeSheetRowCopy: {
    flex: 1,
    gap: 2,
  },
  list: { flex: 1, backgroundColor: "transparent" },
  listContent: { paddingBottom: 16 },
  listWelcome: { flexGrow: 1, justifyContent: "center" },
  highlightWrap: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
  },
  composerArea: {
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 8,
  },
  welcomeWrap: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  welcomeSub: {
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  importHeroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  goalGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  goalCard: {
    borderRadius: 16,
    padding: 14,
    minHeight: 76,
    overflow: "hidden",
  },
  goalCardSelection: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
