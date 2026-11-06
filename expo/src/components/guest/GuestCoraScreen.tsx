import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { GUEST_CORA_QUICK_PROMPTS } from "../../constants/guest-cora-prompts"
import { useGuestEntitlements } from "../../context/GuestEntitlementsProvider"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/api"
import { guestApi } from "../../lib/guest-api"
import {
  createGuestCoraConversation,
  loadGuestCoraConversations,
  upsertGuestCoraConversation,
} from "../../lib/guest-cora-storage"
import type { GuestCoraChatMessage, GuestCoraConversation } from "../../lib/guest-types"
import type { GuestSession } from "../../lib/session"
import { useNativeType } from "../../lib/themed-module-theme"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ChatKeyboardShell } from "../motion/ChatKeyboardShell"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  insufficientCreditsAlertButtons,
  iosInsufficientCoraCreditsNotice,
  isIosPurchaseUiHidden,
  tierLockedAlertButtons,
} from "../../lib/purchase-navigation"

export function GuestCoraScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ requestId?: string }>()
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const { entitlements, hasCapability, refresh: refreshEntitlements } = useGuestEntitlements()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const [conversation, setConversation] = useState<GuestCoraConversation | null>(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [booting, setBooting] = useState(true)
  const listRef = useRef<FlatList<GuestCoraChatMessage>>(null)

  const requestId = useMemo(() => {
    const raw = params.requestId
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) ? parsed : undefined
  }, [params.requestId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const conversations = await loadGuestCoraConversations()
      const existing = conversations[0] ?? createGuestCoraConversation("Cora Career")
      if (!cancelled) {
        setConversation({ ...existing, requestId: requestId ?? existing.requestId ?? null })
        setBooting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [requestId])

  const persistConversation = useCallback(async (next: GuestCoraConversation) => {
    setConversation(next)
    await upsertGuestCoraConversation(next)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!guestSession || !conversation || !text.trim() || sending) return
      const trimmed = text.trim()
      setInput("")
      setSending(true)

      const userMessage: GuestCoraChatMessage = { role: "user", content: trimmed }
      const history = [...conversation.messages, userMessage]
      const working: GuestCoraConversation = {
        ...conversation,
        title: conversation.messages.length === 0 ? trimmed.slice(0, 48) : conversation.title,
        updatedAt: new Date().toISOString(),
        messages: history,
      }
      await persistConversation(working)

      try {
        const response = await guestApi.sendCoraChat(guestSession, {
          message: trimmed,
          conversationHistory: history,
          requestId: working.requestId ?? undefined,
        })

        if (response.denied) {
          AppAlert.alert("Not available", response.denialReason ?? "This request is not available on your plan.")
          return
        }

        const assistantMessage: GuestCoraChatMessage = {
          role: "assistant",
          content: response.content?.trim() || "I could not generate a response. Try again in a moment.",
        }
        await persistConversation({
          ...working,
          messages: [...history, assistantMessage],
          updatedAt: new Date().toISOString(),
        })
        await refreshEntitlements()
      } catch (err) {
        const details = err instanceof ApiError ? (err.details as Record<string, unknown> | undefined) : undefined
        const code = typeof details?.code === "string" ? details.code : undefined
        if (err instanceof ApiError && (code === "GUEST_CORA_UPGRADE" || err.status === 403)) {
          AppAlert.alert(
            "Cora Career required",
            isIosPurchaseUiHidden()
              ? "This feature requires Cora Career membership."
              : "Upgrade to Cora Career to use career coaching tools.",
            tierLockedAlertButtons(() => router.push("/module/cora-career" as never)),
          )
          return
        }
        if (err instanceof ApiError && (code === "GUEST_CREDITS_EXHAUSTED" || err.status === 402)) {
          AppAlert.alert(
            "Credits exhausted",
            isIosPurchaseUiHidden()
              ? iosInsufficientCoraCreditsNotice()
              : "Purchase more Cora Credits to continue chatting.",
            insufficientCreditsAlertButtons(() => router.push("/module/cora-credits" as never)),
          )
          return
        }
        AppAlert.alert("Message failed", err instanceof ApiError ? err.message : "Could not reach Cora.")
      } finally {
        setSending(false)
      }
    },
    [conversation, guestSession, persistConversation, refreshEntitlements, router, sending],
  )

  function handleQuickPrompt(prompt: (typeof GUEST_CORA_QUICK_PROMPTS)[number]) {
    if (!hasCapability(prompt.capability)) {
      AppAlert.alert(
        "Cora Career required",
        isIosPurchaseUiHidden()
          ? "This feature requires Cora Career membership."
          : "Upgrade to Cora Career to use this coaching tool.",
        tierLockedAlertButtons(() => router.push("/module/cora-career" as never)),
      )
      return
    }
    void sendMessage(prompt.prompt)
  }

  const scrollOnKeyboardShow = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true })
  }, [])

  if (!guestSession) return null

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="Cora Career Assistant" fallbackHref="/dashboard" />
      <View style={[styles.creditsBar, { borderBottomColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
        <Ionicons name="sparkles-outline" size={16} color={tokens.accent} />
        <Text style={[type.caption, { color: native.secondaryLabel, flex: 1 }]}>
          {entitlements.plan === "cora_career" ? "Cora Career" : "Career Member Free"} · {entitlements.coraCredits.available.toLocaleString()} credits
          {entitlements.coraCredits.isLow ? " · Low balance" : ""}
        </Text>
        <Pressable onPress={() => router.push("/module/cora-credits" as never)}>
          <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>Credits</Text>
        </Pressable>
      </View>

      {booting || !conversation ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.accent} />
        </View>
      ) : (
        <ChatKeyboardShell
          style={styles.flex}
          onKeyboardShow={scrollOnKeyboardShow}
          composer={
            <View style={[styles.composer, { borderTopColor: native.separator }]}>
              <TextInput
                style={[styles.input, type.body, { color: native.label, backgroundColor: native.fill, borderColor: native.separator }]}
                placeholder="Message Cora…"
                placeholderTextColor={native.tertiaryLabel}
                value={input}
                onChangeText={setInput}
                multiline
                editable={!sending}
              />
              <Pressable
                style={[styles.sendBtn, { backgroundColor: tokens.accent }, (!input.trim() || sending) && styles.sendDisabled]}
                onPress={() => void sendMessage(input)}
                disabled={!input.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#ffffff" />
                )}
              </Pressable>
            </View>
          }
        >
          <FlatList
            ref={listRef}
            data={conversation.messages}
            keyExtractor={(_, index) => String(index)}
            style={styles.flex}
            contentContainerStyle={[styles.messages, { paddingBottom: 12 }]}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListHeaderComponent={
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {GUEST_CORA_QUICK_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt.id}
                    style={[styles.chip, { backgroundColor: native.fill, borderColor: native.separator }]}
                    onPress={() => handleQuickPrompt(prompt)}
                  >
                    <Ionicons name={prompt.icon} size={14} color={tokens.accent} />
                    <Text style={[type.caption, { color: native.label, fontWeight: "600" }]}>{prompt.label}</Text>
                    {prompt.creditFree ? (
                      <Text style={[type.footnote, { color: tokens.success }]}>Free</Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === "user"
                    ? [styles.userBubble, { backgroundColor: tokens.accent }]
                    : [styles.assistantBubble, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }],
                ]}
              >
                <Text style={[type.body, { color: item.role === "user" ? "#ffffff" : native.label, lineHeight: 22 }]}>
                  {item.content}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[type.secondary, styles.emptyCopy]}>
                Ask Cora for recommendation brief help (free) or career coaching with Cora Career.
              </Text>
            }
          />
        </ChatKeyboardShell>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  creditsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  messages: { paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  chips: { gap: 8, paddingBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubble: { maxWidth: "88%", borderRadius: 16, padding: 12, marginBottom: 8 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
  emptyCopy: { textAlign: "center", paddingVertical: 24, lineHeight: 22 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.5 },
})
