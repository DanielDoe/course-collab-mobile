import type { LectureSamplePracticeEvaluateResult, PracticeAnswerReview } from "./lecture-types"
import { scoreSelectAllQuestion } from "./select-all-scoring"

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const

export type StructuredMcqOption = { id: string; text: string }

/** @deprecated Prefer StructuredMcqOption — string entries are normalized on parse. */
export type McqOption = StructuredMcqOption | string

export type GradableMcqSubQuestion = {
  id: string
  type: string
  prompt: string
  options: McqOption[]
  correct_answer?: string
  correct_answers?: string[]
}

function normalizeComparableText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]/g, "")
}

function optionIdForIndex(index: number): string {
  return LETTERS[index] ?? String(index + 1)
}

/** Normalize any stored options shape to schema `{ id, text }[]`. */
export function normalizeStructuredOptions(raw: unknown): StructuredMcqOption[] {
  if (raw == null || raw === "") return []

  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      return normalizeStructuredOptions(JSON.parse(trimmed))
    } catch {
      return trimmed
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text, index) => ({ id: optionIdForIndex(index), text }))
    }
  }

  if (Array.isArray(raw)) {
    return raw
      .map((opt, index) => {
        if (typeof opt === "string") {
          const text = opt.trim()
          return text ? { id: optionIdForIndex(index), text } : null
        }
        if (opt && typeof opt === "object") {
          const o = opt as Record<string, unknown>
          const text = String(o.text ?? o.option_text ?? o.label ?? "").trim()
          if (!text) return null
          const id = String(o.id ?? optionIdForIndex(index)).trim().toUpperCase() || optionIdForIndex(index)
          return { id, text }
        }
        const text = String(opt).trim()
        return text ? { id: optionIdForIndex(index), text } : null
      })
      .filter((opt): opt is StructuredMcqOption => opt != null)
  }

  if (typeof raw === "object") {
    const rec = raw as Record<string, unknown>
    return Object.keys(rec)
      .sort()
      .map((key) => {
        const text = String(rec[key] ?? "").trim()
        if (!text) return null
        return { id: key.trim().toUpperCase(), text }
      })
      .filter((opt): opt is StructuredMcqOption => opt != null)
  }

  return []
}

export function subquestionOptionLabels(
  sq: Pick<GradableMcqSubQuestion, "options">,
): { letter: string; text: string }[] {
  const structured = normalizeStructuredOptions(sq.options)
  return structured.map((opt, i) => ({
    letter: (opt.id || optionIdForIndex(i)).toUpperCase(),
    text: opt.text,
  }))
}

/** Map stored answer (letter, 0-based index, or legacy option text) to the option letter. */
export function resolveMcqCorrectLetter(sq: GradableMcqSubQuestion): string | undefined {
  const ans = (sq.correct_answer ?? "").trim()
  if (!ans) return undefined
  const labels = subquestionOptionLabels(sq)

  const byLetter = labels.find((l) => l.letter.toUpperCase() === ans.toUpperCase())
  if (byLetter) return byLetter.letter.toUpperCase()

  const numeric = Number(ans)
  if (Number.isInteger(numeric) && numeric >= 0 && numeric < labels.length) {
    return labels[numeric].letter.toUpperCase()
  }

  const normalizedAnswer = normalizeComparableText(ans)
  const byText = labels.find((l) => normalizeComparableText(l.text) === normalizedAnswer)
  if (byText) return byText.letter.toUpperCase()

  return undefined
}

/** Resolve select-all keys to letters for grading (stored values may be option text). */
export function resolveSelectAllCorrectLetters(sq: GradableMcqSubQuestion): string[] {
  const raw = sq.correct_answers ?? []
  if (!raw.length) return []
  const labels = subquestionOptionLabels(sq)
  return raw
    .map((entry) => {
      const trimmed = entry.trim()
      if (!trimmed) return ""
      const byLetter = labels.find((l) => l.letter.toUpperCase() === trimmed.toUpperCase())
      if (byLetter) return byLetter.letter.toUpperCase()
      const numeric = Number(trimmed)
      if (Number.isInteger(numeric) && numeric >= 0 && numeric < labels.length) {
        return labels[numeric].letter.toUpperCase()
      }
      const normalizedEntry = normalizeComparableText(trimmed)
      const byText = labels.find((l) => normalizeComparableText(l.text) === normalizedEntry)
      if (byText) return byText.letter.toUpperCase()
      return trimmed.toUpperCase()
    })
    .filter(Boolean)
}

/** Schema: select_all correct_answers are exact option text values, not IDs. */
export function canonicalizeSelectAllCorrectAnswers(sq: GradableMcqSubQuestion): string[] {
  const labels = subquestionOptionLabels(sq)
  const raw = sq.correct_answers ?? []
  return raw
    .map((entry) => {
      const trimmed = entry.trim()
      if (!trimmed) return ""
      if (/^[A-F]$/i.test(trimmed)) {
        const match = labels.find((l) => l.letter.toUpperCase() === trimmed.toUpperCase())
        return match?.text ?? trimmed
      }
      const normalizedEntry = normalizeComparableText(trimmed)
      const byText = labels.find((l) => normalizeComparableText(l.text) === normalizedEntry)
      return byText?.text ?? trimmed
    })
    .filter(Boolean)
}

export function normalizeGradableSubquestionAnswers<T extends GradableMcqSubQuestion>(sq: T): T {
  const structuredOptions = normalizeStructuredOptions(sq.options)
  const withOptions = { ...sq, options: structuredOptions }
  const type = withOptions.type.toLowerCase()

  if (type === "select_all") {
    const correct_answers = canonicalizeSelectAllCorrectAnswers(withOptions)
    return { ...withOptions, correct_answers }
  }

  const letter = resolveMcqCorrectLetter(withOptions)
  return letter ? { ...withOptions, correct_answer: letter } : withOptions
}

export type SelectAllGradeResult = {
  mcq_earned_fraction: number
  is_mcq_correct: boolean
  answerReview: PracticeAnswerReview
}

/** Per-option partial credit: +1/n for each correct selection, −1/n for each wrong selection. */
export function gradeSelectAllAnswer(
  sq: GradableMcqSubQuestion,
  selectedLetters: string[],
): SelectAllGradeResult {
  const normalized = normalizeGradableSubquestionAnswers({ ...sq, type: "select_all" })
  const labels = subquestionOptionLabels(normalized)
  const correctLetters = resolveSelectAllCorrectLetters(normalized).map((letter) => letter.toUpperCase())
  const correctSet = new Set(correctLetters)
  const selected = [
    ...new Set(selectedLetters.map((letter) => letter.trim().toUpperCase()).filter(Boolean)),
  ]
  const selectedSet = new Set(selected)
  const scored = scoreSelectAllQuestion(selected, correctLetters, 1)
  const mcq_earned_fraction = scored.fraction
  const is_mcq_correct = scored.isFullyCorrect

  const options = labels.map(({ letter, text }) => {
    const upper = letter.toUpperCase()
    return {
      letter: upper,
      text,
      isSelected: selectedSet.has(upper),
      isCorrect: correctSet.has(upper),
    }
  })

  const correctTexts = options.filter((row) => row.isCorrect).map((row) => row.text)
  const summary =
    mcq_earned_fraction === 1
      ? "Correct!"
      : mcq_earned_fraction > 0
        ? `Partially correct (${Math.round(mcq_earned_fraction * 100)}%).`
        : "Not quite."

  return {
    mcq_earned_fraction,
    is_mcq_correct,
    answerReview: {
      isCorrect: is_mcq_correct,
      isPartialCredit: mcq_earned_fraction > 0 && mcq_earned_fraction < 1,
      score: Math.round(mcq_earned_fraction * 100),
      correctLetters,
      correctTexts,
      options,
      summary,
    },
  }
}

/** Read select-all keys from an evaluate response: array, JSON-encoded array, or delimited string. */
function selectAllKeysFromEvaluateResult(
  result: LectureSamplePracticeEvaluateResult,
): string[] | undefined {
  const raw = result.parts?.[0]?.correct_answer
  if (raw == null) return undefined
  if (Array.isArray(raw)) {
    const entries = raw.map((entry) => String(entry).trim()).filter(Boolean)
    return entries.length > 0 ? entries : undefined
  }
  if (typeof raw === "string") {
    const entries = parseStoredSelectAllCorrectAnswers(raw)
    return entries.length > 0 ? entries : undefined
  }
  return undefined
}

export function normalizeSamplePracticeSelectAllResult(
  result: LectureSamplePracticeEvaluateResult,
  question: { question_type: string; options: McqOption[]; correct_answers?: string[] },
  selectedLetters: string[],
): LectureSamplePracticeEvaluateResult {
  if (question.question_type !== "select_all") return result

  const localKeys = question.correct_answers?.length ? question.correct_answers : undefined
  const correctAnswers = localKeys ?? selectAllKeysFromEvaluateResult(result)

  // The student GET strips answer keys, so keys are only available when the evaluate
  // response carries them. Without keys we cannot grade locally — regrading anyway
  // scores 0 and flags every option wrong, overwriting a correct server verdict.
  if (!correctAnswers?.length) return result

  const graded = gradeSelectAllAnswer(
    {
      id: "a",
      type: "select_all",
      prompt: "",
      options: question.options,
      correct_answers: correctAnswers,
    },
    selectedLetters,
  )

  return {
    ...result,
    is_mcq_correct: graded.is_mcq_correct,
    mcq_earned_fraction: graded.mcq_earned_fraction,
    answerReview: graded.answerReview,
  }
}

function parseStoredSelectAllCorrectAnswers(correctAnswer?: string): string[] {
  if (!correctAnswer?.trim()) return []
  const trimmed = correctAnswer.trim()
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry).trim()).filter(Boolean)
    }
  } catch {
    // fall through to delimiter split
  }
  return trimmed
    .split(/[,;|]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** Client-side fraction sent with evaluate/study writes when correct keys are available locally. */
export function resolveMcqEarnedFractionForSubmission(input: {
  questionType: string
  options: McqOption[]
  correctAnswer?: string
  correctAnswers?: string[]
  selectedLetters: string[]
}): number | undefined {
  const type = input.questionType.toLowerCase()
  const selected = input.selectedLetters.map((letter) => letter.trim().toUpperCase()).filter(Boolean)
  if (selected.length === 0) return undefined

  if (type === "select_all" || type === "multi_output") {
    const correctAnswers =
      input.correctAnswers ??
      (input.correctAnswer ? parseStoredSelectAllCorrectAnswers(input.correctAnswer) : undefined)
    if (!correctAnswers?.length) return undefined
    return gradeSelectAllAnswer(
      {
        id: "a",
        type: "select_all",
        prompt: "",
        options: input.options,
        correct_answers: correctAnswers,
      },
      selected,
    ).mcq_earned_fraction
  }

  if (type === "mcq" || type === "true_false") {
    if (!input.correctAnswer?.trim()) return undefined
    const sq = normalizeGradableSubquestionAnswers({
      id: "a",
      type,
      prompt: "",
      options: input.options,
      correct_answer: input.correctAnswer,
    })
    return isMcqSubquestionCorrect(sq, selected[0] ?? "") ? 1 : 0
  }

  return undefined
}

export function samplePracticeEngagementPointsMessage(input: {
  pointsSynced: boolean
  pointsEarned?: number
  mcqEarnedFraction?: number
}): string {
  if (!input.pointsSynced) {
    return "Your answer is saved. Points were already recorded for this question."
  }
  if (input.pointsEarned != null && Number.isFinite(input.pointsEarned)) {
    if (input.pointsEarned <= 0) {
      return "Practice engagement recorded for this question. No additional points were awarded."
    }
    if (input.mcqEarnedFraction != null && input.mcqEarnedFraction > 0 && input.mcqEarnedFraction < 1) {
      return `Partial practice engagement points recorded (+${input.pointsEarned}).`
    }
    return `Practice engagement points recorded (+${input.pointsEarned}).`
  }
  if (input.mcqEarnedFraction != null && input.mcqEarnedFraction > 0 && input.mcqEarnedFraction < 1) {
    return "Partial practice engagement points recorded for this question."
  }
  return "Practice engagement points recorded for this question."
}

export function isMcqSubquestionCorrect(sq: GradableMcqSubQuestion, selectedLetter: string): boolean {
  const selected = selectedLetter.trim().toUpperCase()
  if (!selected) return false
  if (sq.type.toLowerCase() === "select_all") return false
  const correct = resolveMcqCorrectLetter(sq)
  return Boolean(correct && selected === correct)
}

export function isMcqSubquestionOptionCorrect(sq: GradableMcqSubQuestion, letter: string): boolean {
  return isMcqSubquestionCorrect(sq, letter)
}

/** Map evaluate API correct_answer (letter or option text) to a display letter. */
export function resolveCorrectLetterFromEvaluateAnswer(
  options: McqOption[],
  correctAnswer: string | string[] | null | undefined,
): string | undefined {
  if (correctAnswer == null) return undefined
  if (Array.isArray(correctAnswer)) {
    if (correctAnswer.length === 0) return undefined
    return resolveCorrectLetterFromEvaluateAnswer(options, correctAnswer[0])
  }
  return resolveMcqCorrectLetter({
    id: "a",
    type: "mcq",
    prompt: "",
    options,
    correct_answer: correctAnswer,
  })
}

export function formatEvaluateCorrectAnswer(
  options: McqOption[],
  correctAnswer: string | string[] | null | undefined,
): string {
  if (correctAnswer == null) return "shown above"
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.length > 0 ? correctAnswer.join(", ") : "shown above"
  }
  const letter = resolveCorrectLetterFromEvaluateAnswer(options, correctAnswer)
  if (!letter) return correctAnswer.trim() || "shown above"
  const labels = subquestionOptionLabels({ options })
  const match = labels.find((l) => l.letter.toUpperCase() === letter)
  return match ? `${letter} — ${match.text}` : letter
}

export function formatMcqSubquestionCorrectAnswer(sq: GradableMcqSubQuestion): string {
  const labels = subquestionOptionLabels(sq)
  const type = sq.type.toLowerCase()
  if (type === "select_all") {
    const texts = canonicalizeSelectAllCorrectAnswers(sq)
    if (texts.length === 0) return "shown above"
    return texts.join(", ")
  }
  const letter = resolveMcqCorrectLetter(sq)
  if (!letter) return "shown above"
  const match = labels.find((l) => l.letter.toUpperCase() === letter)
  return match ? `${letter} — ${match.text}` : letter
}

/** Parse stored student_answer from sample-practice attempts. */
export function parseSamplePracticeStudentAnswer(raw: unknown): string | string[] {
  if (raw == null) return ""
  if (typeof raw === "string") {
    const t = raw.trim()
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return parseSamplePracticeStudentAnswer(JSON.parse(t))
      } catch {
        return t
      }
    }
    return t
  }
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>
    if (o.parts && typeof o.parts === "object") {
      const parts = o.parts as Record<string, unknown>
      const first = parts.a ?? parts.A ?? Object.values(parts)[0]
      if (Array.isArray(first)) return first.map((x) => String(x).trim()).filter(Boolean)
      if (typeof first === "string") return first.trim()
    }
    if (typeof o.answer === "string") return o.answer.trim()
  }
  return String(raw).trim()
}

export function selectedLetterFromSavedAnswer(raw: unknown): string {
  const parsed = parseSamplePracticeStudentAnswer(raw)
  if (Array.isArray(parsed)) return parsed[0]?.toUpperCase() ?? ""
  return String(parsed).trim().toUpperCase().slice(0, 1)
}

export function selectedLettersFromSavedAnswer(raw: unknown): string[] {
  const parsed = parseSamplePracticeStudentAnswer(raw)
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean)
  }
  const letter = String(parsed).trim().toUpperCase()
  return letter ? [letter] : []
}

export function initialSamplePracticeSelection(
  raw: unknown,
  questionType: string,
): string | string[] {
  if (questionType.toLowerCase() === "select_all") {
    return selectedLettersFromSavedAnswer(raw)
  }
  return selectedLetterFromSavedAnswer(raw)
}

/** Quiz / bank UI helper — matches web `isQuizMcqOptionCorrect`. */
function parseCorrectAnswerRaw(raw: unknown): string | string[] | null {
  if (raw == null || raw === "") return null
  if (Array.isArray(raw)) return raw.map((x) => String(x))
  if (typeof raw === "string") {
    const t = raw.trim()
    try {
      const p = JSON.parse(t)
      if (typeof p === "string") return p.trim()
      if (Array.isArray(p)) return p.map((x) => String(x))
    } catch {
      return t
    }
    return t
  }
  return String(raw)
}

export function isQuizMcqOptionCorrect(
  optionLetter: string,
  optionText: string,
  correctAnswer: unknown,
): boolean {
  const parsed = parseCorrectAnswerRaw(correctAnswer)
  if (parsed == null) return false

  const letter = optionLetter.trim().toUpperCase()
  const text = optionText.trim()

  if (Array.isArray(parsed)) {
    return parsed.some((ans) => {
      const a = ans.trim()
      const upper = a.toUpperCase()
      return upper === letter || a === text
    })
  }

  const upper = parsed.trim().toUpperCase()
  if (/^[A-F]$/.test(upper)) return upper === letter
  return parsed.trim() === text
}

/** @deprecated Use `samplePracticeOptionReviewState` + server `answerReview`. */
export function optionLetterIsCorrectForEvaluateResult(
  options: McqOption[],
  letter: string,
  correctAnswer: string | string[] | null | undefined,
): boolean {
  const labels = subquestionOptionLabels({ options })
  const match = labels.find((l) => l.letter.toUpperCase() === letter.toUpperCase())
  if (!match) return false
  return isQuizMcqOptionCorrect(letter, match.text, correctAnswer)
}

export type SamplePracticeOptionReviewState = {
  isCorrect: boolean
  showWrongSelection: boolean
  showPartialCreditSelection?: boolean
}

export function isPracticePartialCredit(review: PracticeAnswerReview | null | undefined): boolean {
  if (!review || review.isCorrect) return false
  if (review.isPartialCredit === true) return true
  if (typeof review.score === "number" && review.score > 0 && review.score < 100) return true
  if (
    typeof review.pointsEarned === "number" &&
    review.pointsEarned > 0 &&
    (review.maxPoints ?? 1) > review.pointsEarned
  ) {
    return true
  }
  return false
}

/** Per-option highlight state from a practice / hub answerReview payload. */
export function practiceAnswerReviewOptionState(
  review: PracticeAnswerReview | null | undefined,
  letter: string,
): SamplePracticeOptionReviewState {
  if (!review) return { isCorrect: false, showWrongSelection: false }

  const upper = letter.toUpperCase()
  const row = review.options.find((opt) => opt.letter.toUpperCase() === upper)
  if (!row) return { isCorrect: false, showWrongSelection: false }

  const partial = isPracticePartialCredit(review)
  if (partial && row) {
    const hasKnownCorrect = review.options.some((opt) => opt.isCorrect)
    if (!hasKnownCorrect) {
      return {
        isCorrect: false,
        showWrongSelection: false,
        showPartialCreditSelection: row.isSelected === true,
      }
    }
    return {
      isCorrect: row.isCorrect && !row.isSelected,
      showWrongSelection: row.isSelected && !row.isCorrect,
      showPartialCreditSelection: row.isSelected && row.isCorrect,
    }
  }
  if (review.isCorrect) {
    return {
      isCorrect: row.isCorrect && row.isSelected,
      showWrongSelection: row.isSelected && !row.isCorrect,
    }
  }
  return {
    isCorrect: row.isCorrect,
    showWrongSelection: row.isSelected && !row.isCorrect,
  }
}

/** Prefer server `answerReview`; fall back to quiz-taker letter/text matching. */
export function samplePracticeOptionReviewState(
  letter: string,
  selectedLetters: string[],
  result: {
    answerReview?: PracticeAnswerReview | null
    parts?: Array<{ correct_answer?: string | string[] | null }>
  } | null,
  options: McqOption[],
): SamplePracticeOptionReviewState {
  if (!result) return { isCorrect: false, showWrongSelection: false }

  if (result.answerReview?.options?.length) {
    return practiceAnswerReviewOptionState(result.answerReview, letter)
  }

  const upper = letter.toUpperCase()
  const labels = subquestionOptionLabels({ options })
  const match = labels.find((l) => l.letter.toUpperCase() === upper)
  const correctAnswer = result.parts?.[0]?.correct_answer ?? null

  // No key from the server means we cannot tell right from wrong. Render neutral
  // instead of flagging every selection as incorrect.
  if (correctAnswer == null || (Array.isArray(correctAnswer) && correctAnswer.length === 0)) {
    return { isCorrect: false, showWrongSelection: false }
  }

  const isCorrect = match ? isQuizMcqOptionCorrect(upper, match.text, correctAnswer) : false
  const isSelected = selectedLetters.includes(upper)
  return {
    isCorrect,
    showWrongSelection: isSelected && !isCorrect,
  }
}

export function samplePracticeResultSummary(
  result: {
    is_mcq_correct: boolean
    mcq_earned_fraction: number
    answerReview?: { summary?: string } | null
    parts?: Array<{ correct_answer?: string | string[] | null }>
  },
  question: { question_type: string; options: McqOption[] },
): string {
  const isSelectAll = question.question_type === "select_all"
  const correctAnswerLabel = formatEvaluateCorrectAnswer(
    question.options,
    result.parts?.[0]?.correct_answer ?? null,
  )

  if (result.is_mcq_correct) return "Correct — nice work."

  const summary = result.answerReview?.summary?.trim()
  if (summary && summary !== "Correct!") {
    if (isSelectAll && summary.startsWith("Partially correct")) {
      return `${summary} Select all that apply: ${correctAnswerLabel}.`
    }
    return summary
  }

  if (isSelectAll && result.mcq_earned_fraction > 0 && result.mcq_earned_fraction < 1) {
    return `Partially correct (${Math.round(result.mcq_earned_fraction * 100)}%). Select all that apply: ${correctAnswerLabel}.`
  }
  return `Not quite. The correct answer${isSelectAll ? "s are" : " is"} ${correctAnswerLabel}.`
}

type ObjectiveQuestionShape = {
  id: number
  question_type: string
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  option_e?: string | null
  correct_answer?: string | null
}

export function objectiveQuestionToGradableMcq(question: ObjectiveQuestionShape): GradableMcqSubQuestion {
  const options: StructuredMcqOption[] = []
  for (const letter of ["A", "B", "C", "D", "E"] as const) {
    const text = question[`option_${letter.toLowerCase()}` as keyof ObjectiveQuestionShape]
    if (typeof text === "string" && text.trim()) {
      options.push({ id: letter, text })
    }
  }
  const qType = question.question_type.toLowerCase()
  const base: GradableMcqSubQuestion = {
    id: String(question.id),
    type: question.question_type,
    prompt: "",
    options,
  }

  if (qType === "select_all" || qType === "multi_output") {
    const parsed = question.correct_answer
      ? parseStoredSelectAllCorrectAnswers(question.correct_answer)
      : []
    return {
      ...base,
      correct_answers: parsed.length > 0 ? parsed : undefined,
      correct_answer: question.correct_answer ?? undefined,
    }
  }

  return {
    ...base,
    correct_answer: question.correct_answer ?? undefined,
  }
}

export function normalizePracticeHubAnswerReview(
  serverReview: PracticeAnswerReview,
  evalResult: {
    isCorrect?: boolean
    score?: number
    pointsEarned?: number
    maxPoints?: number
  },
): PracticeAnswerReview {
  const score =
    typeof evalResult.score === "number"
      ? evalResult.score
      : typeof serverReview.score === "number"
        ? serverReview.score
        : undefined
  const pointsEarned =
    typeof evalResult.pointsEarned === "number"
      ? evalResult.pointsEarned
      : serverReview.pointsEarned
  const maxPoints =
    typeof evalResult.maxPoints === "number"
      ? evalResult.maxPoints
      : serverReview.maxPoints
  const isCorrect = evalResult.isCorrect ?? serverReview.isCorrect
  const isPartialCredit =
    !isCorrect &&
    ((typeof score === "number" && score > 0 && score < 100) ||
      (typeof pointsEarned === "number" &&
        pointsEarned > 0 &&
        (maxPoints ?? 1) > pointsEarned))

  return {
    ...serverReview,
    isCorrect,
    isPartialCredit,
    score,
    pointsEarned,
    maxPoints,
  }
}

export function buildLocalObjectiveAnswerReview(input: {
  question: ObjectiveQuestionShape
  selectedLetters: string[]
  selectedLetter?: string
  isCorrect: boolean
  score?: number
  pointsEarned?: number
  maxPoints?: number
}): PracticeAnswerReview | null {
  const qType = input.question.question_type.toLowerCase()
  if (
    qType !== "select_all" &&
    qType !== "multi_output" &&
    qType !== "mcq" &&
    qType !== "true_false" &&
    qType !== "multiple_choice"
  ) {
    return null
  }

  const gradable = objectiveQuestionToGradableMcq(input.question)
  const letters =
    qType === "select_all" || qType === "multi_output"
      ? input.selectedLetters
      : input.selectedLetter?.trim()
        ? [input.selectedLetter.trim().toUpperCase()]
        : input.selectedLetters

  if (qType === "select_all" || qType === "multi_output") {
    const graded = gradeSelectAllAnswer({ ...gradable, type: "select_all" }, letters)
    return {
      ...graded.answerReview,
      pointsEarned: input.pointsEarned,
      maxPoints: input.maxPoints,
      score: typeof input.score === "number" ? input.score : graded.answerReview.score,
    }
  }

  const correctLetter = resolveMcqCorrectLetter(gradable)
  if (!correctLetter) return null
  const labels = subquestionOptionLabels(gradable)
  const selectedSet = new Set(letters.map((l) => l.toUpperCase()))
  const selected = letters[0]?.toUpperCase() ?? ""
  const localCorrect = Boolean(selected && selected === correctLetter.toUpperCase())
  const options = labels.map(({ letter, text }) => ({
    letter: letter.toUpperCase(),
    text,
    isSelected: selectedSet.has(letter.toUpperCase()),
    isCorrect: letter.toUpperCase() === correctLetter.toUpperCase(),
  }))

  return {
    isCorrect: localCorrect,
    isPartialCredit: false,
    score: localCorrect ? 100 : 0,
    pointsEarned: input.pointsEarned,
    maxPoints: input.maxPoints,
    correctLetters: [correctLetter.toUpperCase()],
    correctTexts: options.filter((row) => row.isCorrect).map((row) => row.text),
    options,
    summary: localCorrect ? "Correct!" : `Correct: ${correctLetter.toUpperCase()}`,
  }
}

export function isEvalPartialCredit(
  evalResult: {
    isCorrect?: boolean
    score?: number
    pointsEarned?: number
    maxPoints?: number
  },
  review?: PracticeAnswerReview | null,
): boolean {
  if (review && isPracticePartialCredit(review)) return true
  if (evalResult.isCorrect) return false
  if (typeof evalResult.score === "number" && evalResult.score > 0 && evalResult.score < 100) {
    return true
  }
  if (
    typeof evalResult.pointsEarned === "number" &&
    evalResult.pointsEarned > 0 &&
    (evalResult.maxPoints ?? 1) > evalResult.pointsEarned
  ) {
    return true
  }
  return false
}

export function buildPartialCreditFallbackReview(input: {
  question: ObjectiveQuestionShape
  selectedLetters: string[]
  evalResult: {
    isCorrect?: boolean
    score?: number
    pointsEarned?: number
    maxPoints?: number
  }
}): PracticeAnswerReview | null {
  if (!isEvalPartialCredit(input.evalResult, null)) return null

  const gradable = objectiveQuestionToGradableMcq(input.question)
  const labels = subquestionOptionLabels(gradable)
  const selectedSet = new Set(input.selectedLetters.map((letter) => letter.toUpperCase()))
  const score =
    typeof input.evalResult.score === "number"
      ? input.evalResult.score
      : input.evalResult.maxPoints && typeof input.evalResult.pointsEarned === "number"
        ? (input.evalResult.pointsEarned / input.evalResult.maxPoints) * 100
        : undefined

  const options = labels.map(({ letter, text }) => ({
    letter: letter.toUpperCase(),
    text,
    isSelected: selectedSet.has(letter.toUpperCase()),
    isCorrect: false,
  }))

  return {
    isCorrect: false,
    isPartialCredit: true,
    score,
    pointsEarned: input.evalResult.pointsEarned,
    maxPoints: input.evalResult.maxPoints,
    correctLetters: [],
    correctTexts: [],
    options,
    summary:
      typeof score === "number"
        ? `Partial credit (${Math.round(score)}%).`
        : "Partial credit — some selections were correct.",
  }
}

export function resolveObjectiveAnswerReview(input: {
  question: ObjectiveQuestionShape
  selectedLetters: string[]
  selectedLetter?: string
  serverReview?: PracticeAnswerReview | null
  evalResult: {
    isCorrect?: boolean
    score?: number
    pointsEarned?: number
    maxPoints?: number
  }
}): PracticeAnswerReview | null {
  const qType = input.question.question_type.toLowerCase().replace(/-/g, "_")
  const isSingleChoice =
    qType === "mcq" || qType === "true_false" || qType === "multiple_choice"
  const markedCorrect = input.serverReview?.options?.filter((row) => row.isCorrect) ?? []
  const uniqueReviewLetters = (input.serverReview?.correctLetters ?? []).filter(Boolean)
  const inferredKey =
    !input.question.correct_answer?.trim() && isSingleChoice
      ? markedCorrect.length === 1
        ? markedCorrect[0]?.letter
        : uniqueReviewLetters.length === 1
          ? uniqueReviewLetters[0]
          : undefined
      : undefined
  const questionWithKey = inferredKey
    ? { ...input.question, correct_answer: inferredKey }
    : input.question
  const hasAnswerKey = Boolean(questionWithKey.correct_answer?.trim())
  const canGradeLocally =
    hasAnswerKey &&
    (qType === "select_all" ||
      qType === "multi_output" ||
      qType === "mcq" ||
      qType === "true_false" ||
      qType === "multiple_choice")

  if (canGradeLocally) {
    const local = buildLocalObjectiveAnswerReview({
      question: questionWithKey,
      selectedLetters: input.selectedLetters,
      selectedLetter: input.selectedLetter,
      isCorrect: Boolean(input.evalResult.isCorrect),
      score: input.evalResult.score,
      pointsEarned: input.evalResult.pointsEarned,
      maxPoints: input.evalResult.maxPoints,
    })
    if (local) {
      return {
        ...local,
        pointsEarned: input.evalResult.pointsEarned ?? local.pointsEarned,
        maxPoints: input.evalResult.maxPoints ?? local.maxPoints,
      }
    }
  }

  if (input.serverReview) {
    return normalizePracticeHubAnswerReview(input.serverReview, input.evalResult)
  }
  if (input.question.correct_answer) {
    const local = buildLocalObjectiveAnswerReview({
      question: input.question,
      selectedLetters: input.selectedLetters,
      selectedLetter: input.selectedLetter,
      isCorrect: Boolean(input.evalResult.isCorrect),
      score: input.evalResult.score,
      pointsEarned: input.evalResult.pointsEarned,
      maxPoints: input.evalResult.maxPoints,
    })
    if (local) return local
  }
  return buildPartialCreditFallbackReview({
    question: input.question,
    selectedLetters: input.selectedLetters,
    evalResult: input.evalResult,
  })
}

export function practiceHubFeedbackSummary(
  review: PracticeAnswerReview | null | undefined,
  fallback: string,
  evalResult?: {
    isCorrect?: boolean
    score?: number
    pointsEarned?: number
    maxPoints?: number
  },
): string {
  if (review) {
    if (review.summary?.trim()) return review.summary.trim()
    if (isPracticePartialCredit(review)) {
      return typeof review.score === "number"
        ? `Partial credit (${Math.round(review.score)}%).`
        : "Partial credit — some selections were correct."
    }
    return review.isCorrect ? "Correct!" : fallback
  }
  if (evalResult && isEvalPartialCredit(evalResult, null)) {
    const score =
      typeof evalResult.score === "number"
        ? evalResult.score
        : evalResult.maxPoints && typeof evalResult.pointsEarned === "number"
          ? (evalResult.pointsEarned / evalResult.maxPoints) * 100
          : undefined
    return typeof score === "number"
      ? `Partial credit (${Math.round(score)}%).`
      : "Partial credit — some selections were correct."
  }
  return fallback
}

/** Read a programmed key from generate/evaluate payloads (camelCase or snake_case). */
export function programmedAnswerKeyFromRecord(raw: Record<string, unknown> | null | undefined): string | undefined {
  if (!raw) return undefined
  const scalars = [raw.correct_answer, raw.correctAnswer, raw.answer_key, raw.answerKey]
  for (const value of scalars) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  if (Array.isArray(raw.correct_answers) && raw.correct_answers.length > 0) {
    return JSON.stringify(raw.correct_answers.map((entry) => String(entry)))
  }
  if (typeof raw.correct_answers === "string" && raw.correct_answers.trim()) {
    return raw.correct_answers.trim()
  }
  return undefined
}

export function programmedAnswerKeyFromReview(
  review: PracticeAnswerReview | null | undefined,
  questionType: string,
): string | undefined {
  if (!review) return undefined
  const qType = questionType.toLowerCase().replace(/-/g, "_")
  if (qType === "select_all" || qType === "multi_output") {
    if (review.correctTexts?.length) return JSON.stringify(review.correctTexts)
    if (review.correctLetters?.length) return JSON.stringify(review.correctLetters)
    return undefined
  }
  if (review.correctLetters?.filter(Boolean).length === 1) {
    return review.correctLetters.find((letter) => Boolean(letter))
  }
  const marked = review.options?.filter((row) => row.isCorrect) ?? []
  return marked.length === 1 ? marked[0]?.letter : undefined
}
