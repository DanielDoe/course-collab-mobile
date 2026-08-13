import { useCallback, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"
import type { ChatMessage } from "../../../lib/ai-tutor-api"
import type { FacultyCoraCapabilityId } from "../../../lib/faculty-cora-config"
import { facultyCoraCapability } from "../../../lib/faculty-cora-config"
import { facultyCoraApi, type FacultyCoraChatAction } from "../../../lib/faculty-cora-api"
import { setFacultyCoraPending } from "../../../lib/faculty-cora-pending"
import {
  FACULTY_CORA_COLOR,
  facultyCoraCapabilityAccent,
  facultyCoraCanvas,
  facultyCoraCardSurface,
  facultyCoraMaterialCardStyle,
} from "../../../lib/faculty-cora-theme"
import type { InstructorScope } from "../../../lib/instructor-content-api"
import { ApiError } from "../../../lib/api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  facultyActionToRbac,
  facultyCapabilityToRbac,
  isCoraAccessDeniedError,
  prepareCoraRequest,
  recordCoraError,
  recordCoraSuccess,
} from "../../../lib/cora-rbac"
import { CoraBrand } from "../../cora/CoraBrand"
import { ComposerSendButton } from "../../theme/ComposerSendButton"
import { SolidListThumbTile } from "../../theme/SolidListThumbTile"

type Props = {
  scope: InstructorScope
  capabilityId?: FacultyCoraCapabilityId
  initialMessages?: ChatMessage[]
  initialPrompt?: string
  onMessagesChange?: (messages: ChatMessage[]) => void
  onClose?: () => void
}

type AssistantMessage = ChatMessage & {
  actions?: FacultyCoraChatAction[]
  proposals?: import("../../../lib/cora/types").CoraActionProposal[]
}

function nextChatMessageId(): string {
  return `fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function FacultyCoraChatView({
  scope,
  capabilityId,
  initialMessages = [],
  initialPrompt,
  onMessagesChange,
  onClose,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const { session } = useFacultyScope()

  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages)
  const [input, setInput] = useState(initialPrompt ?? "")
  const [sending, setSending] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const capability = capabilityId ? facultyCoraCapability(capabilityId) : null
  const capabilityAccent = capabilityId ? facultyCoraCapabilityAccent(capabilityId) : null
  const chatAccent = capabilityAccent?.accent ?? FACULTY_CORA_COLOR.ai
  const chatAccentSoft = capabilityAccent?.iconSoft(tokens.isDark) ?? `${FACULTY_CORA_COLOR.ai}22`
  const cardBg = facultyCoraCardSurface(native.secondaryGrouped)
  const canvas = facultyCoraCanvas(tokens.isDark, native.groupedBackground)
  const materialStyle = facultyCoraMaterialCardStyle(tokens.isDark, native.separator)

  const updateMessages = useCallback(
    (next: AssistantMessage[]) => {
      setMessages(next)
      onMessagesChange?.(next)
    },
    [onMessagesChange],
  )

  const runAction = useCallback(
    async (action: FacultyCoraChatAction) => {
      if (!scope.courseId || !session) return

      let prepared
      try {
        prepared = prepareCoraRequest({
          session,
          scope,
          tool: facultyActionToRbac(action.kind),
          prompt: String(action.payload.prompt ?? action.label),
        })
      } catch (err) {
        AppAlert.alert(
          "Not allowed",
          isCoraAccessDeniedError(err) ? err.message : "Cora cannot run that action.",
        )
        return
      }

      setActionKey(action.id)
      try {
        if (action.kind === "generate_questions") {
          const prompt = String(action.payload.prompt ?? "").trim()
          if (!prompt) throw new Error("Missing generation prompt")
          const res = await facultyCoraApi.generateQuestions(
            scope,
            { prompt },
            { prepared },
          )
          recordCoraSuccess(prepared, { prompt, response: `${res.drafts.length} drafts` })
          await setFacultyCoraPending(scope.instructorId, scope.courseId, {
            kind: "question_bank_drafts",
            drafts: res.drafts,
            createdAt: new Date().toISOString(),
          })
          onClose?.()
          router.push("/module/question-bank" as never)
          return
        }

        if (action.kind === "open_quiz_create") {
          await setFacultyCoraPending(scope.instructorId, scope.courseId, {
            kind: "quiz_create",
            title: "New quiz from Cora",
            description: String(action.payload.prompt ?? ""),
            assessmentType: "quiz",
            createdAt: new Date().toISOString(),
          })
          onClose?.()
          router.push("/module/quizzes" as never)
          return
        }

        if (action.kind === "schedule_automation") {
          const jobType =
            action.payload.jobType === "post_lecture_flashcards"
              ? "post_lecture_flashcards"
              : "weekly_announcement"
          const res = await facultyCoraApi.scheduleAutomation(
            scope,
            {
              jobType,
              payload: {
                notes: String(action.payload.notes ?? ""),
                topic: String(action.payload.topic ?? "Course update"),
              },
              runInHours: Number(action.payload.runInHours ?? 24),
            },
            { prepared },
          )
          recordCoraSuccess(prepared, { prompt: action.label, response: `job ${res.job.id}` })
          AppAlert.alert(
            "Automation scheduled",
            `Job #${res.job.id} will run ${new Date(res.job.runAt).toLocaleString()}.`,
          )
        }
      } catch (err) {
        if (prepared) recordCoraError(prepared, String(action.payload.prompt ?? action.label))
        AppAlert.alert(
          "Action failed",
          err instanceof ApiError ? err.message : "Could not complete that action.",
        )
      } finally {
        setActionKey(null)
      }
    },
    [onClose, router, scope, session],
  )

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !session) return
    setInput("")
    const userMsg: ChatMessage = { id: nextChatMessageId(), role: "user", content: text }
    const draft = [...messages, userMsg]
    updateMessages(draft)
    setSending(true)

    let prepared
    try {
      prepared = prepareCoraRequest({
        session,
        scope,
        tool: capabilityId ? facultyCapabilityToRbac(capabilityId) : "chat",
        prompt: text,
      })
    } catch (err) {
      setSending(false)
      updateMessages([
        ...draft,
        {
          id: nextChatMessageId(),
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
          message: text,
          capabilityId,
          conversationHistory: messages,
        },
        { prepared },
      )

      if (res.rbacBlocked || res.restricted) {
        recordCoraError(prepared, text)
        updateMessages([
          ...draft,
          {
            id: nextChatMessageId(),
            role: "assistant",
            content:
              res.blockReason ??
              "That request is outside Cora's teaching permissions for your account.",
          },
        ])
        return
      }

      recordCoraSuccess(prepared, { prompt: text, response: res.reply })
      updateMessages([
        ...draft,
        {
          id: nextChatMessageId(),
          role: "assistant",
          content: res.reply,
          actions: res.offline ? [] : (res.actions ?? []),
          proposals: res.proposals ?? [],
        },
      ])
      // Note: CoraActionCard rendering lives in FacultyCoraImmersiveChat (primary faculty surface).
    } catch (err) {
      if (prepared) recordCoraError(prepared, text)
      const fallback =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again or open the related module directly."
      updateMessages([
        ...draft,
        { id: nextChatMessageId(), role: "assistant", content: fallback },
      ])
    } finally {
      setSending(false)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
    }
  }, [capabilityId, input, messages, scope, sending, session, updateMessages])

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {capability && capabilityAccent ? (
        <View style={[styles.contextBanner, materialStyle, { backgroundColor: cardBg }]}>
          <SolidListThumbTile thumb={capabilityAccent.thumb} icon={capability.icon} size="compact" />
          <Text style={[type.caption, { color: native.secondaryLabel, flex: 1 }]}>
            {capability.label} · {capability.tagline}
          </Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={[styles.hintBox, materialStyle, { backgroundColor: cardBg }]}>
            <CoraBrand size="sm" />
            <Text style={[type.body, { color: native.secondaryLabel, flex: 1, lineHeight: 22 }]}>
              Cora can help create, improve, analyze, and explain your course. She can draft content and recommend
              actions — but cannot change billing, membership, or platform admin settings.
            </Text>
          </View>
        ) : null}
        {messages.map((message, index) => {
          const isUser = message.role === "user"
          return (
            <View key={`${message.role}-${index}`} style={styles.messageBlock}>
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.userBubble, { backgroundColor: chatAccent }]
                    : [styles.assistantBubble, materialStyle, { backgroundColor: cardBg }],
                ]}
              >
                <Text style={[type.body, { color: isUser ? "#fff" : native.label, lineHeight: 22 }]}>
                  {message.content}
                </Text>
              </View>
              {!isUser && message.actions?.length ? (
                <View style={styles.actionRow}>
                  {message.actions.map((action) => (
                    <Pressable
                      key={action.id}
                      onPress={() => void runAction(action)}
                      disabled={actionKey != null}
                      style={[
                        styles.actionChip,
                        {
                          backgroundColor: chatAccentSoft,
                          borderColor: native.separator,
                          opacity: actionKey === action.id ? 0.6 : 1,
                        },
                      ]}
                    >
                      {actionKey === action.id ? (
                        <ActivityIndicator size="small" color={chatAccent} />
                      ) : (
                        <>
                          <Ionicons name="open-outline" size={14} color={chatAccent} />
                          <Text style={[type.caption, { color: chatAccent, fontWeight: "700" }]}>
                            {action.label}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )
        })}
        {sending ? (
          <View style={[styles.bubble, styles.assistantBubble, materialStyle, { backgroundColor: cardBg }]}>
            <ActivityIndicator size="small" color={FACULTY_CORA_COLOR.link} />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            borderTopColor: native.separator,
            backgroundColor: canvas,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Cora about your course…"
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
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: NATIVE.pagePadding,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: NATIVE.pagePadding, paddingVertical: 8, gap: 10 },
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  messageBlock: { gap: 8, maxWidth: "100%" },
  bubble: {
    maxWidth: "92%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 4 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
})
