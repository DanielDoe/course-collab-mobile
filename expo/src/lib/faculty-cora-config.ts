import type { Ionicons } from "@expo/vector-icons"

/** Eight teaching-copilot capabilities — task-oriented, not course-specific. */
export type FacultyCoraCapabilityId =
  | "create"
  | "improve"
  | "analyze"
  | "explain"
  | "automate"
  | "review"
  | "assistant"
  | "insights"

export type FacultyCoraCapability = {
  id: FacultyCoraCapabilityId
  label: string
  emoji: string
  tagline: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  examplePrompts: string[]
  relatedModuleIds: string[]
}

export const FACULTY_CORA_TAGLINE = "Your AI teaching copilot"
export const FACULTY_CORA_GREETING = "What would you like help with today?"

/** Modules Cora must never mutate or advise changing via chat (financial / platform admin). */
export {
  FACULTY_CORA_RESTRICTED_MODULE_IDS,
  isFacultyCoraRestrictedModule,
} from "./cora-rbac/data-scope"

export const FACULTY_CORA_CAPABILITIES: FacultyCoraCapability[] = [
  {
    id: "create",
    label: "Create",
    emoji: "✨",
    tagline: "Build course content",
    description:
      "Generate assessments, lectures, study materials, and communication drafts from topics, slides, PDFs, or existing content.",
    icon: "add-circle-outline",
    examplePrompts: [
      "Generate 5 question bank items on Kirchhoff's laws",
      "Draft a weekly announcement for Homework 3",
      "Create flashcards from Lecture 6 notes",
      "Build a playground question set on loops",
    ],
    relatedModuleIds: [
      "question-bank",
      "quizzes",
      "homework",
      "mid-semester-exams",
      "final-exams",
      "practice",
      "playground",
      "classroom-points",
      "lectures",
      "course-notes",
      "flashcards",
      "announcements",
      "discussions",
      "projects",
      "recommendations",
    ],
  },
  {
    id: "improve",
    label: "Improve",
    emoji: "🪄",
    tagline: "Refine what you have",
    description:
      "Improve difficulty, wording, distractors, Bloom's level, and fairness for quizzes, homework, and question bank items.",
    icon: "color-wand-outline",
    examplePrompts: [
      "Improve this quiz for better discrimination",
      "Make these questions more conceptual",
      "Generate better distractors for question 12",
      "Reduce difficulty on Homework 4",
    ],
    relatedModuleIds: ["question-bank", "quizzes", "homework", "mid-semester-exams", "final-exams", "practice"],
  },
  {
    id: "analyze",
    label: "Analyze",
    emoji: "📊",
    tagline: "Discover course patterns",
    description:
      "Analyze assessments, results, attendance, practice, and discussions to find gaps, duplicates, and hard topics.",
    icon: "analytics-outline",
    examplePrompts: [
      "Which topics are students missing most?",
      "Compare Homework 3 vs Homework 4 difficulty",
      "Find duplicate questions in my bank",
      "Summarize quiz 2 item analysis",
    ],
    relatedModuleIds: ["results", "student-progress", "reports", "attendance", "practice", "question-bank", "discussions"],
  },
  {
    id: "explain",
    label: "Explain",
    emoji: "💡",
    tagline: "Clarify concepts and trends",
    description:
      "Explain why students miss questions, common misconceptions, grading trends, circuits, code, and AI flags.",
    icon: "bulb-outline",
    examplePrompts: [
      "Why are students missing KCL questions?",
      "Explain common misconceptions on recursion",
      "Explain this grading trend from Results",
      "Explain why the AI flagged this submission",
    ],
    relatedModuleIds: ["results", "student-progress", "office-hours", "messages", "student-support"],
  },
  {
    id: "automate",
    label: "Automate",
    emoji: "⚡",
    tagline: "Save repetitive work",
    description:
      "Plan weekly announcements, flashcard generation after lectures, review materials before exams, and office hour summaries.",
    icon: "flash-outline",
    examplePrompts: [
      "Plan weekly announcements for the next month",
      "Generate practice after each quiz this term",
      "Draft a pre-final review checklist",
      "Summarize today's office hours",
    ],
    relatedModuleIds: ["announcements", "flashcards", "practice", "office-hours", "lectures", "course-notes"],
  },
  {
    id: "review",
    label: "Review",
    emoji: "✅",
    tagline: "Quality-check your course",
    description:
      "Audit syllabi, lectures, assessments, rubrics, flashcards, and policies for coverage, accessibility, and consistency.",
    icon: "shield-checkmark-outline",
    examplePrompts: [
      "Review my syllabus for learning outcomes coverage",
      "Review Quiz 3 for ambiguous wording",
      "Review flashcards for this week's topic",
      "Review project rubric fairness",
    ],
    relatedModuleIds: ["syllabus", "lectures", "quizzes", "homework", "flashcards", "projects", "course-evaluations"],
  },
  {
    id: "assistant",
    label: "Assistant",
    emoji: "💬",
    tagline: "Ask anything about your course",
    description: "Open chat for open-ended help building, grading, organizing, and analyzing your course.",
    icon: "chatbubbles-outline",
    examplePrompts: [
      "Help me build Quiz 3",
      "Help answer this student email",
      "Help organize lectures by topic",
      "Help analyze grades from the midterm",
    ],
    relatedModuleIds: ["messages", "students", "quizzes", "results", "lectures"],
  },
  {
    id: "insights",
    label: "Insights",
    emoji: "📈",
    tagline: "Proactive recommendations",
    description:
      "See what Cora notices this week — struggling topics, completion drops, and content that may need a rewrite.",
    icon: "trending-up-outline",
    examplePrompts: [
      "What should I focus on this week?",
      "Which assessments need attention?",
      "Summarize student Cora usage trends",
      "What content gaps should I fill?",
    ],
    relatedModuleIds: ["dashboard", "recent-activity", "results", "student-progress", "reports"],
  },
]

export function facultyCoraCapability(id: FacultyCoraCapabilityId): FacultyCoraCapability {
  const found = FACULTY_CORA_CAPABILITIES.find((c) => c.id === id)
  if (!found) throw new Error(`Unknown faculty Cora capability: ${id}`)
  return found
}

export function facultyCoraModuleRoute(moduleId: string): string {
  const normalized = moduleId.trim().replace(/^\/+|\/+$/g, "")
  if (!normalized || normalized === "dashboard") return "/dashboard"
  if (normalized.startsWith("/module/")) return normalized
  if (normalized.startsWith("module/")) return `/${normalized}`
  return `/module/${normalized}`
}

/** Maps assessment API types to native faculty module routes. */
export function facultyCoraAssessmentModuleRoute(assessmentType?: string): string {
  switch (assessmentType) {
    case "homework":
      return "/module/homework"
    case "mid_semester":
      return "/module/mid-semester-exams"
    case "final":
      return "/module/final-exams"
    default:
      return "/module/quizzes"
  }
}
