import { useCallback, useEffect, useMemo, useState } from "react"
import { View } from "react-native"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { assignmentKindLabel, isSolutionAssignment, shortenTaskTitle } from "../../lib/classroom-submission"
import { StudentSearchToolbar } from "../student/student-search-toolbar"
import {
  categoryLabel,
  formatRelativeTime,
  rewardsApi,
  type ClassroomLeaderboardEntry,
  type ClassroomPointRecord,
  type ClassroomSubmission,
} from "../../lib/rewards-api"
import { EmptyBlock, useRewardsTheme } from "./rewards-shared"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { SignatureListCard } from "../theme/SignatureListCard"
import { TabbedModuleLayout, signatureListStyles } from "../theme/TabbedModuleLayout"
import { ClassroomPointsLeaderboardPodium } from "./ClassroomPointsLeaderboardPodium"
import { classroomPointsLeaderboardForCurrentOffering } from "../../lib/classroom-points-leaderboard-scope"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type Tab = "history" | "assignments" | "leaderboard"

function pointStatusColor(status: string | undefined): string {
  if (status === "approved") return "#16a34a"
  if (status === "pending") return "#d97706"
  if (status === "rejected") return "#dc2626"
  return "#64748b"
}

function PointListCard({
  item,
  index,
  onPress,
}: {
  item: ClassroomPointRecord
  index: number
  onPress: () => void
}) {
  const theme = useRewardsTheme()
  const pts = Number(item.points ?? 0)
  return (
    <SignatureListCard
      index={index}
      title={item.reason}
      meta={`${categoryLabel(item.category)} · ${formatRelativeTime(item.awarded_at)}`}
      statusLabel={item.status ?? "Awarded"}
      statusColor={pointStatusColor(item.status)}
      statusIcon={item.status === "approved" ? "checkmark-circle" : "ellipse"}
      trailingValue={`+${pts.toFixed(pts % 1 ? 1 : 0)}`}
      trailingValueColor={theme.primaryDark}
      icon="ribbon-outline"
      accent={theme.primary}
      onPress={onPress}
    />
  )
}

function LeaderboardListCard({ entry, index }: { entry: ClassroomLeaderboardEntry; index: number }) {
  const theme = useRewardsTheme()
  const isMe = entry.is_current_user
  return (
    <SignatureListCard
      index={index}
      title={`${entry.full_name ?? "Student"}${isMe ? " (you)" : ""}`}
      meta={`Rank #${entry.rank}`}
      metaIcon="podium-outline"
      trailingValue={String(Number(entry.total_points ?? 0))}
      trailingValueColor={theme.primary}
      icon="trophy-outline"
      accent={theme.primary}
      showChevron={false}
    />
  )
}

function AssignmentListCard({ sub, index, onPress }: { sub: ClassroomSubmission; index: number; onPress: () => void }) {
  const theme = useRewardsTheme()
  const isSolution = isSolutionAssignment(sub)
  const pending = sub.pending || sub.classroomPoint?.status === "pending"
  return (
    <SignatureListCard
      index={index}
      title={shortenTaskTitle(sub.title)}
      subtitle={assignmentKindLabel(sub.submission_kind)}
      meta={sub.due_at ? `Due ${formatRelativeTime(sub.due_at)}` : undefined}
      statusLabel={pending ? "Pending review" : "Open"}
      statusColor={pending ? "#d97706" : theme.primary}
      icon={isSolution ? "bulb-outline" : "terminal-outline"}
      accent={theme.primary}
      onPress={onPress}
    />
  )
}

export function ClassroomPointsScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const theme = useRewardsTheme()
  const [tab, setTab] = useState<Tab>("history")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [points, setPoints] = useState<ClassroomPointRecord[]>([])
  const [summary, setSummary] = useState<{ total_points?: number | string; award_count?: number }>({})
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([])
  const [pendingSubmissions, setPendingSubmissions] = useState<ClassroomSubmission[]>([])
  const [leaderboard, setLeaderboard] = useState<ClassroomLeaderboardEntry[]>([])
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [pointsData, subsData, lbData] = await Promise.all([
        rewardsApi.getClassroomPoints(session),
        rewardsApi.getClassroomSubmissions(session),
        rewardsApi.getClassroomLeaderboard(session),
      ])
      setPoints(pointsData.points ?? [])
      setSummary(pointsData.summary ?? {})
      setSubmissions(subsData.submissions ?? [])
      setPendingSubmissions(subsData.pendingSubmissions ?? [])
      setLeaderboard(lbData.leaderboard ?? [])
      setError("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load classroom points.")
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [session, load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("classroom-points", onRefresh)

  const sortedHistory = useMemo(
    () => {
      const q = search.trim().toLowerCase()
      const sorted = [...points].sort(
        (a, b) => new Date(b.awarded_at ?? 0).getTime() - new Date(a.awarded_at ?? 0).getTime(),
      )
      if (!q) return sorted
      return sorted.filter(
        (item) =>
          item.reason.toLowerCase().includes(q) ||
          categoryLabel(item.category).toLowerCase().includes(q),
      )
    },
    [points, search],
  )

  const taskItems = useMemo(() => {
    const byId = new Map<number, ClassroomSubmission>()
    for (const sub of [...submissions, ...pendingSubmissions]) {
      byId.set(sub.id, sub)
    }
    const items = Array.from(byId.values())
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((sub) => {
      const title = shortenTaskTitle(sub.title).toLowerCase()
      const preview =
        sub.question_config?.question_text?.trim()?.toLowerCase() ||
        sub.description?.trim()?.toLowerCase() ||
        ""
      return title.includes(q) || preview.includes(q) || assignmentKindLabel(sub.submission_kind).toLowerCase().includes(q)
    })
  }, [submissions, pendingSubmissions, search])

  const filteredLeaderboard = useMemo(() => {
    const awarded = session
      ? classroomPointsLeaderboardForCurrentOffering(leaderboard, session)
      : classroomPointsLeaderboardForCurrentOffering(leaderboard)
    const q = search.trim().toLowerCase()
    if (!q) return awarded
    return awarded.filter((entry) => (entry.full_name ?? "Student").toLowerCase().includes(q))
  }, [leaderboard, search, session])

  function openPointDetail(item: ClassroomPointRecord) {
    router.push(`/rewards/classroom-point/${item.id}`)
  }

  function openTask(sub: ClassroomSubmission) {
    router.push(`/rewards/classroom-task/${sub.id}`)
  }

  const tabs = useMemo(
    () => [
      { id: "history" as const, label: "History", icon: "time-outline" as const },
      { id: "assignments" as const, label: "Tasks", icon: "code-slash-outline" as const },
      { id: "leaderboard" as const, label: "Ranks", icon: "podium-outline" as const },
    ],
    [],
  )

  function renderHistoryPage() {
    if (sortedHistory.length === 0) {
      return (
        <EmptyBlock
          icon="ribbon-outline"
          title="No awards yet"
          body="Complete classroom tasks or get recognized in class to earn points."
        />
      )
    }
    return (
      <View style={signatureListStyles.list}>
        {sortedHistory.map((item, index) => (
          <PointListCard key={item.id} item={item} index={index} onPress={() => openPointDetail(item)} />
        ))}
      </View>
    )
  }

  function renderTasksPage() {
    if (taskItems.length === 0) {
      return (
        <EmptyBlock
          icon="code-slash-outline"
          title="No active assignments"
          body="When your instructor posts a classroom task, it will show up here."
        />
      )
    }
    return (
      <View style={signatureListStyles.list}>
        {taskItems.map((sub, index) => (
          <AssignmentListCard key={sub.id} sub={sub} index={index} onPress={() => openTask(sub)} />
        ))}
      </View>
    )
  }

  function renderLeaderboardPage() {
    if (filteredLeaderboard.length === 0) {
      return (
        <EmptyBlock
          icon="podium-outline"
          title="Leaderboard empty"
          body="Rankings appear once classmates start earning classroom points."
        />
      )
    }
    return (
      <View style={signatureListStyles.list}>
        <ClassroomPointsLeaderboardPodium entries={filteredLeaderboard} />
        {filteredLeaderboard.length > 3 ? (
          filteredLeaderboard.slice(3).map((entry, index) => (
            <LeaderboardListCard key={entry.rank} entry={entry} index={index + 3} />
          ))
        ) : null}
      </View>
    )
  }

  return (
    <TabbedModuleLayout
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      error={error}
      chrome={
        <StudentSearchToolbar
          value={search}
          onChange={setSearch}
          showFilter={false}
          placeholder={
            tab === "assignments"
              ? "Search classroom tasks…"
              : tab === "leaderboard"
                ? "Search rankings…"
                : "Search point history…"
          }
        />
      }
      pages={[renderHistoryPage(), renderTasksPage(), renderLeaderboardPage()]}
    />
  )
}
