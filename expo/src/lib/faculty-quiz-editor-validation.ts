import { validateSectionConfig } from "./faculty-assessment-sections"
import {
  isCircuitQuestionType,
  isMcqStyleType,
  isTextAnswerType} from "./faculty-quiz-editor-config"
import type { QuizEditorDraft, QuizQuestionDraft } from "./faculty-quiz-editor-mapper"

function parseCircuitSpec(spec: Record<string, unknown> | null) {
  return spec ?? {}
}

function gradableSubquestionCount(subquestions: unknown): number {
  if (!Array.isArray(subquestions)) return 0
  return subquestions.filter((s) => s != null).length
}

export function validateQuizEditorDraft(
  draft: QuizEditorDraft,
  assessmentType: string,
): string | null {
  if (!draft.title.trim()) {
    return "Enter a title for this assessment."
  }

  if (
    (assessmentType === "mid_semester" || assessmentType === "final") &&
    !draft.coverage.trim()
  ) {
    return "Enter coverage (chapters/lectures) for this exam."
  }

  if (draft.questions.length === 0) {
    return "Add at least one question."
  }

  for (let i = 0; i < draft.questions.length; i++) {
    const err = validateQuestion(draft.questions[i], i + 1)
    if (err) return err
  }

  if (assessmentType === "final") {
    const usesSections = draft.section_config && draft.section_config.length > 0
    if (!usesSections) {
      const total = draft.questions.reduce((sum, q) => sum + (q.max_points ?? q.points ?? 1), 0)
      if (total !== 100) {
        return `Final exam question points must sum to 100 (currently ${total}).`
      }
    }
  }

  if (draft.geo_required) {
    if (!draft.geo_lat.trim() || !draft.geo_lng.trim()) {
      return "Geolocation is on — enter latitude and longitude."
    }
  }

  if (draft.restrict_access_to_students && !draft.access_restriction_session_id) {
    return "Who can access is on — select a class section for the student roster."
  }

  const sectionErr = validateSectionConfig(draft.section_config)
  if (sectionErr) return sectionErr

  return null
}

export function validateQuestion(q: QuizQuestionDraft, index: number): string | null {
  if (!q.question_text.trim()) {
    return `Question ${index}: enter question text.`
  }

  const type = q.question_type.toLowerCase()

  if (isCircuitQuestionType(type)) {
    const spec = parseCircuitSpec(q.circuit_spec)
    if (type === "circuit_numeric") {
      const exp = String(spec.expectedAnswer ?? q.correct_answer ?? "").trim()
      if (!exp) {
        return `Question ${index}: circuit numeric needs an expected answer.`
      }
    }
    if (type === "circuit_fill_equation") {
      const eq = spec.equationExpected as Record<string, string> | undefined
      if (!eq || Object.keys(eq).length === 0) {
        return `Question ${index}: circuit fill equation needs equation slots configured.`
      }
    }
    if (type === "circuit_multi_part") {
      const subs = (spec.subQuestions as unknown[]) ?? []
      if (!subs.length) {
        return `Question ${index}: circuit multi-part needs sub-questions configured.`
      }
    }
    return null
  }

  if (type === "multi_part") {
    if (gradableSubquestionCount(q.subquestions) === 0) {
      return `Question ${index}: multi-part needs at least one sub-question (edit in question bank).`
    }
    return null
  }

  if (isTextAnswerType(type)) {
    if (!q.correct_answer.trim()) {
      return `Question ${index}: enter the correct answer.`
    }
    return null
  }

  if (isMcqStyleType(type)) {
    if (!q.option_a.trim() || !q.option_b.trim()) {
      return `Question ${index}: options A and B are required.`
    }
    if (type === "mcq" && (!q.option_c.trim() || !q.option_d.trim())) {
      return `Question ${index}: options A–D are required for multiple choice.`
    }
    if (type === "true_false" && !q.correct_answer.trim()) {
      return `Question ${index}: select True or False.`
    }
    if ((type === "select_all" || type === "multi_output") && !q.correct_answer.trim()) {
      return `Question ${index}: enter correct answers (comma-separated letters or JSON array).`
    }
    if (type === "mcq" && !q.correct_answer.trim()) {
      return `Question ${index}: select the correct option.`
    }
  }

  return null
}
