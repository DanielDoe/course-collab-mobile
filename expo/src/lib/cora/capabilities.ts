/** Compact module capability packets for client-side tool discovery (mirrors server manifests). */

import {
  STUDENT_CORA_MODULE_REGISTRY,
  STUDENT_CORA_AUTHORIZATION_PRINCIPLE,
  type StudentCoraModuleId,
} from "./student-module-registry"
import {
  FACULTY_CORA_MODULE_REGISTRY,
  FACULTY_CORA_AUTHORIZATION_PRINCIPLE,
  DEFAULT_FACULTY_CAPABILITY_MODULES,
  type FacultyCoraModuleId,
} from "./faculty-module-registry"

export { STUDENT_CORA_MODULE_REGISTRY, STUDENT_CORA_AUTHORIZATION_PRINCIPLE }
export type { StudentCoraModuleId }
export {
  FACULTY_CORA_MODULE_REGISTRY,
  FACULTY_CORA_AUTHORIZATION_PRINCIPLE,
  DEFAULT_FACULTY_CAPABILITY_MODULES,
}
export type { FacultyCoraModuleId }

export const AnnouncementsCapability = {
  module: "announcements",
  version: 1,
  tools: ["propose_announcement"] as const,
  roles: ["faculty"] as const,
  confirmation: "required" as const,
  servicePath: "instructorApi.createAnnouncement → POST /api/announcements",
} as const

export const QuestionBankCapability = {
  module: "question-bank",
  version: 1,
  tools: ["generate_question_drafts", "propose_question_bank_create"] as const,
  roles: ["faculty"] as const,
  confirmation: "required" as const,
  servicePath: "instructorApi.bulkCreateQuestionBankQuestions",
  questionTypes: [
    "mcq",
    "true_false",
    "select_all",
    "fill_blank",
    "code_problem",
    "code_write",
    "code_write_plot",
    "code_explain",
    "debug_code",
    "trace_output",
    "multi_part",
    "circuit_submission",
  ] as const,
} as const

export const AssessmentFromBankCapability = {
  module: "quizzes",
  version: 1,
  tools: ["propose_assessment_from_bank", "analyze_assessment_results"] as const,
  roles: ["faculty"] as const,
  confirmation: "required" as const,
  servicePath: "createAssessmentFromBank → quizzes + quiz_questions",
} as const

export const FacultyMessageCapability = {
  module: "messages",
  version: 1,
  tools: ["propose_message_send"] as const,
  roles: ["faculty"] as const,
  confirmation: "required" as const,
  servicePath: "sendInstructorDirectMessage → sendDirectMessage",
} as const

export const PersonalFlashcardsCapability = {
  module: "flashcards",
  version: 1,
  tools: ["propose_personal_flashcards"] as const,
  roles: ["student"] as const,
  confirmation: "required" as const,
  servicePath: "flashcardsApi.createDeck + addCard",
  resourceClass: "student_owned" as const,
} as const

export const PersonalNotesCapability = {
  module: "notes",
  version: 1,
  tools: ["propose_personal_note"] as const,
  roles: ["student"] as const,
  confirmation: "required" as const,
  servicePath: "digitalNotesApi.createNote / exportWorkspaceToNotes",
  resourceClass: "student_owned" as const,
} as const

export const PersonalCalendarCapability = {
  module: "calendar",
  version: 1,
  tools: ["propose_calendar_study_sessions"] as const,
  roles: ["student"] as const,
  confirmation: "required" as const,
  servicePath: "student calendar study events",
  resourceClass: "student_owned" as const,
} as const

export const PersonalPracticeQuizCapability = {
  module: "practice",
  version: 1,
  tools: ["propose_practice_quiz"] as const,
  roles: ["student"] as const,
  confirmation: "required" as const,
  servicePath: "personalPracticeQuiz.create",
  resourceClass: "student_owned" as const,
} as const

export const PersonalStudyPlanCapability = {
  module: "progress-review",
  version: 1,
  tools: ["propose_study_plan"] as const,
  roles: ["student"] as const,
  confirmation: "required" as const,
  servicePath: "personalStudyPlan.create",
  resourceClass: "student_owned" as const,
} as const

export const AssessmentIntegrityCapability = {
  module: "quizzes",
  version: 1,
  tools: ["get_assessment_integrity", "review_released_attempt"] as const,
  roles: ["student"] as const,
  confirmation: "none" as const,
  servicePath: "Assessment Integrity Context (dynamic)",
  resourceClass: "assessment" as const,
  note: "Never use student+quiz=disabled. Capabilities follow attempt/release state.",
} as const

export const CORA_MODULE_CAPABILITIES = {
  announcements: AnnouncementsCapability,
  "question-bank": QuestionBankCapability,
  "assessment-from-bank": AssessmentFromBankCapability,
  messages: FacultyMessageCapability,
  flashcards: PersonalFlashcardsCapability,
  notes: PersonalNotesCapability,
  calendar: PersonalCalendarCapability,
  practice: PersonalPracticeQuizCapability,
  "progress-review": PersonalStudyPlanCapability,
  quizzes: AssessmentIntegrityCapability,
} as const

export function capabilitiesForRole(role: "student" | "faculty" | "admin") {
  return Object.values(CORA_MODULE_CAPABILITIES).filter((cap) =>
    (cap.roles as readonly string[]).includes(role),
  )
}

export function canUseModuleTool(
  role: "student" | "faculty" | "admin",
  moduleId: keyof typeof CORA_MODULE_CAPABILITIES,
): boolean {
  const cap = CORA_MODULE_CAPABILITIES[moduleId]
  return (cap.roles as readonly string[]).includes(role)
}

/** Load student module boundary from the full registry (preferred over CORA_MODULE_CAPABILITIES alone). */
export function studentOwnedWriteModules(): StudentCoraModuleId[] {
  return (Object.keys(STUDENT_CORA_MODULE_REGISTRY) as StudentCoraModuleId[]).filter(
    (id) => STUDENT_CORA_MODULE_REGISTRY[id].resourceClass === "student_owned",
  )
}

export function facultyModulesWithCapability(prefix: string): FacultyCoraModuleId[] {
  return (Object.keys(FACULTY_CORA_MODULE_REGISTRY) as FacultyCoraModuleId[]).filter((id) =>
    FACULTY_CORA_MODULE_REGISTRY[id].capabilities.some((c) => c.startsWith(prefix)),
  )
}
