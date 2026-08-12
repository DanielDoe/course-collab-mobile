import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ActivityIndicator, Animated, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { ScrollView, Swipeable } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { countExchanges, isThreadAtExchangeLimit, type AiTutorChatThread } from "../../lib/ai-tutor-chat-storage"
import { formatRelativeTime } from "../../lib/collaboration-api"

const SWIPE_ACTION_WIDTH = 68
const SWIPE_ACTION_GAP = 6
const SWIPE_TRAY_PADDING = 8

/** Subtle tray tint — lighter than page canvas, just enough to separate from the white row. */
function swipeTrayBackground(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "#f6f7f9"
}

type SwipeActionTone = "blue" | "orange" | "green" | "red"

type Props = {
  historyLoading?: boolean
  historySyncing?: boolean
  threads: AiTutorChatThread[]
  archivedThreads: AiTutorChatThread[]
  maxExchanges: number
  onNewConversation: () => void
  onOpenThread: (thread: AiTutorChatThread) => void
  onRenameThread: (threadId: string, title: string) => void
  onArchiveThread: (threadId: string) => void
  onRestoreThread: (threadId: string) => void
  onPermanentlyDeleteThread: (threadId: string) => void
}

function ThreadRowContent({
  thread,
  maxExchanges,
}: {
  thread: AiTutorChatThread
  maxExchanges: number
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const exchanges = countExchanges(thread.messages)
  const atLimit = isThreadAtExchangeLimit(thread.messages, maxExchanges)

  return (
    <>
      <View style={[styles.threadIcon, { backgroundColor: SN.accentSoft }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={SN.accent} />
      </View>
      <View style={styles.threadCopy}>
        <Text style={[type.bodyEmphasis, styles.threadTitle]} numberOfLines={1}>
          {thread.title}
        </Text>
        <Text style={[type.caption, { color: SN.secondaryLabel }]} numberOfLines={1}>
          {thread.preview}
        </Text>
        <Text style={[type.caption, styles.threadMeta, { color: native.tertiaryLabel }]}>
          {exchanges}/{maxExchanges} exchanges · {formatRelativeTime(thread.updatedAt)}
          {atLimit ? " · Full" : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.rowChevron} />
    </>
  )
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

function SwipeableThreadRow({
  thread,
  maxExchanges,
  isLast,
  variant,
  onPress,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}: {
  thread: AiTutorChatThread
  maxExchanges: number
  isLast: boolean
  variant: "active" | "archived"
  onPress: () => void
  onRename: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onSwipeOpen: (ref: Swipeable) => void
  onSwipeClose: (ref: Swipeable) => void
}) {
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
        style={({ pressed }) => [
          styles.threadRow,
          { backgroundColor: native.secondaryGrouped },
          !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
          Platform.OS === "ios" && pressed && { opacity: NATIVE.pressedOpacity },
        ]}
      >
        <ThreadRowContent thread={thread} maxExchanges={maxExchanges} />
      </Pressable>
    </Swipeable>
  )
}

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

export function CoraWorkspaceTab({
  historyLoading = false,
  historySyncing = false,
  threads,
  archivedThreads,
  maxExchanges,
  onNewConversation,
  onOpenThread,
  onRenameThread,
  onArchiveThread,
  onRestoreThread,
  onPermanentlyDeleteThread,
}: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const openSwipeRef = useRef<Swipeable | null>(null)
  const [renameTarget, setRenameTarget] = useState<AiTutorChatThread | null>(null)

  const closeOpenSwipe = useCallback(() => {
    openSwipeRef.current?.close()
    openSwipeRef.current = null
  }, [])

  const handleSwipeOpen = useCallback(
    (ref: Swipeable) => {
      if (openSwipeRef.current && openSwipeRef.current !== ref) {
        openSwipeRef.current.close()
      }
      openSwipeRef.current = ref
    },
    [],
  )

  const handleSwipeClose = useCallback((ref: Swipeable) => {
    if (openSwipeRef.current === ref) {
      openSwipeRef.current = null
    }
  }, [])

  const confirmArchive = (thread: AiTutorChatThread) => {
    AppAlert.alert("Move to Archived?", `"${thread.title}" will move to Archived. You can restore it later.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: () => onArchiveThread(thread.id) },
    ])
  }

  const confirmPermanentDelete = (thread: AiTutorChatThread) => {
    AppAlert.alert(
      "Delete permanently?",
      `"${thread.title}" will be removed forever. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onPermanentlyDeleteThread(thread.id) },
      ],
    )
  }

  const openRename = (thread: AiTutorChatThread) => {
    setRenameTarget(thread)
  }

  let historyBody: ReactNode = null

  if (historyLoading && threads.length === 0) {
    historyBody = (
      <View style={styles.historyLoading}>
        <ActivityIndicator color={SN.accent} />
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading chat history…</Text>
      </View>
    )
  } else if (threads.length === 0) {
    historyBody = (
      <View style={[styles.emptyCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        <View style={[styles.emptyIcon, { backgroundColor: SN.accentSoft }]}>
          <Ionicons name="chatbubbles-outline" size={24} color={SN.accent} />
        </View>
        <Text style={[type.bodyEmphasis, styles.emptyTitle]}>No conversations yet</Text>
        <Text style={[type.caption, styles.emptyBody, { color: SN.secondaryLabel }]}>
          Start a new conversation — Cora saves each chat to your account automatically.
        </Text>
      </View>
    )
  } else {
    historyBody = (
      <>
        {historySyncing ? (
          <View style={styles.historySyncRow}>
            <ActivityIndicator size="small" color={SN.accent} />
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>Updating conversations…</Text>
          </View>
        ) : null}
        <View style={[styles.threadGroup, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Text style={[type.caption, styles.groupLabel, { color: SN.secondaryLabel }]}>Chat History</Text>
          {threads.map((thread, index) => (
            <SwipeableThreadRow
              key={thread.id}
              thread={thread}
              maxExchanges={maxExchanges}
              isLast={index === threads.length - 1}
              variant="active"
              onPress={() => {
                closeOpenSwipe()
                onOpenThread(thread)
              }}
              onRename={() => openRename(thread)}
              onArchive={() => confirmArchive(thread)}
              onRestore={() => onRestoreThread(thread.id)}
              onDelete={() => confirmPermanentDelete(thread)}
              onSwipeOpen={handleSwipeOpen}
              onSwipeClose={handleSwipeClose}
            />
          ))}
        </View>
      </>
    )
  }

  return (
    <>
      <ScrollView
        style={styles.hubScroll}
        contentContainerStyle={styles.hubContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={closeOpenSwipe}
      >
        <Pressable
          onPress={onNewConversation}
          style={({ pressed }) => [styles.newCtaWrap, pressed && { opacity: NATIVE.pressedOpacity }]}
          accessibilityRole="button"
          accessibilityLabel="New conversation"
        >
          <View style={[styles.newCta, { backgroundColor: SN.accent }]}>
            <Ionicons name="add" size={22} color="#ffffff" />
            <Text style={styles.newCtaText}>New conversation</Text>
          </View>
        </Pressable>

        {historyBody}

        {!historyLoading && archivedThreads.length > 0 ? (
          <View style={[styles.threadGroup, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            <Text style={[type.caption, styles.groupLabel, { color: SN.secondaryLabel }]}>Archived</Text>
            <Text style={[type.caption, styles.archivedHint, { color: SN.secondaryLabel }]}>
              Deleted chats stay here until you restore or delete them permanently.
            </Text>
            {archivedThreads.map((thread, index) => (
              <SwipeableThreadRow
                key={thread.id}
                thread={thread}
                maxExchanges={maxExchanges}
                isLast={index === archivedThreads.length - 1}
                variant="archived"
                onPress={() => {
                  closeOpenSwipe()
                  onOpenThread(thread)
                }}
                onRename={() => openRename(thread)}
                onArchive={() => confirmArchive(thread)}
                onRestore={() => onRestoreThread(thread.id)}
                onDelete={() => confirmPermanentDelete(thread)}
                onSwipeOpen={handleSwipeOpen}
                onSwipeClose={handleSwipeClose}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

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

const styles = StyleSheet.create({
  hubScroll: { flex: 1 },
  hubContent: {
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  newCtaWrap: { alignSelf: "stretch" },
  newCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
  historyLoading: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 28,
  },
  historySyncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  newCtaText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
  emptyCard: {
    alignItems: "center",
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17 },
  emptyBody: { textAlign: "center", lineHeight: 20 },
  threadGroup: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  archivedHint: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    lineHeight: 18,
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  threadIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  threadCopy: { flex: 1, gap: 2, minWidth: 0 },
  threadTitle: { fontSize: 15 },
  threadMeta: { fontSize: 11, marginTop: 2 },
  rowChevron: {
    flexShrink: 0,
    marginLeft: 2,
    opacity: 0.72,
  },
  swipeActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderLeftWidth: StyleSheet.hairlineWidth,
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
  renameBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  renameCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  renameTitle: { fontSize: 17 },
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
