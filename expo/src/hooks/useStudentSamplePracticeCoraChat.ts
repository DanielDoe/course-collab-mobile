import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "expo-router"
import { AppAlert } from "../lib/app-alert"
import {
  aiTutorApi,
  type AiTutorCredits,
  type ChatMessage,
} from "../lib/ai-tutor-api"
import {
  AI_TUTOR_CONTEXT_WINDOW,
  countExchanges,
  exchangesRemaining,
  getMaxExchangesForTier,
  isThreadAtExchangeLimit,
} from "../lib/ai-tutor-chat-storage"
import { buildMessageForApi, buildProblemContextForApi } from "../lib/cora-composer-attachments"
import type { CoraImportedProblem } from "../lib/cora-api"
import { loadCoraStudentContext } from "../lib/cora-student-context-loader"
import {
  minimizeStudentContextForExternalAi,
  resolveExternalAiContextLevel,
} from "../lib/cora-privacy-minimization"
import { enrichStudentContextForMessage } from "../lib/student-cora-platform-lookup"
import { isCoraAccessDeniedError } from "../lib/cora-rbac/guard"
import { prepareCoraRequest } from "../lib/cora-rbac/prepare-request"
import { loadCoraLocalPreferences, type CoraPreferences } from "../lib/cora-preferences-storage"
import { fetchCoraServerPrivacy, DEFAULT_CORA_SERVER_PRIVACY } from "../lib/cora-privacy-api"
import type { StudentSession } from "../lib/session"
import { hasNavAccess } from "../constants/student-nav"
import { CORA_NAME } from "../lib/cora-constants"
import {
  insufficientCreditsAlertButtons,
  iosCoraLiteNotice,
  iosInsufficientCoraCreditsNotice,
  iosMembershipRequiredNotice,
  isIosPurchaseUiHidden,
  tierLockedAlertButtons,
} from "../lib/purchase-navigation"
import type { MembershipTier } from "../types/dashboard"
import { isCoraLiteEligible } from "../lib/cora/credits/economy"

export function useStudentSamplePracticeCoraChat(options: {
  session: StudentSession
  importedProblem: CoraImportedProblem
  conversationTitle: string
  enabled: boolean
  membershipTier: MembershipTier
  membershipTierLoaded: boolean
}) {
  const router = useRouter()
  const {
    session,
    importedProblem,
    conversationTitle,
    enabled,
    membershipTier,
    membershipTierLoaded,
  } = options

  const [contextLoading, setContextLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [credits, setCredits] = useState<AiTutorCredits | null>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const coraPreferencesRef = useRef<CoraPreferences | null>(null)
  const importedProblemRef = useRef(importedProblem)
  importedProblemRef.current = importedProblem

  const maxExchanges = getMaxExchangesForTier(membershipTier)
  const exchangeCount = countExchanges(messages)
  const remainingExchanges = exchangesRemaining(messages, maxExchanges)
  const atExchangeLimit = isThreadAtExchangeLimit(messages, maxExchanges)
  const nearExchangeLimit = remainingExchanges <= 2 && remainingExchanges > 0

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setContextLoading(true)
    void (async () => {
      try {
        const [localPrefs, serverPrivacy, creditsRes] = await Promise.all([
          loadCoraLocalPreferences(session.databaseId),
          fetchCoraServerPrivacy(session).catch(() => DEFAULT_CORA_SERVER_PRIVACY),
          aiTutorApi.getCredits(session).catch(() => null),
        ])
        if (cancelled) return
        coraPreferencesRef.current = { ...serverPrivacy, ...localPrefs }
        if (creditsRes) setCredits(creditsRes)
      } finally {
        if (!cancelled) setContextLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, session])

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setStreaming(false)
    setStreamingMessageId(null)
  }, [])

  const clearChat = useCallback(() => {
    stopStreaming()
    setMessages([])
    setInput("")
  }, [stopStreaming])

  const sendMessage = useCallback(
    async (
      text: string,
      meta?: Pick<ChatMessage, "importedQuestion" | "importedQuestionLabel">,
    ) => {
      if (!session || streaming) return

      const imported =
        meta?.importedQuestion ??
        importedProblemRef.current
      const trimmed = text.trim()
      if (!trimmed && !imported) return

      if (isThreadAtExchangeLimit(messages, maxExchanges)) {
        AppAlert.alert(
          "Conversation limit",
          `This chat reached the ${maxExchanges}-exchange limit. Start a new chat to continue.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "New chat", onPress: () => setMessages([]) },
          ],
        )
        return
      }

      if (!membershipTierLoaded) return
      if (!hasNavAccess(membershipTier, "Explorer")) {
        AppAlert.alert(
          isIosPurchaseUiHidden() ? "Membership required" : "Upgrade required",
          isIosPurchaseUiHidden()
            ? iosMembershipRequiredNotice("Explorer or Trailblazer")
            : `${CORA_NAME} requires Explorer or Trailblazer membership.`,
          tierLockedAlertButtons(() => router.push("/membership" as never)),
        )
        return
      }

      if (credits?.coraMode === "lite" && trimmed && !isCoraLiteEligible(trimmed)) {
        AppAlert.alert(
          "Cora Lite",
          isIosPurchaseUiHidden()
            ? iosCoraLiteNotice()
            : "Premium generation needs Cora Credits. Buy a pack on Plans, or ask about grades, deadlines, and navigation.",
          insufficientCreditsAlertButtons(() => router.push("/membership" as never)),
        )
        return
      }

      if (credits && credits.coraMode !== "lite" && credits.credits <= 0) {
        AppAlert.alert(
          "No credits left",
          isIosPurchaseUiHidden()
            ? iosInsufficientCoraCreditsNotice()
            : `You've used your ${CORA_NAME} credits for this period. Buy a pack or wait for your monthly refresh.`,
          insufficientCreditsAlertButtons(() => router.push("/membership" as never)),
        )
        return
      }

      const userMsg: ChatMessage = {
        id: `${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        importedQuestion: imported,
        importedQuestionLabel:
          meta?.importedQuestionLabel ??
          imported.title ??
          imported.topic ??
          conversationTitle,
      }
      const assistantId = `${Date.now() + 1}`
      const baseMessages = [...messages, userMsg]
      setMessages([
        ...baseMessages,
        { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
      ])
      setInput("")
      setStreaming(true)
      setStreamingMessageId(assistantId)

      const apiMessage = buildMessageForApi(userMsg)
      const problemContext = buildProblemContextForApi(imported)
      const history = baseMessages.slice(-AI_TUTOR_CONTEXT_WINDOW).map((m) => ({
        role: m.role,
        content: m.role === "user" ? buildMessageForApi(m) : m.content,
      }))

      let platformContext = null
      try {
        let ctx = await loadCoraStudentContext(session)
        ctx = await enrichStudentContextForMessage(session, ctx, apiMessage)
        const prefs = coraPreferencesRef.current
        const level = resolveExternalAiContextLevel(prefs ?? DEFAULT_CORA_SERVER_PRIVACY)
        platformContext = minimizeStudentContextForExternalAi(ctx, level, prefs ?? undefined)
      } catch {
        platformContext = null
      }

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
        setMessages(messages)
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
            void aiTutorApi.getCredits(session).then(setCredits).catch(() => undefined)
          },
          onError: (err) => {
            streamAbortRef.current = null
            setStreaming(false)
            setStreamingMessageId(null)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        m.content ||
                        (err.includes("data:") || err.includes("Streaming unavailable")
                          ? `${CORA_NAME} couldn't complete that request. Please try again.`
                          : err),
                    }
                  : m,
              ),
            )
          },
          onAborted: () => {
            streamAbortRef.current = null
            setStreaming(false)
            setStreamingMessageId(null)
          },
        },
        {
          problemContext,
          studentContext: platformContext,
          useAgent: true,
          learningMemory: coraPreferencesRef.current ?? undefined,
          prepared,
          signal: streamController.signal,
        },
      )
    },
    [
      session,
      streaming,
      messages,
      maxExchanges,
      membershipTierLoaded,
      membershipTier,
      credits,
      conversationTitle,
      router,
    ],
  )

  const regenerateLastResponse = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUser?.content.trim() && !lastUser?.importedQuestion) return
    const trimmed = [...messages]
    while (trimmed.length > 0 && trimmed[trimmed.length - 1]?.role === "assistant") {
      trimmed.pop()
    }
    const user = trimmed[trimmed.length - 1]
    if (!user || user.role !== "user") return
    setMessages(trimmed.slice(0, -1))
    void sendMessage(user.content, {
      importedQuestion: user.importedQuestion,
      importedQuestionLabel: user.importedQuestionLabel,
    })
  }, [messages, sendMessage])

  return {
    contextLoading,
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
    credits,
    sendMessage,
    stopStreaming,
    clearChat,
    regenerateLastResponse,
    studentFirstName: session.name.trim().split(/\s+/)[0] || "there",
  }
}
