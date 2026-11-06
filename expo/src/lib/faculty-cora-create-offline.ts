import type { InstructorScope } from "./instructor-content-api"
import { instructorApi } from "./instructor-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatResponse } from "./faculty-cora-api"
import type { DraftQuestionBankItem, QuestionBankAiDifficulty } from "./question-bank-ai-types"
import { isApiRouteMissingError } from "./http-errors"
import { ApiError } from "./api"
import {
  generateQuestionsAction,
  matchesAny,
  matchesPrompt,
  moduleAction,
} from "./faculty-cora-offline-shared"
import { buildLocalAnnouncementProposal, buildLocalFlashcardDeckProposal } from "./cora/local-proposals"

export function parseQuestionCount(message: string): number {
  const match = message.match(/\b(\d{1,2})\b/)
  if (!match) return 5
  return Math.min(15, Math.max(1, Number.parseInt(match[1], 10)))
}

export function parseTopicPhrase(message: string): string {
  const patterns = [
    /\bon\s+(.+?)(?:\.|$)/i,
    /\babout\s+(.+?)(?:\.|$)/i,
    /\bfrom\s+(.+?)(?:\.|$)/i,
    /\bfor\s+(.+?)(?:\.|$)/i,
  ]
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return "course topic"
}

export function parseHomeworkLabel(message: string): string {
  const match = message.match(/homework\s+(\d+)/i)
  return match ? `Homework ${match[1]}` : "this week's homework"
}

export function parseLectureLabel(message: string): string {
  const match = message.match(/lecture\s+(\d+)/i)
  return match ? `Lecture ${match[1]}` : "recent lecture"
}

export function buildAnnouncementDraft(homeworkLabel: string, courseCode?: string): { title: string; content: string } {
  const course = courseCode ? `${courseCode} — ` : ""
  return {
    title: `${course}Weekly update: ${homeworkLabel}`,
    content: [
      "Hi everyone,",
      "",
      `This is a quick update on **${homeworkLabel}**.`,
      "",
      "- Review the related lecture notes and practice problems before you start.",
      "- Start early so you have time to ask questions in office hours or on the forum.",
      "- Submit through CourseCollab before the posted deadline.",
      "",
      "Reply in the forum if anything is unclear — good luck!",
    ].join("\n"),
  }
}

function isQuestionBankPrompt(message: string): boolean {
  return matchesAny(message, ["question bank", "kirchhoff", "bank items"]) || (
    matchesAny(message, ["generate", "draft"]) &&
    !matchesAny(message, ["announcement", "flashcard", "playground"])
  )
}

function isAnnouncementPrompt(message: string): boolean {
  return matchesAny(message, [
    "announcement",
    "weekly update",
    "draft a weekly",
    "tell my students",
    "running late",
    "minutes late",
    "post to the class",
    "publish an announcement",
  ])
}

function isFlashcardPrompt(message: string): boolean {
  return matchesAny(message, ["flashcard", "flash card", "deck from", "notes on"])
}

function isCreateIntentMessage(message: string): boolean {
  return matchesAny(message, [
    "create",
    "generate",
    "draft",
    "build",
    "make",
    "flashcard",
    "announcement",
    "question bank",
    "playground",
    "notes",
  ])
}

export function normalizeFacultyChatActions(raw: unknown): FacultyCoraChatResponse["actions"] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is NonNullable<FacultyCoraChatResponse["actions"]>[number] =>
      !!item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { kind?: unknown }).kind === "string",
  )
}

function isPlaygroundPrompt(message: string): boolean {
  return matchesAny(message, ["playground", "question set", "live quiz"])
}

function generateQuestionBankReply(message: string): FacultyCoraChatResponse {
  const count = parseQuestionCount(message)
  const topic = parseTopicPhrase(message)

  return {
    reply: [
      `I'll help you create **${count} question bank item${count === 1 ? "" : "s"}** on **${topic}**.`,
      "",
      "Tap **Generate question drafts** to review AI drafts in Question Bank before publishing.",
      "You can also upload a PDF or slides from the **+** menu for document-based extraction.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "question-bank",
    actions: [
      generateQuestionsAction(message, { count, topic }),
      moduleAction("question-bank", "Open Question Bank"),
    ],
  }
}

function generateAnnouncementReply(
  message: string,
  scope?: InstructorScope,
): FacultyCoraChatResponse {
  const lateMatch = /\b(late|running late|few minutes|five minutes|5 minutes)\b/i.test(message)
  const homeworkLabel = parseHomeworkLabel(message)
  const courseLabel =
    (scope as InstructorScope & { courseCode?: string; courseTitle?: string })?.courseCode ||
    (scope as InstructorScope & { courseCode?: string; courseTitle?: string })?.courseTitle ||
    (scope?.courseId ? `Course ${scope.courseId}` : "your course")

  const draft = lateMatch
    ? {
        title: "Running About 5 Minutes Late",
        content: [
          "Hi everyone,",
          "",
          "I am running approximately five minutes late today. Please remain in the classroom and I will be there shortly.",
          "",
          "Thank you for your patience.",
        ].join("\n"),
      }
    : buildAnnouncementDraft(homeworkLabel, undefined)

  const proposals =
    scope?.courseId != null && scope.courseId > 0
      ? [
          buildLocalAnnouncementProposal({
            instructorId: scope.instructorId,
            courseId: scope.courseId,
            courseLabel,
            title: draft.title,
            content: draft.content,
          }),
        ]
      : []

  return {
    reply: [
      "Yes — I can publish that for you. Here's the announcement I prepared.",
      "",
      `**${draft.title}**`,
      "",
      draft.content,
      "",
      `**Audience:** ${courseLabel}`,
      "**Publish:** Immediately after you confirm",
      "",
      proposals.length
        ? "Confirm in the card below to publish to your course."
        : "Select a course first, then I can publish this announcement.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "announcements",
    proposals,
    actions: proposals.length
      ? []
      : [
          moduleAction("announcements", "Open announcement draft", {
            pendingKind: "announcement_draft",
            title: draft.title,
            content: draft.content,
          }),
        ],
  }
}

function generateFlashcardReply(message: string, scope?: InstructorScope): FacultyCoraChatResponse {
  const lectureLabel = parseLectureLabel(message)
  const topic = parseTopicPhrase(message)
  const resolvedTopic = topic !== "course topic" ? topic : lectureLabel
  const courseLabel =
    (scope as InstructorScope & { courseCode?: string; courseTitle?: string })?.courseCode ||
    (scope as InstructorScope & { courseCode?: string; courseTitle?: string })?.courseTitle ||
    (scope?.courseId ? `Course ${scope.courseId}` : "your course")

  const proposals =
    scope?.courseId != null && scope.courseId > 0
      ? [
          buildLocalFlashcardDeckProposal({
            instructorId: scope.instructorId,
            courseId: scope.courseId,
            courseLabel,
            topicName: resolvedTopic.replace(/\s+for my students.*$/i, "").trim() || resolvedTopic,
          }),
        ]
      : []

  return {
    reply: [
      `To build flashcards from **${lectureLabel}** notes:`,
      "",
      "1. Confirm the matching **question bank topic** (often the lecture week or unit name).",
      "2. Generate cards from the bank — Cora pre-filled the topic below.",
      "3. Review and edit cards before students see them.",
      "",
      topic !== "course topic"
        ? `Suggested bank topic: **${topic}**`
        : `Try a topic like **${lectureLabel}** if it exists in your bank.`,
      "",
      proposals.length
        ? "Confirm in the card below to generate the deck in CourseCollab."
        : "Select a course first, then I can generate the deck for you.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "flashcards",
    proposals,
    actions: proposals.length
      ? [
          moduleAction("flashcards", "Review flashcards", {
            pendingKind: "flashcard_topic",
            topicName: resolvedTopic,
          }),
        ]
      : [
          moduleAction("flashcards", "Generate flashcards", {
            pendingKind: "flashcard_topic",
            topicName: resolvedTopic,
          }),
          moduleAction("lectures", "Manage Lectures"),
          moduleAction("course-notes", "Course Notes"),
        ],
  }
}

function generatePlaygroundReply(message: string): FacultyCoraChatResponse {
  const topic = parseTopicPhrase(message)
  const resolvedTopic = topic !== "course topic" ? topic : "loops"

  return {
    reply: [
      `Let's build a **playground question set** on **${resolvedTopic}**.`,
      "",
      "Open Playground → **Questions** to pick bank items, or start a live session from selected topics.",
      "Cora will pre-select the topic filter when you open the module.",
    ].join("\n"),
    offline: true,
    suggestedModuleId: "playground",
    actions: [
      moduleAction("playground", "Open Playground", {
        pendingKind: "playground_topic",
        topic: resolvedTopic,
        questionCount: 10,
        openQuestionsTab: true,
      }),
      moduleAction("question-bank", "Question Bank"),
    ],
  }
}

function genericCreateReply(): FacultyCoraChatResponse {
  return {
    reply: [
      "I can help you **create** course content even while Cora chat is offline:",
      "",
      "- Question bank items from a topic or uploaded document",
      "- Announcement drafts for homework and weekly updates",
      "- Flashcard decks from lecture notes and bank topics",
      "- Playground question sets for in-class review",
      "",
      "Pick a starter prompt or tell me what you'd like to build.",
    ].join("\n"),
    offline: true,
    actions: [
      moduleAction("question-bank", "Question Bank"),
      moduleAction("announcements", "Announcements"),
      moduleAction("flashcards", "Flashcards"),
      moduleAction("playground", "Playground"),
    ],
  }
}

export function buildFacultyCoraCreateOfflineReply(
  message: string,
  scope?: InstructorScope,
): FacultyCoraChatResponse {
  if (
    matchesPrompt(message, ["draft a weekly announcement for homework 3"]) ||
    isAnnouncementPrompt(message)
  ) {
    return generateAnnouncementReply(message, scope)
  }

  if (
    matchesPrompt(message, ["create flashcards from lecture 6 notes"]) ||
    isFlashcardPrompt(message)
  ) {
    return generateFlashcardReply(message, scope)
  }

  if (
    matchesPrompt(message, ["build a playground question set on loops"]) ||
    isPlaygroundPrompt(message)
  ) {
    return generatePlaygroundReply(message)
  }

  if (
    matchesPrompt(message, ["generate 5 question bank items on kirchhoff's laws"]) ||
    isQuestionBankPrompt(message)
  ) {
    return generateQuestionBankReply(message)
  }

  return genericCreateReply()
}

function buildTemplateQuestionDrafts(topic: string, count: number): DraftQuestionBankItem[] {
  const difficulties: QuestionBankAiDifficulty[] = ["easy", "medium", "hard"]
  return Array.from({ length: count }, (_, index) => ({
    draftId: `offline-${Date.now()}-${index}`,
    question_text: `[Draft ${index + 1}] Add a question about ${topic} for your students.`,
    question_type: "mcq",
    difficulty: difficulties[index % difficulties.length],
    topic,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correct_answer: "Option A",
    hint: `Review ${topic} before finalizing this item.`,
    explanation: null,
    evaluation_mode: "auto" as const,
    answer_guidelines: [],
    sample_answer: null,
    subquestions: null,
    source_note: "Offline placeholder — edit or regenerate when Cora server routes are live.",
  }))
}

export async function generateFacultyCoraQuestionDrafts(
  scope: InstructorScope,
  payload: { prompt: string; count?: number; topic?: string },
): Promise<{ drafts: DraftQuestionBankItem[]; parsed: Record<string, unknown>; offline?: boolean }> {
  const count = payload.count ?? parseQuestionCount(payload.prompt)
  const topic = payload.topic?.trim() || parseTopicPhrase(payload.prompt)

  try {
    const drafts = await Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const res = await instructorApi.generateQuestionBankDraft(scope, {
          questionType: "mcq",
          description: `${payload.prompt} (item ${index + 1} of ${count})`,
          correctAnswer: "Option A",
          topic,
          difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
          includeHint: true,
          includeExplanation: true,
        })
        return res.draft
      }),
    )
    return { drafts, parsed: { topic, count, source: "question-bank-generate-draft" } }
  } catch {
    return {
      drafts: buildTemplateQuestionDrafts(topic, count),
      parsed: { topic, count, source: "offline-template" },
      offline: true,
    }
  }
}

/**
 * Live Cora chat often returns conversational text without `actions` / `proposals`.
 * Re-attach create-intent chips from the offline matcher so instructors still get
 * "Generate flashcards" / module shortcuts after the API reply.
 */
export function supplementFacultyCoraLiveResponse(
  scope: InstructorScope,
  message: string,
  response: FacultyCoraChatResponse,
  capabilityId?: FacultyCoraCapabilityId,
): FacultyCoraChatResponse {
  if (response.offline || response.rbacBlocked || response.scopeRedirect) {
    return response
  }

  const actions = normalizeFacultyChatActions(response.actions)
  const proposals = response.proposals ?? []
  if (proposals.length > 0) {
    return { ...response, actions }
  }

  const shouldSupplement = capabilityId === "create" || isCreateIntentMessage(message)
  if (!shouldSupplement) return response

  const supplemental = buildFacultyCoraCreateOfflineReply(message, scope)
  const supplementalActions = normalizeFacultyChatActions(supplemental.actions)
  const supplementalProposals = supplemental.proposals ?? []
  if (supplementalActions.length === 0 && supplementalProposals.length === 0) {
    return response
  }

  return {
    ...response,
    proposals: supplementalProposals,
    actions: supplementalActions,
    suggestedModuleId: supplemental.suggestedModuleId ?? response.suggestedModuleId,
  }
}

export async function buildFacultyCoraCreateOfflineChatReply(
  _scope: InstructorScope,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  if (payload.capabilityId !== "create") {
    return {
      reply:
        "Cora chat is not connected to the server yet for this build. You can still open Question Bank, Quizzes, and other modules from the capability cards below.",
      offline: true,
      actions: [],
    }
  }

  return buildFacultyCoraCreateOfflineReply(payload.message, _scope)
}

export function isCoraGenerateQuestionsOfflineError(err: unknown): boolean {
  return err instanceof ApiError && isApiRouteMissingError(err.status, err.message)
}
