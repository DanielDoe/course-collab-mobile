/**
 * Client-side helpers to build local proposals when the faculty chat API is offline.
 * Confirmation still goes through CourseCollab APIs (createAnnouncement / bulk create).
 */

import type { InstructorScope } from "../instructor-content-api"
import type { StudentSession } from "../session"
import { instructorApi } from "../instructor-api"
import { flashcardsApi } from "../flashcards-api"
import { digitalNotesApi } from "../digital-notes-api"
import type { DraftQuestionBankItem } from "../question-bank-ai-types"
import type { CoraActionProposal, CoraConfirmActionResult, CoraProposalPreview } from "./types"
import { recordActivityFromConfirmResult } from "./activity-store"

function localProposalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Local (unsigned) proposal for offline faculty drafts — confirmed via direct CourseCollab APIs. */
export function buildLocalAnnouncementProposal(input: {
  instructorId: number
  courseId: number
  courseLabel: string
  title: string
  content: string
  pinned?: boolean
}): CoraActionProposal {
  const now = Date.now()
  const preview: CoraProposalPreview = {
    title: "Publish announcement",
    summary: input.title,
    fields: [
      { label: "Audience", value: `${input.courseLabel} · All students` },
      { label: "Delivery", value: "Publish now" },
    ],
    confirmLabel: "Publish announcement",
    entityType: "announcement",
  }
  return {
    actionId: localProposalId(),
    userId: input.instructorId,
    role: "faculty",
    institutionId: null,
    courseId: input.courseId,
    tool: "announcement.publish",
    arguments: {
      courseId: input.courseId,
      title: input.title,
      content: input.content,
      pinned: input.pinned === true,
      __local: true,
    },
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
    preview,
    hash: "local",
  }
}

export function buildLocalQuestionBankProposal(input: {
  instructorId: number
  courseId: number
  courseLabel: string
  drafts: DraftQuestionBankItem[]
  topic: string
}): CoraActionProposal {
  const now = Date.now()
  const typeCounts = new Map<string, number>()
  for (const d of input.drafts) {
    typeCounts.set(d.question_type, (typeCounts.get(d.question_type) ?? 0) + 1)
  }
  const typeSummary = [...typeCounts.entries()].map(([t, n]) => `${n} ${t}`).join(" · ")
  return {
    actionId: localProposalId(),
    userId: input.instructorId,
    role: "faculty",
    institutionId: null,
    courseId: input.courseId,
    tool: "questionBank.createQuestions",
    arguments: {
      courseId: input.courseId,
      drafts: input.drafts,
      __local: true,
    },
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
    preview: {
      title: "Create questions in Question Bank",
      summary: `${input.drafts.length} questions · ${input.topic}`,
      fields: [
        { label: "Topic", value: input.topic },
        { label: "Count", value: String(input.drafts.length) },
        { label: "Types", value: typeSummary || "mixed" },
        { label: "Course", value: input.courseLabel },
      ],
      confirmLabel: "Create in Question Bank",
      entityType: "question",
    },
    hash: "local",
  }
}

export function isLocalCoraProposal(proposal: CoraActionProposal): boolean {
  return proposal.hash === "local" || proposal.arguments?.__local === true
}

/** Execute local proposals through the same CourseCollab client APIs the UI uses. */
export async function executeLocalCoraProposal(
  proposal: CoraActionProposal,
  ctx:
    | { role: "faculty"; scope: InstructorScope }
    | { role: "student"; session: StudentSession },
): Promise<CoraConfirmActionResult> {
  if (Date.parse(proposal.expiresAt) < Date.now()) {
    return {
      success: false,
      tool: proposal.tool,
      message: "This action proposal has expired. Ask Cora to prepare it again.",
      error: "expired",
    }
  }

  switch (proposal.tool) {
    case "announcement.publish": {
      if (ctx.role !== "faculty") {
        return { success: false, tool: proposal.tool, message: "Faculty required.", error: "role" }
      }
      const res = await instructorApi.createAnnouncement(ctx.scope, {
        title: String(proposal.arguments.title ?? ""),
        content: String(proposal.arguments.content ?? ""),
        pinned: proposal.arguments.pinned === true,
      })
      const result: CoraConfirmActionResult = {
        success: true,
        tool: proposal.tool,
        message: `Announcement published.`,
        entity: {
          type: "announcement",
          id: Number(res.id),
          title: String(proposal.arguments.title ?? ""),
          route: "/module/announcements",
        },
        undo: { method: "delete", entityType: "announcement", entityId: Number(res.id) },
      }
      await recordActivityFromConfirmResult(result, "faculty", ctx.scope.courseId)
      return result
    }
    case "questionBank.createQuestions": {
      if (ctx.role !== "faculty") {
        return { success: false, tool: proposal.tool, message: "Faculty required.", error: "role" }
      }
      const drafts = Array.isArray(proposal.arguments.drafts)
        ? (proposal.arguments.drafts as DraftQuestionBankItem[])
        : []
      const res = await instructorApi.bulkCreateQuestionBankQuestions(ctx.scope, drafts)
      const result: CoraConfirmActionResult = {
        success: true,
        tool: proposal.tool,
        message: `Added ${res.createdCount} question${res.createdCount === 1 ? "" : "s"} to your bank.`,
        entity: {
          type: "question",
          id: res.questionIds[0] ?? 0,
          title: `${res.createdCount} questions`,
          route: "/module/question-bank",
        },
      }
      await recordActivityFromConfirmResult(result, "faculty", ctx.scope.courseId)
      return result
    }
    case "personalFlashcards.createDeck": {
      if (ctx.role !== "student") {
        return { success: false, tool: proposal.tool, message: "Student required.", error: "role" }
      }
      const topic = String(proposal.arguments.topic ?? "Study")
      const title = String(proposal.arguments.title ?? `Flashcards · ${topic}`)
      const cards = Array.isArray(proposal.arguments.cards)
        ? (proposal.arguments.cards as { front: string; back: string }[])
        : []
      const { deck } = await flashcardsApi.createDeck(ctx.session, {
        title,
        topic,
        description: "Created by Cora",
      })
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]!
        if (!card.front?.trim() || !card.back?.trim()) continue
        await flashcardsApi.addCard(ctx.session, deck.id, {
          frontText: card.front.trim(),
          backText: card.back.trim(),
          sortOrder: i,
        })
      }
      const result: CoraConfirmActionResult = {
        success: true,
        tool: proposal.tool,
        message: `Created flashcard deck "${deck.title}".`,
        entity: {
          type: "flashcard_deck",
          id: deck.id,
          title: deck.title,
          route: `/flashcards/${deck.id}/edit`,
        },
      }
      await recordActivityFromConfirmResult(result, "student", ctx.session.courseId)
      return result
    }
    case "personalNotes.create": {
      if (ctx.role !== "student") {
        return { success: false, tool: proposal.tool, message: "Student required.", error: "role" }
      }
      const title = String(proposal.arguments.title ?? "Cora study note")
      const bodyText = String(proposal.arguments.bodyText ?? proposal.arguments.content ?? "")
      const { note } = await digitalNotesApi.createNote(ctx.session, {
        title,
        bodyText: bodyText || `Notes on ${String(proposal.arguments.topic ?? "study")}`,
      })
      const result: CoraConfirmActionResult = {
        success: true,
        tool: proposal.tool,
        message: `Saved note "${note.title ?? title}".`,
        entity: {
          type: "note",
          id: note.id,
          title: note.title ?? title,
          route: `/notes/${note.id}`,
        },
      }
      await recordActivityFromConfirmResult(result, "student", ctx.session.courseId)
      return result
    }
    default:
      return {
        success: false,
        tool: proposal.tool,
        message: `Unsupported local tool: ${proposal.tool}`,
        error: "unsupported",
      }
  }
}
