import { fetchStudentLectureViewerData } from "./student-lecture-api"
import { studentApi, type LectureItem, type StudentLectureDetail } from "./student-api"
import { flashcardsApi, type FlashcardCard, type FlashcardDeck } from "./flashcards-api"
import { practiceApi, type TopicProgress } from "./practice-api"
import type { StudentSession } from "./session"
import { hashToolContent } from "./cora-tool-results-cache"

const TEXT_FIELDS = [
  "notes",
  "content",
  "summary",
  "ai_summary",
  "slide_notes",
  "lecture_notes",
  "description",
  "objectives",
  "key_points",
  "transcript",
] as const

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 6 || out.length > 80) return
  if (typeof value === "string" && value.trim().length > 12) {
    out.push(value.trim())
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1)
    return
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (TEXT_FIELDS.includes(key as (typeof TEXT_FIELDS)[number]) || key.includes("note") || key.includes("summary")) {
        collectStrings(nested, out, depth + 1)
      }
    }
  }
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export type LectureToolContext = {
  lectureId: number
  week: number
  title: string
  label: string
  contentHash: string
  contextBlock: string
}

export async function loadLectureToolContext(
  session: StudentSession,
  lecture: Pick<LectureItem, "id" | "week" | "title" | "description">,
): Promise<LectureToolContext> {
  const chunks: string[] = [
    `Week ${lecture.week}: ${lecture.title}`,
    lecture.description?.trim() ?? "",
  ]

  try {
    const bundle = await fetchStudentLectureViewerData(session, lecture.id)
    const detail = bundle.lecture as StudentLectureDetail
    if (detail.description?.trim()) chunks.push(detail.description.trim())

    for (const q of bundle.samplePractice.questions ?? []) {
      const text = [q.title, q.question_text].filter(Boolean).join(" — ")
      if (text.trim()) chunks.push(stripHtml(text))
    }
    for (const q of bundle.workspace.questions ?? []) {
      const text = [q.title, q.question_text].filter(Boolean).join(" — ")
      if (text.trim()) chunks.push(stripHtml(text))
    }
  } catch {
    /* fall back to list metadata */
  }

  try {
    const contentRes = await studentApi.getLectureContent(session, lecture.id)
    collectStrings(contentRes, chunks)
    if (contentRes.lecture && typeof contentRes.lecture === "object") {
      collectStrings(contentRes.lecture, chunks)
    }
  } catch {
    /* metadata-only context */
  }

  const unique = [...new Set(chunks.map((c) => stripHtml(c)).filter((c) => c.length > 8))]
  const body = unique.join("\n\n").slice(0, 12000)
  const contentHash = hashToolContent(body || `${lecture.id}:${lecture.title}:${lecture.week}`)
  const label = `Week ${lecture.week} · ${lecture.title}`

  const contextBlock = [
    "=== CourseCollab lecture material (use this as the primary source) ===",
    label,
    "",
    body || "(No extracted lecture text was available — use your course knowledge graph and ask the student which slides to focus on.)",
    "=== End lecture material ===",
  ].join("\n")

  return {
    lectureId: lecture.id,
    week: lecture.week,
    title: lecture.title,
    label,
    contentHash,
    contextBlock,
  }
}

export type FlashcardToolContext = {
  deck: FlashcardDeck
  card: FlashcardCard
  label: string
  contentHash: string
  contextBlock: string
}

export async function loadFlashcardToolContext(
  session: StudentSession,
  deckId: number,
  cardId: number,
): Promise<FlashcardToolContext | null> {
  const { deck, cards } = await flashcardsApi.getDeck(session, deckId)
  const card = cards.find((c) => c.id === cardId)
  if (!card) return null

  const body = [
    `Deck: ${deck.title}`,
    deck.topic ? `Topic: ${deck.topic}` : "",
    deck.description?.trim() ?? "",
    "",
    `Front: ${card.frontText.trim()}`,
    `Back: ${card.backText.trim()}`,
  ]
    .filter(Boolean)
    .join("\n")

  const contentHash = hashToolContent(`${deck.id}:${deck.updatedAt}:${card.id}:${card.frontText}:${card.backText}`)
  const label = `${deck.title} — ${card.frontText.trim().slice(0, 48)}`

  const contextBlock = [
    "=== CourseCollab flashcard ===",
    body,
    "=== End flashcard ===",
  ].join("\n")

  return { deck, card, label, contentHash, contextBlock }
}

export type PracticeToolContext = {
  topic: TopicProgress
  questions: Array<{ id: number; text: string; topic: string; difficulty?: string }>
  label: string
  contentHash: string
  contextBlock: string
}

export async function loadPracticeToolContext(
  session: StudentSession,
  topic: TopicProgress,
  questionCount = 5,
): Promise<PracticeToolContext> {
  const generated = await practiceApi.generate(session, {
    topics: [topic.name],
    count: questionCount,
    courseId: session.courseId ?? undefined,
  })

  const questions = (generated.questions ?? []).map((q) => ({
    id: q.id,
    text: stripHtml(q.question_text ?? ""),
    topic: q.topic ?? topic.name,
    difficulty: q.difficulty,
  }))

  const body = questions
    .map((q, i) => `${i + 1}. [${q.topic}${q.difficulty ? ` · ${q.difficulty}` : ""}] ${q.text}`)
    .join("\n")

  const contentHash = hashToolContent(`${topic.name}:${topic.questionCount}:${topic.accuracy}:${body}`)
  const label = topic.name

  const contextBlock = [
    "=== CourseCollab practice questions (quiz the student using these — one at a time) ===",
    `Topic: ${topic.name}`,
    `Student accuracy on this topic: ${topic.accuracy}% (${topic.completed} attempts)`,
    "",
    body || "(No questions were generated — ask conceptual questions for this topic instead.)",
    "=== End practice questions ===",
  ].join("\n")

  return { topic, questions, label, contentHash, contextBlock }
}

export async function loadLectureList(session: StudentSession): Promise<LectureItem[]> {
  const data = await studentApi.getLectures(session)
  return (data.lectures ?? []).sort((a, b) => a.week - b.week)
}

export async function loadFlashcardDecks(session: StudentSession): Promise<FlashcardDeck[]> {
  const data = await flashcardsApi.listDecks(session)
  return [...(data.courseDecks ?? []), ...(data.myDecks ?? [])].sort((a, b) =>
    a.title.localeCompare(b.title),
  )
}

export async function loadPracticeTopics(session: StudentSession): Promise<TopicProgress[]> {
  const data = await practiceApi.getTopicsProgress(session)
  return (data.topics ?? []).sort((a, b) => a.name.localeCompare(b.name))
}
