import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { AppAlert } from "../../lib/app-alert"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { Image } from "expo-image"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStableTopSafeInset } from "../shell/shell-shared"
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
  markThreadReadLocally,
  markThreadUnreadLocally,
} from "../../lib/messages-local-state"
import {
  emitMessagesRefresh,
  onMessagesRefresh,
  shouldReloadThreadOnMessageRefresh,
} from "../../lib/notifications/notification-events"
import {
  inferMessageAttachmentMime,
  isImageMimeType,
  isPersistedMessageAttachmentUrl,
} from "../../lib/messages-media"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useChatListScrollToEnd } from "../../hooks/useChatListScrollToEnd"
import { ChatKeyboardShell } from "../motion/ChatKeyboardShell"
import { MessageBubble } from "./messages-ui"
import { AppErrorNotice } from "../errors/AppErrorNotice"
import { MessageComposerBar } from "./MessageComposerBar"
import {
  MessageComposerAttachMenu,
  type MessageAttachActionId,
} from "./MessageComposerAttachMenu"
import { MessageParticipantProfileSheet } from "./MessageParticipantProfileSheet"
import { MessagesThreadHeader, messagesThreadHeaderHeight } from "./MessagesThreadHeader"
import { buildForwardedMessage, buildQuotedReply, MessageActionSheet } from "./MessageActionSheet"
import { MessagesComposeModal } from "./MessagesComposeModal"
import { usePresenceTracking } from "../../hooks/usePresenceTracking"
import type { PresenceStatus } from "../../lib/presence/types"
import { CoraImportCourseSheet } from "../ai-tutor/CoraImportCourseSheet"
import { CoraImportedQuestionPreview } from "../ai-tutor/CoraImportedQuestionPreview"
import { FacultyCoraImportCourseSheet } from "../faculty/cora/FacultyCoraImportCourseSheet"
import { useOptionalFacultyShell } from "../../context/FacultyShellContext"
import type { CoraImportedProblem } from "../../lib/cora-api"
import { buildMessageBodyWithCourseImport } from "../../lib/message-course-import"
import { messagePlainTextForEdit } from "../../lib/message-lifecycle"
import { hexToRgba } from "../../constants/app-themes"
import type { FacultySession, StudentSession } from "../../lib/session"
import { useMessagesLayout } from "../../hooks/useMessagesLayout"

const EMPTY_THREAD_MESSAGES: ThreadMessage[] = []

function composerAttachmentLabel(fileName: string, isImage: boolean): string {
  const name = fileName.trim()
  if (!name || /^messages-upload-/i.test(name) || /^photo-\d+/i.test(name) || /^IMG_/i.test(name)) {
    return isImage ? "Photo" : "Attachment"
  }
  return name
}

function attachmentPayload(draft: MessageAttachmentDraft): MessageAttachmentDraft {
  return {
    fileName: draft.fileName,
    fileUrl: draft.fileUrl,
    mimeType: draft.mimeType ?? null,
    fileSize: draft.fileSize ?? null,
  }
}

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

type ThreadListProps = {
  messages: ThreadMessage[]
  headerHeight: number
  paddingBottom: number
  otherLastReadAt?: string | null
  reactingId: number | null
  reactionPop: { messageId: number; emoji: string } | null
  accent: string
  getStatus: (kind: ParticipantKind, id: number) => PresenceStatus | undefined
  onOpenProfile: () => void
  onLongPressMessage: (message: ThreadMessage) => void
}

/** Isolated from composer draft so typing does not re-render the message list. */
const MessagesThreadList = memo(function MessagesThreadList({
  messages,
  headerHeight,
  paddingBottom,
  otherLastReadAt,
  reactingId,
  reactionPop,
  accent,
  getStatus,
  onOpenProfile,
  onLongPressMessage,
}: ThreadListProps) {
  const layout = useMessagesLayout()
  const listRef = useRef<FlatList<ThreadMessage>>(null)
  const scrollToEnd = useChatListScrollToEnd(listRef, 80)
  const prevCountRef = useRef(messages.length)

  useEffect(() => {
    if (messages.length !== prevCountRef.current) {
      prevCountRef.current = messages.length
      scrollToEnd(messages.length > 1)
    }
  }, [messages.length, scrollToEnd])

  useEffect(() => {
    requestAnimationFrame(() => scrollToEnd(false))
  }, [scrollToEnd])

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const sub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => scrollToEnd(true))
    })
    return () => sub.remove()
  }, [scrollToEnd])

  const renderMessage = useCallback(
    ({ item: message }: { item: ThreadMessage }) => (
      <View>
        <Pressable onLongPress={() => onLongPressMessage(message)}>
          <MessageBubble
            message={message}
            otherLastReadAt={otherLastReadAt}
            onPressSender={!message.isMine ? onOpenProfile : undefined}
            senderPresence={
              !message.isMine ? getStatus(message.senderKind, message.senderId) : undefined
            }
            popReactionEmoji={reactionPop?.messageId === message.id ? reactionPop.emoji : null}
          />
        </Pressable>
        {reactingId === message.id ? (
          <ActivityIndicator size="small" color={accent} style={styles.reactSpinner} />
        ) : null}
      </View>
    ),
    [accent, getStatus, onLongPressMessage, onOpenProfile, otherLastReadAt, reactingId, reactionPop],
  )

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderMessage}
      style={styles.flex}
      contentContainerStyle={[
        styles.messages,
        layout.contentStyle,
        {
          paddingTop: headerHeight,
          paddingBottom,
          width: "100%",
        },
      ]}
      initialNumToRender={16}
      maxToRenderPerBatch={8}
      windowSize={11}
      removeClippedSubviews={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={false}
      extraData={{ reactingId, reactionPop, otherLastReadAt }}
    />
  )
})

export function MessagesThreadScreen() {
  const { threadId: rawThreadId } = useLocalSearchParams<{ threadId: string }>()
  const threadId = Number(rawThreadId)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const topSafeInset = useStableTopSafeInset()
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
  const headerHeight = messagesThreadHeaderHeight(topSafeInset)
  const layout = useMessagesLayout()
  const facultyShell = useOptionalFacultyShell()
  const studentSession = session?.portal === "student" ? (session as StudentSession) : null
  const facultySession = session?.portal === "faculty" ? (session as FacultySession) : null
  const facultyScope =
    facultySession && facultyShell?.selectedCourse
      ? { instructorId: facultySession.id, courseId: facultyShell.selectedCourse.id }
      : null

  const [thread, setThread] = useState<ThreadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<ApiErrorPresentation | null>(null)
  const [draft, setDraft] = useState("")
  const [attachments, setAttachments] = useState<MessageAttachmentDraft[]>([])
  const composerUploading = attachments.some((item) => item.uploadState === "uploading")
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [importCourseOpen, setImportCourseOpen] = useState(false)
  const [importedQuestion, setImportedQuestion] = useState<CoraImportedProblem | null>(null)
  const [importedQuestionLabel, setImportedQuestionLabel] = useState<string | null>(null)
  const [reactingId, setReactingId] = useState<number | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [actionMessage, setActionMessage] = useState<ThreadMessage | null>(null)
  const [reactionPop, setReactionPop] = useState<{ messageId: number; emoji: string } | null>(null)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardBody, setForwardBody] = useState("")
  const [editingMessage, setEditingMessage] = useState<ThreadMessage | null>(null)

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
    markThreadReadLocally(threadId)
    // Notify the inbox only — do not emit an event that this screen would reload on.
    emitMessagesRefresh({ threadId, cause: "local-read" })
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
    return onMessagesRefresh((payload) => {
      if (!shouldReloadThreadOnMessageRefresh(threadId, payload)) return
      void load().catch(() => {})
    })
  }, [load, threadId])

  async function handleSend(rawBody?: string) {
    if (!auth || !thread) return
    const note = (rawBody ?? draft).trim()

    if (editingMessage) {
      if (!note) return
      setSending(true)
      setError(null)
      try {
        const result = await messagesApi.editMessage(auth, thread.id, editingMessage.id, note)
        setDraft("")
        setEditingMessage(null)
        setThread((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((item) =>
                  item.id === editingMessage.id ? result.message : item,
                ),
              }
            : prev,
        )
      } catch (err) {
        setError(
          presentApiError(err, {
            feature: "Message",
            fallbackMessage: "Could not update your message.",
          }),
        )
      } finally {
        setSending(false)
      }
      return
    }

    const body = importedQuestion
      ? buildMessageBodyWithCourseImport(importedQuestion, importedQuestionLabel ?? "", note)
      : note
    if (attachments.some((item) => item.uploadState === "uploading")) {
      AppAlert.alert("Still uploading", "Wait for the photo to finish uploading, then send.")
      return
    }
    const readyAttachments = attachments
      .filter((item) => isPersistedMessageAttachmentUrl(item.fileUrl))
      .map(attachmentPayload)
    if (attachments.length > 0 && readyAttachments.length === 0) {
      AppAlert.alert(
        "Attachment not ready",
        "The photo or file did not finish uploading. Remove it and attach again with + → Photo.",
      )
      return
    }
    if (!body && readyAttachments.length === 0) return

    setSending(true)
    setError(null)
    try {
      const result = await messagesApi.replyToThread(auth, thread.id, {
        body,
        attachments: readyAttachments,
      })
      setDraft("")
      setAttachments([])
      setImportedQuestion(null)
      setImportedQuestionLabel(null)
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

  async function handleDeleteMessage(message: ThreadMessage, mode: "unsend" | "hide" = "hide") {
    if (!auth || !thread) return
    const isUnsend = mode === "unsend"
    if (isUnsend && !message.isMine) return

    const title = isUnsend ? "Undo Send?" : "Delete message?"
    const messageText = isUnsend
      ? "This removes the message for everyone in the chat."
      : "This removes the message from your view only."

    AppAlert.alert(title, messageText, [
      { text: "Cancel", style: "cancel" },
      {
        text: isUnsend ? "Undo Send" : "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            const applyResult = (nextMessage?: ThreadMessage) => {
              setActionMessage(null)
              setThread((prev) => {
                if (!prev) return prev
                if (isUnsend && nextMessage) {
                  return {
                    ...prev,
                    messages: prev.messages.map((item) =>
                      item.id === message.id ? nextMessage : item,
                    ),
                  }
                }
                return {
                  ...prev,
                  messages: prev.messages.filter((item) => item.id !== message.id),
                }
              })
            }

            try {
              await messagesApi.deleteMessage(auth, thread.id, message.id, mode)
              if (isUnsend) {
                await load()
                setActionMessage(null)
                return
              }
              applyResult()
            } catch (err) {
              if (err instanceof ApiError && err.status === 404) {
                applyResult()
                return
              }
              AppAlert.alert(
                isUnsend ? "Undo Send failed" : "Delete failed",
                err instanceof ApiError
                  ? err.message
                  : "Could not update this message. Try again.",
              )
            }
          })()
        },
      },
    ])
  }

  function handleEditMessage(message: ThreadMessage) {
    setEditingMessage(message)
    setDraft(messagePlainTextForEdit(message.body))
    setImportedQuestion(null)
    setImportedQuestionLabel(null)
    setAttachments([])
  }

  function cancelEditingMessage() {
    setEditingMessage(null)
    setDraft("")
  }

  function handleForward(message: ThreadMessage) {
    setForwardBody(buildForwardedMessage(message))
    setForwardOpen(true)
  }

  function openImportFromCourse() {
    if (studentSession) {
      setImportCourseOpen(true)
      return
    }
    if (facultySession) {
      if (!facultyScope) {
        AppAlert.alert("Select a course", "Choose a course in the header before importing from course.")
        return
      }
      setImportCourseOpen(true)
      return
    }
    AppAlert.alert("Import from course", "Course import is available for student and faculty accounts.")
  }

  function handleImportedCourseQuestion(problem: CoraImportedProblem, label: string) {
    setImportedQuestion(problem)
    setImportedQuestionLabel(label)
  }

  async function pickAttachmentAction(actionId: MessageAttachActionId) {
    if (actionId === "photo_library") {
      await pickPhoto(false)
      return
    }
    if (actionId === "camera") {
      await pickPhoto(true)
      return
    }
    if (actionId === "import_course") {
      openImportFromCourse()
      return
    }
    await pickDocument()
  }

  async function uploadFile(uri: string, name: string, mimeType: string) {
    if (!auth) return
    const resolvedMime = inferMessageAttachmentMime(name, mimeType, uri)
    if (resolvedMime === "application/octet-stream") {
      AppAlert.alert(
        "Unsupported file",
        "That file type is not allowed. Try a photo (JPEG/PNG/HEIC) or PDF.",
      )
      return
    }

    const localKey = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const pending: MessageAttachmentDraft = {
      localKey,
      fileName: name,
      fileUrl: "",
      mimeType: resolvedMime,
      localPreviewUri: uri,
      uploadState: "uploading",
    }
    setAttachments((prev) => [...prev, pending])
    try {
      const uploaded = await messagesApi.uploadAttachment(auth, {
        uri,
        name,
        mimeType: resolvedMime,
      })
      setAttachments((prev) =>
        prev.map((item) =>
          item.localKey === localKey
            ? {
                ...uploaded,
                localKey,
                localPreviewUri: uri,
                uploadState: "ready",
                fileName: uploaded.fileName || name,
              }
            : item,
        ),
      )
    } catch (err) {
      setAttachments((prev) => prev.filter((item) => item.localKey !== localKey))
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error && err.message.trim()
            ? err.message
            : "Could not upload file."
      AppAlert.alert("Upload failed", message)
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
    const name = asset.name ?? "attachment"
    await uploadFile(asset.uri, name, asset.mimeType ?? "application/octet-stream")
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

    const libraryOptions: ImagePicker.ImagePickerOptions = {
      quality: 0.85,
      allowsEditing: false,
      mediaTypes: ["images"],
    }
    const compatible = ImagePicker.UIImagePickerPreferredAssetRepresentationMode?.Compatible
    if (compatible != null) {
      libraryOptions.preferredAssetRepresentationMode = compatible
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync(libraryOptions)

    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    let name = asset.fileName?.trim() || `photo-${Date.now()}.jpg`
    let mimeType = inferMessageAttachmentMime(name, asset.mimeType, asset.uri)
    if (/\.heic$|\.heif$/i.test(name) || /heic|heif/i.test(mimeType)) {
      name = name.replace(/\.(heic|heif)$/i, ".jpg")
      if (!/\.(jpe?g|png|gif|webp)$/i.test(name)) name = `${name}.jpg`
      mimeType = "image/jpeg"
    }
    await uploadFile(asset.uri, name, mimeType)
  }

  const openProfile = useCallback(() => setProfileOpen(true), [])

  const presenceParticipants = useMemo(() => {
    const refs: Array<{ kind: ParticipantKind; id: number }> = []
    if (thread?.otherParticipant) {
      refs.push({ kind: thread.otherParticipant.kind, id: thread.otherParticipant.id })
    }
    for (const message of thread?.messages ?? EMPTY_THREAD_MESSAGES) {
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

  const messagePaddingBottom = 12

  const onLongPressMessage = useCallback((message: ThreadMessage) => {
    setActionMessage(message)
  }, [])

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <ChatKeyboardShell
        style={styles.flex}
        composer={
          <>
            {importedQuestion ? (
              <View
                style={[
                  styles.importPreviewDock,
                  {
                    borderColor: hexToRgba(tokens.accent, 0.18),
                    backgroundColor: hexToRgba(tokens.accent, 0.06),
                    marginHorizontal: layout.composerHorizontalInset,
                  },
                ]}
              >
                <CoraImportedQuestionPreview
                  label={importedQuestionLabel ?? undefined}
                  problem={importedQuestion}
                  compact
                  chatTurn
                  onClear={() => {
                    setImportedQuestion(null)
                    setImportedQuestionLabel(null)
                  }}
                />
              </View>
            ) : null}

            {attachments.length > 0 ? (
              <View
                style={[
                  styles.attachRow,
                  {
                    borderTopColor: native.separator,
                    backgroundColor: native.groupedBackground,
                    paddingHorizontal: layout.horizontalPadding,
                  },
                ]}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.attachScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {attachments.map((attachment, index) => {
                    const isImage = isImageMimeType(attachment.mimeType, attachment.fileName)
                    const previewUri = attachment.localPreviewUri || attachment.fileUrl
                    const isUploading = attachment.uploadState === "uploading"
                    const label = composerAttachmentLabel(attachment.fileName, isImage)
                    return (
                      <View
                        key={attachment.localKey ?? `${attachment.fileUrl}-${index}`}
                        style={[
                          styles.attachPreviewCard,
                          {
                            backgroundColor: native.fill,
                            borderColor: native.separator,
                          },
                        ]}
                      >
                        {isImage && previewUri ? (
                          <Image
                            source={{ uri: previewUri }}
                            style={styles.attachPreviewImage}
                            contentFit="cover"
                            transition={120}
                          />
                        ) : (
                          <View style={[styles.attachPreviewFallback, { backgroundColor: native.secondaryGrouped }]}>
                            <Ionicons
                              name="document-outline"
                              size={28}
                              color={native.secondaryLabel}
                            />
                          </View>
                        )}
                        {isUploading ? (
                          <View style={styles.attachPreviewBusy}>
                            <ActivityIndicator size="small" color="#ffffff" />
                            <Text style={styles.attachPreviewBusyText}>Uploading…</Text>
                          </View>
                        ) : null}
                        <Text
                          style={[type.caption, styles.attachPreviewLabel, { color: native.secondaryLabel }]}
                          numberOfLines={1}
                        >
                          {isUploading ? "Uploading…" : label}
                        </Text>
                        <Pressable
                          style={styles.attachPreviewRemove}
                          onPress={() =>
                            setAttachments((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Remove attachment"
                        >
                          <Ionicons name="close-circle" size={22} color={native.secondaryLabel} />
                        </Pressable>
                      </View>
                    )
                  })}
                </ScrollView>
              </View>
            ) : null}

            <MessageComposerBar
              value={draft}
              onChange={setDraft}
              onSend={(text) => void handleSend(text)}
              onAttach={() => setAttachMenuOpen(true)}
              placeholder="Message…"
              sending={sending}
              uploading={composerUploading}
              hasAttachments={attachments.length > 0}
              hasCourseImport={importedQuestion != null && !editingMessage}
              editing={editingMessage != null}
              onCancelEdit={cancelEditingMessage}
              bottomInset={0}
            />
          </>
        }
      >
        <View style={styles.threadColumn}>
        {loading ? (
          <View style={[styles.center, { paddingTop: headerHeight }]}>
            <ActivityIndicator size="large" color={tokens.accent} />
          </View>
        ) : error && !thread ? (
          <View style={[styles.center, styles.errorWrap, { paddingTop: headerHeight }]}>
            <AppErrorNotice presentation={error} onRetry={() => void load()} />
          </View>
        ) : (
          <MessagesThreadList
            messages={thread?.messages ?? []}
            headerHeight={headerHeight}
            paddingBottom={messagePaddingBottom}
            otherLastReadAt={thread?.otherLastReadAt}
            reactingId={reactingId}
            reactionPop={reactionPop}
            accent={tokens.accent}
            getStatus={getStatus}
            onOpenProfile={openProfile}
            onLongPressMessage={onLongPressMessage}
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
        </View>
      </ChatKeyboardShell>

      <MessagesThreadHeader
        participant={thread?.otherParticipant ?? null}
        participantPresence={otherPresence}
        participantLastSeenAt={otherLastSeenAt}
        onBack={handleBack}
        onOpenProfile={openProfile}
      />

      <MessageComposerAttachMenu
        visible={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onAction={(actionId) => void pickAttachmentAction(actionId)}
      />

      {studentSession ? (
        <CoraImportCourseSheet
          visible={importCourseOpen}
          session={studentSession}
          purpose="messages"
          onClose={() => setImportCourseOpen(false)}
          onImportProblem={handleImportedCourseQuestion}
        />
      ) : null}

      {facultyScope ? (
        <FacultyCoraImportCourseSheet
          visible={importCourseOpen}
          scope={facultyScope}
          onClose={() => setImportCourseOpen(false)}
          onImportProblem={handleImportedCourseQuestion}
        />
      ) : null}

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
        onEdit={(message) => handleEditMessage(message)}
        onUnsend={(message) => void handleDeleteMessage(message, "unsend")}
        onDelete={(message) => void handleDeleteMessage(message, "hide")}
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
  threadColumn: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorWrap: { width: "100%" },
  messages: {},
  reactSpinner: { marginBottom: 8 },
  inlineErrorNotice: { marginHorizontal: 0, marginBottom: 6 },
  attachRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  attachScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  importPreviewDock: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    maxHeight: 160,
    overflow: "hidden",
    marginBottom: 6,
  },
  attachPreviewCard: {
    width: 96,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingBottom: 6,
  },
  attachPreviewImage: {
    width: "100%",
    height: 72,
    backgroundColor: "rgba(120,120,128,0.18)",
  },
  attachPreviewFallback: {
    width: "100%",
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  attachPreviewBusy: {
    ...StyleSheet.absoluteFill,
    top: 0,
    height: 72,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  attachPreviewBusyText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  attachPreviewLabel: {
    marginTop: 4,
    paddingHorizontal: 8,
    fontSize: 11,
  },
  attachPreviewRemove: {
    position: "absolute",
    top: 4,
    right: 4,
  },
})
