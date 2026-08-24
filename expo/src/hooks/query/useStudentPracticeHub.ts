import { useQuery } from "@tanstack/react-query"
import { fetchPracticeHubBundle } from "../../lib/query/prefetch"
import { queryKeys, studentQueryScope, STALE_BY_RESOURCE } from "../../lib/query"
import type { StudentSession } from "../../lib/session"

export function useStudentPracticeHub(session: StudentSession | null, enabled = true) {
  const query = useQuery({
    queryKey: session
      ? queryKeys.student.practice.hub(studentQueryScope(session))
      : ["student", "practice", "idle", "hub"],
    queryFn: () => fetchPracticeHubBundle(session!),
    enabled: Boolean(session) && enabled,
    staleTime: STALE_BY_RESOURCE.practice,
    placeholderData: (previous) => previous,
  })
  const hasData = query.data != null
  return {
    topics: query.data?.topics ?? [],
    practiceAccess: query.data?.practiceAccess ?? null,
    recentSessions: query.data?.recentSessions ?? [],
    practiceHubDecks: query.data?.practiceHubDecks ?? [],
    deckMastery: query.data?.deckMastery ?? {},
    courseTierAccess: query.data?.courseTierAccess ?? null,
    leaderboard: query.data?.leaderboard ?? [],
    leaderboardSelf: query.data?.leaderboardSelf ?? null,
    leaderboardPrivacy: query.data?.leaderboardPrivacy ?? { blurPeerNames: false },
    leaderboardDisplay: query.data?.leaderboardDisplay ?? { showAccuracy: true, showResponseTime: true },
    leaderboardLocked: query.data?.leaderboardLocked ?? false,
    isInitialLoading: !hasData && query.isLoading,
    isRefreshing: query.isFetching,
    refreshFailed: query.isError && hasData,
    error: !hasData ? query.error : null,
    refetch: query.refetch,
  }
}
