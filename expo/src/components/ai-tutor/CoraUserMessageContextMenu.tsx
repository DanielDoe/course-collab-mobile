import { useEffect, useMemo } from "react"
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutRectangle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { BlurView } from "expo-blur"
import * as Haptics from "expo-haptics"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import type { ChatMessage } from "../../lib/ai-tutor-api"
import {
  getUserPromptBubbleColors,
  getUserPromptBubbleRadius,
  getUserPromptBubbleShadow,
  getUserPromptBubbleBorderWidth,
} from "./cora-chat-bubble-theme"

export type CoraUserMessageMenuAction = "copy" | "edit" | "select-text" | "reattach-import"

export type UserMessageAnchor = LayoutRectangle & { pageX: number; pageY: number }

type Props = {
  visible: boolean
  message: ChatMessage | null
  anchor: UserMessageAnchor | null
  sentAt?: string
  onClose: () => void
  onAction: (action: CoraUserMessageMenuAction, message: ChatMessage) => void
}

const MENU_ITEMS: {
  id: CoraUserMessageMenuAction
  label: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  { id: "copy", label: "Copy", icon: "copy-outline" },
  { id: "edit", label: "Edit", icon: "pencil-outline" },
  { id: "select-text", label: "Select text", icon: "text-outline" },
]

function formatMessageTimestamp(iso?: string): string {
  const date = iso ? new Date(iso) : new Date()
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(undefined, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  })
}

const HORIZONTAL_INSET = 20
const PREVIEW_SCALE = 1.02
const MENU_GAP = 12
const TIMESTAMP_BLOCK_HEIGHT = 28
const MENU_ROW_HEIGHT = 40
const MENU_BOTTOM_PAD = 4

type MenuPlacement = "above" | "below"

function estimateMenuHeight(rowCount: number) {
  return TIMESTAMP_BLOCK_HEIGHT + rowCount * MENU_ROW_HEIGHT + MENU_BOTTOM_PAD
}

function resolveMenuPlacement({
  bubbleTop,
  bubbleBottom,
  menuHeight,
  windowHeight,
  safeTop,
  safeBottom,
}: {
  bubbleTop: number
  bubbleBottom: number
  menuHeight: number
  windowHeight: number
  safeTop: number
  safeBottom: number
}): { placement: MenuPlacement; menuTop: number } {
  const spaceBelow = windowHeight - safeBottom - bubbleBottom - MENU_GAP
  const spaceAbove = bubbleTop - safeTop - MENU_GAP
  const fitsBelow = spaceBelow >= menuHeight
  const fitsAbove = spaceAbove >= menuHeight

  if (fitsBelow && !fitsAbove) {
    return { placement: "below", menuTop: bubbleBottom + MENU_GAP }
  }
  if (fitsAbove && !fitsBelow) {
    return { placement: "above", menuTop: bubbleTop - menuHeight - MENU_GAP }
  }
  if (fitsBelow && fitsAbove) {
    if (spaceBelow >= spaceAbove) {
      return { placement: "below", menuTop: bubbleBottom + MENU_GAP }
    }
    return { placement: "above", menuTop: bubbleTop - menuHeight - MENU_GAP }
  }

  if (spaceBelow >= spaceAbove) {
    const menuTop = Math.min(
      bubbleBottom + MENU_GAP,
      windowHeight - safeBottom - menuHeight,
    )
    return { placement: "below", menuTop: Math.max(menuTop, safeTop) }
  }

  const menuTop = Math.max(bubbleTop - menuHeight - MENU_GAP, safeTop)
  return { placement: "above", menuTop }
}

export function CoraUserMessageContextMenu({ visible, message, anchor, sentAt, onClose, onAction }: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const backdrop = useSharedValue(0)
  const bubbleScale = useSharedValue(0.96)
  const menuOpacity = useSharedValue(0)
  const menuTranslate = useSharedValue(8)

  const menuItems = useMemo(() => {
    const items = [...MENU_ITEMS]
    if (message && !message.importedQuestion) {
      items.splice(1, 0, {
        id: "reattach-import",
        label: "Re-attach from course",
        icon: "library-outline",
      })
    }
    return items
  }, [message])

  const menuHeight = estimateMenuHeight(menuItems.length)
  const menuLayout = useMemo(() => {
    if (!anchor) return { placement: "below" as MenuPlacement, menuTop: 0 }
    return resolveMenuPlacement({
      bubbleTop: anchor.pageY,
      bubbleBottom: anchor.pageY + anchor.height,
      menuHeight,
      windowHeight,
      safeTop: insets.top,
      safeBottom: insets.bottom,
    })
  }, [anchor, menuHeight, windowHeight, insets.top, insets.bottom])

  useEffect(() => {
    const slideOffset = menuLayout.placement === "above" ? -8 : 8
    if (visible) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      backdrop.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
      bubbleScale.value = withSpring(PREVIEW_SCALE, { damping: 16, stiffness: 340 })
      menuOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
      menuTranslate.value = slideOffset
      menuTranslate.value = withSpring(0, { damping: 18, stiffness: 320 })
      return
    }
    backdrop.value = withTiming(0, { duration: 160 })
    bubbleScale.value = withTiming(0.96, { duration: 160 })
    menuOpacity.value = withTiming(0, { duration: 120 })
    menuTranslate.value = withTiming(slideOffset, { duration: 120 })
  }, [visible, backdrop, bubbleScale, menuOpacity, menuTranslate, menuLayout.placement])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }))

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }))

  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ translateY: menuTranslate.value }],
  }))

  if (!message || !anchor) return null

  const colors = getUserPromptBubbleColors(tokens.isDark, native)
  const bubbleShadow = getUserPromptBubbleShadow(tokens.isDark)
  const menuWidth = Math.min(220, windowWidth - HORIZONTAL_INSET * 2)
  const maxBubbleWidth = windowWidth - HORIZONTAL_INSET * 2
  const bubbleWidth = Math.min(Math.max(anchor.width, 0), maxBubbleWidth)
  const bubbleLeft = Math.min(
    Math.max(anchor.pageX, HORIZONTAL_INSET),
    windowWidth - bubbleWidth - HORIZONTAL_INSET,
  )
  const menuLeft = Math.min(
    Math.max(bubbleLeft + bubbleWidth - menuWidth, HORIZONTAL_INSET),
    windowWidth - menuWidth - HORIZONTAL_INSET,
  )
  const { menuTop } = menuLayout
  const previewText = message.content.trim()

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView
            intensity={tokens.isDark ? 48 : 36}
            tint={tokens.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: tokens.isDark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.18)" },
            ]}
          />
        </Animated.View>

        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss message menu" />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.previewBubble,
            bubbleStyle,
            bubbleShadow,
            {
              top: anchor.pageY,
              left: bubbleLeft,
              width: bubbleWidth,
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderWidth: getUserPromptBubbleBorderWidth(),
              borderRadius: getUserPromptBubbleRadius(),
            },
          ]}
        >
          <Text style={[type.body, styles.previewText, { color: colors.text }]}>
            {previewText}
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.menu,
            menuStyle,
            {
              top: menuTop,
              left: menuLeft,
              width: menuWidth,
              borderColor: native.separator,
              backgroundColor: tokens.isDark ? hexToRgba("#2c2c2e", 0.92) : hexToRgba("#ffffff", 0.88),
            },
          ]}
        >
          <BlurView
            intensity={tokens.isDark ? 40 : 28}
            tint={tokens.isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[type.caption, styles.timestamp, { color: native.secondaryLabel }]}>
            {formatMessageTimestamp(sentAt)}
          </Text>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                void Haptics.selectionAsync()
                onAction(item.id, message)
                onClose()
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon} size={17} color={native.label} />
              <Text style={[type.body, styles.rowLabel, { color: native.label }]}>{item.label}</Text>
            </Pressable>
          ))}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  previewBubble: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  previewText: {
    fontSize: 16,
    lineHeight: 24,
    flexShrink: 1,
  },
  menu: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
    paddingBottom: 4,
  },
  timestamp: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    textAlign: "center",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
  },
  rowPressed: {
    opacity: 0.55,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 20,
  },
})
