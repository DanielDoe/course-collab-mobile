/** Instructor lecture extensions — mirrors web sample practice & workspace shapes. */

import type { QuestionMedia } from "./classroom-submission"
import type { CircuitWorkspace } from "./circuit-workspace"
import type { MultiPartSubQuestion } from "./lecture-sample-practice-utils"

export type LectureSamplePracticeQuestion = {
  id: string
  title: string
  topic?: string
  difficulty?: string
  question_text: string
  subquestions: MultiPartSubQuestion[]
  question_media?: QuestionMedia
}

export type LectureSamplePracticeConfig = {
  enabled: boolean
  button_label?: string
  questions: LectureSamplePracticeQuestion[]
}

export type LectureWorkspaceCategory = "nodal" | "mesh" | "thevenin_norton"

export type LectureWorkspaceQuestion = {
  id: string
  category: LectureWorkspaceCategory
  title: string
  topic?: string
  question_text: string
  question_media?: QuestionMedia
  step_by_step_solution: { format: "markdown_latex"; content: string[] }
  /** Instructor-published ink solution (read-only for students). */
  instructor_solution_workspace?: CircuitWorkspace | null
}

export type LectureWorkspaceConfig = {
  enabled: boolean
  title: string
  button_label?: string
  questions: LectureWorkspaceQuestion[]
}

export function defaultSamplePracticeConfig(): LectureSamplePracticeConfig {
  return { enabled: false, button_label: "Sample Practice", questions: [] }
}

export function defaultWorkspaceConfig(): LectureWorkspaceConfig {
  return { enabled: true, title: "In-Class Workspace", button_label: "Workspace", questions: [] }
}

export function emptySamplePracticeQuestion(index: number): LectureSamplePracticeQuestion {
  return {
    id: `new-${Date.now()}-${index}`,
    title: `Practical Example ${index + 1}`,
    topic: "",
    difficulty: "easy",
    question_text: "",
    subquestions: [
      {
        id: "a",
        type: "mcq",
        points: 1,
        prompt: "",
        options: [
          { id: "A", text: "Option A" },
          { id: "B", text: "Option B" },
          { id: "C", text: "Option C" },
          { id: "D", text: "Option D" },
        ],
        correct_answer: "A",
        explanation: ""},
    ]}
}

export function emptyWorkspaceQuestion(index: number): LectureWorkspaceQuestion {
  return {
    id: `new-${Date.now()}-${index}`,
    category: "nodal",
    title: `Problem ${index + 1}`,
    topic: "",
    question_text: "",
    step_by_step_solution: { format: "markdown_latex", content: [] }}
}

export const WORKSPACE_CATEGORIES: { value: LectureWorkspaceCategory; label: string }[] = [
  { value: "nodal", label: "Nodal analysis" },
  { value: "mesh", label: "Mesh analysis" },
  { value: "thevenin_norton", label: "Thevenin / Norton" },
]
