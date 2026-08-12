import type { IoniconName } from "../components/icons/ion-to-lucide-map"
import type { CoraRole, CoraToolId } from "./cora-rbac/types"

/** High-level AI intents — not CourseCollab modules. Shared across Cora surfaces. */
export type CoraIntentId =
  | "create-content"
  | "transform-content"
  | "review-content"
  | "analyze-data"
  | "brainstorm-ideas"
  | "explain-concepts"
  | "generate-feedback"
  | "summarize-content"
  | "automate-task"

export type CoraIntentDefinition = {
  id: CoraIntentId
  label: string
  icon: IoniconName
  roles: CoraRole[]
  /** Sent as the user turn to start a guided Cora conversation. */
  starterPrompt: string
  /** Maps to RBAC when the intent eventually invokes a tool. */
  rbacTool: CoraToolId
  /** Examples Cora may offer — not shown in the attach menu. */
  examples: string[]
}

const INSTRUCTOR_INTENTS: CoraIntentDefinition[] = [
  {
    id: "create-content",
    label: "Create content",
    icon: "sparkles-outline",
    roles: ["faculty"],
    rbacTool: "generate_questions",
    examples: [
      "Quiz",
      "Homework",
      "Midterm",
      "Final",
      "Flashcards",
      "Lecture",
      "Announcement",
      "Rubric",
      "Study guide",
      "Practice problems",
      "Coding exercise",
      "Project",
      "Discussion prompt",
      "Office hour agenda",
    ],
    starterPrompt:
      "I want to create something for my course. Ask what I'd like to create — quiz, homework, flashcards, lecture, rubric, study guide, practice problems, coding exercise, project, discussion prompt, or something else — then guide me step by step.",
  },
  {
    id: "transform-content",
    label: "Transform content",
    icon: "brush-outline",
    roles: ["faculty"],
    rbacTool: "generate_questions",
    examples: [
      "Rewrite",
      "Improve",
      "Simplify",
      "Expand",
      "Convert lecture → flashcards",
      "Convert PDF → quiz",
      "Convert slides → notes",
      "Translate",
      "Change difficulty",
      "Bloom's taxonomy conversion",
    ],
    starterPrompt:
      "I want to transform existing course material. Ask what content I have and what I'd like to do — rewrite, improve, simplify, expand, convert format, translate, change difficulty, Bloom's taxonomy, etc. — then guide me.",
  },
  {
    id: "review-content",
    label: "Review content",
    icon: "search-outline",
    roles: ["faculty"],
    rbacTool: "grade_assistance",
    examples: [
      "Review quiz",
      "Review lecture",
      "Review syllabus",
      "Review rubric",
      "Review assessment fairness",
      "Review learning objectives",
      "Check clarity",
      "Check consistency",
      "Check grammar",
    ],
    starterPrompt:
      "I want to review course content. Ask what I want reviewed — quiz, lecture, syllabus, rubric, fairness, learning objectives, clarity, consistency, grammar — then guide me through the review.",
  },
  {
    id: "analyze-data",
    label: "Analyze data",
    icon: "bar-chart-outline",
    roles: ["faculty"],
    rbacTool: "faculty_analytics",
    examples: [
      "Quiz statistics",
      "Grade distributions",
      "CSV upload",
      "Attendance",
      "Classroom points",
      "Student progress",
      "Assessment analytics",
      "Submission trends",
    ],
    starterPrompt:
      "I want to analyze course data. Ask what data I have or want to explore — quiz stats, grade distributions, CSV, attendance, classroom points, student progress, assessment analytics, submission trends — then guide me.",
  },
  {
    id: "brainstorm-ideas",
    label: "Brainstorm ideas",
    icon: "bulb-outline",
    roles: ["faculty"],
    rbacTool: "chat",
    examples: [
      "Classroom activities",
      "Assignment ideas",
      "Projects",
      "Labs",
      "Icebreakers",
      "Team activities",
      "Discussion prompts",
      "Research ideas",
    ],
    starterPrompt:
      "Help me brainstorm teaching ideas. Ask what area I want ideas for — activities, assignments, projects, labs, icebreakers, team work, discussion prompts, research — then explore options with me.",
  },
  {
    id: "explain-concepts",
    label: "Explain concepts",
    icon: "book-outline",
    roles: ["faculty", "student"],
    rbacTool: "learn_concepts",
    examples: [
      "Circuit theory",
      "Code",
      "Algorithms",
      "Graphs",
      "Standards",
      "Research paper",
      "AI output",
    ],
    starterPrompt:
      "I need help explaining a concept for teaching. Ask what topic or material I want explained — theory, code, algorithms, graphs, standards, a paper, or AI output — then explain clearly for my course context.",
  },
  {
    id: "generate-feedback",
    label: "Generate feedback",
    icon: "fitness-outline",
    roles: ["faculty"],
    rbacTool: "grade_assistance",
    examples: [
      "Assignment feedback",
      "Project feedback",
      "Recommendation comments",
      "Rubric comments",
      "Performance summaries",
      "Personalized study advice",
      "Peer review comments",
    ],
    starterPrompt:
      "I want to generate feedback for students. Ask what kind — assignment, project, recommendation, rubric comments, performance summary, personalized advice, peer review — then guide me to draft it.",
  },
  {
    id: "summarize-content",
    label: "Summarize content",
    icon: "document-text-outline",
    roles: ["faculty", "student"],
    rbacTool: "learn_concepts",
    examples: [
      "Summarize lecture",
      "Summarize PDF",
      "Summarize research paper",
      "Summarize meeting notes",
      "Summarize discussion",
      "Summarize student responses",
    ],
    starterPrompt:
      "I want to summarize content. Ask what I need summarized — lecture, PDF, paper, meeting notes, discussion, student responses — and how detailed the summary should be.",
  },
  {
    id: "automate-task",
    label: "Automate task",
    icon: "flash-outline",
    roles: ["faculty"],
    rbacTool: "faculty_automation",
    examples: [
      "Schedule announcement",
      "Reminder",
      "Weekly recap",
      "Office hour reminder",
      "Follow-up email",
      "Generate checklist",
      "Generate workflow",
    ],
    starterPrompt:
      "I want to automate a teaching task. Ask what I'd like to automate — announcement, reminder, weekly recap, office hour reminder, follow-up email, checklist, workflow — then help me set it up.",
  },
]

const INTENT_BY_ID = new Map<CoraIntentId, CoraIntentDefinition>(
  INSTRUCTOR_INTENTS.map((intent) => [intent.id, intent]),
)

/** Intents available for a Cora role (permission-filtered). */
export function getCoraIntentsForRole(role: CoraRole): CoraIntentDefinition[] {
  return INSTRUCTOR_INTENTS.filter((intent) => intent.roles.includes(role))
}

export function getCoraIntent(id: CoraIntentId): CoraIntentDefinition | undefined {
  return INTENT_BY_ID.get(id)
}

export type CoraIntentDispatchResult = {
  intent: CoraIntentDefinition
  /** User message to send — starts guided conversation, does not execute tools. */
  starterPrompt: string
  rbacTool: CoraToolId
}

/**
 * Central intent dispatcher. Quick actions route here — never directly to modules.
 * Returns a starter prompt for conversational guidance; tool execution happens later in chat.
 */
export function dispatchCoraIntent(intentId: CoraIntentId, role: CoraRole): CoraIntentDispatchResult | null {
  const intent = INTENT_BY_ID.get(intentId)
  if (!intent || !intent.roles.includes(role)) return null
  return {
    intent,
    starterPrompt: intent.starterPrompt,
    rbacTool: intent.rbacTool,
  }
}
