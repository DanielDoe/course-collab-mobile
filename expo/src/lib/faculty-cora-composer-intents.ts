import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import { dispatchCoraIntent, type CoraIntentId } from "./cora-intents"
import type { FacultyCoraInstructorContext } from "./faculty-cora-instructor-context"

/** Maps attach-menu quick actions to the closest teaching-copilot capability mode. */
export const FACULTY_CORA_INTENT_CAPABILITY: Partial<Record<CoraIntentId, FacultyCoraCapabilityId>> = {
  "create-content": "create",
  "transform-content": "improve",
  "review-content": "review",
  "analyze-data": "analyze",
  "brainstorm-ideas": "assistant",
  "explain-concepts": "explain",
  "generate-feedback": "assistant",
  "summarize-content": "assistant",
  "automate-task": "automate",
}

export function buildFacultyCoraIntentStarter(
  intentId: CoraIntentId,
  context: FacultyCoraInstructorContext | null,
): string | null {
  const dispatched = dispatchCoraIntent(intentId, "faculty")
  if (!dispatched) return null

  const course = context?.activeCourse
  const courseLine = course
    ? `I'm working in ${course.courseCode} (${course.courseTitle}) as the instructor.`
    : "I'm the instructor for this course."

  const topicHint =
    course && course.topics.length > 0
      ? `Common topics here include ${course.topics.slice(0, 3).join(", ")}.`
      : ""

  return [courseLine, topicHint, dispatched.starterPrompt].filter(Boolean).join("\n\n")
}

export function facultyCoraIntentCapability(intentId: CoraIntentId): FacultyCoraCapabilityId | undefined {
  return FACULTY_CORA_INTENT_CAPABILITY[intentId]
}
