import type { StudentContextPayload } from "../student-context-api"
import { CORA_CONTEXT_SOURCES } from "./data-scope"
import type { CoraContextSource, CoraRole } from "./types"

/**
 * Defense-in-depth: strip context fields that must never reach a student Cora prompt.
 * Primary enforcement remains on permission-aware backend APIs.
 */
export function filterStudentContextForCora(
  context: StudentContextPayload | null | undefined,
): StudentContextPayload | null {
  if (!context) return null

  return {
    profile: context.profile,
    account: context.account,
    membership: context.membership,
    grades: context.grades,
    announcements: context.announcements,
    flashcardDecks: context.flashcardDecks,
    digitalNotes: context.digitalNotes,
    strugglingTopics: context.strugglingTopics,
    strengths: context.strengths,
    topicMastery: context.topicMastery,
    calendarEvents: context.calendarEvents,
    upcomingAssessments: context.upcomingAssessments,
    missedDeadlines: context.missedDeadlines,
    assessmentResults: context.assessmentResults,
    liveGradeBreakdown: context.liveGradeBreakdown,
    knowledgeGraph: context.knowledgeGraph
      ? {
          updatedAt: context.knowledgeGraph.updatedAt,
          topics: context.knowledgeGraph.topics,
          assessments: context.knowledgeGraph.assessments,
          calendar: context.knowledgeGraph.calendar,
          lectures: context.knowledgeGraph.lectures,
          notifications: context.knowledgeGraph.notifications,
          summary: context.knowledgeGraph.summary,
        }
      : undefined,
    summary: context.summary,
    syncedAt: context.syncedAt,
    liveLookupAt: context.liveLookupAt,
  }
}

export function contextSourcesForRole(role: CoraRole): CoraContextSource[] {
  return CORA_CONTEXT_SOURCES[role]
}

export function contextSourceLabels(sources: CoraContextSource[]): string[] {
  return sources.map((s) => s.replace(/_/g, " "))
}
