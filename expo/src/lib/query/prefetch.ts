import type { QueryClient } from "@tanstack/react-query"
import type { StudentSession } from "../session"
import { digitalNotesApi } from "../digital-notes-api"
import { flashcardsApi, type FlashcardDeck, type FlashcardTierAccess } from "../flashcards-api"
import { courseInfoApi } from "../course-info-api"
import { fetchStudentNotifications } from "../student-notifications"
import { studentApi } from "../student-api"
import { fetchStudentDashboardBundle } from "../student-dashboard-stats"
import { instructorApi } from "../instructor-api"
import { instructorCourseNotesApi } from "../instructor-content-api"
import type { InstructorScope } from "../instructor-content-api"
import { collaborationApi } from "../collaboration-api"
import {
  practiceApi,
  type LeaderboardEntry,
  type PracticeAccess,
  type PracticeLeaderboardDisplay,
  type PracticeLeaderboardPrivacy,
  type RecentSession,
  type TopicProgress,
} from "../practice-api"
import { practiceAccessFromMembership } from "../practice-hub-access"
import { ApiError } from "../student-api"
import { queryKeys } from "./keys"
import { facultyQueryScopeFromInstructor, studentQueryScope } from "./scope"
import { STALE_BY_RESOURCE } from "./stale"

/** Prefetch likely next destinations only — notes, flashcards, announcements, inbox, lectures. */
export async function prefetchStudentPhase1(queryClient: QueryClient, session: StudentSession): Promise<void> {
  const scope = studentQueryScope(session)
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.notes.mine(scope),
      queryFn: () => digitalNotesApi.listMyNotes(session),
      staleTime: STALE_BY_RESOURCE.studentNotes,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.notes.course(scope),
      queryFn: () => digitalNotesApi.listCourseNotes(session),
      staleTime: STALE_BY_RESOURCE.studentCourseNotes,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.flashcards.decks(scope),
      queryFn: () => flashcardsApi.listDecks(session),
      staleTime: STALE_BY_RESOURCE.studentFlashcards,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.announcements.list(scope),
      queryFn: () => courseInfoApi.getAnnouncements(session),
      staleTime: STALE_BY_RESOURCE.studentAnnouncements,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.notifications.inbox({
        ...scope,
        courseId: session.courseId ?? null,
      }),
      queryFn: () => fetchStudentNotifications(session),
      staleTime: STALE_BY_RESOURCE.studentNotifications,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.lectures.list(scope),
      queryFn: () => studentApi.getLectures(session),
      staleTime: STALE_BY_RESOURCE.lectures,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.dashboard.bundle(scope),
      queryFn: () => fetchStudentDashboardBundle(session),
      staleTime: STALE_BY_RESOURCE.studentDashboard,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.practice.hub(scope),
      queryFn: () => fetchPracticeHubBundle(session),
      staleTime: STALE_BY_RESOURCE.practice,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.groups.list(scope),
      queryFn: () => fetchStudentGroupsBundle(session),
      staleTime: STALE_BY_RESOURCE.groups,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.student.officeHours.list(scope),
      queryFn: () => courseInfoApi.getOfficeHours(session),
      staleTime: STALE_BY_RESOURCE.officeHours,
    }),
  ])
}

export async function prefetchFacultyPhase2(queryClient: QueryClient, scope: InstructorScope): Promise<void> {
  if (scope.courseId == null) return
  const queryScope = facultyQueryScopeFromInstructor(scope)
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.announcements.list(queryScope),
      queryFn: () =>
        instructorApi.getAnnouncements(scope).then((announcements) => ({ announcements })),
      staleTime: STALE_BY_RESOURCE.facultyAnnouncements,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.notes.bundle(queryScope, "ALL"),
      queryFn: () => fetchFacultyNotesBundle(scope, "ALL"),
      staleTime: STALE_BY_RESOURCE.facultyCourseNotes,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.questionBank.list(queryScope),
      queryFn: () => fetchFacultyQuestionBankBundle(scope),
      staleTime: STALE_BY_RESOURCE.facultyQuestionBank,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.quizzes.list(queryScope, "quiz"),
      queryFn: () => fetchFacultyAssessmentsBundle(scope, "quiz"),
      staleTime: STALE_BY_RESOURCE.facultyAssessments,
    }),
  ])
}

export async function fetchFacultyQuestionBankBundle(scope: InstructorScope) {
  const [questions, topics, deletedRows, customTypes] = await Promise.all([
    instructorApi.getQuestionBank(scope),
    instructorApi.getQuestionBankTopics(scope),
    instructorApi.getQuestionBankDeleted(scope),
    instructorApi.getQuestionBankCustomTypes(scope),
  ])
  return {
    questions,
    topics,
    deleted: deletedRows.map((row) => ({
      ...row,
      deleted_at: row.deleted_at ?? "deleted",
    })),
    customTypes,
  }
}

export async function fetchFacultyAssessmentsBundle(scope: InstructorScope, assessmentType: string) {
  const [quizzes, sessionData, openIssues, deletedItems] = await Promise.all([
    instructorApi.getQuizzes(scope, assessmentType),
    instructorApi.getSessions(scope),
    instructorApi.getIssues(scope, "open", assessmentType),
    instructorApi.getDeletedAssessments(scope, assessmentType),
  ])
  return {
    quizzes,
    sessions: sessionData.sessions ?? [],
    openIssueCount: openIssues.length,
    deletedCount: deletedItems.length,
  }
}

export async function fetchFacultyOfficeHoursBundle(scope: InstructorScope) {
  const [requests, regularHours] = await Promise.all([
    instructorApi.getOfficeHours(scope),
    instructorApi.getRegularOfficeHours(scope).catch(() => []),
  ])
  return { requests, regularHours }
}

export async function fetchStudentGroupsBundle(session: StudentSession) {
  const [groupRes, discoverRes] = await Promise.all([
    collaborationApi.getGroups(session).catch(() => ({ groups: [] })),
    collaborationApi.getGroupsDiscover(session).catch(() => ({ openGroups: [] })),
  ])
  return {
    groups: groupRes.groups ?? [],
    discover: discoverRes.openGroups ?? [],
  }
}

export async function fetchStudentProjectsBundle(session: StudentSession) {
  try {
    const res = await collaborationApi.getProjects(session)
    return { projects: res.projects ?? [] }
  } catch {
    return { projects: [] }
  }
}

export async function fetchPracticeHubBundle(session: StudentSession): Promise<PracticeHubBundle> {
  let progress: { topics: TopicProgress[]; access?: PracticeAccess | null } = {
    topics: [],
    access: practiceAccessFromMembership("Scholar"),
  }
  let recent: { sessions: RecentSession[] } = { sessions: [] }

  try {
    progress = await practiceApi.getTopicsProgress(session)
  } catch (err) {
    if (!isPracticeMembershipDenied(err)) throw err
    progress = { topics: [], access: practiceAccessFromMembership("Scholar") }
  }

  try {
    recent = await practiceApi.getRecentSessions(session)
  } catch (err) {
    if (!isPracticeMembershipDenied(err)) throw err
    recent = { sessions: [] }
  }

  const [flashRes, gamRes] = await Promise.all([
    flashcardsApi.listDecks(session, true).catch(() => ({ courseDecks: [] as FlashcardDeck[], myDecks: [] as FlashcardDeck[] })),
    flashcardsApi.getGamification(session).catch(() => null),
  ])
  const practiceHubDecks = flashRes.courseDecks ?? []
  const courseTierAccess: FlashcardTierAccess | null = flashRes.studySettings?.tierAccess ?? null

  let leaderboard: LeaderboardEntry[] = []
  let leaderboardSelf: LeaderboardEntry | null = null
  let leaderboardPrivacy: PracticeLeaderboardPrivacy = { blurPeerNames: false }
  let leaderboardDisplay: PracticeLeaderboardDisplay = { showAccuracy: true, showResponseTime: true }
  let leaderboardLocked = false
  try {
    const lb = await practiceApi.getLeaderboard(session)
    leaderboard = lb.leaderboard ?? []
    leaderboardSelf = lb.currentStudent ?? null
    leaderboardPrivacy = lb.privacy
    leaderboardDisplay = lb.display
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 0
    if (status === 403) leaderboardLocked = true
  }

  return {
    topics: progress.topics ?? [],
    practiceAccess: progress.access ?? null,
    recentSessions: recent.sessions ?? [],
    practiceHubDecks,
    deckMastery: gamRes?.deckMastery ?? {},
    courseTierAccess,
    leaderboard,
    leaderboardSelf,
    leaderboardPrivacy,
    leaderboardDisplay,
    leaderboardLocked,
  }
}

export type PracticeHubBundle = {
  topics: TopicProgress[]
  practiceAccess: PracticeAccess | null
  recentSessions: RecentSession[]
  practiceHubDecks: FlashcardDeck[]
  deckMastery: Record<string, { pct: number }>
  courseTierAccess: FlashcardTierAccess | null
  leaderboard: LeaderboardEntry[]
  leaderboardSelf: LeaderboardEntry | null
  leaderboardPrivacy: PracticeLeaderboardPrivacy
  leaderboardDisplay: PracticeLeaderboardDisplay
  leaderboardLocked: boolean
}

function isPracticeMembershipDenied(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403
}

export async function fetchFacultyNotesBundle(scope: InstructorScope, topicSession: string) {
  const [notesRes, deletedRes, topicsRes, configRes, sessionsRes] = await Promise.all([
    instructorCourseNotesApi.listNotes(scope),
    instructorCourseNotesApi.listDeleted(scope),
    instructorCourseNotesApi.listTopics(scope, topicSession),
    instructorCourseNotesApi.getConfiguration(scope),
    instructorApi.getSessions(scope).catch(() => ({ sessions: [] })),
  ])
  return {
    notes: notesRes.notes ?? [],
    deletedNotes: deletedRes.notes ?? [],
    topics: topicsRes.topics ?? [],
    config: configRes,
    sessions: sessionsRes.sessions ?? [],
  }
}

export function seedAnnouncementsCache(
  queryClient: QueryClient,
  session: StudentSession,
  announcements: unknown[],
): void {
  const scope = studentQueryScope(session)
  queryClient.setQueryData(queryKeys.student.announcements.list(scope), { announcements })
}

export function seedStudentDashboardCache(
  queryClient: QueryClient,
  session: StudentSession,
  bundle: unknown,
): void {
  const scope = studentQueryScope(session)
  queryClient.setQueryData(queryKeys.student.dashboard.bundle(scope), bundle)
}

export function seedFacultyDashboardCache(
  queryClient: QueryClient,
  scope: InstructorScope,
  bundle: unknown,
): void {
  if (scope.courseId == null) return
  queryClient.setQueryData(queryKeys.faculty.dashboard.bundle(facultyQueryScopeFromInstructor(scope)), bundle)
}
