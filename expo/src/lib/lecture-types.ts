/** Instructor lecture extensions — mirrors web sample practice & workspace shapes. */

import type { QuestionMedia } from "./classroom-submission"
import type { CircuitWorkspace } from "./circuit-workspace"

export type SamplePracticeQuestionType = "mcq" | "true_false" | "select_all"

export type SamplePracticeOption = { id: string; text: string }

export type LectureSamplePracticeQuestion = {
  id: string
  title: string
  topic?: string
  difficulty?: string
  points?: number
  question_type: SamplePracticeQuestionType
  question_text: string
  options: SamplePracticeOption[]
  correct_answer?: string
  correct_answers?: string[]
  explanation?: string
  question_media?: QuestionMedia
}

export type LectureSamplePracticeConfig = {
  enabled: boolean
  button_label?: string
  questions: LectureSamplePracticeQuestion[]
}

/** Post-submit review from quiz-taker pipeline (`buildPracticeAnswerReview`). */
export type PracticeAnswerReviewOption = {
  letter: string
  text: string
  isSelected: boolean
  isCorrect: boolean
}

export type PracticeAnswerReview = {
  isCorrect: boolean
  /** True when score/points are between 0 and full credit (select-all partial). */
  isPartialCredit?: boolean
  score?: number
  pointsEarned?: number
  maxPoints?: number
  correctLetters: string[]
  correctTexts: string[]
  options: PracticeAnswerReviewOption[]
  summary: string
}

/** Post-submit engagement sync from sample-practice evaluate. */
export type LectureSamplePracticeEngagementResult = {
  recorded?: boolean
  pointsSynced?: boolean
  locked?: boolean
  pointsEarned?: number
}

/** Server evaluate response — correct answers are only available after submit. */
export type LectureSamplePracticeEvaluateResult = {
  question_id: string
  is_mcq_correct: boolean
  mcq_earned_fraction: number
  parts: Array<{
    id: string
    prompt: string
    selected: string | string[] | null
    correct_answer: string | string[] | null
    is_correct: boolean
    explanation?: string
    options?: Array<{ letter: string; text: string }>
  }>
  has_upload: boolean
  upload_acknowledged: boolean
  explanation?: string
  /** Same payload as web practice hub / sample practice panel. */
  answerReview?: PracticeAnswerReview | null
}

export type LectureSamplePracticeAttempt = {
  question_id: string
  is_correct: boolean
  score_percentage: number
  student_answer?: unknown
  completed_at?: string
  result?: LectureSamplePracticeEvaluateResult
}

export type LectureSamplePracticeStudentState = LectureSamplePracticeConfig & {
  attempts?: LectureSamplePracticeAttempt[]
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
  solution_unlocked?: boolean
  solution_available?: boolean
  instructor_solution_workspace?: CircuitWorkspace | null
}

export type LectureWorkspaceConfig = {
  enabled: boolean
  title: string
  button_label?: string
  questions: LectureWorkspaceQuestion[]
  /** questionId → saved student answer JSON */
  drafts?: Record<string, string>
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
    points: 1,
    question_type: "mcq",
    question_text: "",
    options: [
      { id: "A", text: "Option A" },
      { id: "B", text: "Option B" },
      { id: "C", text: "Option C" },
      { id: "D", text: "Option D" },
    ],
    correct_answer: "A",
    explanation: "",
  }
}

export function emptyWorkspaceQuestion(index: number): LectureWorkspaceQuestion {
  return {
    id: `ws-${Date.now()}-${index}`,
    category: "nodal",
    title: `Workspace Example ${index + 1}`,
    topic: "",
    question_text: "",
    step_by_step_solution: { format: "markdown_latex", content: [] },
  }
}
