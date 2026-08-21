import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { loadLectureToolContext, type LectureToolContext } from "../lib/cora-tool-context"
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
import type { MembershipTier } from "../types/dashboard"
import { isCoraLiteEligible } from "../lib/cora/credits/economy"

function studentFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there"
}

function buildLectureApiMessage(contextBlock: string, text: string): string {
  const trimmed = text.trim()
  if (!contextBlock.trim()) return trimmed
  return `${contextBlock.trim()}\n\n---\n\nStudent question about these lecture slides:\n${trimmed}`
}

export function useStudentLectureCoraChat(options: {
  session: StudentSession
  lectureId: number
  week: number
  lectureTitle: string
  enabled: boolean
  membershipTier: MembershipTier
  membershipTierLoaded: boolean
}) {
  const router = useRouter()
  const {
    session,
    lectureId,
    week,
    lectureTitle,
    enabled,
    membershipTier,
    membershipTierLoaded,
  } = options

  const [lectureContext, setLectureContext] = useState<LectureToolContext | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [credits, setCredits] = useState<AiTutorCredits | null>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const coraPreferencesRef = useRef<CoraPreferences | null>(null)

  const maxExchanges = getMaxExchangesForTier(membershipTier)
  const exchangeCount = countExchanges(messages)
  const remainingExchanges = exchangesRemaining(messages, maxExchanges)
  const atExchangeLimit = isThreadAtExchangeLimit(messages, maxExchanges)
  const nearExchangeLimit = remainingExchanges <= 2 && remainingExchanges > 0

  const conversationTitle = useMemo(
    () => lectureContext?.label ?? `Week ${week} · ${lectureTitle}`,
    [lectureContext?.label, lectureTitle, week],
  )

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setContextLoading(true)
    void (async () => {
      try {
        const [ctx, localPrefs, serverPrivacy, creditsRes] = await Promise.all([
          loadLectureToolContext(session, { id: lectureId, week, title: lectureTitle }),
          loadCoraLocalPreferences(session.databaseId),
          fetchCoraServerPrivacy(session).catch(() => DEFAULT_CORA_SERVER_PRIVACY),
          aiTutorApi.getCredits(session).catch(() => null),
        ])
        if (cancelled) return
        setLectureContext(ctx)
        coraPreferencesRef.current = { ...serverPrivacy, ...localPrefs }
        if (creditsRes) setCredits(creditsRes)
      } finally {
        if (!cancelled) setContextLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, session, lectureId, week, lectureTitle])

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setStreaming(false)
    setStreamingMessageId(null)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!session || streaming) return
      if (!text.trim()) return

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
        AppAlert.alert("Upgrade required", `${CORA_NAME} requires Explorer or Trailblazer membership.`, [
          { text: "Cancel", style: "cancel" },
          { text: "View plans", onPress: () => router.push("/membership" as never) },
        ])
        return
      }

      if (credits?.coraMode === "lite" && !isCoraLiteEligible(text)) {
        AppAlert.alert(
          "Cora Lite",
          "Premium generation needs Cora Credits. Buy a pack on Plans, or ask about grades, deadlines, and navigation.",
          [
            { text: "Not now", style: "cancel" },
            { text: "View packs", onPress: () => router.push("/membership" as never) },
          ],
        )
        return
      }

      if (credits && credits.coraMode !== "lite" && credits.credits <= 0) {
        AppAlert.alert(
          "No credits left",
          `You've used your ${CORA_NAME} credits for this period. Buy a pack or wait for your monthly refresh.`,
          [
            { text: "Not now", style: "cancel" },
            { text: "View packs", onPress: () => router.push("/membership" as never) },
          ],
        )
        return
      }

      const userMsg: ChatMessage = {
        id: `${Date.now()}`,
        role: "user",
        content: text.trim(),
        createdAt: new Date().toISOString(),
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

      const contextBlock = lectureContext?.contextBlock ?? ""
      const apiMessage = buildLectureApiMessage(contextBlock, text)
      const history = baseMessages.slice(-AI_TUTOR_CONTEXT_WINDOW).map((m) => ({
        role: m.role,
        content: m.content,
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
      lectureContext?.contextBlock,
      router,
    ],
  )

  const regenerateLastResponse = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user" && m.content.trim())
    if (!lastUser) return
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === lastUser.id)
      if (idx < 0) return prev
      return prev.slice(0, idx + 1)
    })
    void sendMessage(lastUser.content)
  }, [messages, sendMessage])

  return {
    studentFirstName: studentFirstName(session.name),
    lectureContext,
    contextLoading,
    messages,
    input,
    setInput,
    streaming,
    streamingMessageId,
    credits,
    conversationTitle,
    exchangeCount,
    maxExchanges,
    remainingExchanges,
    atExchangeLimit,
    nearExchangeLimit,
    sendMessage,
    stopStreaming,
    regenerateLastResponse,
    clearChat: () => setMessages([]),
  }
}
