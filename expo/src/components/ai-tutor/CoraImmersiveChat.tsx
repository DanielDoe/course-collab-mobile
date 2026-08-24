import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useKpiGridCardStyle } from "../../lib/responsive-layout"
import { ActivityIndicator, FlatList, InteractionManager, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { readAsStringAsync } from "expo-file-system/legacy"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useStudentCoraContextValue } from "../../context/StudentCoraContextProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import { getCoraChatCanvasColor, getThemedCoraChatBubblePalette, CORA_CHAT_EDGE_PADDING } from "./cora-chat-bubble-theme"
import {
  CORA_LEARNING_GOALS,
  type CoraLearningGoalId,
} from "../../lib/cora-workspace-config"
import { exportWorkspaceToNotes } from "../../lib/cora-api"
import type { CoraMessageMenuActionId } from "../../lib/cora-message-actions"
import { useChatListScrollToEnd } from "../../hooks/useChatListScrollToEnd"
import { useCoraVoiceDictation } from "../../hooks/use-cora-voice-dictation"
import { CoraComposerAttachMenu } from "./CoraComposerAttachMenu"
import {
  CoraCodeToolSheet,
  CoraConceptSheet,
  CoraMicroLessonSheet,
  CoraMoreToolsSheet,
} from "./CoraComposerToolSheets"
import { CoraImportCourseSheet } from "./CoraImportCourseSheet"
import { CoraChatSideNav, type CoraHistoryThreadItem } from "../cora/CoraChatHistorySheet"
import { CoraChatMenuButton } from "../cora/CoraChatMenuButton"
import { CoraChatCloseButton } from "../cora/CoraChatCloseButton"
import { CoraPasteCodeSheet } from "./CoraPasteCodeSheet"
import { CoraMessageOptionsSheet } from "./CoraMessageOptionsSheet"
import {
  CoraUserMessageContextMenu,
  type CoraUserMessageMenuAction,
  type UserMessageAnchor,
} from "./CoraUserMessageContextMenu"
import { CoraUserMessageSelectSheet } from "./CoraUserMessageSelectSheet"
import { CoraChatBubble } from "./CoraChatBubble"
import { CoraScopeFeedbackBar } from "../cora/CoraScopeFeedbackBar"
import { CoraWorkspaceComposer } from "./CoraWorkspaceComposer"
import { CoraBrand } from "../cora/CoraBrand"
import { CoraActionCard } from "../cora/CoraActionCard"
import { CoraChatDayDivider } from "../cora/CoraChatDayDivider"
import { shouldShowChatDayDivider } from "../../lib/cora/chat-day-divider"
import { CoraEdgeBackSwipe } from "../cora/CoraEdgeBackSwipe"
import { resolveStudentCoraCapability } from "../../lib/student-cora-context-store"
import type { ChatMessage, CoraImportedProblem, AiTutorCredits } from "../../lib/ai-tutor-api"
import type { CoraActionProposal } from "../../lib/cora/types"
import { openCoraNativeRoute } from "../../lib/cora/resolve-open-route"
import {
  buildWorkspaceSendText,
  isLikelyTextFile,
  type CoraComposerAttachment,
} from "../../lib/cora-composer-attachments"
import {
  buildConceptPrompt,
  buildDebugPrompt,
  buildExecutionTracePrompt,
  buildMicroLessonPrompt,
  buildMoreToolPrompt,
  buildPasteCodePrompt,
  buildStudyNotesPrompt,
} from "../../lib/cora-composer-prompts"
import { formatRelativeTime } from "../../lib/collaboration-api"
import { countExchanges, type AiTutorChatThread } from "../../lib/ai-tutor-chat-storage"
import type { StudentSession } from "../../lib/session"
import type { CoraComposerActionId } from "../../lib/cora-composer-actions"
import { NATIVE } from "../../constants/faculty-native-theme"

function ChatCreditNotice({
  mode,
  onOpenPacks,
}: {
  mode: "lite" | "low"
  onOpenPacks: () => void
}) {
  const type = useNativeType()
  const isLite = mode === "lite"
  const iconColor = isLite ? "#F59E0B" : "#F97316"
  const bg = hexToRgba(iconColor, 0.12)

  return (
    <View style={[noticeStyles.banner, { backgroundColor: bg, borderColor: hexToRgba(iconColor, 0.22) }]}>
      <Ionicons name={isLite ? "moon-outline" : "flash-outline"} size={18} color={iconColor} />
      <View style={noticeStyles.copy}>
        <Text style={[type.bodyEmphasis, noticeStyles.title]}>
          {isLite ? "Cora Lite" : "Running low on credits"}
        </Text>
        <Text style={[type.caption, { color: iconColor, opacity: 0.9, marginTop: 2 }]}>
          {isLite
            ? "Navigation & simple lookups only — packs restore premium generation."
            : "Buy a pack or wait for your monthly refresh."}
        </Text>
      </View>
      <Pressable onPress={onOpenPacks} hitSlop={8}>
        <Text style={[noticeStyles.btn, { color: iconColor }]}>Packs</Text>
      </Pressable>
    </View>
  )
}

function ChatDepthNotice({
  tone,
  remaining,
  onNewChat,
}: {
  tone: "warning" | "limit"
  remaining?: number
  onNewChat: () => void
}) {
  const type = useNativeType()
  const isLimit = tone === "limit"
  const iconColor = isLimit ? "#f59e0b" : "#7c3aed"
  const bg = isLimit ? hexToRgba("#f59e0b", 0.12) : hexToRgba("#8b5cf6", 0.1)

  return (
    <View style={[noticeStyles.banner, { backgroundColor: bg, borderColor: hexToRgba(iconColor, 0.22) }]}>
      <Ionicons name={isLimit ? "alert-circle-outline" : "information-circle-outline"} size={18} color={iconColor} />
      <View style={noticeStyles.copy}>
        <Text style={[type.bodyEmphasis, noticeStyles.title]}>
          {isLimit ? "Conversation limit reached" : `${remaining} exchange${remaining === 1 ? "" : "s"} left`}
        </Text>
      </View>
      <Pressable onPress={onNewChat} hitSlop={8}>
        <Text style={[noticeStyles.btn, { color: "#7c3aed" }]}>New</Text>
      </Pressable>
    </View>
  )
}

function NewChatWelcome({
  studentFirstName,
  onPickGoal,
}: {
  studentFirstName: string
  onPickGoal: (goalId: CoraLearningGoalId, prompt: string) => void
}) {
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const native = useThemedNative()
  const goals = CORA_LEARNING_GOALS.filter((g) => g.id !== "create")
  const goalCardLayout = useKpiGridCardStyle("47%")

  return (
    <View style={styles.welcomeWrap}>
      <Text style={[type.caption, { color: SN.secondaryLabel, textAlign: "center" }]}>
        Hey {studentFirstName} — I&apos;m
      </Text>
      <CoraBrand size="lg" />
      <Text style={[type.caption, styles.welcomeSub, { color: SN.secondaryLabel }]}>
        Choose a learning goal — I&apos;ll figure out the rest from your context.
      </Text>
      <View style={styles.goalGrid}>
        {goals.map((goal) => (
          <Pressable
            key={goal.id}
            onPress={() => onPickGoal(goal.id, goal.starterPrompt)}
            style={({ pressed }) => [
              styles.goalCard,
              goalCardLayout,
              {
                backgroundColor: goal.featured ? hexToRgba("#8b5cf6", 0.08) : native.secondaryGrouped,
                borderColor: goal.featured ? hexToRgba("#8b5cf6", 0.25) : native.separator,
                opacity: pressed ? NATIVE.pressedOpacity : 1,
              },
            ]}
          >
            <Text style={styles.goalEmoji}>{goal.emoji}</Text>
            <Text style={[type.bodyEmphasis, styles.goalLabel]}>{goal.label}</Text>
            <Text style={[type.caption, { color: SN.secondaryLabel, lineHeight: 16 }]} numberOfLines={2}>
              {goal.tagline}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

type Props = {
  session: StudentSession
  studentFirstName: string
  chatHydrated?: boolean
  historyLoading?: boolean
  historySyncing?: boolean
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  streaming: boolean
  streamingMessageId: string | null
  atExchangeLimit: boolean
  nearExchangeLimit: boolean
  remainingExchanges: number
  exchangeCount: number
  maxExchanges: number
  conversationTitle: string | null
  threadCreatedAt: string | null
  threadUpdatedAt: string | null
  credits: AiTutorCredits | null
  onSend: (
    text: string,
    meta?: Pick<ChatMessage, "importedQuestion" | "importedQuestionLabel">,
  ) => void
  onStop?: () => void
  onRegenerate: () => void
  onScopeFeedbackRelated?: (messageId: string, note: string | null) => void
  onScopeFeedbackNotRelated?: (messageId: string) => void
  onBranchChat: (message: ChatMessage) => void
  onEditUserMessage: (message: ChatMessage) => void
  onReattachImport?: (message: ChatMessage, problem: CoraImportedProblem, label: string) => void
  onNavigateUserMessageVersion: (message: ChatMessage, direction: "prev" | "next") => void
  onConfirmProposal?: (messageId: string, proposal: import("../../lib/cora/types").CoraActionProposal) => void
  onCancelProposal?: (messageId: string, proposalId: string) => void
  onBack: () => void
  onNewFromChat: () => void
  threads: AiTutorChatThread[]
  archivedThreads: AiTutorChatThread[]
  activeThreadId: string | null
  onOpenThread: (thread: AiTutorChatThread) => void
  onRenameThread: (threadId: string, title: string) => void
  onArchiveThread: (threadId: string) => void
  onRestoreThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
  seedImportedQuestion?: CoraImportedProblem | null
  seedImportedQuestionLabel?: string | null
}

export function CoraImmersiveChat({
  session,
  studentFirstName,
  chatHydrated = true,
  historyLoading = false,
  historySyncing = false,
  messages,
  input,
  setInput,
  streaming,
  streamingMessageId,
  atExchangeLimit,
  nearExchangeLimit,
  remainingExchanges,
  exchangeCount,
  maxExchanges,
  conversationTitle,
  threadCreatedAt,
  threadUpdatedAt,
  credits,
  onSend,
  onStop,
  onRegenerate,
  onScopeFeedbackRelated,
  onScopeFeedbackNotRelated,
  onBranchChat,
  onEditUserMessage,
  onReattachImport,
  onNavigateUserMessageVersion,
  onConfirmProposal,
  onCancelProposal,
  onBack,
  onNewFromChat,
  threads,
  archivedThreads,
  activeThreadId,
  onOpenThread,
  onRenameThread,
  onArchiveThread,
  onRestoreThread,
  onDeleteThread,
  seedImportedQuestion = null,
  seedImportedQuestionLabel = null,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const { context: studentCoraContext } = useStudentCoraContextValue()
  const listRef = useRef<FlatList>(null)
  const threadsRef = useRef(threads)
  threadsRef.current = threads
  const archivedThreadsRef = useRef(archivedThreads)
  archivedThreadsRef.current = archivedThreads
  const scrollToEnd = useChatListScrollToEnd(listRef, 120)
  const [selectedGoalId, setSelectedGoalId] = useState<CoraLearningGoalId>("understand")
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [pasteCodeOpen, setPasteCodeOpen] = useState(false)
  const [importCourseOpen, setImportCourseOpen] = useState(false)
  const [conceptOpen, setConceptOpen] = useState(false)
  const [microLessonOpen, setMicroLessonOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [traceOpen, setTraceOpen] = useState(false)
  const [studyNotesOpen, setStudyNotesOpen] = useState(false)
  const [moreToolsOpen, setMoreToolsOpen] = useState(false)
  const [moreToolsInitial, setMoreToolsInitial] = useState<CoraComposerActionId | null>(null)
  const [attachments, setAttachments] = useState<CoraComposerAttachment[]>([])
  const [importedQuestion, setImportedQuestion] = useState<CoraImportedProblem | null>(null)
  const [importedQuestionLabel, setImportedQuestionLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!seedImportedQuestion) return
    setImportedQuestion(seedImportedQuestion)
    setImportedQuestionLabel(
      seedImportedQuestionLabel ??
        seedImportedQuestion.title ??
        seedImportedQuestion.topic ??
        null,
    )
  }, [seedImportedQuestion, seedImportedQuestionLabel])
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null)
  const [sideNavOpen, setSideNavOpen] = useState(false)
  const [composerHeight, setComposerHeight] = useState(128)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)
  const [feedbackById, setFeedbackById] = useState<Record<string, "up" | "down">>({})
  const [userMenuMessage, setUserMenuMessage] = useState<ChatMessage | null>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<UserMessageAnchor | null>(null)
  const [userMenuSentAt, setUserMenuSentAt] = useState<string | null>(null)
  const [selectTextContent, setSelectTextContent] = useState<string | null>(null)
  const [reattachTargetMessageId, setReattachTargetMessageId] = useState<string | null>(null)

  const showWelcome = messages.length === 0 && !streaming
  const canvas = getCoraChatCanvasColor(tokens.isDark, native)
  const bubblePalette = useMemo(() => getThemedCoraChatBubblePalette(tokens), [tokens])
  const headerHeight = insets.top + 56
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant" && m.content)?.id ?? null

  const handleVoiceTranscript = useCallback((text: string) => setInput(text), [setInput])
  const { listening, toggleListening } = useCoraVoiceDictation(handleVoiceTranscript)

  const prevMessageCountRef = useRef(messages.length)
  const prevThreadIdRef = useRef(activeThreadId)
  const [threadPaintReady, setThreadPaintReady] = useState(true)

  useEffect(() => {
    if (activeThreadId === prevThreadIdRef.current) return
    prevThreadIdRef.current = activeThreadId
    setThreadPaintReady(false)

    let cancelled = false
    const startedAt = Date.now()
    const MIN_COVER_MS = 300

    const reveal = () => {
      if (cancelled) return
      scrollToEnd(false)
      setThreadPaintReady(true)
    }

    const fallback = setTimeout(reveal, MIN_COVER_MS + 180)

    const interaction = InteractionManager.runAfterInteractions(() => {
      const remaining = Math.max(0, MIN_COVER_MS - (Date.now() - startedAt))
      setTimeout(reveal, remaining)
    })

    return () => {
      cancelled = true
      clearTimeout(fallback)
      interaction.cancel()
    }
  }, [activeThreadId, scrollToEnd])

  useEffect(() => {
    if (messages.length !== prevMessageCountRef.current) {
      const countIncreased = messages.length > prevMessageCountRef.current
      prevMessageCountRef.current = messages.length
      if (countIncreased && threadPaintReady) {
        scrollToEnd(true)
      }
    }
  }, [messages.length, scrollToEnd, threadPaintReady])

  const handleBubbleFeedback = useCallback((msg: ChatMessage, vote: "up" | "down") => {
    setFeedbackById((prev) => ({ ...prev, [msg.id]: vote }))
  }, [])

  const handleOpenBubbleMenu = useCallback((msg: ChatMessage) => {
    setMenuMessage(msg)
  }, [])

  const handleLongPressUserMessage = useCallback((msg: ChatMessage, anchor: UserMessageAnchor) => {
    setUserMenuMessage(msg)
    setUserMenuAnchor(anchor)
    setUserMenuSentAt(new Date().toISOString())
  }, [])

  const handleListContentSizeChange = useCallback(() => {
    if (streaming) scrollToEnd(true)
  }, [scrollToEnd, streaming])

  const historyThreadItems: CoraHistoryThreadItem[] = useMemo(
    () =>
      threads.map(({ id, title, preview, updatedAt, capabilityId }) => {
        const base = { id, title, preview, updatedAt }
        if (!capabilityId) return base
        const cap = resolveStudentCoraCapability(capabilityId, studentCoraContext)
        return {
          ...base,
          capabilityBadge: { label: cap.label },
        }
      }),
    [studentCoraContext, threads],
  )

  const historyArchivedItems: CoraHistoryThreadItem[] = useMemo(
    () =>
      archivedThreads.map(({ id, title, preview, updatedAt, capabilityId }) => {
        const base = { id, title, preview, updatedAt }
        if (!capabilityId) return base
        const cap = resolveStudentCoraCapability(capabilityId, studentCoraContext)
        return {
          ...base,
          capabilityBadge: { label: cap.label },
        }
      }),
    [archivedThreads, studentCoraContext],
  )

  const openHistoryThread = useCallback(
    (item: CoraHistoryThreadItem) => {
      const thread =
        threadsRef.current.find((entry) => entry.id === item.id) ??
        archivedThreadsRef.current.find((entry) => entry.id === item.id)
      if (thread) {
        onOpenThread(thread)
      }
    },
    [onOpenThread],
  )

  const threadMeta = useCallback(
    (thread: CoraHistoryThreadItem) => {
      const full =
        threads.find((entry) => entry.id === thread.id) ??
        archivedThreads.find((entry) => entry.id === thread.id)
      if (!full) return formatRelativeTime(thread.updatedAt)
      const exchanges = countExchanges(full.messages)
      return `${exchanges}/${maxExchanges} exchanges · ${formatRelativeTime(thread.updatedAt)}`
    },
    [archivedThreads, maxExchanges, threads],
  )

  const handleHistoryNewChat = useCallback(() => {
    onNewFromChat()
    setSideNavOpen(false)
  }, [onNewFromChat])

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((entry) => entry.role === "user"),
    [messages],
  )

  const appendToInput = (text: string) => {
    setInput(input.trim() ? `${input.trim()}\n\n${text}` : text)
  }

  const clearComposerContext = () => {
    setAttachments([])
    setImportedQuestion(null)
    setImportedQuestionLabel(null)
  }

  const submitComposerMessage = (promptOverride?: string) => {
    const finalText = buildWorkspaceSendText({
      input: promptOverride ?? input,
      attachments,
      importedQuestion,
    })
    if (!finalText.trim() && !importedQuestion) return

    const meta =
      importedQuestion != null
        ? {
            importedQuestion,
            importedQuestionLabel: importedQuestionLabel ?? importedQuestion.title ?? importedQuestion.topic ?? undefined,
          }
        : undefined

    onSend(finalText, meta)
    setInput("")
    clearComposerContext()
  }

  const sendPromptNow = (prompt: string) => {
    submitComposerMessage(prompt)
  }

  const handlePickGoal = (goalId: CoraLearningGoalId, prompt: string) => {
    setSelectedGoalId(goalId)
    onSend(prompt)
  }

  const handleComposerSend = () => {
    submitComposerMessage(input)
  }

  const handleUserMessageMenuAction = async (action: CoraUserMessageMenuAction, message: ChatMessage) => {
    switch (action) {
      case "copy": {
        const { copyToClipboard } = await import("../../lib/copy-to-clipboard")
        const ok = await copyToClipboard(message.content)
        if (!ok) AppAlert.alert("Copy failed", "Could not copy this message.")
        return
      }
      case "edit":
        onEditUserMessage(message)
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

  const handleMessageAction = async (actionId: CoraMessageMenuActionId, message: ChatMessage) => {
    switch (actionId) {
      case "copy": {
        const { copyToClipboard } = await import("../../lib/copy-to-clipboard")
        await copyToClipboard(message.content)
        return
      }
      case "save-note":
        try {
          const result = await exportWorkspaceToNotes(session, [{ role: message.role, content: message.content }])
          const noteId = result.noteId
          AppAlert.alert("Saved to My Notes", result.message ?? "This response was added to your notes.", [
            ...(noteId
              ? [{ text: "Open note", onPress: () => router.push(`/notes/${noteId}` as never) }]
              : []),
            { text: "OK", style: "cancel" as const },
          ])
        } catch {
          AppAlert.alert("Could not save", "Try again in a moment.")
        }
        return
      case "regenerate":
        onRegenerate()
        return
      case "explain-simpler":
        onSend("Explain that answer in simpler terms with a shorter example.")
        return
      case "create-flashcards": {
        const topic =
          message.content
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.length > 8)
            ?.slice(0, 80) || "Study review"
        AppAlert.alert(
          "Create flashcards?",
          `Cora will create a personal deck on “${topic.slice(0, 60)}” and save it to My Flashcards.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Create",
              onPress: () => {
                void (async () => {
                  try {
                    const { executeLocalCoraProposal } = await import("../../lib/cora/local-proposals")
                    const result = await executeLocalCoraProposal(
                      {
                        actionId: `local_${Date.now().toString(36)}`,
                        userId: Number(session.databaseId) || 0,
                        role: "student",
                        institutionId: null,
                        courseId: session.courseId ?? null,
                        tool: "personalFlashcards.createDeck",
                        arguments: { topic, title: `Flashcards · ${topic.slice(0, 48)}`, cards: [], __local: true },
                        createdAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                        preview: {
                          title: "Create personal flashcard deck",
                          summary: topic,
                          fields: [{ label: "Topic", value: topic }],
                          confirmLabel: "Create flashcards",
                          entityType: "flashcard_deck",
                        },
                        hash: "local",
                      },
                      { role: "student", session },
                    )
                    if (!result.success) {
                      AppAlert.alert("Could not create", result.message)
                      return
                    }
                    AppAlert.alert("Flashcards created", result.message, [
                      ...(result.entity?.route
                        ? [{ text: "Open deck", onPress: () => router.push(result.entity!.route as never) }]
                        : []),
                      { text: "OK", style: "cancel" as const },
                    ])
                  } catch (err) {
                    AppAlert.alert(
                      "Could not create",
                      err instanceof Error ? err.message : "Try again in a moment.",
                    )
                  }
                })()
              },
            },
          ],
        )
        return
      }
      case "branch-chat":
        onBranchChat(message)
        return
      case "double-check":
        onSend("Double-check the previous answer for accuracy against my course context and note any corrections.")
        return
      case "report-concern":
        AppAlert.alert(
          "Report a concern",
          "Flag this response for review. Your instructor team may use reports to improve Cora safety and accuracy.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Submit report", style: "destructive", onPress: () => AppAlert.alert("Report submitted", "Thanks — we logged this response for review.") },
          ],
        )
        return
    }
  }

  const handleAttachAction = async (actionId: CoraComposerActionId) => {
    switch (actionId) {
      case "paste-code":
        setPasteCodeOpen(true)
        return
      case "import-course":
        setImportCourseOpen(true)
        return
      case "concept":
        setConceptOpen(true)
        return
      case "mini-lesson":
        setMicroLessonOpen(true)
        return
      case "debug":
        setDebugOpen(true)
        return
      case "debug-trace":
        setTraceOpen(true)
        return
      case "doc-generator":
        setStudyNotesOpen(true)
        return
      case "alternative-solutions":
      case "exam-prep-mode":
        sendPromptNow(buildMoreToolPrompt(actionId))
        return
      case "complexity-analysis":
      case "refactor-mode":
      case "explain-thinking":
      case "code-translator":
        setMoreToolsInitial(actionId)
        setMoreToolsOpen(true)
        return
      case "upload-files": {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true })
        if (result.canceled) return
        const next: CoraComposerAttachment[] = []
        for (const asset of result.assets) {
          const mimeType = asset.mimeType ?? "application/octet-stream"
          if (mimeType.startsWith("image/")) {
            next.push({
              id: asset.uri,
              name: asset.name,
              mimeType,
              kind: "image",
              size: asset.size,
            })
            continue
          }
          if (isLikelyTextFile(asset.name, mimeType)) {
            try {
              const text = (await readAsStringAsync(asset.uri)).slice(0, 50_000)
              next.push({
                id: asset.uri,
                name: asset.name,
                mimeType,
                kind: "text",
                text,
                size: asset.size,
              })
            } catch {
              AppAlert.alert("Could not read file", `Unable to read ${asset.name}. Try a text-based file.`)
            }
            continue
          }
          AppAlert.alert("Unsupported file", `${asset.name} is not a supported text or image attachment yet.`)
        }
        if (next.length > 0) setAttachments((prev) => [...prev, ...next])
        return
      }
      case "upload-photos": {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          AppAlert.alert("Photos access needed", "Allow photo access to attach images to your Cora chat.")
          return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
        })
        if (result.canceled) return
        const asset = result.assets[0]
        setAttachments((prev) => [
          ...prev,
          {
            id: asset.uri,
            name: asset.fileName ?? "photo.jpg",
            mimeType: asset.mimeType ?? "image/jpeg",
            kind: "image",
            size: asset.fileSize,
          },
        ])
        return
      }
    }
  }

  const handleMoreTool = (toolId: CoraComposerActionId, code?: string, targetLanguage?: string) => {
    sendPromptNow(buildMoreToolPrompt(toolId, code, targetLanguage))
  }

  const headerTitle = useMemo(() => {
    const raw = conversationTitle ?? "New conversation"
    return raw.length > 28 ? `${raw.slice(0, 25)}…` : raw
  }, [conversationTitle])

  return (
    <View style={[styles.root, { backgroundColor: canvas }]}>
      <CoraEdgeBackSwipe onBack={onBack} />
      {!chatHydrated ? (
        <View style={[styles.hydrateOverlay, { backgroundColor: canvas }]}>
          <ActivityIndicator color={SN.accent} size="large" />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading conversations…</Text>
        </View>
      ) : null}
      <View style={styles.contentShell} pointerEvents={chatHydrated ? "auto" : "none"}>
      <View style={[styles.headerHost, { paddingTop: insets.top, backgroundColor: canvas, borderBottomColor: native.separator }]}>
        <View style={styles.headerRow}>
          <CoraChatMenuButton active={sideNavOpen} onPress={() => setSideNavOpen((open) => !open)} />
          <View style={styles.headerCopy}>
            <Text style={[type.bodyEmphasis, styles.headerTitle, { color: native.label }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            {messages.length > 0 ? (
              <Text style={[type.caption, { color: SN.secondaryLabel }]}>
                {exchangeCount}/{maxExchanges} exchanges
              </Text>
            ) : null}
          </View>
          <CoraChatCloseButton onPress={onBack} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <View style={styles.messagesPane}>
      <FlatList
        ref={listRef}
        data={messages}
        extraData={activeThreadId}
        keyExtractor={(item) => item.id}
        style={styles.list}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + 8,
            paddingBottom: Math.max(composerHeight + 80, 260),
          },
          showWelcome && styles.listWelcome,
        ]}
        ListFooterComponent={<View style={{ height: 48 }} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={false}
        onContentSizeChange={handleListContentSizeChange}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.35 })
          }, 100)
        }}
        ListHeaderComponent={
          showWelcome ? <NewChatWelcome studentFirstName={studentFirstName} onPickGoal={handlePickGoal} /> : null
        }
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : null
          const dayDivider = shouldShowChatDayDivider(item, prev)
          const followsActionCards =
            item.role === "user" &&
            !!prev &&
            prev.role === "assistant" &&
            !!prev.proposals?.length
          return (
          <View
            style={[
              styles.messageTurn,
              item.role === "user" ? styles.messageTurnUser : null,
              followsActionCards ? styles.messageTurnAfterCards : null,
              item.role === "assistant" && item.proposals?.length ? styles.messageTurnWithCards : null,
              highlightMessageId === item.id
                ? [
                    styles.highlightWrap,
                    { backgroundColor: hexToRgba(SN.accent, 0.08), borderColor: hexToRgba(SN.accent, 0.2) },
                  ]
                : null,
            ]}
          >
            {dayDivider.show && dayDivider.label ? <CoraChatDayDivider label={dayDivider.label} /> : null}
            <CoraChatBubble
              message={item}
              isStreaming={streamingMessageId === item.id}
              isLast={index === messages.length - 1}
              bubblePalette={bubblePalette}
              feedback={feedbackById[item.id] ?? null}
              thinkingContext={
                item.role === "assistant" && streamingMessageId === item.id && !item.content
                  ? {
                      domain: lastUserMessage?.importedQuestion?.domain,
                      hasImportedQuestion: !!lastUserMessage?.importedQuestion,
                    }
                  : undefined
              }
              onFeedback={handleBubbleFeedback}
              onOpenMenu={handleOpenBubbleMenu}
              onLongPressUserMessage={handleLongPressUserMessage}
              suppressWhileMenuOpen={userMenuMessage?.id === item.id}
              onNavigateUserMessageVersion={onNavigateUserMessageVersion}
            />
            {item.role === "assistant" && item.scopeFeedback ? (
              <CoraScopeFeedbackBar
                feedback={item.scopeFeedback}
                onRelated={(note) => onScopeFeedbackRelated?.(item.id, note)}
                onNotRelated={() => onScopeFeedbackNotRelated?.(item.id)}
              />
            ) : null}
            {item.role === "assistant" && item.proposals?.length
              ? item.proposals.map((proposal: CoraActionProposal) => (
                  <View key={proposal.actionId} style={styles.proposalWrap}>
                    <CoraActionCard
                      proposal={proposal}
                      status={item.proposalStatusById?.[proposal.actionId] ?? "idle"}
                      result={item.proposalResultById?.[proposal.actionId] ?? null}
                      resultMessage={item.proposalResultById?.[proposal.actionId]?.message}
                      onConfirm={() => onConfirmProposal?.(item.id, proposal)}
                      onCancel={() => onCancelProposal?.(item.id, proposal.actionId)}
                      onOpen={(route) => openCoraNativeRoute(router, route)}
                    />
                  </View>
                ))
              : null}
          </View>
          )
        }}
      />

      {!threadPaintReady ? (
        <View pointerEvents="none" style={[styles.threadPaintCover, { backgroundColor: canvas }]} />
      ) : null}

      </View>

        <View
          style={[
            styles.composerArea,
            { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: canvas },
          ]}
          onLayout={(e) => {
            const next = Math.ceil(e.nativeEvent.layout.height)
            setComposerHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev))
          }}
        >
          {credits?.coraMode === "lite" || (credits && credits.credits <= 0) ? (
            <ChatCreditNotice mode="lite" onOpenPacks={() => router.push("/membership" as never)} />
          ) : credits?.isLow ? (
            <ChatCreditNotice mode="low" onOpenPacks={() => router.push("/membership" as never)} />
          ) : null}
          {atExchangeLimit ? (
            <ChatDepthNotice tone="limit" onNewChat={onNewFromChat} />
          ) : nearExchangeLimit ? (
            <ChatDepthNotice tone="warning" remaining={remainingExchanges} onNewChat={onNewFromChat} />
          ) : null}
          <CoraWorkspaceComposer
            value={input}
            onChangeText={setInput}
            onSend={handleComposerSend}
            onStop={onStop}
            canSend={
              !!(input.trim() || attachments.length > 0 || importedQuestion) && !streaming && !atExchangeLimit
            }
            streaming={streaming}
            disabled={atExchangeLimit}
            listening={listening}
            hasMessages={messages.length > 0}
            selectedGoalId={selectedGoalId}
            onSelectGoal={(goal) => {
              setSelectedGoalId(goal.id)
              if (!input.trim()) setInput(goal.starterPrompt)
            }}
            onOpenAttachMenu={() => setAttachMenuOpen(true)}
            onToggleVoice={() => void toggleListening(input)}
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

      <CoraComposerAttachMenu
        visible={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onAction={(actionId) => void handleAttachAction(actionId)}
      />
      <CoraPasteCodeSheet
        visible={pasteCodeOpen}
        onClose={() => setPasteCodeOpen(false)}
        onInsert={(code) => sendPromptNow(buildPasteCodePrompt(code))}
      />
      <CoraImportCourseSheet
        visible={importCourseOpen}
        session={session}
        onClose={() => {
          setImportCourseOpen(false)
          setReattachTargetMessageId(null)
        }}
        onImportProblem={(problem, label) => {
          if (reattachTargetMessageId && onReattachImport) {
            const target = messages.find((entry) => entry.id === reattachTargetMessageId)
            if (target) {
              onReattachImport(target, problem, label)
            }
            setReattachTargetMessageId(null)
            return
          }
          setImportedQuestion(problem)
          setImportedQuestionLabel(label)
        }}
      />
      <CoraConceptSheet
        visible={conceptOpen}
        onClose={() => setConceptOpen(false)}
        onSubmit={(concept) => sendPromptNow(buildConceptPrompt(concept))}
      />
      <CoraMicroLessonSheet
        visible={microLessonOpen}
        onClose={() => setMicroLessonOpen(false)}
        onSubmit={(payload) => sendPromptNow(buildMicroLessonPrompt(payload))}
      />
      <CoraCodeToolSheet
        visible={debugOpen}
        title="Fix my code"
        hint="Paste the code you want Cora to debug."
        buttonLabel="Analyze code"
        onClose={() => setDebugOpen(false)}
        onSubmit={(code) => sendPromptNow(buildDebugPrompt(code))}
      />
      <CoraCodeToolSheet
        visible={traceOpen}
        title="Execution trace"
        hint="Paste code and Cora will walk through each runtime step."
        buttonLabel="Trace code"
        onClose={() => setTraceOpen(false)}
        onSubmit={(code) => sendPromptNow(buildExecutionTracePrompt(code))}
      />
      <CoraCodeToolSheet
        visible={studyNotesOpen}
        title="Generate study notes"
        hint="Paste code to turn into study notes and documentation."
        buttonLabel="Generate notes"
        onClose={() => setStudyNotesOpen(false)}
        onSubmit={(code) => sendPromptNow(buildStudyNotesPrompt(code))}
      />
      <CoraMoreToolsSheet
        visible={moreToolsOpen}
        initialTool={moreToolsInitial}
        onClose={() => {
          setMoreToolsOpen(false)
          setMoreToolsInitial(null)
        }}
        onSelectTool={handleMoreTool}
      />
      <CoraChatSideNav
        visible={sideNavOpen}
        threads={historyThreadItems}
        archivedThreads={historyArchivedItems}
        activeThreadId={activeThreadId}
        historyLoading={historyLoading}
        historySyncing={historySyncing}
        onClose={() => setSideNavOpen(false)}
        onNewChat={handleHistoryNewChat}
        onOpenThread={openHistoryThread}
        onRenameThread={onRenameThread}
        onArchiveThread={onArchiveThread}
        onRestoreThread={onRestoreThread}
        onDeleteThread={onDeleteThread}
        threadMeta={threadMeta}
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
      </View>
    </View>
  )
}

const noticeStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  copy: { flex: 1 },
  title: { fontSize: 13 },
  btn: { fontSize: 14, fontWeight: "700" },
})

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  contentShell: { ...StyleSheet.absoluteFillObject, flex: 1 },
  keyboardShell: { flex: 1 },
  messagesPane: { flex: 1, position: "relative" },
  threadPaintCover: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  hydrateOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  headerHost: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    elevation: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    minHeight: 56,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    textAlign: "center",
    maxWidth: "100%",
  },
  list: { flex: 1 },
  listContent: {
    paddingBottom: 160,
  },
  listWelcome: { flexGrow: 1 },
  messageTurn: {
    marginBottom: 8,
    paddingBottom: 0,
  },
  messageTurnUser: {
    marginTop: 4,
    marginBottom: 8,
  },
  messageTurnAfterCards: {
    marginTop: 10,
  },
  messageTurnWithCards: {
    marginBottom: 10,
    paddingBottom: 4,
  },
  proposalWrap: {
    marginTop: 6,
    marginBottom: 8,
  },
  welcomeWrap: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingBottom: 20,
    paddingHorizontal: CORA_CHAT_EDGE_PADDING,
  },
  welcomeSub: { textAlign: "center", lineHeight: 20, maxWidth: 300 },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  goalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  goalEmoji: { fontSize: 20 },
  goalLabel: { fontSize: 14 },
  composerArea: {
    zIndex: 20,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 4,
  },
  highlightWrap: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
  },
})
