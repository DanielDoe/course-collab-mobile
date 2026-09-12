import { useCallback, useRef, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { notetakerApi, type NotetakerChatMessage } from "../../lib/notetaker-api"
import { ComposerSendButton } from "../theme/ComposerSendButton"

type Props = {
  session: StudentSession
  captionContext: string
  enabled: boolean
}

export function NotetakerLiveCaptionChat({ session, captionContext, enabled }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [messages, setMessages] = useState<NotetakerChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !enabled) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", text }])
    setSending(true)
    try {
      const res = await notetakerApi.sendLiveCaptionChat(session, text, captionContext)
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply || "" }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err instanceof ApiError ? err.message : "Could not answer from live captions.",
        },
      ])
    } finally {
      setSending(false)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
    }
  }, [captionContext, enabled, input, sending, session])

  if (!enabled) return null

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
      <Text style={[type.caption, styles.heading, { color: native.secondaryLabel }]}>
        Cora AI Assistant
      </Text>
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <Text style={[type.caption, { color: native.tertiaryLabel, lineHeight: 18 }]}>
            Speak for a few seconds, then ask a question. Answers use the live preview — the full
            transcript is generated after you stop.
          </Text>
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === "user"
            return (
              <View
                key={`${message.role}-${index}`}
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.userBubble, { backgroundColor: tokens.accent }]
                    : [styles.assistantBubble, { backgroundColor: native.fill }],
                ]}
              >
                <Text style={[type.caption, { color: isUser ? "#fff" : native.label, lineHeight: 18 }]}>
                  {message.text}
                </Text>
              </View>
            )
          })
        )}
        {sending ? <ActivityIndicator size="small" color={tokens.accent} /> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Cora about this lecture…"
          placeholderTextColor={native.tertiaryLabel}
          style={[
            styles.input,
            type.body,
            { color: native.label, backgroundColor: native.groupedBackground, borderColor: native.separator },
          ]}
          editable={!sending}
          maxLength={4000}
        />
        <ComposerSendButton active={!!input.trim() && !sending} onPress={() => void send()} size={36} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  heading: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  messages: {
    maxHeight: 140,
  },
  messagesContent: {
    gap: 8,
  },
  bubble: {
    maxWidth: "92%",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 38,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
