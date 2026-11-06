import type { StudentSession } from "./session"
import type { StudentContextPayload } from "./student-context-api"
import { loadCoraStudentContext } from "./cora-student-context-loader"
import {
  STUDENT_CORA_CAPABILITIES,
  type StudentCoraCapability,
  type StudentCoraCapabilityId,
} from "./student-cora-config"

export const STUDENT_CORA_CONTEXT_VERSION = 1

export type StudentCoraSetupStepId =
  | "preparing"
  | "exploring"
  | "reading"
  | "generating"
  | "finalizing"

export const STUDENT_CORA_SETUP_STEPS: Array<{ id: StudentCoraSetupStepId; label: string }> = [
  { id: "preparing", label: "Setting things up" },
  { id: "exploring", label: "Exploring your course" },
  { id: "reading", label: "Reading your progress" },
  { id: "generating", label: "Personalizing suggestions" },
  { id: "finalizing", label: "Finalizing Cora setup" },
]

export type StudentCoraContext = {
  version: typeof STUDENT_CORA_CONTEXT_VERSION
  studentId: string
  studentName?: string
  courseId?: number
  courseCode?: string
  courseTitle?: string
  section?: string
  focusLabel?: string
  focusTopics: string[]
  payload: StudentContextPayload
  tailoredCapabilities: StudentCoraCapability[]
  generatedAt: string
  setupComplete: boolean
}

function tailorCapabilityPrompts(
  capabilityId: StudentCoraCapabilityId,
  base: StudentCoraCapability,
  payload: StudentContextPayload,
): string[] {
  const courseCode = payload.account?.courseCode ?? "your course"
  const upcoming = payload.upcomingAssessments?.[0]?.title ?? "your next exam"
  const struggling =
    payload.strugglingTopics?.[0] ??
    payload.topicMastery?.find((row) => row.status === "weak" || row.mastery < 0.55)?.topic ??
    "key topics"
  const strength = payload.strengths?.[0] ?? payload.topicMastery?.[0]?.topic ?? "recent material"
  const lecture =
    payload.knowledgeGraph?.lectures?.[0]?.title ??
    payload.digitalNotes?.[0]?.title ??
    "your latest lecture"

  switch (capabilityId) {
    case "explain-problem":
      return [
        `Explain this ${courseCode} homework problem step by step`,
        `Why is my answer wrong for this ${courseCode} question?`,
        `Walk me through ${struggling} with a worked example`,
        `Break down the concepts I need before solving this ${courseCode} problem`,
        `Show me a similar ${courseCode} problem and talk through the method`,
        `Check my reasoning without giving me the final answer`,
      ]
    case "walk-circuit":
      return [
        `Walk me through this circuit analysis step by step`,
        `Explain voltage and current in each branch of this circuit`,
        `Help me analyze a circuit problem from ${courseCode}`,
        `Set up nodal or mesh equations for this circuit`,
        `Find the equivalent resistance and explain each simplification`,
        `Check my ${courseCode} circuit work and point out errors`,
      ]
    case "help-code":
      return [
        `Help me debug this code and explain what's going wrong`,
        `Trace through this program and show me the output`,
        `Review my ${courseCode} programming assignment approach`,
        `Explain this algorithm line by line with a sample input`,
        `Suggest a cleaner structure for this ${courseCode} solution`,
        `Find edge cases my code might fail on`,
      ]
    case "prepare-exam":
      return [
        `Help me prepare for ${upcoming} in ${courseCode}`,
        `Quiz me on topics most likely to appear on ${upcoming}`,
        `Build a focused review plan for ${upcoming}`,
        `What should I review first for ${upcoming} based on my weak areas?`,
        `Give me a 30-minute warm-up drill for ${upcoming}`,
        `Summarize must-know ideas for ${upcoming} in ${courseCode}`,
      ]
    case "review-homework":
      return [
        `Review my ${courseCode} homework and point out gaps in my reasoning`,
        `Check my work on ${struggling} and suggest concrete improvements`,
        `Compare my solution approach to the expected method`,
        `Tell me which steps are correct and which need rework`,
        `Help me rewrite my explanation more clearly`,
        `Flag anything that would lose partial credit on this assignment`,
      ]
    case "generate-flashcards":
      return [
        `Generate flashcards from ${lecture}`,
        `Create flashcards for ${struggling} in ${courseCode}`,
        `Build a deck covering ${strength} and weak areas`,
        `Make cards for definitions I keep mixing up in ${courseCode}`,
        `Turn ${lecture} into front/back flashcard pairs`,
        `Prioritize flashcards for topics likely on ${upcoming}`,
      ]
    case "summarize-lecture":
      return [
        `Summarize the key ideas from ${lecture}`,
        `Build a glossary of important terms from this week's ${courseCode} lectures`,
        `Turn ${lecture} into a short study outline`,
        `List formulas from ${lecture} and when to use each`,
        `Highlight common exam traps from ${lecture}`,
        `Create a one-page cheat sheet from ${lecture}`,
      ]
    case "create-study-plan":
      return [
        `Create a daily study plan for ${upcoming} in ${courseCode}`,
        `Build an exam countdown schedule focused on ${struggling}`,
        `Plan my next two weeks around ${courseCode} deadlines`,
        `Balance lectures, practice, and flashcards for this week`,
        `Suggest daily review blocks before ${upcoming}`,
        `Adjust my plan if I'm behind on ${struggling}`,
      ]
    default:
      return base.examplePrompts
  }
}

export function tailorStudentCoraCapabilities(payload: StudentContextPayload): StudentCoraCapability[] {
  return STUDENT_CORA_CAPABILITIES.map((capability) => ({
    ...capability,
    examplePrompts: tailorCapabilityPrompts(capability.id, capability, payload),
  }))
}

function resolveFocusTopics(payload: StudentContextPayload): string[] {
  const fromStruggling = payload.strugglingTopics ?? []
  const fromMastery =
    payload.topicMastery
      ?.filter((row) => row.status === "weak" || row.mastery < 0.55)
      .map((row) => row.topic) ?? []
  const combined = [...fromStruggling, ...fromMastery]
  const seen = new Set<string>()
  const result: string[] = []
  for (const topic of combined) {
    const key = topic.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(topic.trim())
  }
  return result.slice(0, 5)
}

function resolveFocusLabel(payload: StudentContextPayload, focusTopics: string[]): string | undefined {
  if (focusTopics[0]) return focusTopics[0]
  if (payload.upcomingAssessments?.[0]?.title) return payload.upcomingAssessments[0].title
  if (payload.account?.courseCode) return payload.account.courseCode
  return undefined
}

export async function buildStudentCoraContext(
  session: StudentSession,
  payload: StudentContextPayload,
): Promise<StudentCoraContext> {
  const focusTopics = resolveFocusTopics(payload)
  const tailoredCapabilities = tailorStudentCoraCapabilities(payload)

  return {
    version: STUDENT_CORA_CONTEXT_VERSION,
    studentId: session.databaseId,
    studentName: payload.account?.fullName ?? session.name,
    courseId: session.courseId,
    courseCode: payload.account?.courseCode ?? session.courseCode,
    courseTitle: payload.account?.courseTitle ?? undefined,
    section: payload.account?.section ?? session.section,
    focusLabel: resolveFocusLabel(payload, focusTopics),
    focusTopics,
    payload,
    tailoredCapabilities,
    generatedAt: new Date().toISOString(),
    setupComplete: true,
  }
}

export async function runStudentCoraContextSetup(
  session: StudentSession,
  options?: { onStep?: (step: StudentCoraSetupStepId) => void },
): Promise<StudentCoraContext> {
  options?.onStep?.("preparing")
  options?.onStep?.("exploring")
  options?.onStep?.("reading")
  const payload = await loadCoraStudentContext(session)
  options?.onStep?.("generating")
  const context = await buildStudentCoraContext(session, payload)
  options?.onStep?.("finalizing")
  return context
}
