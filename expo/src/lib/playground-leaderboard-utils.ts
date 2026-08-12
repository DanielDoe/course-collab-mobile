import type { PlaygroundLeaderboardEntry } from "./instructor-api"

export type PlaygroundLeaderboardPollStatus = "waiting" | "playing" | "completed"

export function playgroundParticipantStatus(
  joinedAtQuestion: number,
  questionsAnswered: number,
  questionCount: number,
  completedAt: string | null | undefined,
): PlaygroundLeaderboardPollStatus {
  if (joinedAtQuestion < 0) return "waiting"
  if (completedAt || (questionCount > 0 && questionsAnswered >= questionCount)) return "completed"
  return "playing"
}

type PollEntry = { status?: PlaygroundLeaderboardPollStatus | string }
type PollStats = { waitingParticipants?: number; activeParticipants?: number } | null
type PollSession = { is_active?: boolean; game_started?: boolean; isActive?: boolean; gameStarted?: boolean } | null

/** True while scores may still change; false when the board is finalized. */
export function playgroundLeaderboardShouldPoll(
  entries: PollEntry[],
  stats?: PollStats,
  session?: PollSession,
): boolean {
  const sessionActive = session?.is_active ?? session?.isActive
  const gameStarted = session?.game_started ?? session?.gameStarted

  if (sessionActive === false) return false

  const hasWaiting =
    entries.some((entry) => entry.status === "waiting") || (stats?.waitingParticipants ?? 0) > 0
  const hasPlaying = entries.some((entry) => entry.status === "playing")

  if (hasWaiting || hasPlaying) return true

  if (entries.length === 0) return sessionActive === true || gameStarted === true

  return false
}

/** Stable fingerprint for student-facing leaderboard rows. */
export function playgroundStudentLeaderboardFingerprint(
  entries: Array<{
    rank: number
    resultId?: number
    displayName: string
    score: number
    correctAnswers?: number
    questionsAnswered?: number
    status?: string
  }>,
): string {
  return entries
    .map((entry) =>
      [
        entry.resultId ?? 0,
        entry.rank,
        entry.displayName,
        entry.score,
        entry.correctAnswers ?? 0,
        entry.questionsAnswered ?? 0,
        entry.status ?? "",
      ].join(":"),
    )
    .join("|")
}

type StatsSlice = {
  uniqueStudents?: number
  waitingParticipants?: number
  avgScore?: number
  maxScore?: number
} | null

/** Stable fingerprint so polling skips re-renders when nothing changed. */
export function playgroundLeaderboardFingerprint(
  entries: PlaygroundLeaderboardEntry[],
  stats: StatsSlice,
): string {
  const entrySlice = entries.map((entry) =>
    [
      entry.resultId,
      entry.rank,
      entry.score,
      entry.questionsAnswered,
      entry.correctAnswers,
      entry.status,
      entry.displayName || entry.studentName,
    ].join(":"),
  )
  const statsSlice = stats
    ? [
        stats.uniqueStudents ?? 0,
        stats.waitingParticipants ?? 0,
        stats.avgScore ?? 0,
        stats.maxScore ?? 0,
      ].join(":")
    : ""
  return `${entrySlice.join("|")}#${statsSlice}`
}

type PlaygroundRunLike = {
  mode?: "CLASSROOM" | "PERSONAL" | string
  completedAt?: string | null
  questionsAnswered?: number
}

/** Label for a student's own run history row (not a multiplayer name). */
export function formatPlaygroundRunLabel(run: PlaygroundRunLike, index: number): string {
  const modeLabel = run.mode === "CLASSROOM" ? "Live session" : "Solo practice"
  if (run.completedAt) {
    const date = new Date(run.completedAt)
    if (!Number.isNaN(date.getTime())) {
      return `${modeLabel} · ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    }
  }
  const answered = run.questionsAnswered ?? 0
  if (answered > 0) {
    return `${modeLabel} · ${answered} answered`
  }
  return `${modeLabel} · Run ${index + 1}`
}
