import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { memo, useEffect } from "react"
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
  stripMessageHtml,
} from "../../lib/messages-html"

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
  isLast,
  presenceStatus,
}: {
  thread: ThreadSummary
  onPress: () => void
  isLast?: boolean
  presenceStatus?: PresenceStatus
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const preview = thread.lastMessage
    ? messagePreviewText(thread.lastMessage.body, 80)
    : "No messages yet"
  const name = thread.otherParticipant.displayName

  return (
    <Pressable
      style={({ pressed }) => [
        styles.threadRow,
        { backgroundColor: native.secondaryGrouped },
        !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <MessageAvatar name={name} presenceStatus={presenceStatus} />
      <View style={styles.threadCopy}>
        <View style={styles.threadTop}>
          <Text style={[type.bodyEmphasis, styles.threadName]} numberOfLines={1}>
            {name}
          </Text>
          {thread.lastMessage ? (
            <Text style={[type.caption, { color: native.tertiaryLabel }]}>
              {thread.lastMessage.deliveryStatus
                ? formatMessageMetaLine(thread.lastMessage.createdAt, {
                    deliveryStatus: thread.lastMessage.deliveryStatus,
                    showReceipt: true,
                  })
                : formatMessageWhen(thread.lastMessage.createdAt)}
            </Text>
          ) : null}
        </View>
        {thread.otherParticipant.subtitle ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {thread.otherParticipant.subtitle}
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
  const body = looksLikeHtml(message.body) ? stripMessageHtml(message.body) : message.body.trim()

  return (
    <View style={[styles.bubbleRow, message.isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      {!message.isMine ? <MessageAvatar name={message.senderName} presenceStatus={senderPresence} /> : null}
      <View style={styles.bubbleCol}>
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
        <View
          style={[
            styles.bubble,
            message.isMine
              ? { backgroundColor: tokens.accent }
              : { backgroundColor: native.secondaryGrouped, borderColor: native.separator, borderWidth: StyleSheet.hairlineWidth },
          ]}
        >
          {body ? (
            <Text
              style={[
                type.body,
                styles.bubbleText,
                { color: message.isMine ? "#ffffff" : native.label },
              ]}
            >
              {body}
            </Text>
          ) : null}
          {message.attachments.map((attachment) => (
            <AttachmentChip key={attachment.id} attachment={attachment} mine={message.isMine} />
          ))}
        </View>
        <Text
          style={[
            type.caption,
            styles.bubbleTime,
            { color: native.tertiaryLabel },
            message.isMine && styles.bubbleTimeMine,
          ]}
        >
          {message.isMine
            ? pendingStatus
              ? `${deliveryStatusLabel(pendingStatus)} · ${formatMessageWhen(message.createdAt)}`
              : formatMessageMetaLine(message.createdAt, {
                  deliveryStatus: message.deliveryStatus,
                  otherLastReadAt,
                  showReceipt: true,
                })
            : formatMessageWhen(message.createdAt)}
        </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 72,
  },
  threadCopy: { flex: 1, minWidth: 0, gap: 2 },
  threadTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  threadName: { flex: 1 },
  threadPreview: { marginTop: 2 },
  bubbleRow: { flexDirection: "row", gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubbleCol: { maxWidth: "82%", gap: 2 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  bubbleText: { lineHeight: 20 },
  bubbleTime: { marginTop: 2, marginHorizontal: 4 },
  bubbleTimeMine: { textAlign: "right" },
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
