import { useCallback, useEffect, useRef, useState } from "react"
import {
  InteractionManager,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useShellChrome, useThemedNative } from "../../context/AppearanceProvider"
import { extractLastEmoji, normalizeReactionEmoji } from "../../lib/emoji-utils"
import { useNativeType } from "../../lib/themed-module-theme"
import type { ThreadMessage } from "../../lib/messages-api"
import { canEditMessage, canUnsendMessage } from "../../lib/message-lifecycle"
import { parseCourseImportFromMessage } from "../../lib/message-course-import"
import { formatMessageWhen, stripMessageHtml } from "../../lib/messages-html"
import { copyText } from "../../lib/copy-text"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassMenuSectionGap,
  GlassSheetHandle,
} from "../theme/GlassActionSheetMenu"

/** Teams-style quick reactions — scroll for more; tap + for any emoji from the keyboard. */
export const MESSAGE_QUICK_REACTIONS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "👏",
  "🙏",
  "🔥",
  "🎉",
  "💯",
  "✅",
  "🤔",
  "👀",
  "💪",
  "🎯",
] as const

type Props = {
  visible: boolean
  message: ThreadMessage | null
  senderLabel?: string
  onClose: () => void
  onReact: (emoji: string) => void
  onReplyWithQuote: () => void
  onForward: () => void
  onMarkUnread: () => void
  onEdit?: (message: ThreadMessage) => void
  onUnsend?: (message: ThreadMessage) => void
  onDelete?: (message: ThreadMessage) => void
}

function AnimatedEmojiButton({
  emoji,
  index,
  visible,
  active,
  backgroundColor,
  borderColor,
  onPress,
}: {
  emoji: string
  index: number
  visible: boolean
  active: boolean
  backgroundColor: string
  borderColor: string
  onPress: (emoji: string) => void
}) {
  const scale = useSharedValue(0.72)
  const emojiLift = useSharedValue(0)
  const selectingRef = useRef(false)

  useEffect(() => {
    if (!visible) {
      cancelAnimation(scale)
      cancelAnimation(emojiLift)
      scale.value = 0.72
      emojiLift.value = 0
      selectingRef.current = false
      return
    }

    const loopDuration = 1300 + index * 55

    scale.value = withDelay(index * 36, withSpring(1, { damping: 12, stiffness: 220 }))
    emojiLift.value = withDelay(
      index * 36 + 160,
      withRepeat(
        withSequence(
          withTiming(-4, {
            duration: loopDuration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: loopDuration / 2,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      ),
    )
  }, [visible, index, scale, emojiLift])

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const glyphStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emojiLift.value }, { scale: 1 + Math.min(emojiLift.value * -0.04, 0.12) }],
  }))

  function handlePress() {
    if (selectingRef.current) return
    selectingRef.current = true
    onPress(emoji)
  }

  return (
    <Animated.View style={shellStyle}>
      <Pressable
        style={[styles.emojiButton, { backgroundColor, borderColor }]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`React with ${emoji}`}
      >
        <Animated.Text style={[styles.emoji, glyphStyle]}>{emoji}</Animated.Text>
      </Pressable>
    </Animated.View>
  )
}

function AnimatedAddEmojiButton({
  index,
  visible,
  active,
  backgroundColor,
  borderColor,
  iconColor,
  onPress,
}: {
  index: number
  visible: boolean
  active: boolean
  backgroundColor: string
  borderColor: string
  iconColor: string
  onPress: () => void
}) {
  const scale = useSharedValue(0.72)
  const pulse = useSharedValue(1)

  useEffect(() => {
    if (!visible) {
      cancelAnimation(scale)
      cancelAnimation(pulse)
      scale.value = 0.72
      pulse.value = 1
      return
    }

    scale.value = withDelay(index * 36, withSpring(1, { damping: 12, stiffness: 220 }))
    pulse.value = withDelay(
      index * 36 + 180,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    )
  }, [visible, index, scale, pulse])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulse.value }],
  }))

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.emojiButton,
          styles.addEmojiButton,
          { backgroundColor, borderColor },
          active ? styles.addEmojiButtonActive : null,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Choose another emoji from keyboard"
      >
        <Ionicons name="add" size={24} color={iconColor} />
      </Pressable>
    </Animated.View>
  )
}

export function MessageActionSheet({
  visible,
  message,
  senderLabel,
  onClose,
  onReact,
  onReplyWithQuote,
  onForward,
  onMarkUnread,
  onEdit,
  onUnsend,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets()
  const chrome = useShellChrome()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const emojiInputRef = useRef<TextInput>(null)
  const focusTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const didAutoFocusRef = useRef(false)
  const [customEmojiDraft, setCustomEmojiDraft] = useState("")
  const [customEmojiOpen, setCustomEmojiOpen] = useState(false)

  const focusEmojiInput = useCallback(() => {
    focusTimersRef.current.forEach(clearTimeout)
    focusTimersRef.current = []

    const attemptFocus = () => emojiInputRef.current?.focus()

    attemptFocus()
    focusTimersRef.current.push(setTimeout(attemptFocus, 80))
    focusTimersRef.current.push(setTimeout(attemptFocus, Platform.OS === "ios" ? 260 : 120))
    focusTimersRef.current.push(setTimeout(attemptFocus, Platform.OS === "ios" ? 480 : 220))
  }, [])

  useEffect(() => {
    if (!visible) {
      setCustomEmojiOpen(false)
      setCustomEmojiDraft("")
      didAutoFocusRef.current = false
      Keyboard.dismiss()
    }
  }, [visible])

  useEffect(() => {
    if (!customEmojiOpen) didAutoFocusRef.current = false
  }, [customEmojiOpen])

  useEffect(() => {
    return () => {
      focusTimersRef.current.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (!customEmojiOpen) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (!cancelled) focusEmojiInput()
      }, Platform.OS === "ios" ? 180 : 60)
    })

    return () => {
      cancelled = true
      task.cancel()
      if (timer) clearTimeout(timer)
    }
  }, [customEmojiOpen, focusEmojiInput])

  const plainBody = message ? stripMessageHtml(message.body) || message.body.trim() : ""
  const canEdit = Boolean(
    message &&
      onEdit &&
      !message.unsent &&
      !parseCourseImportFromMessage(message.body) &&
      canEditMessage({
        createdAt: message.createdAt,
        isMine: message.isMine,
        unsent: message.unsent,
        hasAttachments: message.attachments.length > 0,
        canEdit: message.canEdit,
      }),
  )
  const canUnsend = Boolean(
    message &&
      onUnsend &&
      !message.unsent &&
      !parseCourseImportFromMessage(message.body) &&
      canUnsendMessage({
        createdAt: message.createdAt,
        isMine: message.isMine,
        unsent: message.unsent,
        hasAttachments: message.attachments.length > 0,
        canUnsend: message.canUnsend,
      }),
  )
  const canDelete = Boolean(message && onDelete && (!message.isMine || !canUnsend))

  async function handleCopy() {
    if (!plainBody) return
    onClose()
    await copyText(plainBody)
  }

  function handleReact(emoji: string) {
    onClose()
    onReact(normalizeReactionEmoji(emoji))
  }

  function handleReplyWithQuote() {
    onClose()
    onReplyWithQuote()
  }

  function handleForward() {
    onClose()
    onForward()
  }

  function handleMarkUnread() {
    onClose()
    onMarkUnread()
  }

  function handleEdit() {
    if (!message) return
    const target = message
    onClose()
    onEdit?.(target)
  }

  function handleUnsend() {
    if (!message) return
    const target = message
    onClose()
    onUnsend?.(target)
  }

  function handleDelete() {
    if (!message) return
    const target = message
    onClose()
    onDelete?.(target)
  }

  function openCustomEmojiPicker() {
    setCustomEmojiDraft("")
    setCustomEmojiOpen(true)
    requestAnimationFrame(() => focusEmojiInput())
  }

  function closeCustomEmojiPicker() {
    setCustomEmojiOpen(false)
    setCustomEmojiDraft("")
    Keyboard.dismiss()
  }

  function handleCustomEmojiChange(text: string) {
    setCustomEmojiDraft(text)
    const emoji = extractLastEmoji(text)
    if (!emoji) return
    setCustomEmojiOpen(false)
    setCustomEmojiDraft("")
    Keyboard.dismiss()
    handleReact(emoji)
  }

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      keyboardAvoiding={customEmojiOpen}
      accessibilityLabel="Close message actions"
      sheetHostStyle={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <GlassSheetBackground style={styles.sheet}>
        <GlassSheetHandle />

        <Animated.Text
          entering={FadeIn.duration(180)}
          style={[type.caption, styles.sectionLabel, { color: chrome.secondaryLabel }]}
        >
          React
        </Animated.Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiRow}
          keyboardShouldPersistTaps="handled"
        >
          {MESSAGE_QUICK_REACTIONS.map((emoji, index) => {
            const active = Boolean(
              message?.reactions.some((r) => r.emoji === emoji && r.reactedByMe),
            )
            return (
              <AnimatedEmojiButton
                key={emoji}
                emoji={emoji}
                index={index}
                visible={visible}
                active={active}
                backgroundColor={active ? tokens.accentSoft : native.secondaryGrouped}
                borderColor={active ? tokens.accentBorder : native.separator}
                onPress={handleReact}
              />
            )
          })}

          <AnimatedAddEmojiButton
            index={MESSAGE_QUICK_REACTIONS.length}
            visible={visible}
            active={customEmojiOpen}
            backgroundColor={customEmojiOpen ? tokens.accentSoft : native.secondaryGrouped}
            borderColor={customEmojiOpen ? tokens.accentBorder : native.separator}
            iconColor={chrome.label}
            onPress={openCustomEmojiPicker}
          />
        </ScrollView>

        {customEmojiOpen ? (
          <Pressable
            onPress={focusEmojiInput}
            style={[
              styles.emojiCaptureRow,
              { backgroundColor: native.fill, borderColor: native.separator },
            ]}
          >
            <View style={styles.emojiCaptureHead}>
              <Text style={[type.caption, { color: chrome.secondaryLabel, flex: 1 }]}>
                {Platform.OS === "ios"
                  ? "Tap the emoji key on your keyboard, then pick a reaction."
                  : "Open the emoji keyboard and pick a reaction."}
              </Text>
              <Pressable onPress={closeCustomEmojiPicker} hitSlop={8} accessibilityRole="button">
                <Text style={[type.caption, { color: tokens.accent, fontWeight: "600" }]}>Cancel</Text>
              </Pressable>
            </View>
            <TextInput
              ref={emojiInputRef}
              value={customEmojiDraft}
              onChangeText={handleCustomEmojiChange}
              onLayout={() => {
                if (didAutoFocusRef.current) return
                didAutoFocusRef.current = true
                focusEmojiInput()
              }}
              style={[
                styles.emojiCaptureInput,
                {
                  color: native.label,
                  backgroundColor: native.secondaryGrouped,
                  borderColor: native.separator,
                },
              ]}
              placeholder="Choose emoji…"
              placeholderTextColor={native.tertiaryLabel}
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              showSoftInputOnFocus
              keyboardType="default"
              returnKeyType="done"
              blurOnSubmit={false}
              caretHidden={customEmojiDraft.length === 0}
              accessibilityLabel="Choose emoji from keyboard"
            />
          </Pressable>
        ) : null}

        <GlassMenuSectionGap />

        <Animated.Text
          entering={FadeIn.delay(120).duration(180)}
          style={[type.caption, styles.sectionLabel, { color: chrome.secondaryLabel }]}
        >
          Actions
        </Animated.Text>
        <GlassMenuList>
          <GlassMenuRow icon="copy-outline" label="Copy" onPress={() => void handleCopy()} showSeparator />
          <GlassMenuRow
            icon="return-down-back-outline"
            label="Reply with quote"
            onPress={handleReplyWithQuote}
            showSeparator
          />
          <GlassMenuRow icon="arrow-redo-outline" label="Forward" onPress={handleForward} showSeparator />
          {canEdit ? (
            <GlassMenuRow icon="create-outline" label="Edit" onPress={handleEdit} showSeparator />
          ) : null}
          {canUnsend ? (
            <GlassMenuRow
              icon="arrow-undo-outline"
              label="Undo Send"
              onPress={handleUnsend}
              destructive
              showSeparator
            />
          ) : null}
          <GlassMenuRow
            icon="mail-unread-outline"
            label="Mark as unread"
            onPress={handleMarkUnread}
            showSeparator={canDelete}
          />
          {canDelete ? (
            <GlassMenuRow icon="trash-outline" label="Delete" onPress={handleDelete} destructive />
          ) : null}
        </GlassMenuList>

        {senderLabel && plainBody ? (
          <Animated.View
            entering={FadeIn.delay(160).duration(200)}
            style={[styles.preview, { backgroundColor: native.fill, borderColor: native.separator }]}
          >
            <Text style={[type.caption, { color: chrome.secondaryLabel }]} numberOfLines={1}>
              {senderLabel}
            </Text>
            <Text style={[type.secondary, { color: chrome.label }]} numberOfLines={2}>
              {plainBody}
            </Text>
          </Animated.View>
        ) : null}
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

export function buildQuotedReply(senderName: string, body: string): string {
  const text = stripMessageHtml(body) || body.trim()
  const lines = text.split("\n").map((line) => `> ${line}`)
  return `${lines.join("\n")}\n\n`
}

export function buildForwardedMessage(message: ThreadMessage): string {
  const text = stripMessageHtml(message.body) || message.body.trim()
  const when = formatMessageWhen(message.createdAt)
  const header = [
    "---------- Forwarded message ----------",
    `From: ${message.senderName}`,
    when ? `Sent: ${when}` : null,
    "",
    text,
    "",
  ]
    .filter((line): line is string => line != null)
    .join("\n")
  return header
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 4,
  },
  sectionLabel: {
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    fontSize: 11,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addEmojiButton: {
    borderStyle: "dashed",
  },
  addEmojiButtonActive: {
    borderStyle: "solid",
  },
  emoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  emojiCaptureRow: {
    marginTop: 4,
    marginHorizontal: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  emojiCaptureHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emojiCaptureInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 28,
    lineHeight: 32,
  },
  preview: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
})
