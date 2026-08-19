import type { CoraCourseRoutingPolicy } from "./cora/models/course-policy"

export const AI_ASSISTANT_RESPONSE_STYLES = [
  { value: "helpful", label: "Detailed", description: "Thorough explanations" },
  { value: "concise", label: "Concise", description: "Short and direct" },
  { value: "encouraging", label: "Supportive", description: "Warm, motivating tone" },
] as const

export type AiAssistantResponseStyle = (typeof AI_ASSISTANT_RESPONSE_STYLES)[number]["value"]

export const AI_ASSISTANT_PUBLIC_MODES = [
  { label: "Cora", note: "Everyday answers while premium credits remain" },
  { label: "Cora Lite", note: "Cheaper lookups when credits are exhausted — same course data, no write tools" },
  { label: "Advanced Reasoning", note: "Hard STEM and exams, only if this course allows it" },
] as const

export const AI_ASSISTANT_ACCESS_TOGGLES = [
  {
    key: "enableAITutor" as const,
    label: "Enable Cora Assistant",
    description: "Students can open Cora Assistant in this course",
  },
  {
    key: "allowCodeDebugging" as const,
    label: "Code Help",
    description: "Cora may trace and debug student code in Code and CodeBench",
  },
  {
    key: "allowPracticeGeneration" as const,
    label: "Practice Generation",
    description: "Cora may propose extra Practice Hub quizzes. Students confirm before a quiz is created.",
  },
]

export const AI_ASSISTANT_PEDAGOGY_TOGGLES = [
  {
    key: "enableHints" as const,
    label: "Hints Before Solutions",
    description: "Match student Cora preference: guide first, do not dump the answer",
  },
  {
    key: "enableStepByStep" as const,
    label: "Step-By-Step",
    description: "Break complex answers into Cora Solve walkthroughs",
  },
  {
    key: "enableCodeExamples" as const,
    label: "Code Examples",
    description: "Include runnable examples when the student Cora Code tab is relevant",
  },
]

export const STUDENT_CORA_SETTING_CAPABILITIES = [
  { id: "explain", title: "Explain a Problem", description: "Break down any question step by step" },
  { id: "circuit", title: "Walk Me Through a Circuit", description: "Animated circuit analysis" },
  { id: "code-help", title: "Help Me Code", description: "Debug, trace, and visualize execution" },
  { id: "exam", title: "Prepare Me for an Exam", description: "Adaptive review and practice" },
  { id: "homework", title: "Review My Homework", description: "Course-aware feedback" },
  {
    id: "flashcards",
    title: "Generate Flashcards",
    description: "From lectures or topics. Cora proposes a personal deck. Nothing is saved until the student confirms.",
  },
  {
    id: "lecture",
    title: "Summarize Lecture",
    description: "Notes, glossary, and quiz. Lecture notes can be saved as a personal note after the student confirms.",
  },
  {
    id: "plan",
    title: "Create Study Plan",
    description: "Daily and exam schedules. Cora proposes a study plan. Nothing is saved until the student confirms.",
  },
] as const

export const STUDENT_WRITE_POLICY =
  "Notes, flashcards, practice quizzes, study plans, and calendar sessions are proposed in chat. Confirm writes once; replaying the same card does not create a second copy."

export const WORD_LIMIT_MIN = 100
export const WORD_LIMIT_MAX = 1000
export const WORD_LIMIT_STEP = 50

export function clampAiAssistantWordLimit(value: number): number {
  if (!Number.isFinite(value)) return 500
  const stepped = Math.round(value / WORD_LIMIT_STEP) * WORD_LIMIT_STEP
  return Math.min(WORD_LIMIT_MAX, Math.max(WORD_LIMIT_MIN, stepped))
}

export function aiAssistantSettingsMatchQuery(
  query: string,
  haystacks: Array<string | undefined | null>,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystacks.some((text) => (text ?? "").toLowerCase().includes(q))
}

export function routingPolicyMatchesQuery(query: string, policy: { label: string; note: string }): boolean {
  return aiAssistantSettingsMatchQuery(query, [policy.label, policy.note, "routing", "model", "cora", "reasoning"])
}

export type { CoraCourseRoutingPolicy }
