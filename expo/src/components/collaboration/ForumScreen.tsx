import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { COMM_SYSTEM } from "../../constants/faculty-communication-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  stripHtml,
  type ForumLeaderboardEntry,
  type ForumThread,
  type TutoringOffer,
} from "../../lib/collaboration-api"
import {
  CommEmptyState,
  CommSectionFooter,
} from "../faculty/faculty-communication-ui"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

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

function TutoringListCard({ offer, index }: { offer: TutoringOffer; index: number }) {
  return (
    <SignatureListCard
      index={index}
      title={offer.subject}
      subtitle={offer.tutor_name ?? "Student"}
      meta={formatRelativeTime(offer.created_at)}
      statusLabel="Tutoring offer"
      icon="school-outline"
      accent={COMM_SYSTEM.blue.color}
      showChevron={false}
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

export function ForumScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const SN = useThemedStudentNative()
  const native = useThemedNative()
  const [tab, setTab] = useState<ForumTab>("discussions")
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [tutoring, setTutoring] = useState<TutoringOffer[]>([])
  const [weeklyLb, setWeeklyLb] = useState<ForumLeaderboardEntry[]>([])
  const [allTimeLb, setAllTimeLb] = useState<ForumLeaderboardEntry[]>([])
  const [lbView, setLbView] = useState<"weekly" | "alltime">("weekly")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent")
  const [showTutorForm, setShowTutorForm] = useState(false)
  const [tutorSubject, setTutorSubject] = useState("")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [threadRes, , tutoringRes, lbRes] = await Promise.all([
        collaborationApi.getForumThreads(session, {
          search: tab === "discussions" ? search.trim() || undefined : undefined,
          sortBy,
        }),
        collaborationApi.getForumReputation(session),
        collaborationApi.getTutoringOffers(session),
        collaborationApi.getForumLeaderboard(session),
      ])
      setThreads(threadRes.threads ?? [])
      setTutoring(tutoringRes.offers ?? [])
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

  const leaderboard = lbView === "weekly" ? weeklyLb : allTimeLb

  const filteredTutoring = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tutoring
    return tutoring.filter(
      (offer) =>
        offer.subject.toLowerCase().includes(q) ||
        (offer.tutor_name ?? "").toLowerCase().includes(q) ||
        stripHtml(offer.description ?? "").toLowerCase().includes(q),
    )
  }, [tutoring, search])

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

  const submitTutoringOffer = async () => {
    if (!session || !tutorSubject.trim()) return
    try {
      await collaborationApi.createTutoringOffer(session, {
        offerType: "can_tutor",
        subject: tutorSubject.trim(),
      })
      setTutorSubject("")
      setShowTutorForm(false)
      await load()
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not post offer.")
    }
  }

  const searchPlaceholder =
    tab === "discussions"
      ? "Search discussions…"
      : tab === "tutoring"
        ? "Search tutoring offers…"
        : "Search rankings…"

  const trailingAction =
    tab === "discussions"
      ? {
          onPress: () => router.push("/collaboration/forum/new" as never),
          accessibilityLabel: "Start a thread",
          icon: "add" as const,
        }
      : tab === "tutoring"
        ? {
            onPress: () => setShowTutorForm(true),
            accessibilityLabel: "Offer tutoring",
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
    return (
      <>
        {threads.length === 0 ? (
          <CommEmptyState
            icon="chatbubbles-outline"
            title="No threads yet"
            body="Discussions from your class will show up here."
          />
        ) : (
          <View style={signatureListStyles.list}>
            {threads.map((thread, index) => (
              <ThreadListCard
                key={thread.id}
                index={index}
                thread={thread}
                onPress={() => router.push(`/collaboration/forum/thread/${thread.id}` as never)}
              />
            ))}
          </View>
        )}
        <CommSectionFooter>Tap a thread to read replies or vote on posts.</CommSectionFooter>
      </>
    )
  }

  function renderTutoringPage() {
    return (
      <>
        {filteredTutoring.length === 0 && !showTutorForm ? (
          <CommEmptyState
            icon="school-outline"
            title="No offers yet"
            body="Share a subject you can help with."
          />
        ) : (
          <View style={signatureListStyles.list}>
            {filteredTutoring.map((offer, index) => (
              <TutoringListCard key={offer.id} offer={offer} index={index} />
            ))}
          </View>
        )}
        {showTutorForm ? (
          <View style={styles.tutorForm}>
            <TextInput
              style={[styles.tutorInput, { backgroundColor: native.secondaryGrouped, color: native.label }]}
              value={tutorSubject}
              onChangeText={setTutorSubject}
              placeholder="Subject you can tutor"
              placeholderTextColor={native.tertiaryLabel}
            />
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: SN.accent },
                pressed && { opacity: NATIVE.pressedOpacity },
              ]}
              onPress={() => void submitTutoringOffer()}
            >
              <Text style={styles.primaryBtnText}>Post offer</Text>
            </Pressable>
          </View>
        ) : null}
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
        {filteredLeaderboard.map((entry, index) => (
          <LeaderboardListCard key={entry.student_id} entry={entry} rank={index} index={index} />
        ))}
      </View>
    )
  }

  return (
    <>
      <TabbedModuleLayout
        tabs={navTabs}
        tab={tab}
        onTabChange={setTab}
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
        pages={[renderDiscussionsPage(), renderTutoringPage(), renderLeaderboardPage()]}
      />
    </>
  )
}

const styles = StyleSheet.create({
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
  },
  lbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
  },
  lbRank: {
    width: 36,
    height: 36,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  lbRankText: { fontSize: 13, fontWeight: "600" },
  rowCopy: { flex: 1, gap: 4, minWidth: 0 },
  rowSubtitle: { lineHeight: 18 },
  lbPoints: { alignItems: "flex-end" },
  lbPointsValue: { fontSize: 16, fontWeight: "600" },
  tutorForm: { gap: 10 },
  tutorInput: {
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
})
