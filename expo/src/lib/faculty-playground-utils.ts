import type { PlaygroundSession } from "./instructor-api"
import { facultyPlaygroundPhaseColor } from "./faculty-playground-theme"

export type PlaygroundSessionFilter = "all" | "lobby" | "live" | "ended"

export type PlaygroundSessionPhase = "lobby" | "live" | "ended"

export function playgroundSessionPhase(session: Pick<PlaygroundSession, "is_active" | "game_started">): PlaygroundSessionPhase {
  if (session.is_active && session.game_started) return "live"
  if (session.is_active) return "lobby"
  return "ended"
}

/** Lobby and ended sessions can edit snapshots; live games cannot. */
export function playgroundSessionQuestionsEditable(phase: PlaygroundSessionPhase): boolean {
  return phase !== "live"
}

export function playgroundSessionLabel(session: Pick<PlaygroundSession, "selected_topics" | "session_code">): string {
  const topics = session.selected_topics ?? []
  const lecture = topics.find((t) => t.includes("—") || t.toLowerCase().includes("lecture"))
  return lecture ?? topics[0] ?? session.session_code
}

/** Avoid repeating the session code as both title and subtitle. */
export function playgroundSessionSubtitle(
  session: Pick<PlaygroundSession, "selected_topics" | "session_code">,
): string | undefined {
  const label = playgroundSessionLabel(session)
  if (label !== session.session_code) return session.session_code
  const topics = session.selected_topics ?? []
  if (topics.length > 1) return `${topics.length} topics`
  return undefined
}

export function playgroundSessionStatusLabel(session: Pick<PlaygroundSession, "is_active" | "game_started">): string {
  const phase = playgroundSessionPhase(session)
  if (phase === "live") return "Live"
  if (phase === "lobby") return "Lobby open"
  return "Ended"
}

export function playgroundSessionStatusTone(
  session: Pick<PlaygroundSession, "is_active" | "game_started">,
): "live" | "warning" | "neutral" {
  const phase = playgroundSessionPhase(session)
  if (phase === "live") return "live"
  if (phase === "lobby") return "warning"
  return "neutral"
}

export function filterPlaygroundSessions(
  sessions: PlaygroundSession[],
  filter: PlaygroundSessionFilter,
  query: string,
): PlaygroundSession[] {
  const q = query.trim().toLowerCase()
  return sessions.filter((session) => {
    const phase = playgroundSessionPhase(session)
    if (filter === "lobby" && phase !== "lobby") return false
    if (filter === "live" && phase !== "live") return false
    if (filter === "ended" && phase !== "ended") return false
    if (!q) return true
    const hay = [
      session.session_code,
      playgroundSessionLabel(session),
      session.join_passcode ?? "",
      ...(session.selected_topics ?? []),
    ]
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })
}

/** Matches the web playground session grid. */
export const PLAYGROUND_SESSIONS_PAGE_SIZE = 6
export const PLAYGROUND_SESSIONS_FETCH_PAGE_SIZE = 200

export function playgroundSessionPageCount(
  total: number,
  pageSize = PLAYGROUND_SESSIONS_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize))
}

export function slicePlaygroundSessionPage<T>(
  items: T[],
  page: number,
  pageSize = PLAYGROUND_SESSIONS_PAGE_SIZE,
): T[] {
  const pageCount = playgroundSessionPageCount(items.length, pageSize)
  const safe = Math.min(Math.max(0, page), pageCount - 1)
  return items.slice(safe * pageSize, safe * pageSize + pageSize)
}

export function playgroundSessionPageLabel(
  total: number,
  page: number,
  pageSize = PLAYGROUND_SESSIONS_PAGE_SIZE,
): string {
  if (total <= 0) return "0 sessions"
  const pageCount = playgroundSessionPageCount(total, pageSize)
  const safe = Math.min(Math.max(0, page), pageCount - 1)
  const start = safe * pageSize + 1
  const end = Math.min(total, (safe + 1) * pageSize)
  return `Showing ${start}–${end} of ${total}`
}

export function nextPlaygroundSessionsFetchPage(args: {
  collected: number
  total: number
  currentPage: number
}): number | null {
  if (args.collected >= args.total) return null
  if (args.currentPage >= 20) return null
  return args.currentPage + 1
}

export function countPlaygroundSessionsByFilter(
  sessions: PlaygroundSession[],
): Record<PlaygroundSessionFilter, number> {
  return {
    all: sessions.length,
    lobby: sessions.filter((s) => playgroundSessionPhase(s) === "lobby").length,
    live: sessions.filter((s) => playgroundSessionPhase(s) === "live").length,
    ended: sessions.filter((s) => playgroundSessionPhase(s) === "ended").length}
}

export function stripQuestionPreview(text: string | null | undefined, max = 120): string {
  const plain = String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (plain.length <= max) return plain
  return `${plain.slice(0, max - 1)}…`
}

/** Session was run at least once (game started or previously ended). */
export function playgroundSessionHasBeenUsed(
  session: Pick<PlaygroundSession, "game_started" | "game_started_at" | "ended_at">,
): boolean {
  return Boolean(session.game_started || session.game_started_at || session.ended_at)
}

/** Anyone joined — leaderboard API will return rows. */
export function playgroundSessionHasLeaderboard(
  session: Pick<PlaygroundSession, "participant_count">,
): boolean {
  return (session.participant_count ?? 0) > 0
}

export function playgroundPhaseIcon(
  phase: PlaygroundSessionPhase,
): "radio-outline" | "hourglass-outline" | "checkmark-done-outline" {
  if (phase === "live") return "radio-outline"
  if (phase === "lobby") return "hourglass-outline"
  return "checkmark-done-outline"
}

export function playgroundPhaseColor(phase: PlaygroundSessionPhase): string {
  return facultyPlaygroundPhaseColor(phase)
}
