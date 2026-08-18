import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import {
  messagesApi,
  messagesAuthFromSession,
  type ThreadSummary,
} from "../../lib/messages-api"
import { presentApiError, type ApiErrorPresentation } from "../../lib/present-api-error"
import { applyLocalThreadStateToThreads, reconcileLocalThreadReadState } from "../../lib/messages-local-state"
import { onMessagesRefresh } from "../../lib/notifications/notification-events"
import { usePresenceTracking } from "../../hooks/usePresenceTracking"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import { useChromeTopInset, useChromeBottomInset } from "../../context/ChromeInsetContext"
import { CommEmptyState } from "../faculty/faculty-communication-ui"
import { AppErrorNotice } from "../errors/AppErrorNotice"
import {
  StudentGroupedFilterSheet,
  StudentSearchToolbar,
  type StudentFilterGroup,
} from "../student/student-search-toolbar"
import { messagePreviewText } from "../../lib/messages-html"
import { MessageThreadRow } from "./messages-ui"
import { MessagesComposeModal } from "./MessagesComposeModal"
import { ModuleFlashList } from "../ModuleFlashList"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type StatusFilter = "all" | "unread"
type RoleFilter = "all" | "faculty" | "students"

/** Intentional space between the Messages header divider and the first conversation card. */
const MESSAGES_HEADER_TO_LIST_GAP = 28
/** Bottom clearance for the floating search dock + home indicator. */
const MESSAGES_LIST_BOTTOM_EXTRA = 88

export function MessagesInboxScreen() {
  const { session } = useSession()
  const auth = useMemo(
    () => messagesAuthFromSession(session),
    [
      session?.portal,
      session && "databaseId" in session ? session.databaseId : undefined,
      session?.portal === "faculty" && session ? session.id : undefined,
    ],
  )
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { styles: moduleStyles, type } = useModuleTheme()
  const chromeTop = useChromeTopInset()
  const chromeBottom = useChromeBottomInset()
  // Floating chrome: clear the overlay header, then add the intentional gap.
  // Stacked chrome: header already occupies layout — only the intentional gap.
  // Never add safe-area top here; the header owns that inset.
  const listTopPad = (chromeTop > 0 ? chromeTop : 0) + MESSAGES_HEADER_TO_LIST_GAP
  const listBottomPad = insets.bottom + MESSAGES_LIST_BOTTOM_EXTRA + chromeBottom
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<ApiErrorPresentation | null>(null)
  const [search, setSearch] = useState("")
  const [composeOpen, setComposeOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const skipNextFocusRefresh = useRef(true)

  const presenceParticipants = useMemo(
    () => threads.map((thread) => ({ kind: thread.otherParticipant.kind, id: thread.otherParticipant.id })),
    [threads],
  )
  const { getStatus } = usePresenceTracking(presenceParticipants)

  const load = useCallback(async () => {
    if (!auth) return
    setError(null)
    const data = await messagesApi.listThreads(auth)
    const nextThreads = data.threads ?? []
    reconcileLocalThreadReadState(nextThreads)
    setThreads(applyLocalThreadStateToThreads(nextThreads))
  }, [auth])

  useFocusEffect(
    useCallback(() => {
      if (!auth) return
      if (skipNextFocusRefresh.current) {
        skipNextFocusRefresh.current = false
        return
      }
      void load().catch((err) => {
        setError(
          presentApiError(err, {
            feature: "Messages",
            fallbackMessage: "Could not load your conversations.",
          }),
        )
      })
    }, [auth, load]),
  )

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => {
        setError(
          presentApiError(err, {
            feature: "Messages",
            fallbackMessage: "Could not load your conversations.",
          }),
        )
      })
      .finally(() => setLoading(false))
  }, [auth, load])

  useEffect(() => {
    return onMessagesRefresh((payload) => {
      if (payload?.threadId != null) {
        setThreads((prev) =>
          applyLocalThreadStateToThreads(
            prev.map((thread) =>
              thread.id === payload.threadId ? { ...thread, unreadCount: 0 } : thread,
            ),
          ),
        )
      }
      void load().catch((err) => {
        setError(
          presentApiError(err, {
            feature: "Messages",
            fallbackMessage: "Could not load your conversations.",
          }),
        )
      })
    })
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(
        presentApiError(err, {
          feature: "Messages",
          fallbackMessage: "Could not refresh your inbox.",
        }),
      )
    } finally {
      setRefreshing(false)
    }
  }

  const filterGroups = useMemo<StudentFilterGroup[]>(
    () => [
      {
        id: "status",
        title: "Show",
        value: statusFilter,
        options: [
          { value: "all", label: "All conversations" },
          { value: "unread", label: "Unread only" },
        ],
      },
      {
        id: "role",
        title: "People",
        value: roleFilter,
        options: [
          { value: "all", label: "Everyone" },
          { value: "faculty", label: "Faculty" },
          { value: "students", label: "Students" },
        ],
      },
    ],
    [roleFilter, statusFilter],
  )

  const filterActive = statusFilter !== "all" || roleFilter !== "all"

  const filtered = useMemo(() => {
    let list = threads
    if (statusFilter === "unread") {
      list = list.filter((thread) => (thread.unreadCount ?? 0) > 0)
    }
    if (roleFilter === "faculty") {
      list = list.filter((thread) => thread.otherParticipant.kind === "instructor")
    } else if (roleFilter === "students") {
      list = list.filter((thread) => thread.otherParticipant.kind === "student")
    }

    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((thread) => {
      const haystack = [
        thread.otherParticipant.displayName,
        thread.otherParticipant.email ?? "",
        thread.otherParticipant.subtitle,
        thread.subject ?? "",
        thread.lastMessage?.body ? messagePreviewText(thread.lastMessage.body, 200) : "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [roleFilter, search, statusFilter, threads])

  const unreadTotal = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0),
    [threads],
  )

  const showBlockingError = Boolean(error && !loading && threads.length === 0)

  const listHeader = useMemo(
    () => (
      <View style={{ paddingTop: listTopPad }}>
        {unreadTotal > 0 && !showBlockingError ? (
          <Text style={[type.caption, styles.unreadNote, { color: FACULTY_COMMUNICATION_COLOR.link }]}>
            {unreadTotal} unread conversation{unreadTotal === 1 ? "" : "s"}
          </Text>
        ) : null}
        {error && !showBlockingError ? (
          <AppErrorNotice
            presentation={error}
            variant="compact"
            onRetry={() => void handleRefresh()}
            onDismiss={() => setError(null)}
            style={styles.inlineError}
          />
        ) : null}
      </View>
    ),
    [error, handleRefresh, listTopPad, showBlockingError, type.caption, unreadTotal],
  )

  const renderThreadRow = useCallback(
    ({ item, index }: { item: ThreadSummary; index: number }) => (
      <MessageThreadRow
        thread={item}
        isFirst={index === 0}
        isLast={index === filtered.length - 1}
        presenceStatus={getStatus(item.otherParticipant.kind, item.otherParticipant.id)}
        onPress={() => router.push(`/messages/${item.id}` as never)}
      />
    ),
    [filtered.length, getStatus, router],
  )

  if (!auth) {
    return (
      <View style={moduleStyles.center}>
        <CommEmptyState
          icon="mail-outline"
          title="Sign in required"
          body="Messages are available after you sign in."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search conversations…"
        showFilter
        filterActive={filterActive}
        onOpenFilter={() => setFilterSheetOpen(true)}
        trailingAction={{
          onPress: () => setComposeOpen(true),
          accessibilityLabel: "New message",
          icon: "add",
        }}
      />

      <StudentGroupedFilterSheet
        visible={filterSheetOpen}
        title="Filter messages"
        subtitle="Narrow your inbox by status or who you are messaging."
        groups={filterGroups}
        onSelect={(groupId, value) => {
          if (groupId === "status") setStatusFilter(value as StatusFilter)
          if (groupId === "role") setRoleFilter(value as RoleFilter)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <ModuleFlashList
        data={loading || showBlockingError ? [] : filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderThreadRow}
        extraData={{ filteredLength: filtered.length, unreadTotal }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: listBottomPad },
          // Only grow when empty/loading — otherwise FlashList paints a tall empty card.
          (loading || showBlockingError || filtered.length === 0) && styles.contentGrow,
          showBlockingError && styles.contentBlockingError,
        ]}
        // Header owns the top safe area (stacked or floating). Do not apply it again on the list.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={FACULTY_COMMUNICATION_COLOR.link} />
            </View>
          ) : showBlockingError && error ? (
            <View style={styles.blockingErrorWrap}>
              <AppErrorNotice
                presentation={error}
                onRetry={() => void handleRefresh()}
                onDismiss={() => setError(null)}
              />
            </View>
          ) : (
            <CommEmptyState
              icon="chatbubbles-outline"
              title={threads.length === 0 ? "No conversations yet" : "No matches"}
              body={
                threads.length === 0
                  ? "Tap + in the search bar to start a new message."
                  : "Try a different search or filter."
              }
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_COMMUNICATION_COLOR.link}
            {...(chromeTop > 0 ? { progressViewOffset: chromeTop } : {})}
          />
        }
      />

      <MessagesComposeModal
        visible={composeOpen}
        auth={auth}
        onClose={() => setComposeOpen(false)}
        onSent={(threadId) => {
          setComposeOpen(false)
          void load()
          router.push(`/messages/${threadId}` as never)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // No container `gap` — it stacked on top of listTopPad and inflated the header-to-card space.
  content: {},
  contentGrow: { flexGrow: 1 },
  contentBlockingError: { justifyContent: "center" },
  unreadNote: { paddingHorizontal: 16, fontWeight: "600", marginBottom: 8 },
  inlineError: { marginHorizontal: 16, marginBottom: 8 },
  blockingErrorWrap: { paddingVertical: 12 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
})
