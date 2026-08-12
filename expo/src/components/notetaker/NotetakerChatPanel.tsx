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
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import {
  notetakerApi,
  notetakerNoteSegment,
  type NotetakerChatMessage,
  type NotetakerNoteDetail,
} from "../../lib/notetaker-api"
import { CommEmptyState, CommTintButton } from "../faculty/faculty-communication-ui"
import { CoraBrand } from "../cora/CoraBrand"
import { ComposerSendButton } from "../theme/ComposerSendButton"

type Props = {
  session: StudentSession
  note: NotetakerNoteDetail
  chatEnabled: boolean
  onUpgrade: () => void
}

export function NotetakerChatPanel({ session, note, chatEnabled, onUpgrade }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [messages, setMessages] = useState<NotetakerChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !chatEnabled) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", text }])
    setSending(true)
    try {
      const res = await notetakerApi.sendChatMessage(session, notetakerNoteSegment(note), text)
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply || "" }])
    } catch (err) {
      const body =
        err instanceof ApiError && typeof err.details === "object" && err.details !== null
          ? (err.details as { upgrade?: boolean })
          : null
      const fallback =
        body?.upgrade || err instanceof ApiError
          ? err instanceof ApiError
            ? err.message
            : "Something went wrong."
          : "Something went wrong."
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }])
    } finally {
      setSending(false)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
    }
  }, [chatEnabled, input, note, sending, session])

  if (!chatEnabled) {
    return (
      <View style={styles.upgradeWrap}>
        <CommEmptyState
          icon="sparkles-outline"
          title="AI chat requires Trailblazer"
          body="Upgrade to ask questions about this lecture transcript and get answers grounded in what was recorded."
        />
        <CommTintButton label="View membership" onPress={onUpgrade} icon="arrow-forward-outline" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={[styles.hintBox, { backgroundColor: native.secondaryGrouped }]}>
            <CoraBrand size="sm" />
            <Text style={[type.body, { color: native.secondaryLabel, flex: 1, lineHeight: 22 }]}>
              Ask about definitions, examples, or what the instructor emphasized. Answers use only this lecture's
              transcript.
            </Text>
          </View>
        ) : null}
        {messages.map((message, index) => {
          const isUser = message.role === "user"
          return (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.bubble,
                isUser
                  ? [styles.userBubble, { backgroundColor: tokens.accent }]
                  : [styles.assistantBubble, { backgroundColor: native.secondaryGrouped }],
              ]}
            >
              <Text style={[type.body, { color: isUser ? "#fff" : native.label, lineHeight: 22 }]}>
                {message.text}
              </Text>
            </View>
          )
        })}
        {sending ? (
          <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: native.secondaryGrouped }]}>
            <ActivityIndicator size="small" color={tokens.accent} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { borderTopColor: native.separator, backgroundColor: native.groupedBackground }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about this lecture…"
          placeholderTextColor={native.tertiaryLabel}
          multiline
          maxLength={4000}
          style={[
            styles.input,
            type.body,
            { color: native.label, backgroundColor: native.secondaryGrouped, borderColor: native.separator },
          ]}
          editable={!sending}
        />
        <ComposerSendButton
          active={!!input.trim() && !sending}
          onPress={() => void send()}
          size={40}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { minHeight: 320 },
  upgradeWrap: { gap: 12, paddingVertical: 8 },
  messages: { flexGrow: 0, maxHeight: 420 },
  messagesContent: { paddingVertical: 8, gap: 10 },
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "92%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
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
