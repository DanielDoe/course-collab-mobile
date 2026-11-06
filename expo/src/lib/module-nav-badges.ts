import { quizItemIsDone } from "../components/assessments/assessment-list-logic"
import { studentApi, type QuizItem } from "./student-api"
import type { StudentSession } from "./session"
import { enrichStudentContentSession } from "./student-content-session"
import { messagesApi, messagesAuthFromSession } from "./messages-api"
import { rewardsApi } from "./rewards-api"
import { fetchNotificationCount } from "./student-dashboard-stats"
import {
  countPendingAccessRequests,
  mergeAccessRequestRows,
  recommendationGuestAsAccountRequest,
  summerCampRequestAsAccountRequest,
} from "./faculty-access-requests-utils"
import { instructorApi, type InstructorScope } from "./instructor-api"
import {
  countClassroomPointTasks,
  type StudentBadges,
} from "./module-nav-badge-resolvers"

export type {
  FacultyNavBadgeKey,
  StudentBadges,
  StudentNavBadgeKey,
} from "./module-nav-badge-resolvers"
export {
  EMPTY_STUDENT_BADGES,
  countClassroomPointTasks,
  resolveFacultyNavBadgeCount,
  resolveStudentNavBadgeCount,
  studentNavBadgeTotal,
} from "./module-nav-badge-resolvers"

export function countOpenAssessments(items: QuizItem[]): number {
  return items.filter((item) => !quizItemIsDone(item)).length
}

async function fetchAssessmentsByKind(session: StudentSession, kind: string): Promise<QuizItem[]> {
  const data = await studentApi.getQuizzes(session, kind)
  return data.quizzes ?? []
}

export async function fetchFacultyPendingAccessRequestCount(scope: InstructorScope): Promise<number> {
  const [account, summer, guests] = await Promise.allSettled([
    instructorApi.getAccountRequests(scope),
    instructorApi.getSummerCampers(scope, "requests"),
    instructorApi.getRecommendationGuestAccountRequests(scope),
  ])
  const accountRows = account.status === "fulfilled" ? account.value : []
  const summerRows =
    summer.status === "fulfilled"
      ? (summer.value.requests ?? []).map(summerCampRequestAsAccountRequest)
      : []
  const guestRows =
    guests.status === "fulfilled" ? guests.value.map(recommendationGuestAsAccountRequest) : []
  return countPendingAccessRequests(mergeAccessRequestRows(accountRows, summerRows, guestRows))
}

export async function fetchStudentModuleBadges(session: StudentSession): Promise<import("./module-nav-badge-resolvers").StudentBadges> {
  const contentSession = await enrichStudentContentSession(session)
  const messagesAuth = messagesAuthFromSession(session)

  const [
    quizzes,
    homework,
    midSemester,
    finals,
    classroomSubs,
    messagesData,
    notifications,
    attendanceSessions,
  ] = await Promise.all([
    fetchAssessmentsByKind(contentSession, "quiz").catch(() => [] as QuizItem[]),
    fetchAssessmentsByKind(contentSession, "homework").catch(() => [] as QuizItem[]),
    fetchAssessmentsByKind(contentSession, "mid_semester").catch(() => [] as QuizItem[]),
    fetchAssessmentsByKind(contentSession, "final").catch(() => [] as QuizItem[]),
    rewardsApi.getClassroomSubmissions(contentSession).catch(() => null),
    messagesAuth
      ? messagesApi.listThreads(messagesAuth).catch(() => ({ threads: [] }))
      : Promise.resolve({ threads: [] }),
    fetchNotificationCount(contentSession).catch(() => 0),
    rewardsApi.getStudentAttendanceSessions(contentSession).catch(() => ({ sessions: [] })),
  ])

  const unreadMessages = (messagesData.threads ?? []).reduce(
    (sum, thread) => sum + (thread.unreadCount ?? 0),
    0,
  )
  const attendanceOpen = (attendanceSessions.sessions ?? []).filter((s) => s.canCheckIn).length

  return {
    unreadMessages,
    notifications,
    openQuizzes: countOpenAssessments(quizzes),
    openHomework: countOpenAssessments(homework),
    openMidSemester: countOpenAssessments(midSemester),
    openFinalExams: countOpenAssessments(finals),
    classroomPointTasks: countClassroomPointTasks(classroomSubs),
    attendanceOpen,
  }
}
