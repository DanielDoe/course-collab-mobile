import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { facultyNativeRouteFromLink } from "../../constants/faculty-nav"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { instructorApi, type InstructorNotification } from "../../lib/instructor-api"
import { onNotificationsRefresh } from "../../lib/notifications/notification-events"
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


type Filter = "all" | "unread"

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

  const load = useCallback(async () => {
    if (!session) return
    const data = await instructorApi.getNotifications(session.id)
    setNotifications(data.notifications ?? [])
    setNotificationCount(data.unread_count ?? 0)
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

  const unread = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, filter],
  )

  const pageCount = Math.max(1, Math.ceil(visible.length / NOTIFICATION_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paged = useMemo(
    () =>
      visible.slice(safePage * NOTIFICATION_PAGE_SIZE, safePage * NOTIFICATION_PAGE_SIZE + NOTIFICATION_PAGE_SIZE),
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
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_COMMUNICATION_COLOR.link} />
        }
        showsVerticalScrollIndicator={false}
      >
        <CommSegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All" },
            { id: "unread", label: unread > 0 ? `Unread (${unread})` : "Unread" },
          ]}
        />

        <CommSectionHeader title="Recent Alerts" trailing={rangeLabel ? (
          <Text style={[comm.type.caption, { color: comm.native.secondaryLabel }]}>{rangeLabel}</Text>
        ) : undefined} />

        {loading ? (
          <ActivityIndicator color={FACULTY_COMMUNICATION_COLOR.link} style={{ marginTop: 28 }} />
        ) : visible.length === 0 ? (
          <View style={[styles.emptyWrap, { backgroundColor: comm.native.secondaryGrouped, borderRadius: comm.layout.sectionRadius }]}>
            <CommEmptyState
              icon={filter === "unread" ? "checkmark-circle-outline" : "notifications-off-outline"}
              title={filter === "unread" ? "You're All Caught Up" : "No Notifications"}
              body={
                filter === "unread"
                  ? "New student activity and course updates will show here."
                  : "Course alerts appear here as students engage with your modules."
              }
            />
          </View>
        ) : (
          <NotificationCenterList items={paged} onOpen={(item) => void handleOpen(item)} />
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
          Tap an alert to read the AI summary and full message. Use Open Related Screen when you are ready to jump in.
        </CommSectionFooter>
      </ScrollView>

      <FacultyNotificationDetailSheet
        visible={detailOpen}
        notification={selected}
        onClose={() => setDetailOpen(false)}
        onOpenRelated={handleOpenRelated}
      />
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  emptyWrap: {},
})
