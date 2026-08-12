import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { apiErrorMessage, isApiRouteMissingError } from "./http-errors"
import type { InstructorScope } from "./instructor-content-api"
import {
  instructorApi,
  type InstructorBankQuestion,
  type InstructorQuiz,
  type InstructorQuizQuestion,
} from "./instructor-api"
import {
  normalizeImportedProblem,
  type CoraImportedProblem,
  type CoraQuestionImportContainer,
  type CoraQuestionImportItem,
  type CoraQuestionImportSource,
} from "./cora-api"

export type FacultyCoraImportHint = {
  sourceKey?: string
  containerHint?: string
  openOnMount?: boolean
  improveGoal?: string
}

function questionImportPath(scope: InstructorScope, params: Record<string, string>): string {
  const search = new URLSearchParams({ ...params, portal: "instructor" })
  if (scope.courseId != null) search.set("courseId", String(scope.courseId))
  return `/api/cora/question-import?${search.toString()}`
}

async function facultyImportRequest<T>(
  scope: InstructorScope,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

  const response = await fetch(url, { ...init, headers })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  if (!response.ok) {
    throw new ApiError(apiErrorMessage(body, response.status), response.status, body)
  }
  return body as T
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function previewText(text: string, max = 140): string {
  const plain = stripHtml(text)
  return plain.length <= max ? plain : `${plain.slice(0, max - 1)}…`
}

function bankQuestionToItem(question: InstructorBankQuestion, topic: string): CoraQuestionImportItem {
  return {
    ref: `bank:${question.id}`,
    source: "question_bank",
    group: topic,
    label: `Q${question.id}${question.topic ? ` · ${question.topic}` : ""}`,
    preview: previewText(question.question_text),
    bankQuestionId: question.id,
    questionId: question.id,
  }
}

function quizQuestionToItem(
  quiz: InstructorQuiz,
  question: InstructorQuizQuestion,
  index: number,
): CoraQuestionImportItem {
  return {
    ref: `quiz:${quiz.id}:q:${question.id}`,
    source: "quiz",
    group: quiz.title,
    label: `Q${index + 1}${question.question_order != null ? ` (#${question.question_order})` : ""}`,
    preview: previewText(question.question_text),
    bankQuestionId: question.bank_question_id ?? question.id,
    questionId: question.id,
    quizId: quiz.id,
  }
}

function bankQuestionToProblem(question: InstructorBankQuestion): CoraImportedProblem {
  return normalizeImportedProblem({
    source: "question_bank",
    title: question.topic ?? `Question ${question.id}`,
    topic: question.topic ?? undefined,
    questionText: stripHtml(question.question_text),
    questionType: question.question_type,
    expectedAnswer:
      question.expected_answer != null ? String(question.expected_answer) : question.sample_answer ?? null,
    hint: question.hint ?? null,
    explanation: question.explanation ?? null,
    bankQuestionId: question.id,
    questionId: question.id,
    options: question.options,
  })
}

function quizQuestionToProblem(
  quiz: InstructorQuiz,
  question: InstructorQuizQuestion,
): CoraImportedProblem {
  const options = [question.option_a, question.option_b, question.option_c, question.option_d, question.option_e].filter(
    Boolean,
  )
  return normalizeImportedProblem({
    source: "quiz",
    title: quiz.title,
    topic: quiz.title,
    questionText: stripHtml(question.question_text),
    questionType: question.question_type,
    expectedAnswer: question.correct_answer ?? null,
    hint: question.hint ?? null,
    bankQuestionId: question.bank_question_id ?? undefined,
    questionId: question.id,
    quizId: quiz.id,
    options,
    questionMedia: question.question_media as CoraImportedProblem["questionMedia"],
  })
}

function shouldUseLocalFacultyImport(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  if (isApiRouteMissingError(err.status, err.message)) return true
  const message = err.message.toLowerCase()
  if (message.includes("student")) return true
  if (err.status === 401 || err.status === 403 || err.status === 400) return true
  return err.status >= 500
}

async function loadLocalImportSources(scope: InstructorScope) {
  const sources = await getLocalImportSources(scope)
  return { sources, offline: true as const }
}

async function getLocalImportSources(scope: InstructorScope): Promise<CoraQuestionImportSource[]> {
  const [topics, quizzes, homework, midterm, finals] = await Promise.all([
    instructorApi.getQuestionBankTopics(scope).catch(() => []),
    instructorApi.getQuizzes(scope, "quiz").catch(() => []),
    instructorApi.getQuizzes(scope, "homework").catch(() => []),
    instructorApi.getQuizzes(scope, "mid_semester").catch(() => []),
    instructorApi.getQuizzes(scope, "final").catch(() => []),
  ])

  const sources: CoraQuestionImportSource[] = [
    {
      key: "question_bank",
      label: "Question Bank",
      description: "Topics and standalone bank items",
      count: topics.length,
    },
    {
      key: "quizzes",
      label: "Quizzes",
      description: "Quiz assessments in this course",
      count: quizzes.length,
    },
    {
      key: "homework",
      label: "Homework",
      description: "Homework assessments",
      count: homework.length,
    },
  ]

  if (midterm.length > 0) {
    sources.push({
      key: "mid_semester",
      label: "Mid-Semester Exams",
      description: "Mid-semester assessments",
      count: midterm.length,
    })
  }
  if (finals.length > 0) {
    sources.push({
      key: "final",
      label: "Final Exams",
      description: "Final assessments",
      count: finals.length,
    })
  }

  return sources.filter((source) => source.count > 0)
}

async function getLocalImportContainers(
  scope: InstructorScope,
  sourceKey: string,
): Promise<CoraQuestionImportContainer[]> {
  if (sourceKey === "question_bank") {
    const topics = await instructorApi.getQuestionBankTopics(scope)
    return topics.map((topic) => ({
      id: topic.name,
      label: topic.name,
      subtitle: `${topic.question_count ?? 0} question${topic.question_count === 1 ? "" : "s"}`,
      count: topic.question_count ?? 0,
    }))
  }

  const assessmentType =
    sourceKey === "homework"
      ? "homework"
      : sourceKey === "mid_semester"
        ? "mid_semester"
        : sourceKey === "final"
          ? "final"
          : "quiz"

  const quizzes = await instructorApi.getQuizzes(scope, assessmentType)
  return quizzes.map((quiz) => ({
    id: String(quiz.id),
    label: quiz.title,
    subtitle: `${quiz.question_count ?? 0} question${quiz.question_count === 1 ? "" : "s"}`,
    count: quiz.question_count ?? 0,
  }))
}

async function getLocalImportItems(
  scope: InstructorScope,
  sourceKey: string,
  containerId: string,
): Promise<CoraQuestionImportItem[]> {
  if (sourceKey === "question_bank") {
    const questions = await instructorApi.getQuestionBank(scope, { topic: containerId })
    return questions.map((question) => bankQuestionToItem(question, containerId))
  }

  const quizId = Number(containerId)
  if (!Number.isFinite(quizId)) return []
  const quiz = await instructorApi.getQuiz(scope, quizId)
  const questions = quiz.questions ?? []
  return questions.map((question, index) => quizQuestionToItem(quiz, question, index))
}

async function resolveLocalImport(
  scope: InstructorScope,
  item: CoraQuestionImportItem,
): Promise<CoraImportedProblem> {
  if (item.source === "question_bank" || item.ref.startsWith("bank:")) {
    const question = await instructorApi.getQuestionBankQuestion(scope, item.bankQuestionId)
    return bankQuestionToProblem(question)
  }

  if (item.quizId != null && item.questionId != null) {
    const quiz = await instructorApi.getQuiz(scope, item.quizId)
    const question = (quiz.questions ?? []).find((row) => row.id === Number(item.questionId))
    if (question) return quizQuestionToProblem(quiz, question)
  }

  throw new ApiError("Could not load that question.", 404)
}

export async function getFacultyCoraQuestionImportSources(scope: InstructorScope) {
  try {
    const res = await facultyImportRequest<{ sources: CoraQuestionImportSource[] }>(
      scope,
      questionImportPath(scope, { level: "sources" }),
    )
    if ((res.sources ?? []).length > 0) return res
    return loadLocalImportSources(scope)
  } catch (err) {
    if (shouldUseLocalFacultyImport(err)) {
      return loadLocalImportSources(scope)
    }
    throw err
  }
}

export async function getFacultyCoraQuestionImportContainers(scope: InstructorScope, sourceKey: string) {
  try {
    const res = await facultyImportRequest<{ containers: CoraQuestionImportContainer[] }>(
      scope,
      questionImportPath(scope, { level: "containers", sourceKey }),
    )
    if ((res.containers ?? []).length > 0) return res
    const containers = await getLocalImportContainers(scope, sourceKey)
    return { containers, offline: true as const }
  } catch (err) {
    if (shouldUseLocalFacultyImport(err)) {
      const containers = await getLocalImportContainers(scope, sourceKey)
      return { containers, offline: true as const }
    }
    throw err
  }
}

export async function getFacultyCoraQuestionImportItems(
  scope: InstructorScope,
  sourceKey: string,
  containerId: string,
) {
  try {
    const res = await facultyImportRequest<{ items: CoraQuestionImportItem[] }>(
      scope,
      questionImportPath(scope, { level: "questions", sourceKey, containerId }),
    )
    if ((res.items ?? []).length > 0) return res
    const items = await getLocalImportItems(scope, sourceKey, containerId)
    return { items, offline: true as const }
  } catch (err) {
    if (shouldUseLocalFacultyImport(err)) {
      const items = await getLocalImportItems(scope, sourceKey, containerId)
      return { items, offline: true as const }
    }
    throw err
  }
}

export async function resolveFacultyCoraQuestionImport(
  scope: InstructorScope,
  item: CoraQuestionImportItem,
): Promise<CoraImportedProblem> {
  const body: Record<string, unknown> = {
    source: item.source,
    bankQuestionId: item.bankQuestionId,
  }
  if (scope.courseId != null) body.courseId = scope.courseId
  if (item.questionId != null) body.questionId = item.questionId
  if (item.quizId != null) body.quizId = item.quizId
  if (item.lectureId != null) body.lectureId = item.lectureId

  try {
    const res = await facultyImportRequest<{ problem: CoraImportedProblem }>(
      scope,
      "/api/cora/question-import",
      { method: "POST", body: JSON.stringify(body) },
    )
    return normalizeImportedProblem(res.problem)
  } catch (err) {
    if (shouldUseLocalFacultyImport(err)) {
      return resolveLocalImport(scope, item)
    }
    throw err
  }
}

export function resolveImproveImportHint(prompt: string): FacultyCoraImportHint {
  const normalized = prompt.trim().toLowerCase()

  if (normalized.includes("homework")) {
    return {
      sourceKey: "homework",
      containerHint: parseHomeworkLabel(prompt),
      openOnMount: true,
      improveGoal: "reduce_difficulty",
    }
  }

  if (normalized.includes("distractor") || normalized.includes("question 12")) {
    return {
      sourceKey: "question_bank",
      containerHint: normalized.includes("question 12") ? "12" : undefined,
      openOnMount: true,
      improveGoal: "distractors",
    }
  }

  if (normalized.includes("conceptual")) {
    return {
      sourceKey: "question_bank",
      openOnMount: true,
      improveGoal: "conceptual",
    }
  }

  if (normalized.includes("quiz") || normalized.includes("discrimination")) {
    return {
      sourceKey: "quizzes",
      openOnMount: true,
      improveGoal: "discrimination",
    }
  }

  return { openOnMount: true, improveGoal: "general" }
}

function parseHomeworkLabel(message: string): string {
  const match = message.match(/homework\s+(\d+)/i)
  return match ? `Homework ${match[1]}` : "Homework"
}

export function buildImproveComposerPrompt(
  goal: string | undefined,
  userPrompt: string | undefined,
  label?: string | null,
): string {
  const subject = label?.trim() || "this question"
  const base = userPrompt?.trim() || `Improve ${subject}`

  switch (goal) {
    case "discrimination":
      return `${base}\n\nSuggest edits for stronger discrimination — better distractors, clearer stems, and fair scoring.`
    case "conceptual":
      return `${base}\n\nRewrite toward deeper conceptual understanding rather than recall.`
    case "distractors":
      return `${base}\n\nGenerate stronger distractors and explain why each works pedagogically.`
    case "reduce_difficulty":
      return `${base}\n\nReduce difficulty while keeping learning objectives — simpler wording, scaffolding, and hints.`
    default:
      return `${base}\n\nImprove wording, fairness, Bloom's level, and answer quality.`
  }
}
