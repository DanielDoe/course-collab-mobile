import { memo, useEffect, useMemo, useState } from "react"
import { Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated"
import { Image } from "expo-image"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NativeCountBadge } from "../faculty/faculty-shared"
import type { MessageAttachment, MessageDeliveryStatus, ThreadMessage, ThreadSummary } from "../../lib/messages-api"
import type { PresenceStatus } from "../../lib/presence/types"
import { PresenceAvatarBadge } from "../presence/PresenceAvatarBadge"
import { resolveAttachmentUrl } from "../../lib/messages-api"
import {
  deliveryStatusLabel,
  extractMessageImageUrls,
  formatMessageMetaLine,
  formatMessageWhen,
  isImageMimeType,
  messageInitials,
  messagePreviewText,
  resolveMessageDeliveryStatus,
} from "../../lib/messages-html"
import { needsMarkdownRichRender, prepareMessageRichContent } from "../../lib/assessment-report-markdown"
import { parseTargetedPracticeMessage } from "../../lib/targeted-practice-message"
import { AiTutorMessageMarkdown } from "../ai-tutor/AiTutorMessageMarkdown"
import { TargetedPracticeMessageCard } from "./TargetedPracticeMessageCard"
import {
  incompleteCourseImportLabel,
  parseCourseImportFromMessage,
  stripCourseImportMarkup,
} from "../../lib/message-course-import"
import { unsentAuditLabel } from "../../lib/message-lifecycle"
import { CoraImportedQuestionPreview } from "../ai-tutor/CoraImportedQuestionPreview"
import { useMessagesLayout } from "../../hooks/useMessagesLayout"
import { normalizeMessageParticipant } from "../../lib/messages-thread-normalize"

export function MessageAvatar({
  name,
  mine,
  size = 40,
  presenceStatus,
}: {
  name: string
  mine?: boolean
  size?: number
  presenceStatus?: PresenceStatus
}) {
  const tokens = useAppThemeTokens()
  const radius = size / 2
  return (
    <View style={[styles.avatarWrap, { width: size, height: size }]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: mine ? tokens.accent : tokens.native.fill,
          },
        ]}
      >
        <Text style={[styles.avatarText, { color: mine ? "#ffffff" : tokens.text, fontSize: size * 0.325 }]}>
          {messageInitials(name)}
        </Text>
      </View>
      {presenceStatus ? <PresenceAvatarBadge status={presenceStatus} avatarSize={size} /> : null}
    </View>
  )
}

export const MessageThreadRow = memo(function MessageThreadRow({
  thread,
  onPress,
  isFirst,
  isLast,
  presenceStatus,
}: {
  thread: ThreadSummary
  onPress: () => void
  isFirst?: boolean
  isLast?: boolean
  presenceStatus?: PresenceStatus
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const layout = useMessagesLayout()
  const preview = thread.lastMessage
    ? messagePreviewText(thread.lastMessage.body, 80)
    : "No messages yet"
  const participant = normalizeMessageParticipant(thread.otherParticipant)
  const name = participant.displayName

  return (
    <Pressable
      style={({ pressed }) => [
        styles.threadRow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: native.separator,
          paddingHorizontal: layout.cardPadding,
          minHeight: layout.threadRowMinHeight,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
        },
        isFirst
          ? {
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              borderTopWidth: StyleSheet.hairlineWidth,
            }
          : null,
        isLast
          ? {
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
            }
          : { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <MessageAvatar name={name} size={layout.avatarSize} presenceStatus={presenceStatus} />
      <View style={styles.threadCopy}>
        <View style={styles.threadTop}>
          <Text style={[type.bodyEmphasis, styles.threadName]} numberOfLines={1}>
            {name}
          </Text>
          {thread.lastMessage ? (
            <Text
              style={[type.caption, styles.threadTime, { color: native.tertiaryLabel }]}
              numberOfLines={1}
            >
              {thread.lastMessage.deliveryStatus
                ? formatMessageMetaLine(thread.lastMessage.createdAt, {
                    deliveryStatus: thread.lastMessage.deliveryStatus,
                    showReceipt: true,
                  })
                : formatMessageWhen(thread.lastMessage.createdAt)}
            </Text>
          ) : null}
        </View>
        {participant.subtitle ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {participant.subtitle}
          </Text>
        ) : null}
        <Text
          style={[
            type.caption,
            styles.threadPreview,
            { color: thread.unreadCount > 0 ? native.label : native.secondaryLabel },
            thread.unreadCount > 0 && { fontWeight: "600" },
          ]}
          numberOfLines={2}
        >
          {preview}
        </Text>
      </View>
      {thread.unreadCount > 0 ? (
        <NativeCountBadge count={thread.unreadCount} variant="compact" />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      )}
    </Pressable>
  )
})

export const MessageBubble = memo(function MessageBubble({
  message,
  otherLastReadAt,
  pendingStatus,
  onPressSender,
  senderPresence,
  popReactionEmoji,
}: {
  message: ThreadMessage
  otherLastReadAt?: string | null
  pendingStatus?: MessageDeliveryStatus
  onPressSender?: () => void
  senderPresence?: PresenceStatus
  /** Triggers a spring pop on the matching reaction chip. */
  popReactionEmoji?: string | null
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const layout = useMessagesLayout()
  const [editHistoryOpen, setEditHistoryOpen] = useState(false)
  const courseImport = useMemo(
    () => (message.unsent ? null : parseCourseImportFromMessage(message.body)),
    [message.body, message.unsent],
  )
  const incompleteImportLabel = useMemo(
    () => (message.unsent || courseImport ? null : incompleteCourseImportLabel(message.body)),
    [courseImport, message.body, message.unsent],
  )
  const displayBody = useMemo(() => {
    if (courseImport) return courseImport.userNote
    if (incompleteImportLabel) return stripCourseImportMarkup(message.body)
    return prepareMessageRichContent(message.body)
  }, [courseImport, incompleteImportLabel, message.body])
  const inlineImageUrls = useMemo(
    () => (courseImport || incompleteImportLabel ? [] : extractMessageImageUrls(message.body)),
    [courseImport, incompleteImportLabel, message.body],
  )
  const practicePlan = useMemo(
    () => (courseImport || incompleteImportLabel ? null : parseTargetedPracticeMessage(displayBody)),
    [courseImport, displayBody, incompleteImportLabel],
  )
  const bodyIsRich = useMemo(
    () => Boolean(practicePlan) || needsMarkdownRichRender(displayBody),
    [displayBody, practicePlan],
  )
  const hasAttachments = message.attachments.length > 0 || inlineImageUrls.length > 0
  const editVersions = message.editHistory ?? []
  const hasEditHistory = editVersions.length > 0

  if (message.unsent) {
    return (
      <View
        style={[
          styles.auditRow,
          { paddingHorizontal: layout.horizontalPadding },
          message.isMine ? styles.auditRowMine : styles.auditRowOther,
        ]}
      >
        <Text style={[type.caption, styles.auditText, { color: native.secondaryLabel }]}>
          {unsentAuditLabel(message.isMine, message.senderName)}
        </Text>
      </View>
    )
  }

  const metaPrefix = message.isMine
    ? pendingStatus
      ? `${deliveryStatusLabel(pendingStatus)} · `
      : `${deliveryStatusLabel(message.deliveryStatus ?? resolveMessageDeliveryStatus(message.createdAt, otherLastReadAt))} · `
    : ""

  const editedSuffix =
    message.edited && hasEditHistory
      ? editHistoryOpen
        ? "Hide Edits"
        : "Edited"
      : message.edited
        ? "Edited"
        : null

  const showBubbleContent =
    Boolean(courseImport) ||
    Boolean(incompleteImportLabel) ||
    Boolean(practicePlan) ||
    Boolean(displayBody.trim()) ||
    hasAttachments

  const emptyAttachmentShell = !showBubbleContent

  return (
    <View
      style={[
        styles.bubbleRow,
        { paddingHorizontal: layout.horizontalPadding },
        message.isMine ? styles.bubbleRowMine : styles.bubbleRowOther,
      ]}
    >
      {!message.isMine ? (
        <MessageAvatar name={message.senderName} size={layout.avatarSize} presenceStatus={senderPresence} />
      ) : null}
      <View
        style={[
          styles.bubbleCol,
          courseImport && styles.bubbleColCourseImport,
          practicePlan && styles.bubbleColCourseImport,
          {
            maxWidth:
              courseImport || practicePlan ? layout.courseImportBubbleMaxWidth : layout.bubbleMaxWidth,
            width:
              bodyIsRich || practicePlan
                ? courseImport || practicePlan
                  ? layout.courseImportBubbleMaxWidth
                  : layout.bubbleMaxWidth
                : undefined,
          },
        ]}
      >
        {!message.isMine ? (
          onPressSender ? (
            <Pressable onPress={onPressSender} hitSlop={4}>
              <Text style={[type.caption, { color: tokens.accent, marginBottom: 4, fontWeight: "600" }]}>
                {message.senderName}
              </Text>
            </Pressable>
          ) : (
            <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 4 }]}>
              {message.senderName}
            </Text>
          )
        ) : null}
        {editHistoryOpen && hasEditHistory
          ? editVersions.map((version, index) => (
              <View
                key={`${message.id}-edit-${index}`}
                style={[
                  styles.bubble,
                  styles.editHistoryBubble,
                  {
                    backgroundColor: message.isMine ? tokens.accentSoft : native.fill,
                    borderColor: native.separator,
                    borderWidth: StyleSheet.hairlineWidth,
                    opacity: 0.72,
                  },
                ]}
              >
                <AiTutorMessageMarkdown
                  messageId={`${message.id}-edit-${index}`}
                  markdown={prepareMessageRichContent(version.body)}
                  compact
                />
              </View>
            ))
          : null}
        <View
          style={[
            styles.bubble,
            courseImport ? styles.bubbleCourseImport : practicePlan ? styles.bubbleCourseImport : null,
            courseImport || practicePlan
              ? {
                  backgroundColor: native.secondaryGrouped,
                  borderColor: message.isMine ? tokens.accentBorder : native.separator,
                  borderWidth: StyleSheet.hairlineWidth,
                }
              : message.isMine
                ? { backgroundColor: tokens.accent }
                : { backgroundColor: native.secondaryGrouped, borderColor: native.separator, borderWidth: StyleSheet.hairlineWidth },
          ]}
        >
          {emptyAttachmentShell ? (
            <Text
              style={[
                type.caption,
                styles.bubbleText,
                {
                  color: message.isMine ? "rgba(255,255,255,0.85)" : native.secondaryLabel,
                  fontStyle: "italic",
                },
              ]}
            >
              Attachment missing — the photo or file may not have finished uploading. Ask the student to
              resend using the + button → Photo.
            </Text>
          ) : null}
          {courseImport ? (
            <CoraImportedQuestionPreview
              label={courseImport.label}
              problem={courseImport.problem}
              compact
              chatTurn
            />
          ) : incompleteImportLabel ? (
            <Text
              style={[
                type.bodyEmphasis,
                styles.bubbleText,
                { color: message.isMine ? "#ffffff" : native.label },
              ]}
            >
              {incompleteImportLabel === "Course question"
                ? incompleteImportLabel
                : `Course question: ${incompleteImportLabel}`}
            </Text>
          ) : null}
          {practicePlan ? (
            <TargetedPracticeMessageCard plan={practicePlan} />
          ) : displayBody.trim() ? (
            <View style={courseImport ? styles.bubbleTextAfterImport : undefined}>
              <AiTutorMessageMarkdown
                messageId={`inbox-${message.id}`}
                markdown={displayBody}
                onAccentSurface={message.isMine && !courseImport}
                compact
              />
            </View>
          ) : null}
          {inlineImageUrls.map((src) => (
            <MessageImagePreview
              key={src}
              url={resolveAttachmentUrl(src)}
              mine={message.isMine && !courseImport && !practicePlan}
            />
          ))}
          {message.attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              mine={message.isMine && !courseImport && !practicePlan}
            />
          ))}
        </View>
        <View style={[styles.metaRow, message.isMine && styles.metaRowMine]}>
          <Text style={[type.caption, styles.bubbleTime, { color: native.tertiaryLabel }]}>
            {metaPrefix}
            {formatMessageWhen(message.createdAt)}
          </Text>
          {editedSuffix ? (
            <Pressable
              onPress={() => hasEditHistory && setEditHistoryOpen((open) => !open)}
              hitSlop={6}
              disabled={!hasEditHistory}
            >
              <Text style={[type.caption, styles.editedLabel, { color: native.tertiaryLabel }]}>
                {editedSuffix}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {message.reactions.length > 0 ? (
          <View style={styles.reactionRow}>
            {message.reactions.map((reaction) => (
              <ReactionChip
                key={reaction.emoji}
                reaction={reaction}
                pop={popReactionEmoji === reaction.emoji}
              />
            ))}
          </View>
        ) : popReactionEmoji ? (
          <View style={styles.reactionRow}>
            <ReactionChip
              reaction={{ emoji: popReactionEmoji, count: 1, reactedByMe: true }}
              pop
            />
          </View>
        ) : null}
      </View>
    </View>
  )
})

function ReactionChip({
  reaction,
  pop = false,
}: {
  reaction: { emoji: string; count: number; reactedByMe: boolean }
  pop?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const scale = useSharedValue(1)

  useEffect(() => {
    if (!pop) {
      scale.value = 1
      return
    }
    scale.value = 0.35
    scale.value = withSequence(
      withSpring(1.28, { damping: 8, stiffness: 420 }),
      withSpring(1, { damping: 12, stiffness: 280 }),
    )
  }, [pop, reaction.emoji, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View
      style={[
        styles.reactionChip,
        animatedStyle,
        {
          backgroundColor: reaction.reactedByMe ? tokens.accentSoft : native.fill,
          borderColor: reaction.reactedByMe ? tokens.accentBorder : native.separator,
        },
      ]}
    >
      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
      <Text style={[type.caption, { color: native.secondaryLabel }]}>{reaction.count}</Text>
    </Animated.View>
  )
}

function MessageImageLightbox({
  visible,
  url,
  onClose,
}: {
  visible: boolean
  url: string
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.imageLightboxBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close image preview"
        />
        <Pressable
          style={[styles.imageLightboxClose, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={28} color="#ffffff" />
        </Pressable>
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ width: width - 32, height: height - insets.top - insets.bottom - 48 }}
            contentFit="contain"
            accessibilityLabel="Message attachment image"
          />
        ) : null}
      </View>
    </Modal>
  )
}

function MessageImagePreview({ url, mine }: { url: string; mine: boolean }) {
  const native = useThemedNative()
  const [failed, setFailed] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const openPreview = () => {
    if (!url) return
    setLightboxOpen(true)
  }

  if (failed || !url) {
    return (
      <>
        <Pressable
          style={[styles.attachmentChip, mine && styles.attachmentChipMine]}
          onPress={openPreview}
          accessibilityRole="button"
          accessibilityLabel="View image"
        >
          <Ionicons name="image-outline" size={14} color={mine ? "#ffffff" : native.secondaryLabel} />
          <Text style={[styles.attachmentName, { color: mine ? "#ffffff" : native.label }]} numberOfLines={1}>
            View image
          </Text>
        </Pressable>
        <MessageImageLightbox visible={lightboxOpen} url={url} onClose={() => setLightboxOpen(false)} />
      </>
    )
  }

  return (
    <>
      <Pressable
        onPress={openPreview}
        accessibilityRole="imagebutton"
        accessibilityLabel="View image full screen"
      >
        <Image
          source={{ uri: url }}
          style={styles.attachmentImage}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      </Pressable>
      <MessageImageLightbox visible={lightboxOpen} url={url} onClose={() => setLightboxOpen(false)} />
    </>
  )
}

function AttachmentChip({ attachment, mine }: { attachment: MessageAttachment; mine: boolean }) {
  const type = useNativeType()
  const native = useThemedNative()
  const url = resolveAttachmentUrl(attachment.fileUrl || "")
  const label = String(attachment.fileName || "").trim() || "Attachment"
  const isImage = isImageMimeType(attachment.mimeType, attachment.fileName)

  if (isImage && url) {
    return <MessageImagePreview url={url} mine={mine} />
  }

  return (
    <Pressable
      style={[styles.attachmentChip, mine && styles.attachmentChipMine, { backgroundColor: mine ? "rgba(255,255,255,0.18)" : native.fill }]}
      onPress={() => {
        if (!url) return
        void Linking.openURL(url)
      }}
      disabled={!url}
    >
      <Ionicons name="document-outline" size={14} color={mine ? "#ffffff" : native.secondaryLabel} />
      <Text
        style={[type.caption, styles.attachmentName, { color: mine ? "#ffffff" : native.label }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  avatarWrap: {
    position: "relative",
    overflow: "visible",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700" },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  threadCopy: { flex: 1, minWidth: 0, gap: 2 },
  threadTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  threadName: { flex: 1, minWidth: 0 },
  threadTime: { flexShrink: 0, maxWidth: "46%" },
  threadPreview: { marginTop: 2 },
  bubbleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubbleCol: { gap: 2 },
  bubbleColCourseImport: {},
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  bubbleCourseImport: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  bubbleText: { lineHeight: 20 },
  bubbleTextAfterImport: { marginTop: 2 },
  bubbleTime: { marginTop: 2, marginHorizontal: 4 },
  bubbleTimeMine: { textAlign: "right" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    marginHorizontal: 4,
  },
  metaRowMine: { justifyContent: "flex-end" },
  editedLabel: { fontWeight: "500" },
  auditRow: {
    marginBottom: 10,
    alignItems: "center",
  },
  auditRowMine: {},
  auditRowOther: {},
  auditText: {
    fontStyle: "italic",
    textAlign: "center",
  },
  editHistoryBubble: {
    marginBottom: 4,
  },
  editHistoryBubbleMine: {
    alignSelf: "flex-end",
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    maxWidth: "100%",
  },
  attachmentChipMine: { backgroundColor: "rgba(255,255,255,0.18)" },
  attachmentName: { flexShrink: 1 },
  attachmentImage: {
    width: "100%",
    minWidth: 180,
    maxWidth: 280,
    height: 180,
    borderRadius: 12,
    backgroundColor: "rgba(127,127,127,0.2)",
  },
  imageLightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageLightboxClose: {
    position: "absolute",
    right: 16,
    zIndex: 2,
    padding: 4,
  },
  reactionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, marginHorizontal: 4 },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionEmoji: { fontSize: 14 },
})
