import { flattenSubmissions, submissionXpTotal } from "./codebench-progress-logic"
import { codebenchApi, type CodebenchStreak } from "./codebench-api"
import { fetchPracticeHubBundle, type PracticeHubBundle } from "./query/prefetch"
import type { StudentSession } from "./session"
import { fetchStudentDashboardBundle } from "./student-dashboard-stats"
import { studentAuthenticatedRequest } from "./student-api"
import { normalizedStudentDatabaseId, studentContentPath } from "./student-content-context"
import { enrichStudentContentSession } from "./student-content-session"
import {
  buildPracticeTopicInsights,
  buildStudentActivityLog,
  calendarFromSubmissions,
  type HomeworkHistoryRow,
  type QuizHistoryRow,
  type StudentAnalyticsSnapshot,
} from "./student-analytics"

const EMPTY_PRACTICE: PracticeHubBundle = {
  topics: [],
  practiceAccess: null,
  recentSessions: [],
  practiceHubDecks: [],
  deckMastery: {},
  courseTierAccess: null,
  leaderboard: [],
  leaderboardSelf: null,
  leaderboardPrivacy: { blurPeerNames: false },
  leaderboardDisplay: { showAccuracy: true, showResponseTime: true },
  leaderboardLocked: false,
}

export async function fetchStudentAnalytics(session: StudentSession): Promise<StudentAnalyticsSnapshot> {
  const contentSession = await enrichStudentContentSession(session)
  const studentId = normalizedStudentDatabaseId(contentSession) || contentSession.databaseId
  const [dashboard, practice, quizHistory, homeworkHistory, streakRaw, submissionsRaw] = await Promise.all([
    fetchStudentDashboardBundle(session),
    fetchPracticeHubBundle(session).catch(() => EMPTY_PRACTICE),
    studentAuthenticatedRequest<{ quizHistory?: QuizHistoryRow[] }>(
      session,
      `/api/student/quiz-history?studentId=${encodeURIComponent(studentId)}`,
    ).catch(() => ({ quizHistory: [] as QuizHistoryRow[] })),
    studentAuthenticatedRequest<{ homeworkHistory?: HomeworkHistoryRow[] }>(
      session,
      studentContentPath(contentSession, "/api/student/homework-history", { studentId }),
    ).catch(() => ({ homeworkHistory: [] as HomeworkHistoryRow[] })),
    codebenchApi.getStreak(session).catch(() => ({ streakDays: 0 }) as CodebenchStreak),
    codebenchApi.getSubmissions(session).catch(() => ({
      codeSubmissions: [],
      practiceSubmissions: [],
      dailyChallengeSubmissions: [],
    })),
  ])

  const submissions = flattenSubmissions(submissionsRaw)
  const topicInsights = buildPracticeTopicInsights(practice.topics ?? [])
  const activity = buildStudentActivityLog({
    quizzes: quizHistory.quizHistory,
    homework: homeworkHistory.homeworkHistory,
    practice: practice.recentSessions,
    codebench: submissions,
  })

  const streakDays = Number(
    streakRaw.streakDays ?? (streakRaw as { streak_days?: number }).streak_days ?? 0,
  )

  return {
    stats: dashboard.stats,
    trend: dashboard.trend,
    comparison: dashboard.comparison,
    insights: dashboard.insights,
    topics: topicInsights.topics,
    focusTopic: topicInsights.focusTopic,
    strongestTopic: topicInsights.strongestTopic,
    practiceNext: topicInsights.practiceNext,
    activity,
    practiceSessions: practice.recentSessions.length,
    codebenchXp: submissionXpTotal(submissions),
    codebenchSubmissions: submissions.length,
    codebenchStreakDays: streakDays,
    codebenchCalendar: streakRaw.calendarData ?? calendarFromSubmissions(submissions),
  }
}
