import { useCallback, useRef } from "react"
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Swipeable } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { SignatureListCard } from "../theme/SignatureListCard"

const SWIPE_ACTION_WIDTH = 68
const SWIPE_ACTION_GAP = 6
const SWIPE_TRAY_PADDING = 8

type SwipeActionTone = "blue" | "orange" | "green" | "red"

function swipeTrayBackground(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "#f6f7f9"
}

function SwipeActionButton({
  label,
  icon,
  tone,
  onPress,
  progress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tone: SwipeActionTone
  onPress: () => void
  progress: Animated.AnimatedInterpolation<number>
}) {
  const tokens = useAppThemeTokens()
  const palette = SYSTEM[tone]
  const iconWell = tokens.isDark ? hexToRgba(palette.color, 0.22) : palette.soft

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
    extrapolate: "clamp",
  })
  const opacity = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.72, 1],
    extrapolate: "clamp",
  })

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.swipeAction,
          { width: SWIPE_ACTION_WIDTH },
          pressed && { opacity: NATIVE.pressedOpacity },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[styles.swipeActionIcon, { backgroundColor: iconWell }]}>
          <Ionicons name={icon} size={18} color={palette.color} />
        </View>
        <Text style={[styles.swipeActionLabel, { color: palette.color }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

type Props = {
  index: number
  variant: "active" | "archived"
  title: string
  subtitle: string
  meta?: string
  statusLabel: string
  statusColor: string
  statusIcon: keyof typeof Ionicons.glyphMap
  accent: string
  onOpen: () => void
  onEdit: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onSwipeOpen: (ref: Swipeable) => void
  onSwipeClose: (ref: Swipeable) => void
}

export function NotetakerNoteSwipeRow({
  index,
  variant,
  title,
  subtitle,
  meta,
  statusLabel,
  statusColor,
  statusIcon,
  accent,
  onOpen,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const swipeRef = useRef<Swipeable>(null)
  const trayBackground = swipeTrayBackground(tokens.isDark)

  const closeSwipe = useCallback(() => {
    swipeRef.current?.close()
  }, [])

  const renderRightActions = useCallback(
    (
      progress: Animated.AnimatedInterpolation<number>,
      _dragX: Animated.AnimatedInterpolation<number>,
    ) => (
      <View
        style={[
          styles.swipeActionsRow,
          {
            backgroundColor: trayBackground,
            borderLeftColor: native.separator,
            paddingLeft: SWIPE_TRAY_PADDING,
            paddingRight: SWIPE_TRAY_PADDING,
            gap: SWIPE_ACTION_GAP,
          },
        ]}
      >
        <SwipeActionButton
          label="Edit"
          icon="pencil-outline"
          tone="blue"
          progress={progress}
          onPress={() => {
            closeSwipe()
            onEdit()
          }}
        />
        {variant === "active" ? (
          <SwipeActionButton
            label="Archive"
            icon="archive-outline"
            tone="orange"
            progress={progress}
            onPress={() => {
              closeSwipe()
              onArchive()
            }}
          />
        ) : (
          <SwipeActionButton
            label="Restore"
            icon="arrow-undo-outline"
            tone="green"
            progress={progress}
            onPress={() => {
              closeSwipe()
              onRestore()
            }}
          />
        )}
        <SwipeActionButton
          label="Delete"
          icon="trash-outline"
          tone="red"
          progress={progress}
          onPress={() => {
            closeSwipe()
            onDelete()
          }}
        />
      </View>
    ),
    [closeSwipe, native.separator, onArchive, onDelete, onEdit, onRestore, trayBackground, variant],
  )

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      overshootRight={false}
      containerStyle={{ backgroundColor: trayBackground, borderRadius: 16 }}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (swipeRef.current) onSwipeOpen(swipeRef.current)
      }}
      onSwipeableClose={() => {
        if (swipeRef.current) onSwipeClose(swipeRef.current)
      }}
    >
      <View
        style={[
          styles.rowShell,
          Platform.OS === "android" && { backgroundColor: native.secondaryGrouped },
        ]}
      >
        <SignatureListCard
          index={index}
          title={title}
          subtitle={subtitle}
          meta={meta}
          statusLabel={statusLabel}
          statusColor={statusColor}
          statusIcon={statusIcon}
          icon="document-text-outline"
          accent={accent}
          onPress={onOpen}
        />
      </View>
    </Swipeable>
  )
}

const styles = StyleSheet.create({
  rowShell: {
    borderRadius: 16,
    overflow: "hidden",
  },
  swipeActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderLeftWidth: StyleSheet.hairlineWidth,
    minHeight: 88,
  },
  swipeAction: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
  },
  swipeActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
})
