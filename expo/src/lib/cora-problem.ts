import type { LectureSamplePracticeQuestion, LectureWorkspaceQuestion } from "./lecture-types"
import { normalizeImportedProblem, type CoraImportedProblem } from "./cora-api"
import type { CoraDomain, CoraProblem, CoraSource } from "./cora-types"

function questionTypeForDomain(domain: CoraDomain): string {
  if (domain === "circuit") return "circuit_worked_solution"
  if (domain === "coding") return "code_problem"
  return "open_ended"
}

function domainFromImport(problem: CoraImportedProblem): CoraDomain {
  const raw = (problem.domain ?? "").toLowerCase()
  if (raw.includes("circuit")) return "circuit"
  if (raw.includes("cod") || raw.includes("program")) return "coding"
  if (raw.includes("math")) return "math"
  return "generic"
}

function sourceFromImport(source?: string | null): CoraSource {
  const raw = (source ?? "").toLowerCase()
  if (raw.includes("workspace") || raw.includes("lecture")) return "lecture_workspace"
  if (raw.includes("sample") || raw.includes("practice")) return "sample_practice"
  return "custom"
}

export function buildCustomCoraProblem(
  domain: CoraDomain,
  questionText: string,
  studentDatabaseId: string,
  options?: {
    title?: string
    mediaUrl?: string | null
    intentSuffix?: string
  },
): CoraProblem {
  const trimmed = questionText.trim()
  const withIntent = options?.intentSuffix?.trim()
    ? `${trimmed}${trimmed ? "\n\n" : ""}${options.intentSuffix.trim()}`
    : trimmed
  return {
    source: "custom",
    domain,
    title: options?.title?.trim() || "Custom problem",
    questionText: withIntent,
    questionType: questionTypeForDomain(domain),
    mediaUrl: options?.mediaUrl ?? null,
    lectureId: 0,
    questionId: `custom-${Date.now()}`,
    studentDatabaseId,
  }
}

export function buildImportedCoraProblem(
  imported: CoraImportedProblem,
  studentDatabaseId: string,
  label?: string,
  options?: {
    studentNotes?: string
    intentSuffix?: string
  },
): CoraProblem {
  const normalized = normalizeImportedProblem(imported)
  const domain = domainFromImport(normalized)
  const referenceSteps =
    normalized.referenceSteps ??
    (normalized.explanation?.trim() ? [normalized.explanation.trim()] : undefined)
  const notes = options?.studentNotes?.trim()
  const intent = options?.intentSuffix?.trim()
  const extra = [notes, intent].filter(Boolean).join("\n\n")
  const questionText = extra
    ? `${normalized.questionText.trim()}\n\n${extra}`
    : normalized.questionText.trim()

  return {
    source: sourceFromImport(normalized.source),
    domain,
    title: label?.trim() || normalized.title?.trim() || "Course question",
    topic: normalized.topic,
    questionText,
    questionType: normalized.questionType ?? questionTypeForDomain(domain),
    referenceSteps,
    mediaUrl: normalized.mediaUrl ?? null,
    lectureId: normalized.lectureId ?? 0,
    questionId: String(normalized.questionId ?? normalized.bankQuestionId ?? `import-${Date.now()}`),
    studentDatabaseId,
    bankQuestionId: normalized.bankQuestionId,
    quizId: normalized.quizId,
    expectedAnswer: normalized.expectedAnswer ?? null,
    hint: normalized.hint ?? null,
    explanation: normalized.explanation ?? null,
    classroomSubmissionId: normalized.classroomSubmissionId,
  }
}

export function buildWorkspaceCoraProblem(
  lectureId: number,
  question: LectureWorkspaceQuestion,
  studentDatabaseId: string,
): CoraProblem {
  const steps = question.step_by_step_solution?.content?.filter((step) => step.trim()) ?? []
  return {
    source: "lecture_workspace",
    domain: "circuit",
    title: question.title,
    topic: question.topic,
    questionText: question.question_text,
    questionType: "circuit_submission",
    referenceSteps: steps.length > 0 ? steps : undefined,
    mediaUrl: question.question_media?.media_url ?? null,
    lectureId,
    questionId: question.id,
    studentDatabaseId,
  }
}

export function samplePracticeQuestionToImportedProblem(
  lectureId: number,
  question: LectureSamplePracticeQuestion,
  studentDatabaseId: string,
  result?: { explanation?: string | null } | null,
): import("./cora-api").CoraImportedProblem {
  const explanation =
    result?.explanation?.trim() || question.explanation?.trim() || null
  return {
    source: "lecture_practice",
    domain: "generic",
    title: question.title,
    topic: question.topic,
    questionText: question.question_text.trim() || question.title,
    questionType: question.question_type,
    explanation,
    referenceSteps: explanation ? [explanation] : undefined,
    mediaUrl: question.question_media?.media_url ?? null,
    questionMedia: question.question_media ?? null,
    lectureId,
    questionId: question.id,
    studentDatabaseId,
  }
}

export function buildSamplePracticeCoraProblem(
  lectureId: number,
  question: LectureSamplePracticeQuestion,
  studentDatabaseId: string,
): CoraProblem {
  const questionText =
    question.question_text.trim() || "Work through this example with Cora."
  const explanation = question.explanation?.trim()
  return {
    source: "sample_practice",
    domain: "circuit",
    title: question.title,
    topic: question.topic,
    questionText,
    questionType: question.question_type,
    referenceSteps: explanation ? [explanation] : undefined,
    mediaUrl: question.question_media?.media_url ?? null,
    lectureId,
    questionId: question.id,
    studentDatabaseId,
  }
}
