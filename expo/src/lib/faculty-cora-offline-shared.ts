import type { FacultyCoraChatAction } from "./faculty-cora-api"

export function moduleAction(
  moduleId: string,
  label: string,
  extra?: Record<string, unknown>,
): FacultyCoraChatAction {
  return {
    id: `open-${moduleId}-${label.replace(/\s+/g, "-").toLowerCase()}`,
    label,
    kind: "open_module",
    payload: { moduleId, ...extra },
  }
}

export function generateQuestionsAction(
  prompt: string,
  extra?: { count?: number; topic?: string },
): FacultyCoraChatAction {
  return {
    id: "generate-questions",
    label: extra?.count ? `Generate ${extra.count} drafts` : "Generate question drafts",
    kind: "generate_questions",
    payload: { prompt, ...extra },
  }
}

export function scheduleAutomationAction(
  label: string,
  payload: {
    jobType: "weekly_announcement" | "post_lecture_flashcards"
    notes?: string
    topic?: string
    runInHours?: number
  },
): FacultyCoraChatAction {
  return {
    id: `schedule-${payload.jobType}-${label.replace(/\s+/g, "-").toLowerCase()}`,
    label,
    kind: "schedule_automation",
    payload,
  }
}

export function openQuizCreateAction(
  label: string,
  extra?: { title?: string; prompt?: string; description?: string; assessmentType?: string },
): FacultyCoraChatAction {
  return {
    id: "open-quiz-create",
    label,
    kind: "open_quiz_create",
    payload: extra ?? {},
  }
}

export function normalizePrompt(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ")
}

export function matchesPrompt(message: string, prompts: string[]): boolean {
  const normalized = normalizePrompt(message)
  return prompts.some((prompt) => {
    const p = normalizePrompt(prompt)
    return normalized === p || normalized.includes(p) || p.includes(normalized)
  })
}

export function matchesAny(message: string, fragments: string[]): boolean {
  const normalized = normalizePrompt(message)
  return fragments.some((fragment) => normalized.includes(normalizePrompt(fragment)))
}
