import { memo, useEffect, useMemo, useState } from "react"
import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated"
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
  formatMessageMetaLine,
  formatMessageWhen,
  looksLikeHtml,
  messageInitials,
  messagePreviewText,
  resolveMessageDeliveryStatus,
  stripMessageHtml,
} from "../../lib/messages-html"
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
  const plainBody = useMemo(() => {
    if (courseImport) return courseImport.userNote
    if (incompleteImportLabel) return stripCourseImportMarkup(message.body)
    return looksLikeHtml(message.body) ? stripMessageHtml(message.body) : message.body.trim()
  }, [courseImport, incompleteImportLabel, message.body])
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
          { maxWidth: courseImport ? layout.courseImportBubbleMaxWidth : layout.bubbleMaxWidth },
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
                <Text
                  style={[
                    type.body,
                    styles.bubbleText,
                    { color: message.isMine ? tokens.accent : native.secondaryLabel },
                  ]}
                >
                  {looksLikeHtml(version.body) ? stripMessageHtml(version.body) : version.body.trim()}
                </Text>
              </View>
            ))
          : null}
        <View
          style={[
            styles.bubble,
            courseImport ? styles.bubbleCourseImport : null,
            courseImport
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
          {plainBody ? (
            <Text
              style={[
                type.body,
                styles.bubbleText,
                courseImport && styles.bubbleTextAfterImport,
                { color: courseImport || !message.isMine ? native.label : "#ffffff" },
              ]}
            >
              {plainBody}
            </Text>
          ) : null}
          {message.attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              mine={message.isMine && !courseImport}
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

function AttachmentChip({ attachment, mine }: { attachment: MessageAttachment; mine: boolean }) {
  const type = useNativeType()
  const url = resolveAttachmentUrl(attachment.fileUrl)

  return (
    <Pressable
      style={[styles.attachmentChip, mine && styles.attachmentChipMine]}
      onPress={() => void Linking.openURL(url)}
    >
      <Ionicons name="document-outline" size={14} color={mine ? "#ffffff" : undefined} />
      <Text
        style={[type.caption, styles.attachmentName, mine && { color: "#ffffff" }]}
        numberOfLines={1}
      >
        {attachment.fileName}
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
