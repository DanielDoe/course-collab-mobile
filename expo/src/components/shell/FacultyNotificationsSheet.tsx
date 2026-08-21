import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFacultyShell } from "../../context/FacultyShellContext"
import type { FacultySession } from "../../lib/session"
import { instructorApi, type InstructorNotification } from "../../lib/instructor-api"
import { onNotificationsRefresh } from "../../lib/notifications/notification-events"
import { facultyNativeRouteFromLink } from "../../constants/faculty-nav"
import {
  loadNotificationInboxPrefs,
  saveNotificationInboxPrefs,
  sortNotificationsWithPins,
  withArchived,
  withDeleted,
  withPinned,
  type NotificationInboxPrefs,
} from "../../lib/notification-inbox-prefs"
import { AppAlert } from "../../lib/app-alert"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { FacultyNotificationDetailSheet } from "../faculty/FacultyNotificationDetailSheet"
import { NotificationCenterList } from "../faculty/faculty-notifications-ui"
import { CommEmptyState } from "../faculty/faculty-communication-ui"

type Props = {
  session: FacultySession
}

type Filter = "all" | "unread" | "pinned" | "archived"

const EMPTY_PREFS: NotificationInboxPrefs = {
  pinnedIds: [],
  archivedIds: [],
  deletedIds: [],
}

/** Faculty notification sheet — opens detail page sheet instead of immediate navigation. */
export function FacultyNotificationsSheet({ session }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { notificationsOpen, closeNotifications, setNotificationCount, refreshFacultyData } =
    useFacultyShell()

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<InstructorNotification[]>([])
  const [selected, setSelected] = useState<InstructorNotification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")
  const [prefs, setPrefs] = useState<NotificationInboxPrefs>(EMPTY_PREFS)
  const [actionBusy, setActionBusy] = useState(false)

  const persistPrefs = useCallback(
    async (next: NotificationInboxPrefs) => {
      setPrefs(next)
      await saveNotificationInboxPrefs("faculty", session.id, next)
    },
    [session.id],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, nextPrefs] = await Promise.all([
        instructorApi.getNotifications(session.id),
        loadNotificationInboxPrefs("faculty", session.id),
      ])
      setPrefs(nextPrefs)
      const deleted = new Set(nextPrefs.deletedIds)
      const archived = new Set(nextPrefs.archivedIds)
      const visible = (data.notifications ?? []).filter((n) => !deleted.has(n.id))
      setNotifications(visible)
      const visibleUnread = visible.filter((n) => !n.is_read && !archived.has(n.id)).length
      setNotificationCount(visibleUnread)
    } finally {
      setLoading(false)
    }
  }, [session.id, setNotificationCount])

  useEffect(() => {
    if (notificationsOpen) void load()
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

  const unread = filterCounts.unread

  async function markRead(item: InstructorNotification) {
    if (!item.is_read) {
      await instructorApi.markNotificationRead(session.id, item.id)
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
      setNotificationCount(Math.max(0, unread - 1))
      return { ...item, is_read: true }
    }
    return item
  }

  async function handleOpen(item: InstructorNotification) {
    setSelected(item)
    closeNotifications()
    setDetailOpen(true)
    try {
      const next = await markRead(item)
      setSelected(next)
    } catch (err) {
      console.warn("[FacultyNotificationsSheet] mark read failed", err)
    }
  }

  function handleOpenRelated(item: InstructorNotification) {
    setDetailOpen(false)
    closeNotifications()
    router.push(facultyNativeRouteFromLink(item.link ?? undefined) as never)
  }

  async function handleTogglePin(item: InstructorNotification) {
    await persistPrefs(withPinned(prefs, item.id, !pinnedSet.has(item.id)))
  }

  async function handleToggleArchive(item: InstructorNotification) {
    const nextArchived = !archivedSet.has(item.id)
    await persistPrefs(withArchived(prefs, item.id, nextArchived))
    if (!item.is_read) {
      setNotificationCount(Math.max(0, unread + (nextArchived ? -1 : 1)))
    }
    if (nextArchived && selected?.id === item.id) {
      setDetailOpen(false)
      setFilter("archived")
    }
  }

  function handleDelete(item: InstructorNotification) {
    AppAlert.alert("Delete notification?", "This hides it from your faculty inbox on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActionBusy(true)
            try {
              const wasUnread = !item.is_read
              await persistPrefs(withDeleted(prefs, item.id))
              setNotifications((prev) => prev.filter((n) => n.id !== item.id))
              if (wasUnread) setNotificationCount(Math.max(0, unread - 1))
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
    await instructorApi.markAllNotificationsRead(session.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setNotificationCount(0)
    await refreshFacultyData?.(undefined, { force: true })
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
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
        maxHeight="88%"
        refreshControl={
          !loading && notifications.length > 0 ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={tokens.accent}
            />
          ) : undefined
        }
      >
        <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <GlassSheetHandle />
          <View style={styles.head}>
            <Text style={[type.sheetTitle, styles.title, { color: chrome.label }]}>Notifications</Text>
            <View style={styles.headActions}>
              {unread > 0 ? (
                <Pressable
                  onPress={() => void handleMarkAllRead()}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all notifications read"
                >
                  <Text style={[styles.markAll, { color: tokens.accent }]}>Mark All Read</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={closeNotifications}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
                style={styles.doneHit}
              >
                <Text style={[styles.done, { color: tokens.accent }]}>Done</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={styles.filterRow}
          >
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

          {loading ? (
            <ActivityIndicator color={tokens.accent} style={styles.loading} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <CommEmptyState
                icon="notifications-off-outline"
                title={
                  filter === "pinned"
                    ? "No Pinned Notifications"
                    : filter === "archived"
                      ? "No Archived Notifications"
                      : filter === "unread"
                        ? "You're All Caught Up"
                        : "You're All Caught Up"
                }
                body={
                  filter === "pinned"
                    ? "Pin important updates from a notification to keep them on top."
                    : filter === "archived"
                      ? "Archived notifications will appear here."
                      : "New student activity will appear here."
                }
              />
            </View>
          ) : (
            <NotificationCenterList
              items={filtered}
              pinnedIds={prefs.pinnedIds}
              onOpen={(item) => void handleOpen(item)}
            />
          )}
        </GlassSheetBackground>
      </GlassBottomSheetModal>

      <FacultyNotificationDetailSheet
        visible={detailOpen}
        notification={selected}
        pinned={selected ? pinnedSet.has(selected.id) : false}
        archived={selected ? archivedSet.has(selected.id) : false}
        actionBusy={actionBusy}
        onClose={() => setDetailOpen(false)}
        onOpenRelated={handleOpenRelated}
        onTogglePin={(item) => void handleTogglePin(item)}
        onToggleArchive={(item) => void handleToggleArchive(item)}
        onDelete={handleDelete}
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
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { letterSpacing: -0.4, flexShrink: 1 },
  headActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  markAll: { fontSize: 17, fontWeight: "400" },
  done: { fontSize: 17, fontWeight: "600" },
  doneHit: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  filterRow: { marginBottom: 12, flexGrow: 0 },
  filterScroll: { flexDirection: "row", gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  loading: { marginTop: 24, marginBottom: 16 },
  empty: { paddingVertical: 12 },
})
