import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatAction, FacultyCoraChatResponse } from "./faculty-cora-api"
import { matchesAny, matchesPrompt, moduleAction } from "./faculty-cora-offline-shared"
import { resolveImproveImportHint, type FacultyCoraImportHint } from "./faculty-cora-question-import"

function importFromCourseAction(label: string, hint: FacultyCoraImportHint): FacultyCoraChatAction {
  return {
    id: `import-${hint.sourceKey ?? "course"}`,
    label,
    kind: "import_from_course",
    payload: {
      sourceKey: hint.sourceKey,
      containerHint: hint.containerHint,
      improveGoal: hint.improveGoal,
    },
  }
}

function improveQuizReply(message: string): FacultyCoraChatResponse {
  const hint = resolveImproveImportHint(message)
  return {
    reply: [
      "**Let's improve a quiz**",
      "",
      "First, pick the assessment and question you'd like to refine.",
      "",
      "Use **Import from course** to pull in a quiz item — then I'll suggest edits for discrimination, distractors, and fairness.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "quizzes",
    actions: [
      importFromCourseAction("Import quiz question", hint),
      moduleAction("quizzes", "Manage Quizzes"),
      moduleAction("question-bank", "Question Bank"),
    ],
  }
}

function improveConceptualReply(message: string): FacultyCoraChatResponse {
  const hint = resolveImproveImportHint(message)
  return {
    reply: [
      "**Make questions more conceptual**",
      "",
      "Import the bank items or quiz questions you want to elevate from recall to application/analysis.",
      "",
      "After import, tell me whether you want scenario-based stems, multi-step reasoning, or richer explanations.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "question-bank",
    actions: [
      importFromCourseAction("Import questions to improve", hint),
      moduleAction("question-bank", "Question Bank"),
      moduleAction("practice", "Manage Practice"),
    ],
  }
}

function improveDistractorsReply(message: string): FacultyCoraChatResponse {
  const hint = resolveImproveImportHint(message)
  return {
    reply: [
      "**Better distractors**",
      "",
      "Import the target question (for example, **question 12**) from your question bank or an assessment.",
      "",
      "I'll propose revised distractors, explain common misconceptions, and flag anything ambiguous.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "question-bank",
    actions: [
      importFromCourseAction("Import question 12", hint),
      moduleAction("question-bank", "Question Bank"),
    ],
  }
}

function improveHomeworkReply(message: string): FacultyCoraChatResponse {
  const hint = resolveImproveImportHint(message)
  const homework = hint.containerHint ?? "Homework"
  return {
    reply: [
      `**Reduce difficulty on ${homework}**`,
      "",
      `Import a question from **${homework}** (or the whole assessment's hardest items one at a time).`,
      "",
      "I'll suggest simpler wording, scaffolding hints, and difficulty adjustments while preserving outcomes.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "homework",
    actions: [
      importFromCourseAction(`Import from ${homework}`, hint),
      moduleAction("homework", "Manage Homework"),
      moduleAction("question-bank", "Question Bank"),
    ],
  }
}

function genericImproveReply(): FacultyCoraChatResponse {
  return {
    reply: [
      "**What would you like to improve?**",
      "",
      "Import a question from your course first — quizzes, homework, or question bank — then tell me your goal:",
      "",
      "- Stronger discrimination and distractors",
      "- More conceptual depth",
      "- Clearer wording and fairness",
      "- Lower difficulty with scaffolding",
    ].join("\n"),
    offline: true,
    actions: [
      importFromCourseAction("Import from course", { openOnMount: true }),
      moduleAction("question-bank", "Question Bank"),
      moduleAction("quizzes", "Manage Quizzes"),
    ],
  }
}

export function buildFacultyCoraImproveOfflineReply(message: string): FacultyCoraChatResponse {
  if (
    matchesPrompt(message, ["improve this quiz for better discrimination"]) ||
    matchesAny(message, ["discrimination", "improve this quiz"])
  ) {
    return improveQuizReply(message)
  }

  if (
    matchesPrompt(message, ["make these questions more conceptual"]) ||
    matchesAny(message, ["more conceptual", "conceptual"])
  ) {
    return improveConceptualReply(message)
  }

  if (
    matchesPrompt(message, ["generate better distractors for question 12"]) ||
    matchesAny(message, ["distractor", "question 12"])
  ) {
    return improveDistractorsReply(message)
  }

  if (
    matchesPrompt(message, ["reduce difficulty on homework 4"]) ||
    matchesAny(message, ["reduce difficulty", "homework"])
  ) {
    return improveHomeworkReply(message)
  }

  return genericImproveReply()
}

export async function buildFacultyCoraImproveOfflineChatReply(
  _scope: unknown,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  if (payload.capabilityId !== "improve") {
    return {
      reply:
        "Cora chat is not connected to the server yet for this build. Switch to Improve mode and import a course question to continue.",
      offline: true,
      actions: [],
    }
  }

  return buildFacultyCoraImproveOfflineReply(payload.message)
}
