import type { QueryClient } from "@tanstack/react-query"
import type { CoraConfirmActionResult, CoraProposalTool } from "../cora/types"
import { invalidateByAction } from "./invalidation"
import type { QueryScope } from "./scope"

const CORA_TOOL_ACTIONS: Partial<Record<CoraProposalTool, keyof typeof import("./invalidation").INVALIDATION_GRAPH>> = {
  "personalNotes.create": "cora.personalNotes.create",
  "personalFlashcards.createDeck": "cora.personalFlashcards.createDeck",
  "announcement.publish": "cora.announcement.publish",
  "questionBank.createQuestions": "cora.questionBank.createQuestions",
  "assessment.createFromBank": "cora.assessment.createFromBank",
  "lecture.createShell": "cora.lecture.createShell",
  "personalPracticeQuiz.create": "cora.personalPracticeQuiz.create",
  "personalCalendar.createEvents": "cora.personalCalendar.createEvents",
  "calendar.createStudySessions": "cora.calendar.createStudySessions",
  "syllabus.saveSection": "cora.syllabus.saveSection",
  "syllabus.publishSection": "cora.syllabus.publishSection",
  "message.send": "cora.message.send",
}

export function applyCoraMutationToCache(
  queryClient: QueryClient,
  scope: QueryScope,
  result: CoraConfirmActionResult,
): void {
  if (!result.success) return
  const action = CORA_TOOL_ACTIONS[result.tool]
  if (!action) return
  const extra = {
    noteId: result.entity?.type === "note" ? result.entity.id : undefined,
    deckId: result.entity?.type === "flashcard_deck" ? result.entity.id : undefined,
    announcementId:
      result.entity?.type === "announcement" && typeof result.entity.id === "number"
        ? result.entity.id
        : undefined,
  }
  invalidateByAction(queryClient, scope, action, extra)
}
