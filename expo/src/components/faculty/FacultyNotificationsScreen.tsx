import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { facultyNativeRouteFromLink } from "../../constants/faculty-nav"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { instructorApi, type InstructorNotification } from "../../lib/instructor-api"
import { onNotificationsRefresh } from "../../lib/notifications/notification-events"
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
import {
  CommEmptyState,
  CommSectionFooter,
  CommSectionHeader,
  CommSegmentedControl,
  useFacultyCommunicationTheme,
} from "./faculty-communication-ui"
import { FacultyNotificationDetailSheet } from "./FacultyNotificationDetailSheet"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import {
  NOTIFICATION_PAGE_SIZE,
  NotificationCenterList,
  NotificationInboxFooter,
} from "./faculty-notifications-ui"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Filter = "all" | "unread" | "pinned" | "archived"

const EMPTY_PREFS: NotificationInboxPrefs = {
  pinnedIds: [],
  archivedIds: [],
  deletedIds: [],
}

export function FacultyNotificationsScreen() {
  const { styles: moduleStyles } = useModuleTheme()
  const comm = useFacultyCommunicationTheme()
  const scrollPad = useModuleScrollContentPadding(32)
  const router = useRouter()
  const { session } = useFacultyScope()
  const { setNotificationCount, refreshFacultyData } = useFacultyShell()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")
  const [page, setPage] = useState(0)
  const [notifications, setNotifications] = useState<InstructorNotification[]>([])
  const [selected, setSelected] = useState<InstructorNotification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [prefs, setPrefs] = useState<NotificationInboxPrefs>(EMPTY_PREFS)
  const [actionBusy, setActionBusy] = useState(false)

  const persistPrefs = useCallback(
    async (next: NotificationInboxPrefs) => {
      if (!session) return
      setPrefs(next)
      await saveNotificationInboxPrefs("faculty", session.id, next)
    },
    [session],
  )

  const load = useCallback(async () => {
    if (!session) return
    const [data, nextPrefs] = await Promise.all([
      instructorApi.getNotifications(session.id),
      loadNotificationInboxPrefs("faculty", session.id),
    ])
    setPrefs(nextPrefs)
    const deleted = new Set(nextPrefs.deletedIds)
    const archived = new Set(nextPrefs.archivedIds)
    const visible = (data.notifications ?? []).filter((n) => !deleted.has(n.id))
    setNotifications(visible)
    setNotificationCount(visible.filter((n) => !n.is_read && !archived.has(n.id)).length)
  }, [session, setNotificationCount])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  useEffect(() => onNotificationsRefresh(() => void load()), [load])

  const pinnedSet = useMemo(() => new Set(prefs.pinnedIds), [prefs.pinnedIds])
  const archivedSet = useMemo(() => new Set(prefs.archivedIds), [prefs.archivedIds])

  const unread = useMemo(
    () => notifications.filter((n) => !n.is_read && !archivedSet.has(n.id)).length,
    [archivedSet, notifications],
  )

  const visible = useMemo(() => {
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

  const pageCount = Math.max(1, Math.ceil(visible.length / NOTIFICATION_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paged = useMemo(
    () =>
      visible.slice(
        safePage * NOTIFICATION_PAGE_SIZE,
        safePage * NOTIFICATION_PAGE_SIZE + NOTIFICATION_PAGE_SIZE,
      ),
    [visible, safePage],
  )
  const rangeLabel =
    visible.length === 0
      ? undefined
      : `${safePage * NOTIFICATION_PAGE_SIZE + 1}–${Math.min((safePage + 1) * NOTIFICATION_PAGE_SIZE, visible.length)} of ${visible.length}`

  useEffect(() => {
    setPage(0)
  }, [filter])

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  async function markRead(item: InstructorNotification) {
    if (!session || item.is_read) return item
    await instructorApi.markNotificationRead(session.id, item.id)
    setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)))
    setNotificationCount(Math.max(0, unread - 1))
    return { ...item, is_read: true }
  }

  async function handleOpen(item: InstructorNotification) {
    const next = await markRead(item)
    setSelected(next)
    setDetailOpen(true)
  }

  function handleOpenRelated(item: InstructorNotification) {
    setDetailOpen(false)
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
              const wasUnread = !item.is_read && !archivedSet.has(item.id)
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
    if (!session) return
    await instructorApi.markAllNotificationsRead(session.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setNotificationCount(0)
    await refreshFacultyData?.(undefined, { force: true })
  }

  if (!session) {
    return (
      <View style={[moduleStyles.root, styles.root]}>
        <CommEmptyState
          icon="notifications-outline"
          title="Sign In Required"
          body="Notifications appear after you sign in as faculty."
        />
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={[moduleStyles.root, styles.root]}
        contentContainerStyle={[styles.content, scrollPad]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_COMMUNICATION_COLOR.link}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <CommSegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All" },
            { id: "unread", label: unread > 0 ? `Unread (${unread})` : "Unread" },
            { id: "pinned", label: "Pinned" },
            { id: "archived", label: "Archived" },
          ]}
        />

        <CommSectionHeader
          title="Recent Alerts"
          trailing={
            rangeLabel ? (
              <Text style={[comm.type.caption, { color: comm.native.secondaryLabel }]}>
                {rangeLabel}
              </Text>
            ) : undefined
          }
        />

        {loading ? (
          <ActivityIndicator color={FACULTY_COMMUNICATION_COLOR.link} style={{ marginTop: 28 }} />
        ) : visible.length === 0 ? (
          <View
            style={[
              styles.emptyWrap,
              {
                backgroundColor: comm.native.secondaryGrouped,
                borderRadius: comm.layout.sectionRadius,
              },
            ]}
          >
            <CommEmptyState
              icon={
                filter === "unread"
                  ? "checkmark-circle-outline"
                  : filter === "pinned"
                    ? "pin-outline"
                    : filter === "archived"
                      ? "archive-outline"
                      : "notifications-off-outline"
              }
              title={
                filter === "unread"
                  ? "You're All Caught Up"
                  : filter === "pinned"
                    ? "No Pinned Notifications"
                    : filter === "archived"
                      ? "No Archived Notifications"
                      : "No Notifications"
              }
              body={
                filter === "unread"
                  ? "New student activity and course updates will show here."
                  : filter === "pinned"
                    ? "Pin important alerts from a notification to keep them on top."
                    : filter === "archived"
                      ? "Archived notifications will appear here."
                      : "Course alerts appear here as students engage with your modules."
              }
            />
          </View>
        ) : (
          <NotificationCenterList
            items={paged}
            pinnedIds={prefs.pinnedIds}
            onOpen={(item) => void handleOpen(item)}
          />
        )}

        {visible.length > 0 ? (
          <NotificationInboxFooter
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            showMarkAllRead={unread > 0}
            onMarkAllRead={() => void handleMarkAllRead()}
          />
        ) : null}

        <CommSectionFooter>
          Tap an alert to pin, archive, or delete it. Open Related Screen jumps to the matching module.
        </CommSectionFooter>
      </ScrollView>

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
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  emptyWrap: {},
})
