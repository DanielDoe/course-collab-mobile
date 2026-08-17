import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFacultyShell } from "../../context/FacultyShellContext"
import type { FacultySession } from "../../lib/session"
import { instructorApi, type InstructorNotification } from "../../lib/instructor-api"
import { onNotificationsRefresh } from "../../lib/notifications/notification-events"
import { facultyNativeRouteFromLink } from "../../constants/faculty-nav"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { FacultyNotificationDetailSheet } from "../faculty/FacultyNotificationDetailSheet"
import { NotificationCenterList } from "../faculty/faculty-notifications-ui"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import { CommEmptyState } from "../faculty/faculty-communication-ui"

type Props = {
  session: FacultySession
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await instructorApi.getNotifications(session.id)
      setNotifications(data.notifications ?? [])
      setNotificationCount(data.unread_count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [session.id, setNotificationCount])

  useEffect(() => {
    if (notificationsOpen) void load()
  }, [notificationsOpen, load])

  useEffect(() => onNotificationsRefresh(() => void load()), [load])

  const unread = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

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
              tintColor={FACULTY_COMMUNICATION_COLOR.link}
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

          {loading ? (
            <ActivityIndicator color={FACULTY_COMMUNICATION_COLOR.link} style={styles.loading} />
          ) : notifications.length === 0 ? (
            <View style={styles.empty}>
              <CommEmptyState
                icon="notifications-off-outline"
                title="You're All Caught Up"
                body="New student activity will appear here."
              />
            </View>
          ) : (
            <NotificationCenterList items={notifications} onOpen={(item) => void handleOpen(item)} />
          )}
        </GlassSheetBackground>
      </GlassBottomSheetModal>

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
  loading: { marginTop: 24, marginBottom: 16 },
  empty: { paddingVertical: 12 },
})
