import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { resolveNotificationLink, announcementIdFromNotificationRoute } from "../../lib/notification-link"
import {
  dismissNotification,
  fetchStudentNotifications,
  formatNotificationTime,
  markAllNotificationsRead,
  markNotificationRead,
  type StudentNotification,
} from "../../lib/student-notifications"
import {
  loadNotificationInboxPrefs,
  saveNotificationInboxPrefs,
  sortNotificationsWithPins,
  withArchived,
  withPinned,
  withoutNotification,
  type NotificationInboxPrefs,
} from "../../lib/notification-inbox-prefs"
import { onNotificationsRefresh } from "../../lib/notifications/notification-events"
import { courseInfoApi } from "../../lib/course-info-api"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { AppAlert } from "../../lib/app-alert"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { StudentNotificationDetailSheet } from "./StudentNotificationDetailSheet"
import type { StudentAuthSession } from "../../lib/student-session-proof"

type Props = {
  session: StudentAuthSession
  notificationsOpen: boolean
  closeNotifications: () => void
  setNotificationCount: (count: number) => void
}

type Filter = "all" | "unread" | "pinned" | "archived"

const EMPTY_PREFS: NotificationInboxPrefs = {
  pinnedIds: [],
  archivedIds: [],
  deletedIds: [],
}

function asStudentSession(session: StudentAuthSession): StudentSession {
  return {
    portal: "student",
    databaseId: session.databaseId,
    id: session.id ?? session.databaseId,
    name: "",
    section: session.section ?? "",
    universityId: session.universityId,
    email: session.email,
    authIdentifier: session.authIdentifier,
    expiresAt: Date.now() + 60_000,
  }
}

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
  pinned,
  onPress,
  onDismiss,
  typeIcons,
}: {
  item: StudentNotification
  pinned?: boolean
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
          {pinned ? <Ionicons name="pin" size={13} color={tokens.accent} /> : null}
          {!item.is_read ? (
            <View style={[styles.unreadDot, { backgroundColor: tokens.accent }]} />
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
  const typeIcons = useNotificationTypeIcons()
  const [filter, setFilter] = useState<Filter>("all")
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<StudentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selected, setSelected] = useState<StudentNotification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [relatedAvailable, setRelatedAvailable] = useState(true)
  const [prefs, setPrefs] = useState<NotificationInboxPrefs>(EMPTY_PREFS)
  const [actionBusy, setActionBusy] = useState(false)

  const persistPrefs = useCallback(
    async (next: NotificationInboxPrefs) => {
      setPrefs(next)
      await saveNotificationInboxPrefs("student", session.databaseId, next)
    },
    [session.databaseId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, nextPrefs] = await Promise.all([
        fetchStudentNotifications(session),
        loadNotificationInboxPrefs("student", session.databaseId),
      ])
      setPrefs(nextPrefs)
      setNotifications(result.notifications)
      const archived = new Set(nextPrefs.archivedIds)
      const visibleUnread = result.notifications.filter(
        (n) => !n.is_read && !archived.has(n.id),
      ).length
      setUnreadCount(visibleUnread)
      setNotificationCount(visibleUnread)
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

  const pinnedSet = useMemo(() => new Set(prefs.pinnedIds), [prefs.pinnedIds])
  const archivedSet = useMemo(() => new Set(prefs.archivedIds), [prefs.archivedIds])

  const filtered = useMemo(() => {
    let items = notifications
    if (filter === "archived") {
      items = items.filter((n) => archivedSet.has(n.id))
    } else {
      items = items.filter((n) => !archivedSet.has(n.id))
      if (filter === "unread") items = items.filter((n) => !n.is_read)
      if (filter === "pinned") items = items.filter((n) => pinnedSet.has(n.id))
    }
    return sortNotificationsWithPins(items, prefs.pinnedIds)
  }, [archivedSet, filter, notifications, pinnedSet, prefs.pinnedIds])

  const filterCounts = useMemo(() => {
    const active = notifications.filter((n) => !archivedSet.has(n.id))
    return {
      all: active.length,
      unread: active.filter((n) => !n.is_read).length,
      pinned: active.filter((n) => pinnedSet.has(n.id)).length,
      archived: notifications.filter((n) => archivedSet.has(n.id)).length,
    }
  }, [archivedSet, notifications, pinnedSet])

  async function relatedTargetAvailable(item: StudentNotification): Promise<boolean> {
    const route = resolveNotificationLink(item.link)
    if (!route) return false
    const announcementId = announcementIdFromNotificationRoute(route)
    if (announcementId == null) return true
    try {
      await courseInfoApi.getAnnouncementById(asStudentSession(session), announcementId)
      return true
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || /not found/i.test(err.message))) {
        return false
      }
      return true
    }
  }

  async function handleOpen(item: StudentNotification) {
    setSelected(item)
    setRelatedAvailable(Boolean(item.link))
    closeNotifications()
    setDetailOpen(true)

    if (!item.is_read) {
      const ok = await markNotificationRead(session, item.id)
      if (ok) {
        const nextItem = { ...item, is_read: true, read_at: new Date().toISOString() }
        setSelected(nextItem)
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? nextItem : n)))
        const nextUnread = Math.max(0, unreadCount - 1)
        setUnreadCount(nextUnread)
        setNotificationCount(nextUnread)
      }
    }

    if (item.link) {
      const available = await relatedTargetAvailable(item)
      setRelatedAvailable(available)
    }
  }

  function handleOpenRelated(item: StudentNotification) {
    setDetailOpen(false)
    closeNotifications()
    const route = resolveNotificationLink(item.link)
    if (!route) return
    if (!relatedAvailable && announcementIdFromNotificationRoute(route) != null) {
      router.push("/announcements" as never)
      return
    }
    router.push(route as never)
  }

  async function handleDismiss(item: StudentNotification) {
    const ok = await dismissNotification(session, item.id)
    if (!ok) return
    setNotifications((prev) => prev.filter((n) => n.id !== item.id))
    await persistPrefs(withoutNotification(prefs, item.id))
    if (!item.is_read) {
      const nextUnread = Math.max(0, unreadCount - 1)
      setUnreadCount(nextUnread)
      setNotificationCount(nextUnread)
    }
  }

  async function handleTogglePin(item: StudentNotification) {
    const nextPinned = !pinnedSet.has(item.id)
    await persistPrefs(withPinned(prefs, item.id, nextPinned))
  }

  async function handleToggleArchive(item: StudentNotification) {
    const nextArchived = !archivedSet.has(item.id)
    await persistPrefs(withArchived(prefs, item.id, nextArchived))
    if (!item.is_read) {
      const nextUnread = Math.max(0, unreadCount + (nextArchived ? -1 : 1))
      setUnreadCount(nextUnread)
      setNotificationCount(nextUnread)
    }
    if (nextArchived && selected?.id === item.id) {
      setDetailOpen(false)
      setFilter("archived")
    }
  }

  function handleDeleteFromDetail(item: StudentNotification) {
    AppAlert.alert("Delete notification?", "This removes it from your inbox.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActionBusy(true)
            try {
              await handleDismiss(item)
              setDetailOpen(false)
              setSelected(null)
            } finally {
              setActionBusy(false)
            }
          })()
        },
      },
    ])
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

  const filterOptions: Array<{ id: Filter; label: string }> = [
    { id: "all", label: `All${filterCounts.all ? ` (${filterCounts.all})` : ""}` },
    {
      id: "unread",
      label: `Unread${filterCounts.unread ? ` (${filterCounts.unread})` : ""}`,
    },
    {
      id: "pinned",
      label: `Pinned${filterCounts.pinned ? ` (${filterCounts.pinned})` : ""}`,
    },
    {
      id: "archived",
      label: `Archived${filterCounts.archived ? ` (${filterCounts.archived})` : ""}`,
    },
  ]

  return (
    <>
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
              { backgroundColor: tokens.textMuted, opacity: 0.35 },
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
              style={[
                styles.markAllBtn,
                {
                  backgroundColor: tokens.accentSoftStrong,
                  borderColor: tokens.accentBorder,
                },
              ]}
              onPress={() => void handleMarkAllRead()}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={tokens.accent} />
              <Text style={[styles.markAllText, { color: tokens.accent }]}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filterOptions.map((opt) => {
              const active = filter === opt.id
              return (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? tokens.accent : chrome.groupedBg,
                      borderColor: active ? tokens.accent : chrome.groupedBorder,
                    },
                  ]}
                  onPress={() => setFilter(opt.id)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: active ? "#FFFFFF" : chrome.secondaryLabel },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
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
              {filter === "unread"
                ? "You're all caught up."
                : filter === "pinned"
                  ? "Pin important updates to keep them on top."
                  : filter === "archived"
                    ? "Archived notifications will show up here."
                    : "New updates will appear here."}
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
                  pinned={pinnedSet.has(item.id)}
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

      <StudentNotificationDetailSheet
        visible={detailOpen}
        notification={selected}
        relatedAvailable={relatedAvailable}
        pinned={selected ? pinnedSet.has(selected.id) : false}
        archived={selected ? archivedSet.has(selected.id) : false}
        actionBusy={actionBusy}
        onClose={() => setDetailOpen(false)}
        onOpenRelated={handleOpenRelated}
        onTogglePin={(item) => void handleTogglePin(item)}
        onToggleArchive={(item) => void handleToggleArchive(item)}
        onDelete={handleDeleteFromDetail}
      />
    </>
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  markAllText: { fontSize: 13, fontWeight: "600" },
  filterRow: { marginBottom: 12 },
  filterScroll: { flexDirection: "row", gap: 8, paddingRight: 4 },
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
