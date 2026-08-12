export type CoraMode = "guided" | "explain"

export type CoraDomain = "circuit" | "coding" | "math" | "generic"

export type CoraSource = "lecture_workspace" | "sample_practice" | "custom"

export type CoraProblem = {
  source: CoraSource
  domain: CoraDomain
  title: string
  topic?: string
  questionText: string
  questionType: "circuit_submission" | "mcq" | string
  referenceSteps?: string[]
  mediaUrl?: string | null
  lectureId: number
  questionId: string
  studentDatabaseId: string
  bankQuestionId?: number
  quizId?: number
  expectedAnswer?: string | null
  hint?: string | null
  explanation?: string | null
  classroomSubmissionId?: number
}

export type CoraHintLevel = "almost" | "step" | "solution"

export type CoraHint = {
  level: CoraHintLevel
  text: string
  creditCost?: number
}

export type CoraCheckpointOption = {
  id: string
  label: string
  correct: boolean
  feedback?: string
}

export type CoraCheckpoint = {
  id: string
  prompt: string
  options: CoraCheckpointOption[]
  misconception?: string
}

export type CoraStepInteraction =
  | {
      type: "reflect"
      prompt: string
      placeholder?: string
    }
  | {
      type: "checkpoint"
      checkpoint: CoraCheckpoint
    }
  | {
      type: "confidence"
      prompt: string
      options?: Array<{ id: string; label: string }>
    }

export type CoraStep = {
  id: string
  index: number
  phase?: string
  title: string
  explanation: string
  interaction?: CoraStepInteraction
  hints?: CoraHint[]
  concepts?: string[]
}

export type CoraSessionSummary = {
  conceptsLearned?: string[]
  mistakesMade?: string[]
  skillsPracticed?: string[]
  recommendedNext?: string[]
}

export type CoraSession = {
  mode: CoraMode
  domain: CoraDomain
  source: CoraSource
  dataSource: "reference" | "ai" | string
  problem: CoraProblem & { mode?: CoraMode }
  steps: CoraStep[]
  finalAnswer?: string | null
  summary?: CoraSessionSummary
}

export type CoraSessionResponse = {
  session: CoraSession
}
