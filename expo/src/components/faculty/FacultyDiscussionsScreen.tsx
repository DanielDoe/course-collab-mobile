import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import type { ForumThread } from "../../lib/collaboration-api"
import { COMM_MODULES, COMM_SYSTEM } from "../../constants/faculty-communication-theme"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { instructorApi } from "../../lib/instructor-api"
import {
  CommEmptyState,
  CommGroupedList,
  CommListRow,
  CommSectionFooter,
  CommSectionHeader,
  CommSegmentedControl,
  CommThreadRow,
  useFacultyCommunicationTheme,
} from "./faculty-communication-ui"
import { useFacultyModuleScrollPadding, FacultyFilterSheet, FacultySearchToolbar } from "./faculty-module-shell"
import { FacultyDiscussionNewThreadModal } from "./FacultyDiscussionNewThreadModal"
import { FacultyDiscussionThreadModal } from "./FacultyDiscussionThreadModal"
import { useModuleTheme } from "../../lib/themed-module-shell"


type Tab = "threads" | "moderation"
type SortBy = "recent" | "popular"

const ACCENT = COMM_MODULES.discussions.accent

const SORT_OPTIONS = [
  { value: "recent", label: "Recent" },
  { value: "popular", label: "Popular" },
]

export function FacultyDiscussionsScreen() {
  const { styles: moduleStyles } = useModuleTheme()
  const comm = useFacultyCommunicationTheme()
  const insets = useSafeAreaInsets()
  const scrollPad = useFacultyModuleScrollPadding(24)
  const router = useRouter()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<Tab>("threads")
  const [sortBy, setSortBy] = useState<SortBy>("recent")
  const [search, setSearch] = useState("")
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const rows = await instructorApi.getForumThreads(scope, { sortBy })
    setThreads(rows)
  }, [scope, sortBy])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load discussions."))
      .finally(() => setLoading(false))
  }, [ready, load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("forum", handleRefresh)

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter((thread) => {
      const hay = [thread.title, thread.description, thread.author_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [threads, search])

  function handleThreadCreated(threadId: number) {
    void load()
    setSelectedThreadId(threadId)
  }

  if (!ready) {
    return (
      <View style={[moduleStyles.root, styles.root]}>
        <CommEmptyState
          icon="chatbubbles-outline"
          title="Select a Course"
          body="Discussion threads are scoped to your active course."
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <CommSegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { id: "threads", label: "Threads" },
            { id: "moderation", label: "Moderation" },
          ]}
        />

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: comm.native.secondaryGrouped,
                borderRadius: comm.layout.sectionRadius,
              },
            ]}
          >
            <Text style={[comm.type.caption, { color: comm.tokens.danger }]}>{error}</Text>
          </View>
        ) : null}

        {tab === "threads" ? (
          <>
            <FacultySearchToolbar
              value={search}
              onChange={setSearch}
              placeholder="Search threads…"
              filterActive={sortBy !== "recent"}
              onOpenFilter={() => setFilterOpen(true)}
              trailingAction={{
                onPress: () => setComposeOpen(true),
                accessibilityLabel: "Start new thread"}}
            />

            {loading ? (
              <View
                style={[
                  styles.stateWrap,
                  {
                    backgroundColor: comm.native.secondaryGrouped,
                    borderRadius: comm.layout.sectionRadius,
                  },
                ]}
              >
                <ActivityIndicator color={FACULTY_COMMUNICATION_COLOR.link} />
              </View>
            ) : filteredThreads.length === 0 ? (
              <View
                style={[
                  styles.stateWrap,
                  {
                    backgroundColor: comm.native.secondaryGrouped,
                    borderRadius: comm.layout.sectionRadius,
                  },
                ]}
              >
                <CommEmptyState
                  icon="chatbubbles-outline"
                  title={threads.length === 0 ? "No Threads Yet" : "No Matches"}
                  body={
                    threads.length === 0
                      ? "Student forum posts will appear here."
                      : "Try another search term."
                  }
                />
              </View>
            ) : (
              <CommGroupedList>
                {filteredThreads.map((thread, index) => (
                  <CommThreadRow
                    key={thread.id}
                    thread={thread}
                    isLast={index === filteredThreads.length - 1}
                    onPress={() => setSelectedThreadId(thread.id)}
                  />
                ))}
              </CommGroupedList>
            )}

            <CommSectionFooter>Pull to refresh. Tap a thread to read replies.</CommSectionFooter>

            <CommSectionHeader title="Related" />
            <CommGroupedList>
              <CommListRow
                icon="megaphone-outline"
                iconColor={COMM_SYSTEM.orange.color}
                iconSoft={COMM_SYSTEM.orange.soft}
                title="Announcements"
                subtitle="Broadcast course-wide updates"
                onPress={() => router.push("/module/announcements" as never)}
              />
              <CommListRow
                icon="notifications-outline"
                iconColor={COMM_SYSTEM.blue.color}
                iconSoft={COMM_SYSTEM.blue.soft}
                title="Notifications"
                subtitle="Alerts from forum and course activity"
                onPress={() => router.push("/module/notifications" as never)}
                isLast
              />
            </CommGroupedList>
          </>
        ) : (
          <>
            <CommGroupedList>
              <CommListRow
                icon="pin-outline"
                iconColor={ACCENT.color}
                iconSoft={ACCENT.soft}
                title="Pin a Thread"
                subtitle="Keep important posts at the top of the board"
                meta="Soon"
                showChevron={false}
              />
              <CommListRow
                icon="eye-off-outline"
                iconColor={COMM_SYSTEM.gray.color}
                iconSoft={COMM_SYSTEM.gray.soft}
                title="Hide a Reply"
                subtitle="Remove inappropriate content from student view"
                meta="Soon"
                showChevron={false}
              />
              <CommListRow
                icon="flag-outline"
                iconColor={COMM_SYSTEM.red.color}
                iconSoft={COMM_SYSTEM.red.soft}
                title="Review Flags"
                subtitle="Student-reported posts needing attention"
                meta="Soon"
                showChevron={false}
                isLast
              />
            </CommGroupedList>
            <CommSectionFooter>Moderation actions will attach to thread detail in a future update.</CommSectionFooter>
          </>
        )}
      </ScrollView>

      <FacultyFilterSheet
        visible={filterOpen}
        title="Sort Threads"
        subtitle="Choose how threads are ordered."
        options={SORT_OPTIONS}
        value={sortBy}
        onSelect={(value) => {
          setSortBy(value as SortBy)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
      />

      <FacultyDiscussionNewThreadModal
        visible={composeOpen}
        scope={scope}
        onClose={() => setComposeOpen(false)}
        onCreated={handleThreadCreated}
      />

      <FacultyDiscussionThreadModal
        visible={selectedThreadId != null}
        scope={scope}
        threadId={selectedThreadId}
        onClose={() => setSelectedThreadId(null)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  errorBox: { padding: 12 },
  stateWrap: { minHeight: 160, justifyContent: "center" },
})
