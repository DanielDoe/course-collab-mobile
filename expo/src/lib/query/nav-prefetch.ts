import type { QueryClient } from "@tanstack/react-query"
import type { AppSession } from "../session"
import { courseInfoApi } from "../course-info-api"
import { digitalNotesApi } from "../digital-notes-api"
import { flashcardsApi } from "../flashcards-api"
import { studentApi } from "../student-api"
import { messagesApi, messagesAuthFromSession } from "../messages-api"
import { fetchStudentDashboardBundle } from "../student-dashboard-stats"
import { fetchPracticeHubBundle, fetchStudentGroupsBundle, fetchStudentProjectsBundle } from "./prefetch"
import { queryKeys } from "./keys"
import { getFacultyQueryCourseId } from "./faculty-course"
import { facultyQueryScopeFromInstructor, studentQueryScope } from "./scope"
import { STALE_BY_RESOURCE } from "./stale"
import { instructorApi } from "../instructor-api"
import { fetchFacultyNotesBundle, fetchFacultyQuestionBankBundle, fetchFacultyAssessmentsBundle } from "./prefetch"

function studentRoutePrefetch(queryClient: QueryClient, session: Extract<AppSession, { portal: "student" }>, route: string) {
  const scope = studentQueryScope(session)
  if (route.includes("notes")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.notes.mine(scope),
      queryFn: () => digitalNotesApi.listMyNotes(session),
      staleTime: STALE_BY_RESOURCE.studentNotes,
    })
  }
  if (route.includes("flashcards")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.flashcards.decks(scope),
      queryFn: () => flashcardsApi.listDecks(session),
      staleTime: STALE_BY_RESOURCE.studentFlashcards,
    })
  }
  if (route.includes("practice")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.practice.hub(scope),
      queryFn: () => fetchPracticeHubBundle(session),
      staleTime: STALE_BY_RESOURCE.practice,
    })
  }
  if (route.includes("lectures")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.lectures.list(scope),
      queryFn: () => studentApi.getLectures(session),
      staleTime: STALE_BY_RESOURCE.lectures,
    })
  }
  if (route.includes("announcement")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.announcements.list(scope),
      queryFn: () => courseInfoApi.getAnnouncements(session),
      staleTime: STALE_BY_RESOURCE.studentAnnouncements,
    })
  }
  if (route.includes("calendar")) {
    const start = new Date()
    start.setDate(1)
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0)
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.calendar.range(scope, start.toISOString(), end.toISOString()),
      queryFn: async () => {
        const [eventsData, scheduleData] = await Promise.all([
          courseInfoApi.getCalendarEvents(session, { startDate: start, endDate: end }),
          courseInfoApi.getClassSchedule(session, { startDate: start, endDate: end }),
        ])
        return { personalEvents: eventsData, classMeetings: scheduleData.events ?? [], classSchedule: scheduleData }
      },
      staleTime: STALE_BY_RESOURCE.calendar,
    })
  }
  if (route.includes("groups")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.groups.list(scope),
      queryFn: () => fetchStudentGroupsBundle(session),
      staleTime: STALE_BY_RESOURCE.groups,
    })
  }
  if (route.includes("projects")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.projects.list(scope),
      queryFn: () => fetchStudentProjectsBundle(session),
      staleTime: STALE_BY_RESOURCE.projects,
    })
  }
  if (route.includes("office")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.officeHours.list(scope),
      queryFn: () => courseInfoApi.getOfficeHours(session),
      staleTime: STALE_BY_RESOURCE.officeHours,
    })
  }
  if (route.includes("grades")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.grades.bundle(scope),
      queryFn: () => studentApi.getGrades(session),
      staleTime: STALE_BY_RESOURCE.studentGrades,
    })
  }
  if (route.includes("messages")) {
    const auth = messagesAuthFromSession(session)
    if (!auth) return
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.messages.inbox(scope),
      queryFn: () => messagesApi.listThreads(auth),
      staleTime: STALE_BY_RESOURCE.messages,
    })
  }
  if (route.includes("dashboard")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.student.dashboard.bundle(scope),
      queryFn: () => fetchStudentDashboardBundle(session),
      staleTime: STALE_BY_RESOURCE.studentDashboard,
    })
  }
}

function facultyRoutePrefetch(
  queryClient: QueryClient,
  instructorId: number,
  courseId: number,
  route: string,
) {
  const scope = { instructorId, courseId }
  const queryScope = facultyQueryScopeFromInstructor(scope)
  if (route.includes("announcement")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.announcements.list(queryScope),
      queryFn: () => instructorApi.getAnnouncements(scope).then((announcements) => ({ announcements })),
      staleTime: STALE_BY_RESOURCE.facultyAnnouncements,
    })
  }
  if (route.includes("course-notes")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.notes.bundle(queryScope, "ALL"),
      queryFn: () => fetchFacultyNotesBundle(scope, "ALL"),
      staleTime: STALE_BY_RESOURCE.facultyCourseNotes,
    })
  }
  if (route.includes("question-bank")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.questionBank.list(queryScope),
      queryFn: () => fetchFacultyQuestionBankBundle(scope),
      staleTime: STALE_BY_RESOURCE.facultyQuestionBank,
    })
  }
  if (route.includes("quiz") || route.includes("homework") || route.includes("mid-semester") || route.includes("final")) {
    const type = route.includes("homework")
      ? "homework"
      : route.includes("mid-semester")
        ? "mid_semester"
        : route.includes("final")
          ? "final"
          : "quiz"
    return queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.quizzes.list(queryScope, type),
      queryFn: () => fetchFacultyAssessmentsBundle(scope, type),
      staleTime: STALE_BY_RESOURCE.facultyAssessments,
    })
  }
  if (route.includes("flashcard")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.flashcards.bundle(queryScope, "ALL", "ALL"),
      queryFn: async () => {
        const { fetchFacultyFlashcardsBundle } = await import("../../hooks/query/useFacultyFlashcards")
        return fetchFacultyFlashcardsBundle(scope, undefined, undefined)
      },
      staleTime: STALE_BY_RESOURCE.facultyFlashcards,
    })
  }
  if (route.includes("office")) {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.faculty.officeHours.bundle(queryScope),
      queryFn: async () => {
        const [requests, regularHours] = await Promise.all([
          instructorApi.getOfficeHours(scope),
          instructorApi.getRegularOfficeHours(scope).catch(() => []),
        ])
        return { requests, regularHours }
      },
      staleTime: STALE_BY_RESOURCE.officeHours,
    })
  }
  if (route.includes("students")) {
    return queryClient.prefetchQuery({
      queryKey: [...queryKeys.faculty.students.list(queryScope), "ALL"],
      queryFn: async () => {
        const { fetchFacultyStudentsBundle } = await import("../../hooks/query/useFacultyStudents")
        return fetchFacultyStudentsBundle(scope, "ALL")
      },
      staleTime: STALE_BY_RESOURCE.facultyStudents,
    })
  }
}

/** Begin fetching the tapped destination before the transition finishes. */
export function prefetchForRoute(queryClient: QueryClient, session: AppSession | null, route: string): void {
  if (!session || !route) return
  void (async () => {
    try {
      if (session.portal === "student") {
        await studentRoutePrefetch(queryClient, session, route)
        return
      }
      if (session.portal === "faculty") {
        const courseId = getFacultyQueryCourseId()
        if (courseId == null) return
        await facultyRoutePrefetch(queryClient, session.id, courseId, route)
      }
    } catch {
      // Prefetch is best-effort.
    }
  })()
}
