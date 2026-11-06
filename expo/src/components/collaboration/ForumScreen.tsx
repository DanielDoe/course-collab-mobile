import { useCallback, useEffect, useMemo, useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  type ForumLeaderboardEntry,
  type ForumThread,
} from "../../lib/collaboration-api"
import {
  CommEmptyState,
  CommSectionFooter,
} from "../faculty/faculty-communication-ui"
import { ModuleShowMoreRow } from "../modules/ModuleScreen"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useModuleListPageSize } from "../../hooks/useModuleListPageSize"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

import { podiumRankColor } from "../../lib/leaderboard-podium-theme"

type ForumTab = "discussions" | "tutoring" | "leaderboard"

function medalColor(rank: number, accent: string): string | null {
  const medalRank = rank + 1
  if (medalRank >= 1 && medalRank <= 3) return podiumRankColor(medalRank)
  return null
}

function threadAuthor(thread: ForumThread): string {
  return thread.author_name ?? "Student"
}

function ThreadListCard({ thread, index, onPress }: { thread: ForumThread; index: number; onPress: () => void }) {
  const SN = useThemedStudentNative()
  const replies = thread.reply_count ?? 0
  const votes = (thread.upvotes ?? 0) - (thread.downvotes ?? 0)
  return (
    <SignatureListCard
      index={index}
      title={thread.title}
      subtitle={threadAuthor(thread)}
      meta={`${formatRelativeTime(thread.created_at)} · ${replies} repl${replies === 1 ? "y" : "ies"}`}
      metaIcon="chatbubble-outline"
      statusLabel={votes !== 0 ? `${votes > 0 ? "+" : ""}${votes} votes` : "Discussion"}
      icon="chatbubbles-outline"
      accent={SN.accent}
      onPress={onPress}
    />
  )
}

function LeaderboardListCard({ entry, rank, index }: { entry: ForumLeaderboardEntry; rank: number; index: number }) {
  const SN = useThemedStudentNative()
  const name = entry.full_name ?? entry.student_name ?? "Student"
  return (
    <SignatureListCard
      index={index}
      title={name}
      meta={`${entry.threads_count ?? 0} threads · ${entry.replies_count ?? 0} replies`}
      metaIcon="trophy-outline"
      trailingValue={String(entry.points)}
      statusLabel={`#${rank + 1}`}
      statusColor={medalColor(rank, SN.gold) ?? undefined}
      icon="ribbon-outline"
      accent={SN.accent}
      showChevron={false}
    />
  )
}

/** TabbedModuleLayout pages are plain ScrollViews — page long lists instead of mounting every row. */

export function ForumScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const [tab, setTab] = useState<ForumTab>("discussions")
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [weeklyLb, setWeeklyLb] = useState<ForumLeaderboardEntry[]>([])
  const [allTimeLb, setAllTimeLb] = useState<ForumLeaderboardEntry[]>([])
  const [lbView, setLbView] = useState<"weekly" | "alltime">("weekly")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const listPageSize = useModuleListPageSize({ preset: "standard" })
  const leaderboardPageSize = useModuleListPageSize({ preset: "compact" })
  const [threadCount, setThreadCount] = useState(listPageSize)
  const [leaderboardCount, setLeaderboardCount] = useState(leaderboardPageSize)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [threadRes, , lbRes] = await Promise.all([
        collaborationApi.getForumThreads(session, {
          search: tab === "discussions" ? search.trim() || undefined : undefined,
          sortBy,
        }),
        collaborationApi.getForumReputation(session),
        collaborationApi.getForumLeaderboard(session),
      ])
      setThreads(threadRes.threads ?? [])
      setWeeklyLb(lbRes.weekly ?? [])
      setAllTimeLb(lbRes.allTime ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load forum.")
      setThreads([])
    }
  }, [session, search, sortBy, tab])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  useEffect(() => {
    setFilterSheetOpen(false)
  }, [tab])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("forum", onRefresh)

  useEffect(() => {
    setThreadCount(listPageSize)
    setLeaderboardCount(leaderboardPageSize)
  }, [search, sortBy, lbView, listPageSize, leaderboardPageSize])

  const leaderboard = lbView === "weekly" ? weeklyLb : allTimeLb

  const filteredLeaderboard = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leaderboard
    return leaderboard.filter((entry) =>
      (entry.full_name ?? entry.student_name ?? "Student").toLowerCase().includes(q),
    )
  }, [leaderboard, search])

  const navTabs = useMemo(
    () => [
      { id: "discussions" as const, label: "Threads", icon: "chatbubbles-outline" as const },
      { id: "tutoring" as const, label: "Tutoring", icon: "school-outline" as const },
      { id: "leaderboard" as const, label: "Rank", icon: "trophy-outline" as const },
    ],
    [],
  )

  const searchPlaceholder =
    tab === "discussions" ? "Search discussions…" : "Search rankings…"

  const trailingAction =
    tab === "discussions"
      ? {
          onPress: () => router.push("/collaboration/forum/new" as never),
          accessibilityLabel: "Start a thread",
          icon: "add" as const,
        }
      : undefined

  const showSortFilter = tab === "discussions" || tab === "leaderboard"
  const sortFilterActive =
    tab === "discussions" ? sortBy !== "recent" : tab === "leaderboard" ? lbView !== "weekly" : false
  const sortFilterOptions =
    tab === "discussions"
      ? [
          { value: "recent", label: "Recent" },
          { value: "popular", label: "Popular" },
        ]
      : [
          { value: "weekly", label: "This week" },
          { value: "alltime", label: "All time" },
        ]
  const sortFilterValue = tab === "discussions" ? sortBy : lbView
  const sortFilterTitle = tab === "discussions" ? "Sort threads" : "Ranking period"
  const sortFilterSubtitle =
    tab === "discussions"
      ? "Choose how discussion threads are ordered."
      : "Switch between weekly and all-time standings."

  function renderDiscussionsPage() {
    if (threads.length === 0) {
      return (
        <CommEmptyState
          icon="chatbubbles-outline"
          title="No threads yet"
          body="Discussions from your class will show up here. Tap + to ask a question."
        />
      )
    }

    return (
      <>
        <View style={signatureListStyles.list}>
          {threads.slice(0, threadCount).map((thread, index) => (
            <ThreadListCard
              key={thread.id}
              index={index}
              thread={thread}
              onPress={() => router.push(`/collaboration/forum/thread/${thread.id}` as never)}
            />
          ))}
          <ModuleShowMoreRow
            variant="card"
            remaining={threads.length - threadCount}
            onPress={() => setThreadCount((prev) => prev + listPageSize)}
          />
        </View>
        <CommSectionFooter>Tap a thread to read replies or vote on posts.</CommSectionFooter>
      </>
    )
  }

  function renderLeaderboardPage() {
    return filteredLeaderboard.length === 0 ? (
      <CommEmptyState
        icon="trophy-outline"
        title="No rankings yet"
        body="Participate in discussions to climb the board."
      />
    ) : (
      <View style={signatureListStyles.list}>
        {filteredLeaderboard.slice(0, leaderboardCount).map((entry, index) => (
          <LeaderboardListCard key={entry.student_id} entry={entry} rank={index} index={index} />
        ))}
        <ModuleShowMoreRow
          variant="card"
          remaining={filteredLeaderboard.length - leaderboardCount}
          onPress={() => setLeaderboardCount((prev) => prev + leaderboardPageSize)}
        />
      </View>
    )
  }

  return (
    <>
      <TabbedModuleLayout
        tabs={navTabs}
        tab={tab}
        onTabChange={(next) => {
          if (next === "tutoring") {
            router.push("/collaboration/forum/tutoring" as never)
            return
          }
          setTab(next)
        }}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        error={error}
        chrome={
          <>
            <StudentSearchToolbar
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholder}
              showFilter={showSortFilter}
              filterActive={sortFilterActive}
              onOpenFilter={showSortFilter ? () => setFilterSheetOpen(true) : undefined}
              trailingAction={trailingAction}
            />
            {showSortFilter ? (
              <StudentFilterSheet
                visible={filterSheetOpen}
                title={sortFilterTitle}
                subtitle={sortFilterSubtitle}
                options={sortFilterOptions}
                value={sortFilterValue}
                onSelect={(value) => {
                  if (tab === "discussions") {
                    setSortBy(value as "recent" | "popular")
                  } else {
                    setLbView(value as "weekly" | "alltime")
                  }
                  setFilterSheetOpen(false)
                }}
                onClose={() => setFilterSheetOpen(false)}
              />
            ) : null}
          </>
        }
        pages={[renderDiscussionsPage(), <View />, renderLeaderboardPage()]}
      />
    </>
  )
}
