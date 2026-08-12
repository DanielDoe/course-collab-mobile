export type QuestionBankAiDifficulty = "easy" | "medium" | "hard"

export type DraftQuestionBankItem = {
  draftId: string
  question_text: string
  question_type: string
  difficulty: QuestionBankAiDifficulty
  topic: string
  options: string[]
  correct_answer: string | string[]
  hint: string | null
  explanation: string | null
  evaluation_mode: "auto" | "manual"
  answer_guidelines: string[]
  sample_answer: string | null
  subquestions: unknown[] | null
  source_note: string | null
}

export type QuestionBankDescribeRequest = {
  questionType: string
  description: string
  correctAnswer: string
  topic: string
  difficulty: QuestionBankAiDifficulty
  includeHint?: boolean
  includeExplanation?: boolean
}

export type QuestionBankPdfGenerationRequest = {
  questionType: string
  topic: string
  difficulty: QuestionBankAiDifficulty
  questionCount: number
  optionCount: number
  includeHint: boolean
  includeExplanation: boolean
  programmingLanguage: string
  subPartCount: number
  maxPdfPages: number
  additionalInstructions: string
}

export const PDF_GENERATION_SUPPORTED_TYPES = [
  "mcq",
  "true_false",
  "select_all",
  "fill_blank",
  "multi_part",
  "code_problem",
  "trace_output",
  "code_explain",
] as const

export function defaultPdfGenerationRequest(questionType = "mcq"): QuestionBankPdfGenerationRequest {
  return {
    questionType,
    topic: "",
    difficulty: "medium",
    questionCount: 5,
    optionCount: questionType === "true_false" ? 2 : 4,
    includeHint: true,
    includeExplanation: true,
    programmingLanguage: "C++",
    subPartCount: 3,
    maxPdfPages: 8,
    additionalInstructions: "",
  }
}

export function validatePdfGenerationRequest(req: QuestionBankPdfGenerationRequest): string | null {
  if (!req.topic.trim()) return "Topic is required."
  if (!PDF_GENERATION_SUPPORTED_TYPES.includes(req.questionType as (typeof PDF_GENERATION_SUPPORTED_TYPES)[number])) {
    return "This question type is not supported for PDF generation yet."
  }
  if (req.questionCount < 1 || req.questionCount > 15) {
    return "Generate between 1 and 15 questions per run."
  }
  if (req.maxPdfPages < 1 || req.maxPdfPages > 12) {
    return "PDF page limit must be between 1 and 12."
  }
  return null
}

export type DraftPreviewData = {
  question_text: string
  question_type: string
  difficulty?: string | null
  topic?: string | null
  hint?: string | null
  explanation?: string | null
  sample_answer?: string | null
  evaluation_mode?: string | null
  options?: unknown
  correct_answer?: unknown
  subquestions?: unknown
}

export function draftToPreviewData(draft: DraftQuestionBankItem): DraftPreviewData {
  return {
    question_text: draft.question_text,
    question_type: draft.question_type,
    difficulty: draft.difficulty,
    topic: draft.topic,
    hint: draft.hint,
    explanation: draft.explanation,
    sample_answer: draft.sample_answer,
    evaluation_mode: draft.evaluation_mode,
    options: draft.options,
    correct_answer: draft.correct_answer,
    subquestions: draft.subquestions,
  }
}
