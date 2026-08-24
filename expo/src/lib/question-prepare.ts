import {
  buildQuestionBlocks,
  buildQuestionHtml,
  needsQuestionRichRender,
  questionPlainText,
} from "./classroom-submission"
import { needsMarkdownRichRender, prepareAssessmentReportMarkdown } from "./assessment-report-markdown"
import type { AssessmentResultQuestion } from "./assessment-results-api"
import type { AssessmentQuestion } from "./assessment-quiz/assessment-quiz-types"
import { getGradableSubquestions, subquestionOptionLabels } from "./lecture-sample-practice-utils"
import { solutionMarkdownFromQuestion } from "./lecture-workspace-utils"
import type { LectureSamplePracticeQuestion, LectureWorkspaceQuestion } from "./lecture-types"
import type { PracticeQuestion } from "./practice-session"

export type QuestionPrepareStepId = "fetch" | "parse" | "math" | "choices" | "ready"

export type QuestionPrepareStepStatus = "pending" | "active" | "done"

export type QuestionPrepareStep = {
  id: QuestionPrepareStepId
  label: string
  status: QuestionPrepareStepStatus
}

export const QUESTION_PREPARE_STEP_LABELS: Record<QuestionPrepareStepId, string> = {
  fetch: "Loading questions",
  parse: "Parsing question content",
  math: "Preparing math & formatting",
  choices: "Building answer choices",
  ready: "Ready to view",
}

export function createQuestionPrepareSteps(activeId: QuestionPrepareStepId = "fetch"): QuestionPrepareStep[] {
  const order: QuestionPrepareStepId[] = ["fetch", "parse", "math", "choices", "ready"]
  const activeIndex = order.indexOf(activeId)
  return order.map((id, index) => ({
    id,
    label: QUESTION_PREPARE_STEP_LABELS[id],
    status: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
  }))
}

export function updateQuestionPrepareStep(
  steps: QuestionPrepareStep[],
  id: QuestionPrepareStepId,
  status: "active" | "done",
): QuestionPrepareStep[] {
  const order = steps.map((step) => step.id)
  const index = order.indexOf(id)
  if (index < 0) return steps

  return steps.map((step, stepIndex) => {
    if (status === "active") {
      if (stepIndex < index) return { ...step, status: "done" }
      if (stepIndex === index) return { ...step, status: "active" }
      return { ...step, status: "pending" }
    }
    if (stepIndex <= index) return { ...step, status: "done" }
    return step
  })
}

function dedupeTexts(texts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of texts) {
    const t = String(raw ?? "").trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function collectOptionTexts(source: {
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  option_e?: string | null
}): string[] {
  return [source.option_a, source.option_b, source.option_c, source.option_d, source.option_e]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0))
    } else {
      setTimeout(resolve, 16)
    }
  })
}

/** Warm question copy on the JS thread before mounting WebViews. */
export async function runQuestionPreparePipeline(
  texts: string[],
  onStep: (id: QuestionPrepareStepId, status: "active" | "done") => void,
): Promise<void> {
  const unique = dedupeTexts(texts)
  await yieldToUi()
  onStep("fetch", "done")

  onStep("parse", "active")
  for (let i = 0; i < unique.length; i += 1) {
    const text = unique[i]
    if (needsMarkdownRichRender(text)) {
      prepareAssessmentReportMarkdown(text)
    } else {
      questionPlainText(text)
    }
    if (i % 8 === 7) await yieldToUi()
  }
  onStep("parse", "done")

  onStep("math", "active")
  const rich = unique.filter(needsQuestionRichRender)
  for (let i = 0; i < rich.length; i += 1) {
    buildQuestionBlocks(rich[i])
    if (i % 5 === 4) await yieldToUi()
  }
  onStep("math", "done")

  onStep("choices", "active")
  const choiceCandidates = rich.length > 0 ? rich : unique.slice(0, Math.min(unique.length, 8))
  for (let i = 0; i < choiceCandidates.length; i += 1) {
    if (needsQuestionRichRender(choiceCandidates[i])) {
      buildQuestionHtml(choiceCandidates[i], { compact: true })
    }
    if (i % 4 === 3) await yieldToUi()
  }
  onStep("choices", "done")

  onStep("ready", "active")
  await yieldToUi()
  onStep("ready", "done")
}

export function extractAssessmentResultQuestionTexts(questions: AssessmentResultQuestion[]): string[] {
  const fields: string[] = []
  for (const q of questions) {
    fields.push(q.question_text ?? "")
    if (q.hint) fields.push(String(q.hint))
    fields.push(...collectOptionTexts(q))
  }
  return dedupeTexts(fields)
}

export function extractAssessmentQuizQuestionTexts(questions: AssessmentQuestion[]): string[] {
  const fields: string[] = []
  for (const q of questions) {
    fields.push(q.question_text ?? "")
    if (q.hint) fields.push(String(q.hint))
    fields.push(...collectOptionTexts(q))
  }
  return dedupeTexts(fields)
}

export function extractPracticeQuestionTexts(questions: PracticeQuestion[]): string[] {
  const fields: string[] = []
  for (const q of questions) {
    fields.push(q.question_text ?? "")
    if (q.hint) fields.push(String(q.hint))
    fields.push(...collectOptionTexts(q))
    for (const sq of getGradableSubquestions(q.subquestions)) {
      fields.push(sq.prompt)
      fields.push(...subquestionOptionLabels(sq).map((opt) => opt.text))
      if (sq.explanation) fields.push(sq.explanation)
    }
  }
  return dedupeTexts(fields)
}

export function extractLectureWorkspaceQuestionTexts(questions: LectureWorkspaceQuestion[]): string[] {
  const fields: string[] = []
  for (const q of questions) {
    fields.push(q.question_text ?? "")
    fields.push(q.title ?? "")
    fields.push(solutionMarkdownFromQuestion(q))
  }
  return dedupeTexts(fields)
}

export function extractLectureSamplePracticeQuestionTexts(questions: LectureSamplePracticeQuestion[]): string[] {
  const fields: string[] = []
  for (const q of questions) {
    fields.push(q.question_text ?? "")
    fields.push(q.title ?? "")
    fields.push(...(q.options?.map((opt) => opt.text) ?? []))
    if (q.explanation) fields.push(q.explanation)
  }
  return dedupeTexts(fields)
}

export function extractAssignmentQuestionTexts(questionText?: string, instructions?: string): string[] {
  return dedupeTexts([questionText, instructions])
}
