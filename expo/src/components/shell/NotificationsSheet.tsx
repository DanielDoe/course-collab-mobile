import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { resolveNotificationLink } from "../../lib/notification-link"
import {
  dismissNotification,
  fetchStudentNotifications,
  formatNotificationTime,
  markAllNotificationsRead,
  markNotificationRead,
  type StudentNotification,
} from "../../lib/student-notifications"
import { onNotificationsRefresh } from "../../lib/notifications/notification-events"
import { useAppThemeTokens, useShellChrome, useThemedNative } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import type { StudentAuthSession } from "../../lib/student-session-proof"

type Props = {
  session: StudentAuthSession
  notificationsOpen: boolean
  closeNotifications: () => void
  setNotificationCount: (count: number) => void
}

type Filter = "all" | "unread"

function useNotificationTypeIcons() {
  const tokens = useAppThemeTokens()
  return useMemo(() => {
    const accentIcon = { color: tokens.accent, bg: tokens.accentSoft }
    const warnIcon = { color: tokens.warning, bg: hexToRgba(tokens.warning, 0.12) }
    const dangerIcon = { color: tokens.danger, bg: hexToRgba(tokens.danger, 0.1) }
    return {
      quiz: { icon: "clipboard-outline" as const, ...accentIcon },
      homework: { icon: "book-outline" as const, ...accentIcon },
      exam: { icon: "school-outline" as const, ...dangerIcon },
      deadline: { icon: "alarm-outline" as const, ...warnIcon },
      announcement: { icon: "megaphone-outline" as const, ...accentIcon },
      forum: { icon: "chatbubbles-outline" as const, ...accentIcon },
      group: { icon: "people-outline" as const, ...accentIcon },
      project: { icon: "folder-open-outline" as const, ...accentIcon },
      practice: { icon: "fitness-outline" as const, ...accentIcon },
      ai_tutor: { icon: "sparkles-outline" as const, ...accentIcon },
      default: { icon: "notifications-outline" as const, color: tokens.accentDark, bg: tokens.accentSoft },
    }
  }, [tokens])
}

function NotificationRow({
  item,
  onPress,
  onDismiss,
  typeIcons,
}: {
  item: StudentNotification
  onPress: () => void
  onDismiss: () => void
  typeIcons: ReturnType<typeof useNotificationTypeIcons>
}) {
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const config = typeIcons[item.type as keyof typeof typeIcons] ?? typeIcons.default

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !item.is_read && { backgroundColor: tokens.accentSoftStrong },
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowHead}>
          <Text style={[styles.rowTitle, { color: chrome.label }]} numberOfLines={2}>
            {item.title}
          </Text>
          {!item.is_read ? (
            <View style={[styles.unreadDot, { backgroundColor: tokens.danger }]} />
          ) : null}
        </View>
        <Text style={[styles.rowMessage, { color: chrome.secondaryLabel }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.rowTime, { color: chrome.tertiaryLabel }]}>
          {formatNotificationTime(item.created_at)}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissBtnPressed]}
        onPress={(e) => {
          e.stopPropagation?.()
          onDismiss()
        }}
        hitSlop={8}
        accessibilityLabel="Dismiss notification"
      >
        <Ionicons name="close" size={16} color={chrome.tertiaryLabel} />
      </Pressable>
    </Pressable>
  )
}

export function NotificationsSheet({
  session,
  notificationsOpen,
  closeNotifications,
  setNotificationCount,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const chrome = useShellChrome()
  const native = useThemedNative()
  const typeIcons = useNotificationTypeIcons()
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<StudentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchStudentNotifications(session)
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
      setNotificationCount(result.unreadCount)
      if (result.throttled) {
        setTimeout(() => void load(), 1500)
      }
    } finally {
      setLoading(false)
    }
  }, [session, setNotificationCount])

  useEffect(() => {
    if (notificationsOpen) {
      void load()
    }
  }, [notificationsOpen, load])

  useEffect(() => onNotificationsRefresh(() => void load()), [load])

  const filtered = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications),
    [filter, notifications],
  )

  async function handleOpen(item: StudentNotification) {
    if (!item.is_read) {
      const ok = await markNotificationRead(session, item.id)
      if (ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
        )
        const nextUnread = Math.max(0, unreadCount - 1)
        setUnreadCount(nextUnread)
        setNotificationCount(nextUnread)
      }
    }

    closeNotifications()
    const route = resolveNotificationLink(item.link)
    if (route) router.push(route as never)
  }

  async function handleDismiss(item: StudentNotification) {
    const ok = await dismissNotification(session, item.id)
    if (!ok) return
    setNotifications((prev) => prev.filter((n) => n.id !== item.id))
    if (!item.is_read) {
      const nextUnread = Math.max(0, unreadCount - 1)
      setUnreadCount(nextUnread)
      setNotificationCount(nextUnread)
    }
  }

  async function handleMarkAllRead() {
    const ok = await markAllNotificationsRead(session)
    if (!ok) return
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })),
    )
    setUnreadCount(0)
    setNotificationCount(0)
  }

  return (
    <GlassBottomSheetModal
      visible={notificationsOpen}
      onClose={closeNotifications}
      accessibilityLabel="Close notifications"
      maxHeight="82%"
      sheetHostStyle={[
        styles.sheet,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: chrome.sheetBg,
        },
      ]}
    >
      <View style={styles.handleWrap}>
        <View
          style={[
            styles.handle,
            { backgroundColor: tokens.isDark ? "rgba(255,255,255,0.2)" : "rgba(60,60,67,0.28)" },
          ]}
        />
      </View>

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: chrome.label }]}>Notifications</Text>
          <Text style={[styles.headerSub, { color: chrome.secondaryLabel }]}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            style={[styles.markAllBtn, { backgroundColor: tokens.accentSoftStrong }]}
            onPress={() => void handleMarkAllRead()}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={tokens.accent} />
            <Text style={[styles.markAllText, { color: tokens.accent }]}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {(["all", "unread"] as const).map((id) => {
          const active = filter === id
          return (
            <Pressable
              key={id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? tokens.accent : chrome.groupedBg,
                  borderColor: active ? tokens.accent : chrome.groupedBorder,
                },
              ]}
              onPress={() => setFilter(id)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? "#FFFFFF" : chrome.secondaryLabel },
                ]}
              >
                {id === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={tokens.accent} />
          <Text style={[styles.loadingText, { color: chrome.secondaryLabel }]}>
            Loading notifications…
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: chrome.groupedBg }]}>
            <Ionicons name="notifications-off-outline" size={28} color={chrome.tertiaryLabel} />
          </View>
          <Text style={[styles.emptyTitle, { color: chrome.label }]}>No notifications</Text>
          <Text style={[styles.emptyBody, { color: chrome.secondaryLabel }]}>
            {filter === "unread" ? "You're all caught up." : "New updates will appear here."}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.group,
            { backgroundColor: chrome.groupedBg, borderColor: chrome.groupedBorder },
          ]}
        >
          {filtered.map((item, index) => (
            <View key={item.id}>
              <NotificationRow
                item={item}
                typeIcons={typeIcons}
                onPress={() => void handleOpen(item)}
                onDismiss={() => void handleDismiss(item)}
              />
              {index < filtered.length - 1 ? (
                <View style={[styles.separator, { backgroundColor: chrome.separator }]} />
              ) : null}
            </View>
          ))}
        </View>
      )}
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handleWrap: { alignItems: "center", paddingBottom: 8 },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headerCopy: { flex: 1, gap: 2 },
  headerTitle: nativeType.sheetTitle,
  headerSub: nativeType.secondary,
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  markAllText: { fontSize: 13, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  loadingText: { fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyBody: { fontSize: 14, textAlign: "center" },
  group: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: Platform.OS === "ios" ? "rgba(120,120,128,0.08)" : "rgba(0,0,0,0.03)",
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 3 },
  rowHead: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  rowMessage: { fontSize: 13, lineHeight: 18 },
  rowTime: { fontSize: 12, marginTop: 2 },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dismissBtnPressed: {
    backgroundColor: Platform.OS === "ios" ? "rgba(120,120,128,0.12)" : "rgba(0,0,0,0.06)",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
})
