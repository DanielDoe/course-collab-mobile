import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Swipeable } from "react-native-gesture-handler"
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { formatRelativeTime } from "../../lib/collaboration-api"
import { useCoraHistoryPanelWidth } from "../../lib/responsive-layout"
import { CoraBrand } from "./CoraBrand"

const DRAWER_MS = 240

const SWIPE_ACTION_WIDTH = 68
const SWIPE_ACTION_GAP = 6
const SWIPE_TRAY_PADDING = 8

export type CoraHistoryCapabilityBadge = {
  label: string
}

export type CoraHistoryThreadItem = {
  id: string
  title: string
  preview: string
  updatedAt: string
  capabilityBadge?: CoraHistoryCapabilityBadge
}

type SwipeActionTone = "blue" | "orange" | "green" | "red"

type Props = {
  visible: boolean
  threads: CoraHistoryThreadItem[]
  archivedThreads?: CoraHistoryThreadItem[]
  activeThreadId: string | null
  historyLoading?: boolean
  historySyncing?: boolean
  onClose: () => void
  onNewChat: () => void
  onOpenThread: (thread: CoraHistoryThreadItem) => void
  onRenameThread: (threadId: string, title: string) => void
  onArchiveThread: (threadId: string) => void
  onRestoreThread?: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
  threadMeta?: (thread: CoraHistoryThreadItem) => string | undefined
}

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

const SwipeableHistoryRow = memo(function SwipeableHistoryRow({
  thread,
  isActive,
  isLast,
  variant,
  meta,
  onPress,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: {
  thread: CoraHistoryThreadItem
  isActive: boolean
  isLast: boolean
  variant: "active" | "archived"
  meta?: string
  onPress: () => void
  onRename: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onSwipeOpen: (ref: Swipeable) => void
  onSwipeClose: (ref: Swipeable) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const badgeTheme = {
    soft: SN.accentSoft,
    color: SN.accent,
  }
  const swipeRef = useRef<Swipeable>(null)
  const trayBackground = swipeTrayBackground(tokens.isDark)
  const rowBg = isActive
    ? hexToRgba(SN.accent, tokens.isDark ? 0.14 : 0.08)
    : native.secondaryGrouped
  const iconBg = isActive ? SN.accentSoft : hexToRgba(native.secondaryLabel, 0.1)

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
            onRename()
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
    [closeSwipe, native.separator, onArchive, onDelete, onRename, onRestore, trayBackground, variant],
  )

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      overshootRight={false}
      containerStyle={{ backgroundColor: trayBackground }}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (swipeRef.current) onSwipeOpen(swipeRef.current)
      }}
      onSwipeableClose={() => {
        if (swipeRef.current) onSwipeClose(swipeRef.current)
      }}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{ color: hexToRgba(NATIVE.label, 0.08) }}
        style={({ pressed }) => [Platform.OS === "ios" && pressed && { opacity: NATIVE.pressedOpacity }]}
      >
        <View
          style={[
            styles.threadRow,
            { backgroundColor: rowBg },
            !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
          ]}
        >
          {isActive ? (
            <View style={[styles.activeStripe, { backgroundColor: SN.accent }]} />
          ) : null}
          <View style={[styles.threadIcon, { backgroundColor: iconBg }]}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={isActive ? SN.accent : native.secondaryLabel}
            />
          </View>
          <View style={styles.threadCopy}>
            <View style={styles.threadTitleRow}>
              <Text style={[type.bodyEmphasis, styles.threadTitle]} numberOfLines={1}>
                {thread.title}
              </Text>
              {thread.capabilityBadge ? (
                <View style={[styles.capabilityBadge, { backgroundColor: badgeTheme.soft }]}>
                  <Text style={[styles.capabilityBadgeText, { color: badgeTheme.color }]}>
                    {thread.capabilityBadge.label}
                  </Text>
                </View>
              ) : null}
              {isActive ? (
                <View style={[styles.activeBadge, { backgroundColor: SN.accentSoft }]}>
                  <Text style={[styles.activeBadgeText, { color: SN.accent }]}>Current</Text>
                </View>
              ) : null}
            </View>
            <Text style={[type.caption, { color: SN.secondaryLabel }]} numberOfLines={1}>
              {thread.preview}
            </Text>
            <Text style={[type.caption, styles.threadMeta, { color: native.tertiaryLabel }]}>
              {meta ?? formatRelativeTime(thread.updatedAt)}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={isActive ? SN.accent : native.tertiaryLabel}
            style={styles.rowChevron}
          />
        </View>
      </Pressable>
    </Swipeable>
  )
}, (prev, next) =>
  prev.thread.id === next.thread.id &&
  prev.isActive === next.isActive &&
  prev.isLast === next.isLast &&
  prev.variant === next.variant &&
  prev.meta === next.meta &&
  prev.thread.title === next.thread.title &&
  prev.thread.preview === next.thread.preview)

function RenameThreadModal({
  visible,
  initialTitle,
  onCancel,
  onSave,
}: {
  visible: boolean
  initialTitle: string
  onCancel: () => void
  onSave: (title: string) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [draft, setDraft] = useState(initialTitle)

  useEffect(() => {
    if (visible) setDraft(initialTitle)
  }, [visible, initialTitle])

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={styles.renameBackdrop} onPress={onCancel}>
        <Pressable
          style={[styles.renameCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[type.bodyEmphasis, styles.renameTitle]}>Rename conversation</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Chat title"
            placeholderTextColor={native.tertiaryLabel}
            autoFocus
            selectTextOnFocus
            maxLength={120}
            style={[
              styles.renameInput,
              {
                color: native.label,
                borderColor: native.separator,
                backgroundColor: native.groupedBackground,
              },
            ]}
            onSubmitEditing={() => onSave(draft.trim())}
          />
          <View style={styles.renameActions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.renameBtn, pressed && { opacity: NATIVE.pressedOpacity }]}
            >
              <Text style={[type.body, { color: SN.secondaryLabel }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(draft.trim())}
              style={({ pressed }) => [styles.renameBtn, pressed && { opacity: NATIVE.pressedOpacity }]}
            >
              <Text style={[type.bodyEmphasis, { color: SN.accent }]}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function CoraChatSideNav({
  visible,
  threads,
  archivedThreads = [],
  activeThreadId,
  historyLoading = false,
  historySyncing = false,
  onClose,
  onNewChat,
  onOpenThread,
  onRenameThread,
  onArchiveThread,
  onRestoreThread,
  onDeleteThread,
  threadMeta,
}: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const panelWidth = useCoraHistoryPanelWidth()
  const openSwipeRef = useRef<Swipeable | null>(null)
  const [renameTarget, setRenameTarget] = useState<CoraHistoryThreadItem | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const backdropOpacity = useSharedValue(0)
  const panelTranslateX = useSharedValue(-panelWidth)

  const finishClose = useCallback(() => setModalVisible(false), [])

  useEffect(() => {
    if (visible) {
      setModalVisible(true)
      backdropOpacity.value = withTiming(1, { duration: DRAWER_MS })
      panelTranslateX.value = withTiming(0, {
        duration: DRAWER_MS,
        easing: Easing.out(Easing.quad),
      })
      return
    }

    backdropOpacity.value = withTiming(0, { duration: DRAWER_MS })
    panelTranslateX.value = withTiming(
      -panelWidth,
      { duration: DRAWER_MS, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(finishClose)()
      },
    )
  }, [visible, panelWidth, backdropOpacity, panelTranslateX, finishClose])

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panelTranslateX.value }],
  }))

  const closeOpenSwipe = useCallback(() => {
    openSwipeRef.current?.close()
    openSwipeRef.current = null
  }, [])

  const handleSwipeOpen = useCallback((ref: Swipeable) => {
    if (openSwipeRef.current && openSwipeRef.current !== ref) {
      openSwipeRef.current.close()
    }
    openSwipeRef.current = ref
  }, [])

  const handleSwipeClose = useCallback((ref: Swipeable) => {
    if (openSwipeRef.current === ref) {
      openSwipeRef.current = null
    }
  }, [])

  const confirmArchive = (thread: CoraHistoryThreadItem) => {
    AppAlert.alert("Move to Archived?", `"${thread.title}" will move to Archived. You can restore it later.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", onPress: () => onArchiveThread(thread.id) },
    ])
  }

  const confirmDelete = (thread: CoraHistoryThreadItem) => {
    AppAlert.alert("Delete chat?", `"${thread.title}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDeleteThread(thread.id) },
    ])
  }

  const openRename = (thread: CoraHistoryThreadItem) => {
    setRenameTarget(thread)
  }

  const handleOpenThread = (thread: CoraHistoryThreadItem) => {
    closeOpenSwipe()
    onOpenThread(thread)
    onClose()
  }

  const handleNewChat = () => {
    closeOpenSwipe()
    onClose()
    onNewChat()
  }

  if (!modalVisible && renameTarget == null) return null

  const panelBg = tokens.isDark ? native.groupedBackground : native.secondaryGrouped
  const newChatBg = tokens.isDark ? hexToRgba("#FFFFFF", 0.08) : hexToRgba("#3C3C43", 0.06)

  return (
    <>
      {modalVisible ? (
        <Modal visible transparent animationType="none" onRequestClose={onClose}>
          <View style={styles.overlayRoot}>
            <Reanimated.View style={[styles.backdrop, backdropStyle]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close chat menu" />
            </Reanimated.View>

            <Reanimated.View
              style={[
                styles.panel,
                panelStyle,
                {
                  width: panelWidth,
                  backgroundColor: panelBg,
                  paddingTop: insets.top + 8,
                  paddingBottom: insets.bottom + 12,
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <CoraBrand size="sm" />
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={({ pressed }) => [styles.panelClose, pressed && { opacity: NATIVE.pressedOpacity }]}
                  accessibilityRole="button"
                  accessibilityLabel="Close chat menu"
                >
                  <Ionicons name="close" size={22} color={native.secondaryLabel} />
                </Pressable>
              </View>

              <Pressable
                onPress={handleNewChat}
                style={({ pressed }) => [
                  styles.newChatPill,
                  { backgroundColor: newChatBg, borderColor: native.separator },
                  pressed && { opacity: NATIVE.pressedOpacity },
                ]}
                accessibilityRole="button"
                accessibilityLabel="New chat"
              >
                <Ionicons name="create-outline" size={18} color={native.label} />
                <Text style={[type.bodyEmphasis, { color: native.label }]}>New chat</Text>
              </Pressable>

              <ScrollView
                style={styles.panelScroll}
                contentContainerStyle={styles.panelScrollContent}
                keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Chat history</Text>

                {historyLoading && threads.length === 0 && archivedThreads.length === 0 ? (
                  <View style={styles.historyLoading}>
                    <ActivityIndicator color={native.label} />
                    <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center", lineHeight: 18 }]}>
                      Loading your conversations…
                    </Text>
                  </View>
                ) : null}

                {historySyncing && (threads.length > 0 || archivedThreads.length > 0) ? (
                  <View style={styles.historySyncRow}>
                    <ActivityIndicator size="small" color={native.secondaryLabel} />
                    <Text style={[type.caption, { color: native.secondaryLabel }]}>Updating…</Text>
                  </View>
                ) : null}

                {!historyLoading && threads.length === 0 && archivedThreads.length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <Ionicons name="chatbubbles-outline" size={22} color={native.tertiaryLabel} />
                    <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center", lineHeight: 18 }]}>
                      Previous chats appear here after you send messages.
                    </Text>
                  </View>
                ) : null}

                {threads.length > 0 ? (
                  <View style={[styles.threadGroup, { backgroundColor: native.groupedBackground }]}>
                    {threads.map((thread, index) => (
                      <SwipeableHistoryRow
                        key={thread.id}
                        thread={thread}
                        isActive={thread.id === activeThreadId}
                        isLast={index === threads.length - 1}
                        variant="active"
                        meta={threadMeta?.(thread)}
                        onPress={() => handleOpenThread(thread)}
                        onRename={() => openRename(thread)}
                        onArchive={() => confirmArchive(thread)}
                        onRestore={() => onRestoreThread?.(thread.id)}
                        onDelete={() => confirmDelete(thread)}
                        onSwipeOpen={handleSwipeOpen}
                        onSwipeClose={handleSwipeClose}
                      />
                    ))}
                  </View>
                ) : null}

                {archivedThreads.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Archived</Text>
                    <View style={[styles.threadGroup, { backgroundColor: native.groupedBackground }]}>
                      {archivedThreads.map((thread, index) => (
                        <SwipeableHistoryRow
                          key={thread.id}
                          thread={thread}
                          isActive={false}
                          isLast={index === archivedThreads.length - 1}
                          variant="archived"
                          meta={threadMeta?.(thread)}
                          onPress={() => handleOpenThread(thread)}
                          onRename={() => openRename(thread)}
                          onArchive={() => confirmArchive(thread)}
                          onRestore={() => onRestoreThread?.(thread.id)}
                          onDelete={() => confirmDelete(thread)}
                          onSwipeOpen={handleSwipeOpen}
                          onSwipeClose={handleSwipeClose}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                {(threads.length > 0 || archivedThreads.length > 0) && (
                  <Text style={[type.caption, styles.footerHint, { color: native.secondaryLabel }]}>
                    Swipe left on a chat for edit, archive, or delete.
                  </Text>
                )}
              </ScrollView>
            </Reanimated.View>
          </View>
        </Modal>
      ) : null}

      <RenameThreadModal
        visible={renameTarget != null}
        initialTitle={renameTarget?.title ?? ""}
        onCancel={() => setRenameTarget(null)}
        onSave={(title) => {
          if (renameTarget && title) {
            onRenameThread(renameTarget.id, title)
          }
          setRenameTarget(null)
        }}
      />
    </>
  )
}

/** @deprecated Use CoraChatSideNav */
export const CoraChatHistorySheet = CoraChatSideNav

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: NATIVE.pagePadding,
    paddingBottom: 12,
  },
  panelClose: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  newChatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: NATIVE.pagePadding,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  panelScroll: {
    flex: 1,
  },
  panelScrollContent: {
    paddingHorizontal: NATIVE.pagePadding,
    gap: 10,
    paddingBottom: 16,
  },
  emptyHistory: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  historyLoading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  historySyncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    textTransform: "none",
    fontWeight: "600",
  },
  threadGroup: {
    borderRadius: 16,
    overflow: "hidden",
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "relative",
    overflow: "hidden",
  },
  activeStripe: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 999,
  },
  threadIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  threadCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  threadTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  threadTitle: {
    flexShrink: 1,
  },
  capabilityBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: "100%",
  },
  capabilityBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  threadMeta: {
    marginTop: 2,
  },
  rowChevron: {
    marginLeft: 4,
  },
  activeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  swipeActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  swipeAction: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  swipeActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeActionLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  footerHint: {
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  renameCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 12,
  },
  renameTitle: {
    textAlign: "center",
  },
  renameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 4,
  },
  renameBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
})
