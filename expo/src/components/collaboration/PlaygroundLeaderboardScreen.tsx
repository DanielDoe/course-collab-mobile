import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { useThemedStudentNative, useNativeType } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  type PlaygroundLeaderboardEntry,
} from "../../lib/collaboration-api"
import { playgroundStudentLeaderboardFingerprint } from "../../lib/playground-leaderboard-utils"
import { getLastPlaygroundClassroomSession } from "../../lib/playground-session-lock"
import { ApiError } from "../../lib/student-api"
import { CollabEmpty } from "./collab-shared"
import { CollabFlowHeader } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"
import { PlaygroundLeaderboardPodium } from "./PlaygroundLeaderboardPodium"
import { PlaygroundLeaderboardListCard } from "./PlaygroundLeaderboardListCard"
import { signatureListStyles } from "../theme/TabbedModuleLayout"
import { AppButton } from "../theme/AppButton"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function normalizeLeaderboardEntry(
  entry: PlaygroundLeaderboardEntry & { is_current_user?: boolean },
): PlaygroundLeaderboardEntry {
  return {
    ...entry,
    score: Number(entry.score ?? 0),
    correctAnswers:
      entry.correctAnswers != null ? Number(entry.correctAnswers) : undefined,
    isCurrentUser: Boolean(entry.isCurrentUser ?? entry.is_current_user),
  }
}

export function PlaygroundLeaderboardScreen() {
  const { sessionId: sessionIdParam } = useLocalSearchParams<{ sessionId?: string }>()
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [resolvedSessionId, setResolvedSessionId] = useState<number | null>(null)
  const [entries, setEntries] = useState<PlaygroundLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const [pollLeaderboard, setPollLeaderboard] = useState(false)
  const [leaderboardFinalized, setLeaderboardFinalized] = useState(false)
  const [loadError, setLoadError] = useState("")
  const fingerprintRef = useRef("")

  useEffect(() => {
    const fromRoute = Number(sessionIdParam)
    if (Number.isFinite(fromRoute) && fromRoute > 0) {
      setResolvedSessionId(fromRoute)
      return
    }
    void getLastPlaygroundClassroomSession().then(setResolvedSessionId)
  }, [sessionIdParam])

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session || !resolvedSessionId) {
        if (!options?.silent) setLoading(false)
        return
      }
      const silent = options?.silent ?? false
      if (!silent) setLoading(true)
      setLoadError("")

      try {
        const res = await collaborationApi.getPlaygroundLeaderboard(session, resolvedSessionId)
        const nextEntries = (res.leaderboard ?? []).map((entry) => normalizeLeaderboardEntry(entry))
        const finalized = res.leaderboardFinalized ?? false
        setPollLeaderboard(!finalized)
        setLeaderboardFinalized(finalized)
        const fingerprint = playgroundStudentLeaderboardFingerprint(nextEntries)
        if (fingerprint !== fingerprintRef.current) {
          fingerprintRef.current = fingerprint
          setEntries(nextEntries)
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to load leaderboard."
        if (!silent) {
          fingerprintRef.current = ""
          setEntries([])
          setPollLeaderboard(false)
          setLeaderboardFinalized(false)
          setLoadError(message)
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [resolvedSessionId, session],
  )

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    if (!resolvedSessionId) {
      setLoading(false)
      setEntries([])
      return
    }
    void load()
  }, [load, resolvedSessionId, session])

  useFocusEffect(
    useCallback(() => {
      fingerprintRef.current = ""
      if (session && resolvedSessionId) void load({ silent: entries.length > 0 })
    }, [entries.length, load, resolvedSessionId, session]),
  )

  useEffect(() => {
    if (!session || !resolvedSessionId || !pollLeaderboard) return
    const timer = setInterval(() => void load({ silent: true }), 10000)
    return () => clearInterval(timer)
  }, [session, resolvedSessionId, pollLeaderboard, load])

  const onRefresh = useCallback(async () => {
    setPullRefreshing(true)
    try {
      await load({ silent: true })
    } finally {
      setPullRefreshing(false)
    }
  }, [load])

  const leaderboardTail = useMemo(() => entries.slice(3), [entries])
  const leaderboardTailPager = useFacultyListPager(leaderboardTail, String(resolvedSessionId ?? ""), "players", {
    preset: "compact",
  })

  const podiumSubtitle = leaderboardFinalized ? "Final rankings" : "Live classroom rankings"

  return (
    <View style={[styles.flex, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader
        title="Leaderboard"
        subtitle="Session rankings"
        fallbackHref="/module/playground"
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        refreshControl={
          resolvedSessionId ? (
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          ) : undefined
        }
      >
        {!resolvedSessionId ? (
          <CollabEmpty
            icon="podium-outline"
            title="No live session yet"
            body="Join a classroom session to see the live leaderboard for your class."
            actionLabel="Join live session"
            onAction={() => router.push("/collaboration/playground/join?mode=classroom" as never)}
          />
        ) : loading && entries.length === 0 ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : loadError ? (
          <CollabEmpty icon="alert-circle-outline" title="Could not load leaderboard" body={loadError} />
        ) : entries.length === 0 ? (
          <CollabEmpty
            icon="podium-outline"
            title="No scores yet"
            body="Scores appear here once students start answering in this live session."
          />
        ) : (
          <>
            <PlaygroundLeaderboardPodium
              entries={entries}
              title="Session leaders"
              subtitle={podiumSubtitle}
            />

            {entries.length > 3 ? (
              <View style={styles.listSection}>
                <Text style={[type.caption, styles.listHeading, { color: SN.secondaryLabel }]}>
                  All players
                </Text>
                <View style={signatureListStyles.list}>
                  {leaderboardTailPager.items.map((entry, index) => (
                    <PlaygroundLeaderboardListCard
                      key={`${entry.rank}-${entry.resultId ?? entry.displayName}`}
                      entry={entry}
                      index={leaderboardTailPager.page * leaderboardTailPager.pageSize + index + 3}
                    />
                  ))}
                </View>
                <FacultyListPagerFooter pager={leaderboardTailPager} />
              </View>
            ) : null}

            <AppButton
              label="Join another session"
              variant="ghost"
              fullWidth
              onPress={() => router.push("/collaboration/playground/join?mode=classroom" as never)}
            />
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  loader: { marginTop: 24 },
  listSection: { gap: 8 },
  listHeading: { fontWeight: "600", paddingHorizontal: 4 },
})
