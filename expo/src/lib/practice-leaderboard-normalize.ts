import type { StudentSession } from "./session"

export type LeaderboardEntry = {
  rank: number
  student_id?: number
  student_name?: string
  total_practice_points?: number
  current_streak_days?: number
  avg_practice_score?: number
  is_current_user?: boolean
}

export type PracticeLeaderboardPrivacy = {
  blurPeerNames: boolean
}

export type PracticeLeaderboardDisplay = {
  showAccuracy: boolean
  showResponseTime: boolean
}

function parseMetric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

export function practiceLeaderboardSession(session: StudentSession): string {
  return session.section?.trim() || session.courseCode?.trim() || ""
}

export function parsePracticeLeaderboardPrivacy(payload: Record<string, unknown>): PracticeLeaderboardPrivacy {
  const privacy = payload.leaderboardPrivacy
  if (privacy && typeof privacy === "object") {
    const record = privacy as Record<string, unknown>
    if (typeof record.blurPeerNames === "boolean") {
      return { blurPeerNames: record.blurPeerNames }
    }
  }
  return { blurPeerNames: payload.privacyMode === true }
}

export function parsePracticeLeaderboardDisplay(payload: Record<string, unknown>): PracticeLeaderboardDisplay {
  const display = payload.leaderboardDisplay
  if (display && typeof display === "object") {
    const record = display as Record<string, unknown>
    return {
      showAccuracy: record.showAccuracy !== false,
      showResponseTime: record.showResponseTime !== false,
    }
  }
  return { showAccuracy: true, showResponseTime: true }
}

export function normalizePracticeLeaderboardEntry(
  raw: unknown,
  viewerDatabaseId?: string,
): LeaderboardEntry | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const rank = parseMetric(record.rank)
  if (!rank) return null

  const studentIdRaw = record.student_id ?? record.studentId
  const studentId =
    typeof studentIdRaw === "number"
      ? studentIdRaw
      : typeof studentIdRaw === "string" && studentIdRaw.trim()
        ? Number(studentIdRaw)
        : undefined

  const studentName = pickString(record, ["student_name", "studentName", "full_name", "fullName", "name"])

  const viewerId = viewerDatabaseId?.trim()
  const viewerNumericId = viewerId ? Number.parseInt(viewerId, 10) : Number.NaN
  const isCurrentUser =
    record.is_current_user === true ||
    (Number.isFinite(viewerNumericId) && studentId != null && studentId === viewerNumericId)

  return {
    rank,
    student_id: Number.isFinite(studentId) ? studentId : undefined,
    student_name: studentName,
    total_practice_points: parseMetric(
      record.total_practice_points ?? record.totalPracticePoints ?? record.points ?? record.xp,
    ),
    current_streak_days: parseMetric(
      record.current_streak_days ?? record.currentStreakDays ?? record.streak,
    ),
    avg_practice_score: parseMetric(
      record.avg_practice_score ?? record.avgPracticeScore ?? record.accuracy ?? record.avg_score,
    ),
    is_current_user: isCurrentUser,
  }
}

/** Ensures the signed-in student appears even when outside the fetched page window. */
export function mergePracticeLeaderboardEntries(
  rows: LeaderboardEntry[],
  currentStudent: LeaderboardEntry | null | undefined,
): LeaderboardEntry[] {
  const merged = [...rows]
  if (!currentStudent) {
    return merged.sort((a, b) => a.rank - b.rank)
  }

  const existingIndex = merged.findIndex(
    (entry) =>
      entry.student_id != null &&
      currentStudent.student_id != null &&
      entry.student_id === currentStudent.student_id,
  )

  if (existingIndex >= 0) {
    merged[existingIndex] = {
      ...merged[existingIndex],
      ...currentStudent,
      is_current_user: true,
    }
  } else {
    merged.push({ ...currentStudent, is_current_user: true })
  }

  return merged.sort((a, b) => a.rank - b.rank)
}
