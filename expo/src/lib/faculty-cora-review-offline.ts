import type { InstructorScope } from "./instructor-content-api"
import { instructorFlashcardsApi } from "./instructor-content-api"
import type { FlashcardDeck } from "./flashcards-api"
import type { FacultyCoraCapabilityId } from "./faculty-cora-config"
import type { FacultyCoraChatResponse } from "./faculty-cora-api"
import {
  instructorApi,
  type InstructorProject,
  type InstructorQuiz,
  type InstructorQuizQuestion,
  type InstructorSyllabus,
  type SyllabusSection,
} from "./instructor-api"
import { matchesAny, matchesPrompt, moduleAction } from "./faculty-cora-offline-shared"

export type FacultyCoraReviewContext = {
  syllabus: InstructorSyllabus | null
  quizzes: InstructorQuiz[]
  quizQuestions: InstructorQuizQuestion[]
  targetQuiz: InstructorQuiz | null
  flashcardDecks: FlashcardDeck[]
  projects: InstructorProject[]
  syncedAt: string
}

const OUTCOME_KEYWORDS = ["outcome", "objective", "goal", "competency", "learning"]

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function parseQuizNumber(message: string): number | null {
  const match = message.match(/quiz\s+(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

function findQuizByNumber(quizzes: InstructorQuiz[], number: number): InstructorQuiz | undefined {
  return quizzes.find((quiz) => new RegExp(`\\bquiz\\s*#?\\s*${number}\\b`, "i").test(quiz.title))
}

function sectionText(section: SyllabusSection): string {
  const chunks: string[] = [section.title]
  if (section.content.markdown) chunks.push(section.content.markdown)
  if (section.content.items?.length) chunks.push(section.content.items.join(" "))
  if (section.content.fields) chunks.push(Object.values(section.content.fields).join(" "))
  return stripHtml(chunks.join(" "))
}

function syllabusOutcomeSections(sections: SyllabusSection[]): SyllabusSection[] {
  return sections.filter((section) => {
    const haystack = `${section.title} ${section.type} ${sectionText(section)}`.toLowerCase()
    return OUTCOME_KEYWORDS.some((keyword) => haystack.includes(keyword))
  })
}

function ambiguousQuestionFlags(question: InstructorQuizQuestion): string[] {
  const text = stripHtml(question.question_text).toLowerCase()
  const flags: string[] = []
  if (/\b(all|none|always|never|both|either)\b/.test(text)) flags.push("absolute wording")
  if (text.includes("best") || text.includes("most correct")) flags.push("subjective superlative")
  if (text.length < 40) flags.push("very short stem")
  if (text.includes("?)") || text.includes("??")) flags.push("unclear punctuation")
  if (/\bwhich of the following\b/.test(text) && text.split(",").length > 4) flags.push("long compound stem")
  return flags
}

export async function buildFacultyCoraReviewContext(
  scope: InstructorScope,
  message: string,
): Promise<FacultyCoraReviewContext> {
  const quizNum = parseQuizNumber(message) ?? 3
  const [syllabusRes, quizzes, flashcardRes, projects] = await Promise.all([
    instructorApi.getSyllabus(scope).catch(() => null),
    instructorApi.getQuizzes(scope, "quiz").catch(() => [] as InstructorQuiz[]),
    instructorFlashcardsApi.listDecks(scope).catch(() => ({ decks: [] as FlashcardDeck[] })),
    instructorApi.getProjects(scope).catch(() => [] as InstructorProject[]),
  ])

  const targetQuiz = findQuizByNumber(quizzes, quizNum) ?? quizzes[0] ?? null
  let quizQuestions: InstructorQuizQuestion[] = []
  if (targetQuiz) {
    try {
      const detail = await instructorApi.getQuiz(scope, targetQuiz.id)
      quizQuestions = detail.questions ?? []
    } catch {
      quizQuestions = []
    }
  }

  return {
    syllabus: syllabusRes?.syllabus ?? null,
    quizzes,
    quizQuestions,
    targetQuiz,
    flashcardDecks: flashcardRes.decks ?? [],
    projects,
    syncedAt: new Date().toISOString(),
  }
}

function syllabusCoverageReply(ctx: FacultyCoraReviewContext): FacultyCoraChatResponse {
  const { syllabus } = ctx
  const lines = ["**Syllabus learning outcomes review**", ""]

  if (!syllabus) {
    lines.push("No syllabus found for this course. Add or publish a syllabus first, then rerun this review.")
    return {
      reply: lines.join("\n"),
      offline: true,
      contextSyncedAt: ctx.syncedAt,
      suggestedModuleId: "syllabus",
      actions: [moduleAction("syllabus", "Open Syllabus")],
    }
  }

  const visibleSections = syllabus.sections.filter((section) => section.isVisible)
  const outcomeSections = syllabusOutcomeSections(visibleSections)
  lines.push(
    `**${syllabus.title}** (${syllabus.status}) — ${visibleSections.length} visible section${visibleSections.length === 1 ? "" : "s"}.`,
  )

  if (outcomeSections.length > 0) {
    lines.push("", "**Outcome-related sections**")
    for (const section of outcomeSections.slice(0, 6)) {
      lines.push(`- **${section.title}** (${section.type})`)
    }
  } else {
    lines.push("", "No dedicated outcomes section detected — consider adding one titled *Course Learning Outcomes*.")
  }

  const requiredMissingContent = visibleSections
    .filter((section) => section.isRequired)
    .filter((section) => sectionText(section).length < 24)
  if (requiredMissingContent.length > 0) {
    lines.push("", "**Required sections needing content**")
    for (const section of requiredMissingContent.slice(0, 4)) {
      lines.push(`- ${section.title}`)
    }
  }

  lines.push("", "Cross-check assessments and lectures against these outcomes in **Syllabus** and **Manage Lectures**.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "syllabus",
    actions: [
      moduleAction("syllabus", "Open Syllabus"),
      moduleAction("lectures", "Manage Lectures"),
      moduleAction("course-evaluations", "Course Evaluations"),
    ],
  }
}

function quizWordingReply(ctx: FacultyCoraReviewContext, message: string): FacultyCoraChatResponse {
  const quizNum = parseQuizNumber(message) ?? 3
  const quiz = ctx.targetQuiz
  const lines = [`**Quiz ${quizNum} wording review**`, ""]

  if (!quiz) {
    lines.push(`Could not find **Quiz ${quizNum}** in this course.`)
    return {
      reply: lines.join("\n"),
      offline: true,
      contextSyncedAt: ctx.syncedAt,
      suggestedModuleId: "quizzes",
      actions: [moduleAction("quizzes", "Manage Quizzes"), moduleAction("question-bank", "Question Bank")],
    }
  }

  lines.push(`**${quiz.title}** — ${ctx.quizQuestions.length || quiz.question_count || 0} questions.`)

  const flagged = ctx.quizQuestions
    .map((question) => ({ question, flags: ambiguousQuestionFlags(question) }))
    .filter((row) => row.flags.length > 0)

  if (flagged.length > 0) {
    lines.push("", "**Potential ambiguity flags**")
    for (const row of flagged.slice(0, 5)) {
      lines.push(
        `- Q${row.question.question_order ?? row.question.id}: ${row.flags.join(", ")} — "${stripHtml(row.question.question_text).slice(0, 90)}…"`,
      )
    }
  } else if (ctx.quizQuestions.length > 0) {
    lines.push("", "No strong ambiguity heuristics triggered — still spot-check stems manually for double negatives and trick wording.")
  } else {
    lines.push("", "Question text unavailable offline — open the quiz editor for a full wording pass.")
  }

  lines.push("", "Use **Improve** in Cora or edit directly in **Manage Quizzes** / **Question Bank**.")

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "quizzes",
    actions: [
      moduleAction("quizzes", "Manage Quizzes"),
      moduleAction("question-bank", "Question Bank"),
      moduleAction("results", "Manage Results"),
    ],
  }
}

function flashcardsReviewReply(ctx: FacultyCoraReviewContext): FacultyCoraChatResponse {
  const decks = ctx.flashcardDecks
  const lines = ["**Flashcard review for this week**", ""]

  if (decks.length > 0) {
    const recent = [...decks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
    lines.push(`Found **${decks.length}** deck${decks.length === 1 ? "" : "s"}:`)
    for (const deck of recent) {
      lines.push(
        `- **${deck.title}** — ${deck.cardCount} cards${deck.topic ? ` · topic ${deck.topic}` : ""}${deck.isPublished ? "" : " (draft)"}`,
      )
    }
    lines.push("", "**Quality checks**")
    lines.push("- Front/back pairs should test one idea each")
    lines.push("- Avoid duplicate stems already in quizzes")
    lines.push("- Publish only after verifying MCQ validation settings")
  } else {
    lines.push("No flashcard decks yet. Generate from lecture notes or question bank topics first.")
  }

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "flashcards",
    actions: [
      moduleAction("flashcards", "Flashcards"),
      moduleAction("lectures", "Manage Lectures"),
      moduleAction("question-bank", "Question Bank"),
    ],
  }
}

function projectRubricReply(ctx: FacultyCoraReviewContext): FacultyCoraChatResponse {
  const projects = ctx.projects
  const lines = ["**Project rubric fairness review**", ""]

  if (projects.length > 0) {
    for (const project of projects.slice(0, 4)) {
      lines.push(`**${project.title}** (${project.status})`)
      if (project.summary?.trim()) lines.push(`- Summary: ${stripHtml(project.summary).slice(0, 120)}`)
      if (project.deliverables?.trim()) lines.push(`- Deliverables: ${stripHtml(project.deliverables).slice(0, 120)}`)
      if (project.timeline?.trim()) lines.push(`- Timeline: ${stripHtml(project.timeline).slice(0, 80)}`)
      lines.push(
        `- Group: ${project.group?.name ?? "Unassigned"} · Leader: ${project.leader?.full_name ?? "—"}`,
      )
      lines.push("")
    }
    lines.push("**Fairness checklist**")
    lines.push("- Criteria align with stated deliverables and timeline")
    lines.push("- Weighting is explicit for code, report, and presentation portions")
    lines.push("- Same rubric applies across sections unless documented exceptions exist")
  } else {
    lines.push("No projects found. Create or import project specs before reviewing rubric fairness.")
  }

  return {
    reply: lines.join("\n"),
    offline: true,
    contextSyncedAt: ctx.syncedAt,
    suggestedModuleId: "projects",
    actions: [
      moduleAction("projects", "Manage Projects"),
      moduleAction("groups", "Manage Groups"),
      moduleAction("course-evaluations", "Course Evaluations"),
    ],
  }
}

function genericReviewReply(): FacultyCoraChatResponse {
  return {
    reply: [
      "**Quality review for your course**",
      "",
      "I can audit:",
      "",
      "- Syllabus learning outcomes coverage",
      "- Quiz wording and ambiguity",
      "- Flashcard decks for the current topic",
      "- Project rubric fairness",
      "",
      "Pick a starter prompt to begin.",
    ].join("\n"),
    offline: true,
    actions: [
      moduleAction("syllabus", "Open Syllabus"),
      moduleAction("quizzes", "Manage Quizzes"),
      moduleAction("flashcards", "Flashcards"),
      moduleAction("projects", "Manage Projects"),
    ],
  }
}

export async function buildFacultyCoraReviewOfflineChatReply(
  scope: InstructorScope,
  payload: {
    message: string
    capabilityId?: FacultyCoraCapabilityId
  },
): Promise<FacultyCoraChatResponse> {
  if (payload.capabilityId !== "review") {
    return genericReviewReply()
  }

  let ctx: FacultyCoraReviewContext
  try {
    ctx = await buildFacultyCoraReviewContext(scope, payload.message)
  } catch {
    return {
      reply:
        "I couldn't load review context right now. Open **Syllabus**, **Manage Quizzes**, or **Flashcards** directly.",
      offline: true,
      actions: [
        moduleAction("syllabus", "Open Syllabus"),
        moduleAction("quizzes", "Manage Quizzes"),
      ],
    }
  }

  const message = payload.message

  if (
    matchesPrompt(message, ["review my syllabus for learning outcomes coverage"]) ||
    matchesAny(message, ["syllabus", "learning outcomes coverage"])
  ) {
    return syllabusCoverageReply(ctx)
  }

  if (
    matchesPrompt(message, ["review quiz 3 for ambiguous wording"]) ||
    matchesAny(message, ["ambiguous wording", "review quiz"])
  ) {
    return quizWordingReply(ctx, message)
  }

  if (
    matchesPrompt(message, ["review flashcards for this week's topic"]) ||
    matchesAny(message, ["review flashcards", "flashcards for this week"])
  ) {
    return flashcardsReviewReply(ctx)
  }

  if (
    matchesPrompt(message, ["review project rubric fairness"]) ||
    matchesAny(message, ["project rubric", "rubric fairness"])
  ) {
    return projectRubricReply(ctx)
  }

  return syllabusCoverageReply(ctx)
}
