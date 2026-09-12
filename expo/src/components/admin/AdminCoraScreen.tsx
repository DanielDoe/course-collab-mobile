import { useCallback, useRef, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Haptics from "expo-haptics"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import type { ChatMessage } from "../../lib/ai-tutor-api"
import { sendAdminCoraMessage } from "../../lib/admin-cora-api"
import { ApiError } from "../../lib/api"
import { mapFacultyOrAdminChatResponse } from "../../lib/cora/scope/types"
import { submitCoraScopeFeedback } from "../../lib/cora/scope/feedback-api"
import {
  confirmAdminCoraAction,
  markProposalConfirming,
  markProposalError,
  markProposalResult,
  removeProposal,
  withMessageProposals,
  isProposalConfirmable,
  type CoraActionProposal,
} from "../../lib/cora"
import type { AdminSession } from "../../lib/session"
import { CoraBrand } from "../cora/CoraBrand"
import { AiTutorMessageMarkdown } from "../ai-tutor/AiTutorMessageMarkdown"
import { CoraActionCard } from "../cora/CoraActionCard"
import { openCoraNativeRoute } from "../../lib/cora/resolve-open-route"
import { CoraScopeFeedbackBar } from "../cora/CoraScopeFeedbackBar"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import { CORA_NAME } from "../../lib/cora-constants"

function nextId(): string {
  return `ac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function AdminCoraScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session } = useSession()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const scrollRef = useRef<ScrollView>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scopeRetryRef = useRef<{ confirm: boolean; context: string | null } | null>(null)

  const adminSession = session?.portal === "admin" ? (session as AdminSession) : null

  const confirmProposal = useCallback(
    async (messageId: string, proposal: CoraActionProposal) => {
      if (!adminSession) return
      const current = messages.find((m) => m.id === messageId)
      if (!isProposalConfirmable(current, proposal.actionId)) return
      setMessages((prev) => markProposalConfirming(prev, messageId, proposal.actionId))
      try {
        const result = await confirmAdminCoraAction(adminSession.id, proposal)
        setMessages((prev) => markProposalResult(prev, messageId, proposal.actionId, result))
        if (result.success) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } else {
          AppAlert.alert("Could not complete", result.message || result.error || "Action failed.")
        }
      } catch (err) {
        setMessages((prev) => markProposalError(prev, messageId, proposal.actionId))
        AppAlert.alert(
          "Could not complete",
          err instanceof Error ? err.message : "Action failed.",
        )
      }
    },
    [adminSession, messages],
  )

  const cancelProposal = useCallback((messageId: string, proposalId: string) => {
    setMessages((prev) => removeProposal(prev, messageId, proposalId))
  }, [])

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || sending || !adminSession) return
    setInput("")
    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text }
    const draft = [...messages, userMsg]
    setMessages(draft)
    setSending(true)

    const assistantId = nextId()
    const scopeRetry = scopeRetryRef.current
    scopeRetryRef.current = null
    try {
      const res = await sendAdminCoraMessage({
        session: adminSession,
        message: text,
        conversationHistory: draft,
        confirmScopeRelated: scopeRetry?.confirm,
        declaredAcademicContext: scopeRetry?.context ?? null,
      })
      const outcome = mapFacultyOrAdminChatResponse(
        res as unknown as Record<string, unknown>,
        text,
      )
      if (outcome.kind === "scope_redirect") {
        setMessages([
          ...draft,
          {
            id: assistantId,
            role: "assistant",
            content: outcome.text,
            scopeFeedback: outcome.offerFeedback
              ? { eventId: outcome.eventId, originalMessage: outcome.originalUserMessage }
              : null,
          },
        ])
        return
      }
      if (outcome.kind === "permission_deny") {
        setMessages([
          ...draft,
          {
            id: assistantId,
            role: "assistant",
            content: outcome.text,
            permissionDeny: true,
          },
        ])
        return
      }
      const assistant: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: res.reply || "I couldn't generate a reply.",
      }
      setMessages(withMessageProposals([...draft, assistant], assistantId, res.proposals))
    } catch (err) {
      const fallback =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again or use the web admin console."
      setMessages([...draft, { id: assistantId, role: "assistant", content: fallback }])
    } finally {
      setSending(false)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
    }
  }, [adminSession, input, messages, sending])

  if (!adminSession) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.body, { color: native.secondaryLabel }]}>Admin session required.</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: native.groupedBackground }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: native.separator }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/dashboard"))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={SYSTEM.blue.color} />
        </Pressable>
        <View style={styles.headerTitle}>
          <CoraBrand size="sm" />
          <Text style={[type.navTitle, { color: native.label }]}>{CORA_NAME} Admin</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View
            style={[
              styles.hintBox,
              {
                backgroundColor: tokens.isDark ? NATIVE.secondaryGrouped : "#FFFFFF",
                borderColor: native.separator,
              },
            ]}
          >
            <CoraBrand size="sm" />
            <Text style={[type.body, { color: native.secondaryLabel, flex: 1, lineHeight: 22 }]}>
              Ask {CORA_NAME} about institutions, users, or platform ops. Consequential changes appear as
              confirmation cards — nothing runs until you confirm.
            </Text>
          </View>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user"
          return (
            <View key={message.id} style={styles.messageBlock}>
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.userBubble, { backgroundColor: SYSTEM.blue.color }]
                    : [
                        styles.assistantBubble,
                        {
                          backgroundColor: tokens.isDark ? NATIVE.secondaryGrouped : "#FFFFFF",
                          borderColor: native.separator,
                        },
                      ],
                ]}
              >
                <AiTutorMessageMarkdown
                  messageId={`admin-cora-${message.id}`}
                  markdown={message.content}
                  onAccentSurface={isUser}
                  compact
                />
              </View>
              {!isUser && message.scopeFeedback ? (
                <CoraScopeFeedbackBar
                  feedback={message.scopeFeedback}
                  promptLabel="Was this actually related to platform / academic operations?"
                  onRelated={(note) => {
                    if (!adminSession) return
                    void (async () => {
                      try {
                        const result = await submitCoraScopeFeedback({
                          role: "admin",
                          session: adminSession,
                          related: true,
                          eventId: message.scopeFeedback?.eventId,
                          note,
                        })
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === message.id ? { ...m, scopeFeedback: null } : m,
                          ),
                        )
                        if (result.allowRetry && message.scopeFeedback) {
                          scopeRetryRef.current = { confirm: true, context: note }
                          void send(message.scopeFeedback.originalMessage)
                        }
                      } catch {
                        AppAlert.alert("Could not send feedback", "Try again in a moment.")
                      }
                    })()
                  }}
                  onNotRelated={() => {
                    if (!adminSession || !message.scopeFeedback) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === message.id ? { ...m, scopeFeedback: null } : m,
                        ),
                      )
                      return
                    }
                    void (async () => {
                      try {
                        await submitCoraScopeFeedback({
                          role: "admin",
                          session: adminSession,
                          related: false,
                          eventId: message.scopeFeedback?.eventId,
                        })
                      } catch {
                        /* ignore */
                      }
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === message.id ? { ...m, scopeFeedback: null } : m,
                        ),
                      )
                    })()
                  }}
                />
              ) : null}
              {!isUser && message.proposals?.length
                ? message.proposals.map((proposal) => (
                    <CoraActionCard
                      key={proposal.actionId}
                      proposal={proposal}
                      status={message.proposalStatusById?.[proposal.actionId] ?? "idle"}
                      result={message.proposalResultById?.[proposal.actionId] ?? null}
                      resultMessage={message.proposalResultById?.[proposal.actionId]?.message}
                      onConfirm={() => void confirmProposal(message.id, proposal)}
                      onCancel={() => cancelProposal(message.id, proposal.actionId)}
                      onOpen={(route) => openCoraNativeRoute(router, route)}
                    />
                  ))
                : null}
            </View>
          )
        })}

        {sending ? (
          <View
            style={[
              styles.bubble,
              styles.assistantBubble,
              {
                backgroundColor: tokens.isDark ? NATIVE.secondaryGrouped : "#FFFFFF",
                borderColor: native.separator,
              },
            ]}
          >
            <ActivityIndicator size="small" color={SYSTEM.blue.color} />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            borderTopColor: native.separator,
            backgroundColor: native.groupedBackground,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Ask ${CORA_NAME}…`}
          placeholderTextColor={native.tertiaryLabel}
          multiline
          maxLength={8000}
          style={[
            styles.input,
            type.body,
            { color: native.label, backgroundColor: native.secondaryGrouped, borderColor: native.separator },
          ]}
          editable={!sending}
        />
        <ComposerSendButton
          active={!!input.trim() && !sending}
          sending={sending}
          onPress={() => void send()}
          size={40}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  messages: { flex: 1 },
  messagesContent: { padding: NATIVE.pagePadding, gap: 12, paddingBottom: 24 },
  hintBox: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    ...NATIVE.raisedShadow,
  },
  messageBlock: { gap: 8, marginBottom: 10 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, maxWidth: "92%" },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: {
    alignSelf: "stretch",
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
})
