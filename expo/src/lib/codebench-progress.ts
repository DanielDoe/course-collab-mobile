import {
  codebenchApi,
  type CodebenchAnalysis,
  type CodebenchBadgeDetail,
  type CodebenchLeaderboardEntry,
  type CodebenchLearningPlan,
  type CodebenchStreak,
  type CodebenchSubmissions,
  type DailyChallenge,
} from "./codebench-api"
import { loadCodebenchLatestCode, loadCodebenchXp } from "./codebench-prefs"
import type { StudentSession } from "./session"

type RawSubmission = {
  code?: string
  points_awarded?: number
  pointsAwarded?: number
  submitted_at?: string
  submittedAt?: string
}

export type NormalizedSubmission = {
  code?: string
  pointsAwarded: number
  submittedAt?: string
}

export type CodebenchProgressSnapshot = {
  streak: CodebenchStreak
  badges: Record<string, boolean>
  badgeDetails: Record<string, CodebenchBadgeDetail>
  leaderboard: CodebenchLeaderboardEntry[]
  dailyChallenge: DailyChallenge | null
  submissions: NormalizedSubmission[]
  submissionCount: number
  totalXp: number
  latestCode: string
  analysis: CodebenchAnalysis | null
  learningPlan: CodebenchLearningPlan | null
  hasCodeSample: boolean
}

function normalizeStreak(raw: CodebenchStreak & Record<string, unknown>): CodebenchStreak {
  const activityStats =
    raw.activityStats ??
    (raw.activity_stats as CodebenchStreak["activityStats"] | undefined)

  return {
    streakDays: Number(raw.streakDays ?? raw.streak_days ?? 0),
    calendarData: raw.calendarData ?? (raw.calendar_data as CodebenchStreak["calendarData"]),
    activityStats: activityStats
      ? {
          totalSubmissions: Number(
            activityStats.totalSubmissions ?? (activityStats as { total_submissions?: number }).total_submissions ?? 0,
          ),
          activeDays: Number(
            activityStats.activeDays ?? (activityStats as { active_days?: number }).active_days ?? 0,
          ),
        }
      : undefined,
  }
}

function normalizeLeaderboard(raw: CodebenchLeaderboardEntry): CodebenchLeaderboardEntry {
  return {
    student_id: Number(raw.student_id),
    student_name: raw.student_name,
    student_code: raw.student_code,
    section: raw.section,
    xp: Number(raw.xp ?? 0),
    total_activities: Number(raw.total_activities ?? (raw as { totalActivities?: number }).totalActivities ?? 0),
    rank: raw.rank != null ? Number(raw.rank) : undefined,
  }
}

function normalizeSubmission(raw: RawSubmission): NormalizedSubmission {
  return {
    code: raw.code,
    pointsAwarded: Number(raw.points_awarded ?? raw.pointsAwarded ?? 0),
    submittedAt: raw.submitted_at ?? raw.submittedAt,
  }
}

export function flattenSubmissions(subs: CodebenchSubmissions): NormalizedSubmission[] {
  const buckets: RawSubmission[][] = [
    subs.codeSubmissions ?? [],
    (subs.practiceSubmissions as RawSubmission[] | undefined) ?? [],
    (subs.dailyChallengeSubmissions as RawSubmission[] | undefined) ?? [],
  ]
  return buckets.flatMap((bucket) => bucket.map(normalizeSubmission))
}

export function submissionXpTotal(rows: NormalizedSubmission[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.pointsAwarded, 0))
}

export function latestSubmissionCode(rows: NormalizedSubmission[]): string {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.submittedAt ? Date.parse(a.submittedAt) : 0
    const tb = b.submittedAt ? Date.parse(b.submittedAt) : 0
    return tb - ta
  })
  return sorted.find((row) => row.code?.trim())?.code?.trim() ?? ""
}

async function loadInsights(session: StudentSession, code: string) {
  if (!code.trim()) {
    return { analysis: null as CodebenchAnalysis | null, learningPlan: null as CodebenchLearningPlan | null }
  }

  const [analysis, learningPlan] = await Promise.all([
    codebenchApi.analyze(session, code).catch(() => null),
    codebenchApi.getLearningPlan(session, code).catch(() => null),
  ])

  return { analysis, learningPlan }
}

export async function fetchCodebenchProgress(session: StudentSession): Promise<CodebenchProgressSnapshot> {
  const [streakRes, badgesRes, lbRes, subsRes, localXp, localCode] = await Promise.all([
    codebenchApi.getStreak(session).catch(() => ({ streakDays: 0 })),
    codebenchApi.getBadges(session).catch(() => ({ badges: {}, badgeDetails: {} })),
    codebenchApi.getLeaderboard(session).catch(() => ({ leaderboard: [] })),
    codebenchApi.getSubmissions(session).catch(() => ({
      codeSubmissions: [],
      practiceSubmissions: [],
      dailyChallengeSubmissions: [],
    })),
    loadCodebenchXp(),
    loadCodebenchLatestCode(),
  ])

  const submissions = flattenSubmissions(subsRes)
  const apiXp = submissionXpTotal(submissions)
  const latestCode = latestSubmissionCode(submissions) || localCode.trim()
  const totalXp = Math.max(apiXp, localXp)

  const dailyChallenge = await codebenchApi
    .getDailyChallenge(session)
    .then((res) => (res && "title" in res ? res : null))
    .catch(() => null)

  const { analysis, learningPlan } = await loadInsights(session, latestCode)

  return {
    streak: normalizeStreak(streakRes as CodebenchStreak & Record<string, unknown>),
    badges: badgesRes.badges ?? {},
    badgeDetails: badgesRes.badgeDetails ?? {},
    leaderboard: (lbRes.leaderboard ?? []).map(normalizeLeaderboard),
    dailyChallenge,
    submissions,
    submissionCount: submissions.length,
    totalXp,
    latestCode,
    analysis,
    learningPlan,
    hasCodeSample: Boolean(latestCode),
  }
}
