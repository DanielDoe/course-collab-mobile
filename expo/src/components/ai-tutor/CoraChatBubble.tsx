import { memo, useEffect, useRef, useState, type ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { CORA_NAME } from "../../lib/cora-constants"
import { copyToClipboard } from "../../lib/copy-to-clipboard"
import type { ChatMessage } from "../../lib/ai-tutor-api"
import type { CoraMessageMenuActionId } from "../../lib/cora-message-actions"
import { AiTutorMessageMarkdown } from "./AiTutorMessageMarkdown"
import { CoraImportedQuestionPreview } from "./CoraImportedQuestionPreview"
import { CoraThinkingIndicator } from "./CoraThinkingIndicator"
import {
  CORA_CHAT_USER_TEXT_MAX_WIDTH,
  getAssistantMessageColors,
  getCoraChatChromeMutedColor,
  getUserPromptBubbleColors,
  getUserPromptBubbleRadius,
  getUserPromptBubbleBorderWidth,
  type CoraChatBubblePalette,
} from "./cora-chat-bubble-theme"
import { CoraTranscriptGutter } from "./CoraTranscriptGutter"
import type { UserMessageAnchor } from "./CoraUserMessageContextMenu"
import {
  CHAT_COLLAPSED_MAX_HEIGHT,
  getActiveUserVersionIndex,
  getUserMessageVersions,
  shouldCollapseChatText,
  userMessageHasMultipleVersions,
} from "../../lib/cora-message-versions"

function FeedbackThumbButton({
  vote,
  selected,
  mutedColor,
  activeColor,
  onPress,
  accessibilityLabel,
}: {
  vote: "up" | "down"
  selected: boolean
  mutedColor: string
  activeColor: string
  onPress: () => void
  accessibilityLabel: string
}) {
  const scale = useSharedValue(1)
  const colorProgress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    colorProgress.value = withTiming(selected ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) })
    if (selected) {
      scale.value = withSequence(
        withSpring(1.24, { damping: 9, stiffness: 420 }),
        withSpring(1.08, { damping: 14, stiffness: 280 }),
      )
      return
    }
    scale.value = withSpring(1, { damping: 16, stiffness: 260 })
  }, [selected, scale, colorProgress])

  const mutedIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - colorProgress.value * 0.92,
    transform: [{ scale: scale.value }],
  }))

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: colorProgress.value,
    transform: [{ scale: 0.94 + colorProgress.value * 0.14 }],
  }))

  const haloStyle = useAnimatedStyle(() => ({
    opacity: colorProgress.value * 0.18,
    transform: [{ scale: 0.9 + colorProgress.value * 0.1 }],
  }))

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.86, { damping: 12, stiffness: 420 }),
      withSpring(1.24, { damping: 9, stiffness: 420 }),
      withSpring(1.08, { damping: 14, stiffness: 280 }),
    )
    onPress()
  }

  const iconName = vote === "up" ? "thumbs-up-outline" : "thumbs-down-outline"

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.actionBtn, pressed && !selected && { opacity: 0.55 }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[styles.feedbackHalo, haloStyle, { backgroundColor: activeColor }]} />
      <View style={styles.feedbackIconStack}>
        <Animated.View style={[styles.feedbackIconLayer, mutedIconStyle]}>
          <Ionicons name={iconName} size={18} color={mutedColor} />
        </Animated.View>
        <Animated.View style={[styles.feedbackIconLayer, activeIconStyle]} pointerEvents="none">
          <Ionicons name={iconName} size={18} color={activeColor} strokeWidth={2.35} />
        </Animated.View>
      </View>
    </Pressable>
  )
}

function UserVersionNavigator({
  message,
  mutedColor,
  onNavigate,
}: {
  message: ChatMessage
  mutedColor: string
  onNavigate?: (direction: "prev" | "next") => void
}) {
  if (!userMessageHasMultipleVersions(message)) return null

  const versions = getUserMessageVersions(message)
  const index = getActiveUserVersionIndex(message)
  const canPrev = index > 0
  const canNext = index < versions.length - 1

  return (
    <View style={styles.versionRow}>
      <Pressable
        onPress={() => canPrev && onNavigate?.("prev")}
        disabled={!canPrev}
        hitSlop={6}
        style={({ pressed }) => [styles.versionBtn, pressed && canPrev && { opacity: 0.5 }]}
        accessibilityRole="button"
        accessibilityLabel="Previous message version"
      >
        <Ionicons name="chevron-back" size={14} color={canPrev ? mutedColor : `${mutedColor}55`} />
      </Pressable>
      <Text style={[styles.versionLabel, { color: mutedColor }]}>
        {index + 1}/{versions.length}
      </Text>
      <Pressable
        onPress={() => canNext && onNavigate?.("next")}
        disabled={!canNext}
        hitSlop={6}
        style={({ pressed }) => [styles.versionBtn, pressed && canNext && { opacity: 0.5 }]}
        accessibilityRole="button"
        accessibilityLabel="Next message version"
      >
        <Ionicons name="chevron-forward" size={14} color={canNext ? mutedColor : `${mutedColor}55`} />
      </Pressable>
    </View>
  )
}

function CollapsibleUserPromptText({
  text,
  textStyle,
  mutedColor,
  fadeColor,
}: {
  text: string
  textStyle: object
  mutedColor: string
  fadeColor: string
}) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = shouldCollapseChatText(text)

  if (!collapsible) {
    return <Text style={textStyle}>{text}</Text>
  }

  if (expanded) {
    return (
      <View>
        <Text style={textStyle}>{text}</Text>
        <Pressable
          onPress={() => setExpanded(false)}
          hitSlop={8}
          style={styles.showMoreBtn}
          accessibilityRole="button"
          accessibilityLabel="Show less"
        >
          <Text style={[styles.showMoreText, { color: mutedColor }]}>Show less</Text>
          <Ionicons name="chevron-up" size={14} color={mutedColor} />
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.collapsibleWrap}>
      <View style={styles.collapsedTextClip}>
        <Text style={textStyle}>{text}</Text>
      </View>
      <LinearGradient
        colors={[`${fadeColor}00`, `${fadeColor}CC`, fadeColor]}
        locations={[0, 0.55, 1]}
        style={styles.textFade}
        pointerEvents="none"
      />
      <Pressable
        onPress={() => setExpanded(true)}
        hitSlop={8}
        style={styles.showMoreBtn}
        accessibilityRole="button"
        accessibilityLabel="Show more"
      >
        <Text style={[styles.showMoreText, { color: mutedColor }]}>Show more</Text>
        <Ionicons name="chevron-down" size={14} color={mutedColor} />
      </Pressable>
    </View>
  )
}

function MessageActions({
  content,
  feedback,
  iconColor,
  onFeedback,
  onCopy,
  onOpenMenu,
}: {
  content: string
  feedback: "up" | "down" | null
  iconColor: string
  onFeedback: (vote: "up" | "down") => void
  onCopy: () => void
  onOpenMenu: () => void
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()

  return (
    <View style={styles.actions}>
      <FeedbackThumbButton
        vote="up"
        selected={feedback === "up"}
        mutedColor={iconColor}
        activeColor={tokens.success}
        onPress={() => onFeedback("up")}
        accessibilityLabel="Good response"
      />
      <FeedbackThumbButton
        vote="down"
        selected={feedback === "down"}
        mutedColor={iconColor}
        activeColor={native.destructive}
        onPress={() => onFeedback("down")}
        accessibilityLabel="Bad response"
      />
      <Pressable
        onPress={onCopy}
        hitSlop={8}
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.55 }]}
        accessibilityRole="button"
        accessibilityLabel="Copy response"
      >
        <Ionicons name="copy-outline" size={18} color={iconColor} />
      </Pressable>
      <Pressable
        onPress={onOpenMenu}
        hitSlop={8}
        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.55 }]}
        accessibilityRole="button"
        accessibilityLabel="More options"
      >
        <Ionicons name="ellipsis-vertical" size={18} color={iconColor} />
      </Pressable>
    </View>
  )
}

export const CoraChatBubble = memo(function CoraChatBubble({
  message,
  isStreaming,
  isLast,
  onOpenMenu,
  onFeedback,
  feedback = null,
  thinkingContext,
  onLongPressUserMessage,
  onNavigateUserMessageVersion,
  suppressWhileMenuOpen = false,
  bubblePalette,
}: {
  message: ChatMessage
  isStreaming: boolean
  isLast: boolean
  onOpenMenu?: (message: ChatMessage) => void
  onFeedback?: (message: ChatMessage, vote: "up" | "down") => void
  feedback?: "up" | "down" | null
  thinkingContext?: { domain?: string | null; hasImportedQuestion?: boolean }
  onLongPressUserMessage?: (message: ChatMessage, anchor: UserMessageAnchor) => void
  onNavigateUserMessageVersion?: (message: ChatMessage, direction: "prev" | "next") => void
  suppressWhileMenuOpen?: boolean
  /** When set (faculty copilot), user + assistant bubbles render as bordered cards. */
  bubblePalette?: CoraChatBubblePalette
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const isUser = message.role === "user"
  const userBubbleRef = useRef<View>(null)
  const defaultUserColors = getUserPromptBubbleColors(tokens.isDark, native)
  const defaultAssistantColors = getAssistantMessageColors(tokens.isDark, native)
  const userColors = bubblePalette?.user ?? defaultUserColors
  const assistantColors = bubblePalette?.assistant ?? defaultAssistantColors
  const chromeMutedColor = getCoraChatChromeMutedColor(tokens.isDark, native)
  const userBubbleRadius = bubblePalette?.userRadius ?? getUserPromptBubbleRadius()
  const assistantBubbleRadius = bubblePalette?.assistantRadius ?? 16
  const userBubbleBorderWidth =
    bubblePalette?.userBorderWidth ?? bubblePalette?.borderWidth ?? getUserPromptBubbleBorderWidth()
  const assistantBubbleBorderWidth =
    bubblePalette?.assistantBorderWidth ?? bubblePalette?.borderWidth ?? 0
  const assistantSurfaceStyle =
    bubblePalette?.assistantShadow && !tokens.isDark ? styles.facultyAssistantLight : null
  const themedChat = Boolean(bubblePalette)
  const wrapThemed = (side: "user" | "assistant", node: ReactNode) =>
    themedChat ? <CoraTranscriptGutter side={side}>{node}</CoraTranscriptGutter> : node
  const userBlockStyle = styles.userBlock
  const isEmptyAssistant = !isUser && !message.content && isStreaming
  const showActions = !isUser && !!message.content && !isStreaming

  const handleCopy = async () => {
    const ok = await copyToClipboard(message.content)
    if (!ok) AppAlert.alert("Copy failed", "Could not copy this message.")
  }

  if (isEmptyAssistant) {
    return wrapThemed(
      "assistant",
      <View style={styles.thinkingBlock}>
        <CoraThinkingIndicator
          domain={thinkingContext?.domain}
          hasImportedQuestion={thinkingContext?.hasImportedQuestion}
        />
      </View>,
    )
  }

  if (!message.content && !message.importedQuestion && !isUser) return null

  const handleUserLongPress = () => {
    if (!onLongPressUserMessage) return
    if (!message.content.trim() && !message.importedQuestion) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    userBubbleRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return
      onLongPressUserMessage(message, { x, y, width, height, pageX: x, pageY: y })
    })
  }

  if (isUser) {
    const showFollowUp =
      message.content.trim().length > 0 &&
      !/^Help me work through this question/i.test(message.content.trim())

    if (message.importedQuestion) {
      return wrapThemed(
        "user",
        <View style={[userBlockStyle, suppressWhileMenuOpen && styles.userHidden]}>
          <Pressable
            onLongPress={handleUserLongPress}
            delayLongPress={320}
            style={({ pressed }) => [
              styles.userPressable,
              styles.userPressableImported,
              pressed && styles.userPressed,
            ]}
          >
            <View
              ref={userBubbleRef}
              collapsable={false}
              style={[
                styles.userTurnCard,
                {
                  backgroundColor: userColors.background,
                  borderColor: userColors.border,
                  borderWidth: userBubbleBorderWidth,
                  borderRadius: userBubbleRadius,
                },
              ]}
            >
              <CoraImportedQuestionPreview
                label={message.importedQuestionLabel}
                problem={message.importedQuestion}
                compact
                chatTurn
              />
              {showFollowUp ? (
                <View style={styles.userPromptInset}>
                  <View style={[styles.userPromptDivider, { backgroundColor: native.separator }]} />
                  <CollapsibleUserPromptText
                    text={message.content}
                    textStyle={[type.body, styles.userText, { color: userColors.text }]}
                    mutedColor={native.secondaryLabel}
                    fadeColor={userColors.background}
                  />
                </View>
              ) : null}
            </View>
          </Pressable>
          <UserVersionNavigator
            message={message}
            mutedColor={native.secondaryLabel}
            onNavigate={(direction) => onNavigateUserMessageVersion?.(message, direction)}
          />
        </View>,
      )
    }

    return wrapThemed(
      "user",
      <View style={[userBlockStyle, suppressWhileMenuOpen && styles.userHidden]}>
        <Pressable
          onLongPress={handleUserLongPress}
          delayLongPress={320}
          style={({ pressed }) => [
            styles.userPressable,
            themedChat ? styles.userPressableThemed : null,
            pressed && styles.userPressed,
          ]}
        >
          <View
            ref={userBubbleRef}
            collapsable={false}
            style={[
              styles.userCard,
              {
                backgroundColor: userColors.background,
                borderColor: userColors.border,
                borderWidth: userBubbleBorderWidth,
                borderRadius: userBubbleRadius,
              },
            ]}
          >
            <CollapsibleUserPromptText
              text={message.content}
              textStyle={[type.body, styles.userText, { color: userColors.text }]}
              mutedColor={native.secondaryLabel}
              fadeColor={userColors.background}
            />
          </View>
        </Pressable>
        <UserVersionNavigator
          message={message}
          mutedColor={native.secondaryLabel}
          onNavigate={(direction) => onNavigateUserMessageVersion?.(message, direction)}
        />
      </View>,
    )
  }

  return wrapThemed(
    "assistant",
    <View style={styles.block}>
      <View
        style={[
          styles.card,
          bubblePalette ? styles.facultyAssistantCard : null,
          assistantSurfaceStyle,
          {
            backgroundColor: assistantColors.background,
            borderColor: assistantColors.border,
            borderWidth: assistantBubbleBorderWidth,
            borderRadius: bubblePalette ? assistantBubbleRadius : 0,
            paddingHorizontal: bubblePalette ? 16 : 0,
            paddingVertical: bubblePalette ? 14 : 4,
          },
        ]}
      >
        <AiTutorMessageMarkdown
          messageId={message.id}
          markdown={message.content}
          streaming={isStreaming && isLast}
          onAccentSurface={bubblePalette?.assistantMarkdownOnAccent}
        />
      </View>
      {showActions ? (
        <>
          <MessageActions
            content={message.content}
            feedback={feedback}
            iconColor={chromeMutedColor}
            onFeedback={(vote) => onFeedback?.(message, vote)}
            onCopy={() => void handleCopy()}
            onOpenMenu={() => onOpenMenu?.(message)}
          />
          {isLast ? (
            <Text style={[type.caption, styles.disclaimer, { color: chromeMutedColor }]}>
              {CORA_NAME} is AI and can make mistakes.
            </Text>
          ) : null}
        </>
      ) : null}
    </View>,
  )
})

const styles = StyleSheet.create({
  block: {
    width: "100%",
    marginBottom: 10,
    gap: 8,
  },
  userBlock: {
    width: "100%",
    alignItems: "flex-end",
    marginTop: 2,
    marginBottom: 8,
    gap: 2,
  },
  userPressable: {
    alignSelf: "flex-end",
    maxWidth: "92%",
  },
  userPressableThemed: {
    maxWidth: CORA_CHAT_USER_TEXT_MAX_WIDTH,
  },
  userPressableImported: {
    alignSelf: "stretch",
    maxWidth: "100%",
    width: "100%",
  },
  userPressed: {
    opacity: 0.92,
  },
  userHidden: {
    opacity: 0,
  },
  userTurnCard: {
    width: "100%",
    alignSelf: "stretch",
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  userPromptInset: {
    paddingTop: 6,
    paddingBottom: 2,
  },
  userPromptDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  thinkingBlock: {
    width: "100%",
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  userCard: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    width: "100%",
    paddingVertical: 4,
  },
  facultyAssistantCard: {
    overflow: "hidden",
  },
  facultyAssistantLight: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    paddingLeft: 2,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  feedbackIconStack: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackIconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 16,
    paddingLeft: 2,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 2,
    marginTop: 2,
    marginRight: 2,
  },
  versionBtn: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  versionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    minWidth: 28,
    textAlign: "center",
  },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    marginTop: 2,
    paddingVertical: 2,
    zIndex: 2,
  },
  showMoreText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  collapsibleWrap: {
    position: "relative",
  },
  collapsedTextClip: {
    maxHeight: CHAT_COLLAPSED_MAX_HEIGHT,
    overflow: "hidden",
  },
  textFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 28,
    height: 56,
    zIndex: 1,
  },
})
