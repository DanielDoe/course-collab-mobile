import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "./keys"
import type { QueryScope } from "./scope"

export type InvalidationTarget =
  | "student.notes"
  | "student.notes.detail"
  | "student.flashcards"
  | "student.flashcards.deck"
  | "student.announcements"
  | "student.announcements.detail"
  | "student.notifications"
  | "student.dashboard"
  | "student.lectures"
  | "faculty.dashboard"
  | "faculty.announcements"
  | "faculty.notes"
  | "faculty.questionBank"
  | "faculty.quizzes"
  | "faculty.homework"
  | "faculty.students"
  | "faculty.flashcards"
  | "faculty.officeHours"
  | "student.practice"
  | "student.groups"
  | "student.projects"
  | "student.officeHours"
  | "student.calendar"
  | "student.messages"
  | "student.syllabus"
  | "faculty.messages"
  | "faculty.syllabus"

/**
 * Targeted invalidation graph. Never invalidate unrelated modules.
 * Faculty announcement create → faculty + student announcements + dashboard summary.
 * Question edit → question bank only unless an assessment explicitly embeds it.
 */
export const INVALIDATION_GRAPH: Record<string, InvalidationTarget[]> = {
  "student.notes.create": ["student.notes"],
  "student.notes.update": ["student.notes", "student.notes.detail"],
  "student.notes.delete": ["student.notes", "student.notes.detail"],
  "student.flashcards.deck.create": ["student.flashcards"],
  "student.flashcards.deck.update": ["student.flashcards", "student.flashcards.deck"],
  "student.flashcards.deck.delete": ["student.flashcards", "student.flashcards.deck"],
  "student.flashcards.card.mutate": ["student.flashcards", "student.flashcards.deck"],
  "student.announcements.view": ["student.announcements", "student.announcements.detail"],
  "student.announcements.react": ["student.announcements", "student.announcements.detail"],
  "student.announcements.comment": ["student.announcements.detail", "student.announcements"],
  "student.notifications.mutate": ["student.notifications"],
  "faculty.announcements.create": [
    "faculty.announcements",
    "faculty.dashboard",
    "student.announcements",
    "student.dashboard",
  ],
  "faculty.announcements.update": ["faculty.announcements", "student.announcements"],
  "faculty.announcements.send": ["faculty.announcements", "student.announcements", "student.dashboard"],
  "faculty.notes.mutate": ["faculty.notes", "student.notes"],
  "faculty.questionBank.mutate": ["faculty.questionBank"],
  "faculty.flashcards.mutate": ["faculty.flashcards", "student.flashcards"],
  "cora.personalNotes.create": ["student.notes"],
  "cora.personalFlashcards.createDeck": ["student.flashcards"],
  "cora.announcement.publish": ["faculty.announcements", "student.announcements", "student.dashboard"],
  "cora.questionBank.createQuestions": ["faculty.questionBank"],
  "cora.assessment.createFromBank": ["faculty.quizzes"],
  "cora.lecture.createShell": ["student.lectures"],
  "cora.personalPracticeQuiz.create": ["student.practice"],
  "student.officeHours.create": ["student.officeHours", "faculty.officeHours"],
  "faculty.officeHours.mutate": ["faculty.officeHours", "student.officeHours"],
  "student.groups.mutate": ["student.groups"],
  "student.projects.mutate": ["student.projects"],
  "cora.personalCalendar.createEvents": ["student.calendar"],
  "cora.calendar.createStudySessions": ["student.calendar"],
  "cora.syllabus.saveSection": ["student.syllabus", "faculty.syllabus"],
  "cora.syllabus.publishSection": ["student.syllabus", "faculty.syllabus"],
  "cora.message.send": ["student.messages", "faculty.messages"],
  "student.membership.activate": ["student.flashcards", "student.practice", "student.dashboard"],
}

export function invalidateTargets(
  queryClient: QueryClient,
  scope: QueryScope,
  targets: readonly InvalidationTarget[],
  extra?: { noteId?: string | number; deckId?: string | number; announcementId?: number },
): void {
  for (const target of targets) {
    switch (target) {
      case "student.notes":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.notes.root(scope) })
        break
      case "student.notes.detail":
        if (extra?.noteId != null) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.student.notes.detail(scope, extra.noteId),
          })
        }
        break
      case "student.flashcards":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.flashcards.root(scope) })
        break
      case "student.flashcards.deck":
        if (extra?.deckId != null) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.student.flashcards.deck(scope, extra.deckId),
          })
        }
        break
      case "student.announcements":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.announcements.root(scope) })
        break
      case "student.announcements.detail":
        if (extra?.announcementId != null) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.student.announcements.detail(scope, extra.announcementId),
          })
        }
        break
      case "student.notifications":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.notifications.root(scope) })
        break
      case "student.dashboard":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.dashboard.root(scope) })
        break
      case "student.lectures":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.lectures.root(scope) })
        break
      case "faculty.dashboard":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.dashboard.root(scope) })
        break
      case "faculty.announcements":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.announcements.root(scope) })
        break
      case "faculty.notes":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.notes.root(scope) })
        break
      case "faculty.questionBank":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.questionBank.root(scope) })
        break
      case "faculty.quizzes":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.quizzes.root(scope) })
        break
      case "faculty.homework":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.homework.root(scope) })
        break
      case "faculty.students":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.students.root(scope) })
        break
      case "faculty.flashcards":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.flashcards.root(scope) })
        break
      case "faculty.officeHours":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.officeHours.root(scope) })
        break
      case "student.practice":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.practice.root(scope) })
        break
      case "student.groups":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.groups.root(scope) })
        break
      case "student.projects":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.projects.root(scope) })
        break
      case "student.officeHours":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.officeHours.root(scope) })
        break
      case "student.calendar":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.calendar.root(scope) })
        break
      case "student.messages":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.messages.root(scope) })
        break
      case "student.syllabus":
        void queryClient.invalidateQueries({ queryKey: queryKeys.student.syllabus.root(scope) })
        break
      case "faculty.messages":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.messages.root(scope) })
        break
      case "faculty.syllabus":
        void queryClient.invalidateQueries({ queryKey: queryKeys.faculty.syllabus.root(scope) })
        break
      default:
        break
    }
  }
}

export function invalidateByAction(
  queryClient: QueryClient,
  scope: QueryScope,
  action: keyof typeof INVALIDATION_GRAPH,
  extra?: { noteId?: string | number; deckId?: string | number; announcementId?: number },
): void {
  invalidateTargets(queryClient, scope, INVALIDATION_GRAPH[action], extra)
}
