import type { PracticeAnswerReview } from "../lecture-types"

export type AssessmentQuestion = {
  id: number
  question_text: string
  question_type: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  option_e?: string
  correct_answer?: string
  time_limit?: number | null
  points?: number
  max_points?: number
  hint?: string | null
  hint_penalty?: number
  requires_code?: boolean
  anti_cheat_exempt?: boolean
  question_media?: unknown
  subquestions?: unknown
  solution_upload_config?: unknown
}

export type AssessmentQuizMeta = {
  id: number
  title: string
  time_per_question?: number
  available_until?: string
  section_config?: unknown
  course_timer?: unknown
  antiCheatConfig?: unknown
}

export type StartQuizResult = {
  success?: boolean
  attemptId: number
  attemptNumber?: number
  message?: string
  reused?: boolean
  isRetake?: boolean
  inWaitingList?: boolean
  position?: number
  error?: string
  partialScoreSubmitted?: boolean
  canRetake?: boolean
  upgradeRequired?: boolean
}

export type TakeQuizResult = {
  attemptId: number
  hasSaveAndFinishLaterAccess?: boolean
  quiz: AssessmentQuizMeta
  questions: AssessmentQuestion[]
}

export type AttemptState = {
  attemptId: number | null
  completedAt?: string | null
  currentQuestionIndex?: number
  questionTimeRemaining?: Record<string, number>
  sectionTimeRemaining?: Record<string, number>
  remainingTime?: number | null
  hasSaveAndFinishLaterAccess?: boolean
  answeredQuestionIds?: number[]
  submittedQuestionIds?: number[]
  lockedQuestionIds?: number[]
  flaggedQuestionIds?: number[]
  sessionExpired?: boolean
}

export type SavedAnswer = {
  questionId: number
  answer: string | null
  answerData?: unknown
  pointsEarned?: number
  isCorrect?: boolean
  aiFeedback?: unknown
}

export type EvaluateAnswerResult = {
  success?: boolean
  isCorrect?: boolean
  pointsEarned?: number
  maxPoints?: number
  feedback?: string
  aiGraded?: boolean
  requiresManualReview?: boolean
  requiresReview?: boolean
  score?: number
  aiFeedback?: unknown
  answerReview?: PracticeAnswerReview | null
}

export type FinalizeQuizResult = {
  success: boolean
  attemptId: number
  score: number
  correctCount?: number
  actualPointsEarned?: number
  totalPossiblePoints?: number
  totalQuestions?: number
  answeredCount?: number
}

export type AssessmentQuizSession = {
  attemptId: number
  quizId: number
  assessmentType: string
  apiType: string
  quiz: AssessmentQuizMeta
  questions: AssessmentQuestion[]
  hasSaveAndFinishLaterAccess: boolean
}
