import type { PlaygroundSessionQuestion } from "./instructor-api"

export type PlaygroundSessionQuestionDraft = {
  questionText: string
  options: string[]
  correctAnswer: string
  explanation: string
  topic: string
  difficulty: string
}

export type PlaygroundSessionQuestionSnapshot = {
  id: number
  bankQuestionId: number
  questionOrder: number
  questionText: string
  questionType: string
  difficulty: string
  topic: string
  options: string[]
  correctAnswer: string
  explanation: string | null
}

export const PLAYGROUND_SNAPSHOT_FALLBACK_MESSAGE =
  "Question order and timer were saved. Session-only wording could not be updated. The Question Bank was not changed."

export function draftFromPlaygroundSessionQuestion(
  question: PlaygroundSessionQuestion,
): PlaygroundSessionQuestionDraft {
  return {
    questionText: question.questionText ?? "",
    options: Array.isArray(question.options) ? question.options.map((item) => String(item ?? "")) : [],
    correctAnswer: question.correctAnswer ?? "",
    explanation: question.explanation ?? "",
    topic: question.topic ?? "",
    difficulty: question.difficulty ?? "medium",
  }
}

export function playgroundQuestionUsesOptions(questionType: string): boolean {
  const type = questionType.trim().toLowerCase()
  return type === "" || type === "mcq" || type === "multiple_choice" || type === "select_all" || type === "true_false"
}

export function applyPlaygroundSessionQuestionDraft(
  question: PlaygroundSessionQuestion,
  draft: PlaygroundSessionQuestionDraft,
): { ok: true; question: PlaygroundSessionQuestion } | { ok: false; error: string } {
  const questionText = draft.questionText.trim()
  if (!questionText) return { ok: false, error: "Question text is required." }

  const options = draft.options.map((item) => item.trim())
  const filledOptions = options.filter(Boolean)
  const usesOptions = playgroundQuestionUsesOptions(question.questionType)
  if (usesOptions && filledOptions.length < 2) {
    return { ok: false, error: "Add at least two answer choices." }
  }

  const correctAnswer = draft.correctAnswer.trim()
  if (usesOptions) {
    if (!correctAnswer) return { ok: false, error: "Mark the correct answer." }
    if (!filledOptions.includes(correctAnswer)) {
      return { ok: false, error: "The correct answer must match one of the choices." }
    }
  }

  return {
    ok: true,
    question: {
      ...question,
      questionText,
      options: usesOptions ? filledOptions : options.filter(Boolean),
      correctAnswer,
      explanation: draft.explanation.trim() || null,
      topic: draft.topic.trim() || question.topic,
      difficulty: draft.difficulty.trim() || question.difficulty,
    },
  }
}

export function playgroundSessionQuestionSnapshot(
  question: PlaygroundSessionQuestion,
): PlaygroundSessionQuestionSnapshot {
  return {
    id: question.id,
    bankQuestionId: question.bankQuestionId,
    questionOrder: question.questionOrder,
    questionText: question.questionText,
    questionType: question.questionType,
    difficulty: question.difficulty,
    topic: question.topic,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  }
}

export function playgroundSessionQuestionsHaveSnapshotEdits(
  baseline: PlaygroundSessionQuestion[],
  current: PlaygroundSessionQuestion[],
): boolean {
  if (baseline.length !== current.length) return false
  return current.some((question, index) => {
    const original = baseline[index]
    if (!original || original.id !== question.id || original.bankQuestionId !== question.bankQuestionId) {
      return false
    }
    return (
      original.questionText !== question.questionText ||
      original.correctAnswer !== question.correctAnswer ||
      original.explanation !== question.explanation ||
      original.topic !== question.topic ||
      original.difficulty !== question.difficulty ||
      JSON.stringify(original.options ?? []) !== JSON.stringify(question.options ?? [])
    )
  })
}

export function buildPlaygroundSessionQuestionsPutBody(args: {
  questions: PlaygroundSessionQuestion[]
  durationSec: number
  includeSnapshots: boolean
}): {
  questionIds: number[]
  durationSec: number
  questions?: PlaygroundSessionQuestionSnapshot[]
} {
  const body: {
    questionIds: number[]
    durationSec: number
    questions?: PlaygroundSessionQuestionSnapshot[]
  } = {
    questionIds: args.questions.map((question) => question.bankQuestionId),
    durationSec: args.durationSec,
  }
  if (args.includeSnapshots) {
    body.questions = args.questions.map(playgroundSessionQuestionSnapshot)
  }
  return body
}

export function isPlaygroundQuestionsPayloadRejected(status: number): boolean {
  return status === 400 || status === 422
}
