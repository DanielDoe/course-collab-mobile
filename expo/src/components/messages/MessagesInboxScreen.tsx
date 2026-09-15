import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import {
  messagesAuthFromSession,
  type ThreadSummary,
} from "../../lib/messages-api"
import { presentApiError, type ApiErrorPresentation } from "../../lib/present-api-error"
import { applyLocalThreadStateToThreads, reconcileLocalThreadReadState } from "../../lib/messages-local-state"
import {
  onMessagesRefresh,
  shouldRefetchInboxOnMessageRefresh,
} from "../../lib/notifications/notification-events"
import { usePresenceTracking } from "../../hooks/usePresenceTracking"
import { useOptionalFacultyShell } from "../../context/FacultyShellContext"
import { useOptionalStudentShell } from "../../context/StudentShellContext"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import { useChromeTopInset, useModuleHeaderContentTop } from "../../context/ChromeInsetContext"
import { useSearchDockBottomInset } from "../../context/ModuleSearchDockContext"
import { MODULE_LIST_DUAL_PAGER_HEIGHT, moduleListPagerChromeHeight } from "../../lib/module-list-pager"
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
import type { FlashListRef } from "@shopify/flash-list"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { useMessagesInbox } from "../../hooks/query/useMessagesInbox"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import { useMessagesLayout } from "../../hooks/useMessagesLayout"
import { MessagesErrorBoundary } from "./MessagesErrorBoundary"

type StatusFilter = "all" | "unread"
type RoleFilter = "all" | "faculty" | "students"

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
  const { styles: moduleStyles, type } = useModuleTheme()
  const layout = useMessagesLayout()
  const chromeTop = useChromeTopInset()
  const searchDockInset = useSearchDockBottomInset()
  const headerContentTop = useModuleHeaderContentTop()
  const inboxQuery = useMessagesInbox(auth)
  const threads = inboxQuery.threads
  const setThreads = inboxQuery.setThreads
  const loading = inboxQuery.isInitialLoading
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const listRef = useRef<FlashListRef<ThreadSummary>>(null)
  const error = inboxQuery.error
    ? presentApiError(inboxQuery.error, {
        feature: "Messages",
        fallbackMessage: "Could not load your conversations.",
      })
    : null
  const [search, setSearch] = useState("")
  const [composeOpen, setComposeOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const skipNextFocusRefresh = useRef(true)

  const presenceParticipants = useMemo(
    () =>
      threads
        .filter((thread) => thread.otherParticipant?.id)
        .map((thread) => ({ kind: thread.otherParticipant.kind, id: thread.otherParticipant.id })),
    [threads],
  )
  const { getStatus } = usePresenceTracking(presenceParticipants)

  const load = useCallback(async () => {
    await inboxQuery.refetch()
  }, [inboxQuery.refetch])

  useFocusEffect(
    useCallback(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false })
      if (!auth) return
      if (skipNextFocusRefresh.current) {
        skipNextFocusRefresh.current = false
        return
      }
      void load()
    }, [auth, load]),
  )

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
      if (shouldRefetchInboxOnMessageRefresh(payload)) void load()
    })
  }, [load, setThreads])

  const openCompose = useCallback(() => setComposeOpen(true), [])
  const openFilter = useCallback(() => setFilterSheetOpen(true), [])
  const trailingAction = useMemo(
    () => ({
      onPress: openCompose,
      accessibilityLabel: "New message",
      icon: "add" as const,
    }),
    [openCompose],
  )

  const handleRefresh = useCallback(async () => {
    setPullRefreshing(true)
    try {
      await load()
    } finally {
      setPullRefreshing(false)
    }
  }, [load])

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
  const pager = useFacultyListPager(filtered, `${statusFilter}:${roleFilter}:${search}`, "conversations", {
    rowHeight: layout.threadRowMinHeight,
    pagerHeight: MODULE_LIST_DUAL_PAGER_HEIGHT,
    viewportBuffer: searchDockInset + 8,
  })

  const pagerChromeHeight = moduleListPagerChromeHeight(pager.total, pager.pageCount)
  const listContentPad = useMemo(
    () => ({
      paddingBottom: searchDockInset + pagerChromeHeight + 8,
      paddingTop: headerContentTop,
    }),
    [headerContentTop, pagerChromeHeight, searchDockInset],
  )

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [pager.page])

  const unreadTotal = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0),
    [threads],
  )

  const setFacultyUnreadBadge = useOptionalFacultyShell()?.setBadges
  const setStudentUnreadCount = useOptionalStudentShell()?.setUnreadMessagesCount
  const setStudentNavBadges = useOptionalStudentShell()?.setBadges
  useEffect(() => {
    setFacultyUnreadBadge?.({ unreadMessages: unreadTotal })
    setStudentUnreadCount?.(unreadTotal)
    setStudentNavBadges?.({ unreadMessages: unreadTotal })
  }, [unreadTotal, setFacultyUnreadBadge, setStudentUnreadCount, setStudentNavBadges])

  const showBlockingError = Boolean(error && !loading && threads.length === 0)

  const listHeader = useMemo(
    () => (
      <View>
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
            style={styles.inlineError}
          />
        ) : null}
      </View>
    ),
    [error, handleRefresh, showBlockingError, type.caption, unreadTotal],
  )

  const renderThreadRow = useCallback(
    ({ item, index }: { item: ThreadSummary; index: number }) => (
      <MessageThreadRow
        thread={item}
        isFirst={index === 0}
        isLast={index === pager.items.length - 1}
        presenceStatus={getStatus(item.otherParticipant.kind, item.otherParticipant.id)}
        onPress={() => router.push(`/messages/${item.id}` as never)}
      />
    ),
    [getStatus, pager.items.length, router],
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
    <MessagesErrorBoundary feature="Messages">
    <View style={moduleStyles.root}>
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search conversations…"
        showFilter
        filterActive={filterActive}
        onOpenFilter={openFilter}
        trailingAction={trailingAction}
      />
      <QueryRefreshBanner visible={inboxQuery.refreshFailed} onRetry={() => void handleRefresh()} />

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
        ref={listRef}
        animateItems
        refreshContentGrow={filtered.length === 0 || loading || showBlockingError}
        data={loading || showBlockingError ? [] : pager.items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderThreadRow}
        extraData={{ filteredLength: pager.items.length, unreadTotal, page: pager.page }}
        contentContainerStyle={[
          styles.content,
          layout.contentStyle,
          listContentPad,
          { paddingHorizontal: layout.horizontalPadding },
          // Only grow when empty/loading — otherwise FlashList paints a tall empty card.
          (loading || showBlockingError || filtered.length === 0) && styles.contentGrow,
          showBlockingError && styles.contentBlockingError,
        ]}
        // Header owns the top safe area (stacked or floating). Do not apply it again on the list.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}
        ListHeaderComponent={listHeader}
        ListFooterComponent={null}
        ListEmptyComponent={
          loading ? (
            <QuerySkeleton />
          ) : showBlockingError && error ? (
            <View style={styles.blockingErrorWrap}>
              <AppErrorNotice
                presentation={error}
                onRetry={() => void handleRefresh()}
              />
            </View>
          ) : (
            <CommEmptyState
              icon="chatbubbles-outline"
              title={threads.length === 0 ? "No conversations yet" : "No matches"}
              body={
                threads.length === 0
                  ? "Messages with students and course participants will appear here."
                  : "Try a different search or filter."
              }
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={FACULTY_COMMUNICATION_COLOR.link}
            {...(chromeTop > 0 ? { progressViewOffset: chromeTop } : {})}
          />
        }
      />

      {!loading && !showBlockingError ? (
        <View
          pointerEvents="box-none"
          style={[styles.pagerDock, { bottom: searchDockInset, paddingHorizontal: layout.horizontalPadding }]}
        >
          <FacultyListPagerFooter pager={pager} variant="dock" />
        </View>
      ) : null}

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
    </MessagesErrorBoundary>
  )
}

const styles = StyleSheet.create({
  // No container `gap` — it stacked on top of listTopPad and inflated the header-to-card space.
  content: {},
  contentGrow: { flexGrow: 1 },
  contentBlockingError: { justifyContent: "center" },
  unreadNote: { fontWeight: "600", marginBottom: 8 },
  inlineError: { marginBottom: 8 },
  blockingErrorWrap: { paddingVertical: 12 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  pagerDock: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
  },
})
