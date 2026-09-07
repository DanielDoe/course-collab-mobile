/**
 * Shared Cora action proposal types (mirrors server confirmations).
 * The LLM never invents these — they arrive signed from the CourseCollab API.
 */

export type CoraProposalTool =
  | "announcement.publish"
  | "questionBank.createQuestions"
  | "assessment.createFromBank"
  | "message.send"
  | "syllabus.saveSection"
  | "syllabus.publishSection"
  | "lecture.createShell"
  | "account.passwordReset.approve"
  | "account.passwordReset.reject"
  | "personalFlashcards.createDeck"
  | "flashcard.generateFromBank"
  | "personalNotes.create"
  | "personalCalendar.createEvents"
  | "calendar.createStudySessions"
  | "personalPracticeQuiz.create"
  | "personalStudyPlan.create"
  // Server may issue registry capability IDs (e.g. "flashcards.create", "groups.join")
  // via propose_student_capability / propose_faculty_capability. Proposals are signed
  // server-side and confirmed by round-tripping the payload, so unknown IDs are safe.
  | (string & {})

export type CoraProposalPreviewField = {
  label: string
  value: string
}

export type CoraProposalPreview = {
  title: string
  summary: string
  fields: CoraProposalPreviewField[]
  confirmLabel: string
  entityType:
    | "announcement"
    | "question"
    | "assessment"
    | "message"
    | "syllabus"
    | "lecture"
    | "account"
    | "flashcard_deck"
    | "note"
    | "calendar_events"
    | "practice_quiz"
    | "study_plan"
    // New server entity types (registry capabilities) resolve routes best-effort;
    // unknown values render the generic proposal card without an open-module link.
    | (string & {})
}

export type CoraActionProposal = {
  actionId: string
  userId: number
  role: "student" | "faculty" | "admin"
  institutionId: number | null
  courseId: number | null
  tool: CoraProposalTool
  arguments: Record<string, unknown>
  createdAt: string
  expiresAt: string
  preview: CoraProposalPreview
  hash: string
}

export type CoraConfirmActionResult = {
  success: boolean
  message: string
  tool: CoraProposalTool
  entity?: {
    type: string
    id: number | string
    title?: string
    route?: string
  }
  undo?: {
    method: "delete" | "archive"
    entityType: string
    entityId: number
  }
  error?: string
}

export type CoraActivityEntry = {
  id: string
  tool: CoraProposalTool
  message: string
  entityType?: string
  entityId?: number | string
  entityTitle?: string
  route?: string
  courseId?: number | null
  createdAt: string
  role: "student" | "faculty" | "admin"
}
