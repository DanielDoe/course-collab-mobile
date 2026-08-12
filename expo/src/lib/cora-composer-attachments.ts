import { normalizeImportedProblem, type CoraImportedProblem } from "./cora-api"
import { resolveImportedQuestionMedia, stripDuplicateMediaCaptionFromQuestion } from "./classroom-submission"
import type { ChatMessage } from "./ai-tutor-api"

export type CoraComposerAttachment = {
  id: string
  name: string
  mimeType: string
  kind: "text" | "image"
  text?: string
  size?: number
}

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|xml|html|css|js|ts|tsx|jsx|py|java|cpp|c|h|hpp|cs|rb|go|rs|sql|yaml|yml|tex|log)$/i

export function isLikelyTextFile(name: string, mimeType: string): boolean {
  if (mimeType.startsWith("text/")) return true
  return TEXT_EXTENSIONS.test(name)
}

export function formatAttachmentsForMessage(attachments: CoraComposerAttachment[]): string {
  let extra = ""
  for (const attachment of attachments) {
    if (attachment.kind === "text" && attachment.text) {
      extra += `\n\n--- ${attachment.name} ---\n${attachment.text}\n---`
    } else if (attachment.kind === "image") {
      extra += `\n\n[Attached image: ${attachment.name}]`
    }
  }
  return extra
}

/** Structured import payload for `/api/ai-tutor` (matches web `problemContext`). */
export function buildProblemContextForApi(problem: CoraImportedProblem): CoraImportedProblem {
  const normalized = normalizeImportedProblem(problem)
  const media = resolveImportedQuestionMedia(normalized)

  return {
    source: normalized.source,
    domain: normalized.domain,
    title: normalized.title,
    topic: normalized.topic,
    questionText: normalized.questionText,
    questionType: normalized.questionType,
    expectedAnswer: normalized.expectedAnswer ?? null,
    hint: normalized.hint ?? null,
    explanation: normalized.explanation ?? null,
    bankQuestionId: normalized.bankQuestionId,
    questionId: normalized.questionId,
    quizId: normalized.quizId,
    lectureId: normalized.lectureId,
    classroomSubmissionId: normalized.classroomSubmissionId,
    studentDatabaseId: normalized.studentDatabaseId,
    referenceSteps: normalized.referenceSteps,
    options: normalized.options,
    choices: normalized.choices,
    questionMedia: media,
    question_media: media,
    mediaUrl: media?.media_url ?? normalized.mediaUrl ?? null,
  }
}

function appendIfPresent(lines: string[], label: string, value?: string | null) {
  const trimmed = value?.trim()
  if (trimmed) lines.push(`${label}: ${trimmed}`)
}

/** Plain-text context block for the AI from an imported course question. */
export function buildImportedQuestionContext(
  problem: CoraImportedProblem,
  label?: string | null,
): string {
  const normalized = normalizeImportedProblem(problem)
  const title = label?.trim() || normalized.title?.trim() || normalized.topic?.trim() || "Imported course question"
  const lines = [`Course question: ${title}`]

  appendIfPresent(lines, "Source", normalized.source)
  appendIfPresent(lines, "Domain", normalized.domain)
  appendIfPresent(lines, "Question type", normalized.questionType)
  appendIfPresent(lines, "Topic", normalized.topic)

  const media = resolveImportedQuestionMedia(normalized)
  const questionBody = stripDuplicateMediaCaptionFromQuestion(normalized.questionText ?? "", media)
  if (questionBody.trim()) {
    lines.push(questionBody.trim())
  }
  const figureDescription = media?.media_caption?.trim() || media?.media_alt_text?.trim()
  if (figureDescription) {
    lines.push(`Figure: ${figureDescription}`)
  }
  if (media?.media_url?.trim()) {
    lines.push(`Figure URL: ${media.media_url.trim()}`)
  }

  if (normalized.referenceSteps?.length) {
    lines.push(
      `Reference steps:\n${normalized.referenceSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
    )
  }

  appendIfPresent(lines, "Hint", normalized.hint)
  appendIfPresent(lines, "Explanation", normalized.explanation)
  appendIfPresent(lines, "Expected answer (course reference)", normalized.expectedAnswer)

  const idParts = [
    normalized.bankQuestionId != null ? `bankQuestionId=${normalized.bankQuestionId}` : "",
    normalized.questionId != null ? `questionId=${normalized.questionId}` : "",
    normalized.quizId != null ? `quizId=${normalized.quizId}` : "",
    normalized.lectureId != null ? `lectureId=${normalized.lectureId}` : "",
    normalized.classroomSubmissionId != null ? `classroomSubmissionId=${normalized.classroomSubmissionId}` : "",
  ].filter(Boolean)
  if (idParts.length > 0) {
    lines.push(`Question IDs: ${idParts.join(", ")}`)
  }

  return lines.join("\n\n")
}

/** User-visible chat text stays in `content`; this adds imported-question context for the API. */
export function buildMessageForApi(message: ChatMessage): string {
  if (message.role !== "user") return message.content
  if (!message.importedQuestion) return message.content

  const context = buildImportedQuestionContext(message.importedQuestion, message.importedQuestionLabel)
  const prompt = message.content.trim()
  const genericOpener = /^Help me work through this question/i.test(prompt)

  if (!prompt || genericOpener) {
    return `Help me work through this imported course question.\n\n${context}`
  }

  return `${context}\n\nStudent request: ${prompt}`
}

export function buildWorkspaceSendText({
  input,
  attachments,
  importedQuestion,
}: {
  input: string
  attachments: CoraComposerAttachment[]
  importedQuestion: { title?: string } | null
}): string {
  let text = input.trim() + formatAttachmentsForMessage(attachments)
  if (!text.trim() && importedQuestion) {
    text = `Help me work through this question${importedQuestion.title ? `: ${importedQuestion.title}` : "."}`
  }
  return text.trim()
}
