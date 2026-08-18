import {
  codebenchApi,
  type CodebenchAnalysis,
  type CodebenchBadgeDetail,
  type CodebenchLeaderboardEntry,
  type CodebenchLearningPlan,
  type CodebenchStreak,
} from "./codebench-api"
import {
  codebenchFailureMessage,
  flattenSubmissions,
  latestSubmissionCode,
  submissionXpTotal,
  type NormalizedSubmission,
} from "./codebench-progress-logic"
import { loadCodebenchLatestCode } from "./codebench-prefs"
import type { StudentSession } from "./session"

export {
  codebenchFailureMessage,
  flattenSubmissions,
  latestSubmissionCode,
  submissionXpTotal,
  type NormalizedSubmission,
}

export type CodebenchProgressSnapshot = {
  streak: CodebenchStreak
  badges: Record<string, boolean>
  badgeDetails: Record<string, CodebenchBadgeDetail>
  leaderboard: CodebenchLeaderboardEntry[]
  dailyChallenge: import("./codebench-api").DailyChallenge | null
  submissions: NormalizedSubmission[]
  submissionCount: number
  totalXp: number
  latestCode: string
  analysis: CodebenchAnalysis | null
  learningPlan: CodebenchLearningPlan | null
  hasCodeSample: boolean
  /** Non-empty when one or more core requests failed — safe to surface as a retryable error. */
  error: string
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

async function loadInsights(session: StudentSession, code: string) {
  if (!code.trim()) {
    return {
      analysis: null as CodebenchAnalysis | null,
      learningPlan: null as CodebenchLearningPlan | null,
      failed: [] as string[],
    }
  }

  const failed: string[] = []
  const [analysis, learningPlan] = await Promise.all([
    codebenchApi.analyze(session, code).catch(() => {
      failed.push("analysis")
      return null
    }),
    codebenchApi.getLearningPlan(session, code).catch(() => {
      failed.push("learning plan")
      return null
    }),
  ])

  return { analysis, learningPlan, failed }
}

export async function fetchCodebenchProgress(session: StudentSession): Promise<CodebenchProgressSnapshot> {
  const failed: string[] = []
  const [streakRes, badgesRes, lbRes, subsRes, localCode] = await Promise.all([
    codebenchApi.getStreak(session).catch(() => {
      failed.push("streak")
      return { streakDays: 0 }
    }),
    codebenchApi.getBadges(session).catch(() => {
      failed.push("badges")
      return { badges: {}, badgeDetails: {} }
    }),
    codebenchApi.getLeaderboard(session).catch(() => {
      failed.push("leaderboard")
      return { leaderboard: [] }
    }),
    codebenchApi.getSubmissions(session).catch(() => {
      failed.push("submissions")
      return {
        codeSubmissions: [],
        practiceSubmissions: [],
        dailyChallengeSubmissions: [],
      }
    }),
    loadCodebenchLatestCode(),
  ])

  const submissions = flattenSubmissions(subsRes)
  const apiXp = submissionXpTotal(submissions)
  const latestCode = latestSubmissionCode(submissions) || localCode.trim()
  const totalXp = apiXp

  const dailyChallenge = await codebenchApi
    .getDailyChallenge(session)
    .then((res) => (res && "title" in res ? res : null))
    .catch(() => {
      failed.push("daily challenge")
      return null
    })

  const insights = await loadInsights(session, latestCode)
  failed.push(...insights.failed)
  const { analysis, learningPlan } = insights

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
    error: codebenchFailureMessage(failed),
  }
}
