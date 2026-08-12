import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import type { FlashListRef } from "@shopify/flash-list"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { presentApiError, type ApiErrorPresentation } from "../../lib/present-api-error"
import { ApiError } from "../../lib/api"
import {
  messagesApi,
  messagesAuthFromSession,
  type MessageAttachmentDraft,
  type MessageReactionGroup,
  type ParticipantKind,
  type ThreadDetail,
  type ThreadMessage,
} from "../../lib/messages-api"
import {
  clearThreadUnreadLocally,
  markThreadUnreadLocally,
} from "../../lib/messages-local-state"
import { onMessagesRefresh } from "../../lib/notifications/notification-events"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { MessageBubble } from "./messages-ui"
import { AppErrorNotice } from "../errors/AppErrorNotice"
import { MessageComposerBar, MESSAGE_COMPOSER_DOCK_HEIGHT } from "./MessageComposerBar"
import { MessageParticipantProfileSheet } from "./MessageParticipantProfileSheet"
import { MessagesThreadHeader, messagesThreadHeaderHeight } from "./MessagesThreadHeader"
import { buildForwardedMessage, buildQuotedReply, MessageActionSheet } from "./MessageActionSheet"
import { MessagesComposeModal } from "./MessagesComposeModal"
import { usePresenceTracking } from "../../hooks/usePresenceTracking"
import { ModuleFlashList } from "../ModuleFlashList"

function applyOptimisticReaction(
  reactions: MessageReactionGroup[],
  emoji: string,
): MessageReactionGroup[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji)
  const mine = reactions.find((reaction) => reaction.reactedByMe)

  if (existing?.reactedByMe) {
    if (existing.count <= 1) return reactions.filter((reaction) => reaction.emoji !== emoji)
    return reactions.map((reaction) =>
      reaction.emoji === emoji
        ? { ...reaction, count: reaction.count - 1, reactedByMe: false }
        : reaction,
    )
  }

  let next = reactions
  if (mine && mine.emoji !== emoji) {
    if (mine.count <= 1) {
      next = next.filter((reaction) => reaction.emoji !== mine.emoji)
    } else {
      next = next.map((reaction) =>
        reaction.emoji === mine.emoji
          ? { ...reaction, count: reaction.count - 1, reactedByMe: false }
          : reaction,
      )
    }
  }

  if (existing) {
    return next.map((reaction) =>
      reaction.emoji === emoji
        ? { ...reaction, count: reaction.count + 1, reactedByMe: true }
        : reaction,
    )
  }

  return [...next, { emoji, count: 1, reactedByMe: true }]
}

export function MessagesThreadScreen() {
  const { threadId: rawThreadId } = useLocalSearchParams<{ threadId: string }>()
  const threadId = Number(rawThreadId)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session } = useSession()
  const auth = useMemo(
    () => messagesAuthFromSession(session),
    [
      session?.portal,
      session && "databaseId" in session ? session.databaseId : undefined,
      session?.portal === "faculty" && session ? session.id : undefined,
    ],
  )
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const scrollRef = useRef<FlashListRef<ThreadMessage>>(null)
  const headerHeight = messagesThreadHeaderHeight(insets.top)

  const [thread, setThread] = useState<ThreadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<ApiErrorPresentation | null>(null)
  const [draft, setDraft] = useState("")
  const [attachments, setAttachments] = useState<MessageAttachmentDraft[]>([])
  const [reactingId, setReactingId] = useState<number | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [actionMessage, setActionMessage] = useState<ThreadMessage | null>(null)
  const [reactionPop, setReactionPop] = useState<{ messageId: number; emoji: string } | null>(null)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardBody, setForwardBody] = useState("")

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/module/messages" as never)
  }, [router])

  const load = useCallback(async () => {
    if (!auth || !Number.isFinite(threadId)) return
    setError(null)
    const data = await messagesApi.getThread(auth, threadId)
    setThread(data.thread)
  }, [auth, threadId])

  useEffect(() => {
    if (!auth || !Number.isFinite(threadId)) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) =>
        setError(
          presentApiError(err, {
            feature: "Conversation",
            fallbackMessage: "Could not load this conversation.",
          }),
        ),
      )
      .finally(() => setLoading(false))
  }, [auth, threadId, load])

  useEffect(() => {
    if (!auth || !Number.isFinite(threadId)) return
    clearThreadUnreadLocally(threadId)
  }, [auth, threadId])

  useEffect(() => {
    if (!thread?.messages.length) return
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }))
  }, [thread?.messages.length])

  useEffect(() => {
    return onMessagesRefresh((payload) => {
      if (payload?.threadId != null && payload.threadId !== threadId) return
      void load().catch(() => {})
    })
  }, [load, threadId])

  async function handleSend() {
    if (!auth || !thread) return
    const body = draft.trim()
    if (!body && attachments.length === 0) return

    setSending(true)
    setError(null)
    try {
      const result = await messagesApi.replyToThread(auth, thread.id, { body, attachments })
      setDraft("")
      setAttachments([])
      if (result.thread) setThread(result.thread)
      else await load()
    } catch (err) {
      setError(
        presentApiError(err, {
          feature: "Message",
          fallbackMessage: "Could not send your message.",
        }),
      )
    } finally {
      setSending(false)
    }
  }

  async function handleReact(messageId: number, emoji: string) {
    if (!auth || !thread) return
    const normalized = emoji.normalize("NFC").trim()
    setReactionPop({ messageId, emoji: normalized })
    setThread((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: prev.messages.map((message) =>
          message.id === messageId
            ? { ...message, reactions: applyOptimisticReaction(message.reactions, normalized) }
            : message,
        ),
      }
    })

    setReactingId(messageId)
    try {
      const result = await messagesApi.toggleReaction(auth, thread.id, messageId, normalized)
      setThread((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          messages: prev.messages.map((message) =>
            message.id === messageId ? { ...message, reactions: result.reactions } : message,
          ),
        }
      })
    } catch (err) {
      try {
        await load()
      } catch {
        // keep optimistic UI if refresh fails; alert still informs the user
      }
      AppAlert.alert("Reaction failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setReactingId(null)
      setTimeout(() => setReactionPop(null), 700)
    }
  }

  async function handleMarkUnread() {
    if (!auth || !thread) return
    try {
      await messagesApi.markThreadUnread(auth, thread.id)
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) {
        AppAlert.alert(
          "Could not mark unread",
          err instanceof ApiError ? err.message : "Try again.",
        )
        return
      }
      markThreadUnreadLocally(thread.id)
    }
    handleBack()
  }

  async function handleDeleteMessage(message: ThreadMessage) {
    if (!auth || !thread || !message.isMine) return
    AppAlert.alert("Delete message?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await messagesApi.deleteMessage(auth, thread.id, message.id)
              setThread((prev) =>
                prev
                  ? {
                      ...prev,
                      messages: prev.messages.filter((item) => item.id !== message.id),
                    }
                  : prev,
              )
            } catch (err) {
              AppAlert.alert(
                "Delete failed",
                err instanceof ApiError
                  ? err.message
                  : "Message delete is not available on the server yet.",
              )
            }
          })()
        },
      },
    ])
  }

  function handleForward(message: ThreadMessage) {
    setForwardBody(buildForwardedMessage(message))
    setForwardOpen(true)
  }

  async function pickAttachment() {
    if (!auth) return
    AppAlert.alert("Attach file", "Choose a source", [
      {
        text: "Photo library",
        onPress: () => void pickPhoto(false),
      },
      {
        text: "Camera",
        onPress: () => void pickPhoto(true),
      },
      {
        text: "Document",
        onPress: () => void pickDocument(),
      },
      { text: "Cancel", style: "cancel" },
    ])
  }

  async function uploadFile(uri: string, name: string, mimeType: string) {
    if (!auth) return
    setUploading(true)
    try {
      const uploaded = await messagesApi.uploadAttachment(auth, { uri, name, mimeType })
      setAttachments((prev) => [...prev, uploaded])
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Could not upload file.")
    } finally {
      setUploading(false)
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        "application/pdf",
        "image/*",
        "text/plain",
        "text/csv",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
      ],
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    await uploadFile(asset.uri, asset.name ?? "attachment", asset.mimeType ?? "application/octet-stream")
  }

  async function pickPhoto(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Camera access", "Allow camera access to attach a photo.")
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Photos access", "Allow photo library access to attach an image.")
        return
      }
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
        })

    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    await uploadFile(
      asset.uri,
      asset.fileName ?? `photo-${Date.now()}.jpg`,
      asset.mimeType ?? "image/jpeg",
    )
  }

  const openProfile = useCallback(() => setProfileOpen(true), [])

  const presenceParticipants = useMemo(() => {
    const refs: Array<{ kind: ParticipantKind; id: number }> = []
    if (thread?.otherParticipant) {
      refs.push({ kind: thread.otherParticipant.kind, id: thread.otherParticipant.id })
    }
    for (const message of thread?.messages ?? []) {
      if (!message.isMine) {
        refs.push({ kind: message.senderKind, id: message.senderId })
      }
    }
    return refs
  }, [thread])

  const { getStatus, getLastSeenAt } = usePresenceTracking(presenceParticipants)

  const otherPresence = thread?.otherParticipant
    ? getStatus(thread.otherParticipant.kind, thread.otherParticipant.id)
    : undefined
  const otherLastSeenAt = thread?.otherParticipant
    ? getLastSeenAt(thread.otherParticipant.kind, thread.otherParticipant.id)
    : undefined

  const messagePaddingBottom =
    MESSAGE_COMPOSER_DOCK_HEIGHT +
    Math.max(insets.bottom, 10) +
    (attachments.length > 0 ? 56 : 0)

  const renderMessage = useCallback(
    ({ item: message }: { item: ThreadMessage }) => (
      <View>
        <Pressable onLongPress={() => setActionMessage(message)}>
          <MessageBubble
            message={message}
            otherLastReadAt={thread?.otherLastReadAt}
            onPressSender={!message.isMine ? openProfile : undefined}
            senderPresence={
              !message.isMine ? getStatus(message.senderKind, message.senderId) : undefined
            }
            popReactionEmoji={reactionPop?.messageId === message.id ? reactionPop.emoji : null}
          />
        </Pressable>
        {reactingId === message.id ? (
          <ActivityIndicator size="small" color={tokens.accent} style={styles.reactSpinner} />
        ) : null}
      </View>
    ),
    [getStatus, openProfile, reactingId, reactionPop, thread?.otherLastReadAt, tokens.accent],
  )

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={[styles.center, { paddingTop: headerHeight }]}>
            <ActivityIndicator size="large" color={tokens.accent} />
          </View>
        ) : error && !thread ? (
          <View style={[styles.center, styles.errorWrap, { paddingTop: headerHeight }]}>
            <AppErrorNotice presentation={error} onRetry={() => void load()} />
          </View>
        ) : (
          <ModuleFlashList
            ref={scrollRef}
            data={thread?.messages ?? []}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            extraData={{ reactingId, reactionPop, otherLastReadAt: thread?.otherLastReadAt }}
            contentContainerStyle={[
              styles.messages,
              { paddingTop: headerHeight, paddingBottom: messagePaddingBottom },
            ]}
            onLoad={() => scrollRef.current?.scrollToEnd({ animated: false })}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {error && thread ? (
          <AppErrorNotice
            presentation={error}
            variant="compact"
            onDismiss={() => setError(null)}
            style={styles.inlineErrorNotice}
          />
        ) : null}

        {attachments.length > 0 ? (
          <View
            style={[
              styles.attachRow,
              {
                borderTopColor: native.separator,
                backgroundColor: native.groupedBackground,
                marginBottom: MESSAGE_COMPOSER_DOCK_HEIGHT + Math.max(insets.bottom, 10) - 8,
              },
            ]}
          >
            {attachments.map((attachment, index) => (
              <View key={`${attachment.fileUrl}-${index}`} style={[styles.attachChip, { backgroundColor: native.fill }]}>
                <Text style={[type.caption, { flex: 1 }]} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                <Pressable
                  onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  hitSlop={6}
                >
                  <Ionicons name="close-circle" size={18} color={native.secondaryLabel} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <MessageComposerBar
          value={draft}
          onChange={setDraft}
          onSend={() => void handleSend()}
          onAttach={() => void pickAttachment()}
          placeholder="Message…"
          sending={sending}
          uploading={uploading}
          canSend={draft.trim().length > 0 || attachments.length > 0}
          bottomInset={insets.bottom}
        />
      </KeyboardAvoidingView>

      <MessagesThreadHeader
        participant={thread?.otherParticipant ?? null}
        participantPresence={otherPresence}
        participantLastSeenAt={otherLastSeenAt}
        onBack={handleBack}
        onOpenProfile={openProfile}
      />

      <MessageParticipantProfileSheet
        visible={profileOpen}
        participant={thread?.otherParticipant ?? null}
        auth={auth}
        presenceStatus={otherPresence}
        presenceLastSeenAt={otherLastSeenAt}
        onClose={() => setProfileOpen(false)}
      />

      <MessageActionSheet
        visible={actionMessage != null}
        message={actionMessage}
        senderLabel={actionMessage?.senderName}
        onClose={() => setActionMessage(null)}
        onReact={(emoji) => {
          if (!actionMessage) return
          void handleReact(actionMessage.id, emoji)
        }}
        onReplyWithQuote={() => {
          if (!actionMessage) return
          const quote = buildQuotedReply(actionMessage.senderName, actionMessage.body)
          setDraft((prev) => `${quote}${prev}`)
        }}
        onForward={() => {
          if (!actionMessage) return
          handleForward(actionMessage)
        }}
        onMarkUnread={() => void handleMarkUnread()}
        onDelete={
          actionMessage?.isMine
            ? () => {
                if (!actionMessage) return
                void handleDeleteMessage(actionMessage)
              }
            : undefined
        }
      />

      {auth ? (
        <MessagesComposeModal
          visible={forwardOpen}
          auth={auth}
          title="Forward message"
          initialBody={forwardBody}
          onClose={() => {
            setForwardOpen(false)
            setForwardBody("")
          }}
          onSent={(nextThreadId) => {
            setForwardOpen(false)
            setForwardBody("")
            if (nextThreadId !== threadId) {
              router.replace(`/messages/${nextThreadId}` as never)
            }
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorWrap: { width: "100%" },
  messages: {},
  reactSpinner: { marginBottom: 8 },
  inlineErrorNotice: { marginHorizontal: 0, marginBottom: 6 },
  attachRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  attachChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
})
