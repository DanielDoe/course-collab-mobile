import * as SecureStore from "../secure-store-client"
import type { CoraActivityEntry, CoraConfirmActionResult, CoraProposalTool } from "./types"

const ACTIVITY_KEY = "cora_action_activity_v1"
const MAX_ENTRIES = 100

export async function clearCoraActivity(): Promise<void> {
  await SecureStore.deleteItemAsync(ACTIVITY_KEY)
}

export async function loadCoraActivity(): Promise<CoraActivityEntry[]> {
  try {
    const raw = await SecureStore.getItemAsync(ACTIVITY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CoraActivityEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function recordCoraActivity(
  entry: Omit<CoraActivityEntry, "id" | "createdAt"> & { createdAt?: string },
): Promise<CoraActivityEntry> {
  const full: CoraActivityEntry = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  }
  const prev = await loadCoraActivity()
  const next = [full, ...prev].slice(0, MAX_ENTRIES)
  await SecureStore.setItemAsync(ACTIVITY_KEY, JSON.stringify(next))
  return full
}

export async function recordActivityFromConfirmResult(
  result: CoraConfirmActionResult,
  role: "student" | "faculty" | "admin",
  courseId?: number | null,
): Promise<void> {
  if (!result.success) return
  await recordCoraActivity({
    tool: result.tool,
    message: result.message,
    entityType: result.entity?.type,
    entityId: result.entity?.id,
    entityTitle: result.entity?.title,
    route: result.entity?.route,
    courseId: courseId ?? null,
    role,
  })
}

export function activityToolLabel(tool: CoraProposalTool): string {
  switch (tool) {
    case "announcement.publish":
      return "Published announcement"
    case "questionBank.createQuestions":
      return "Created questions"
    case "assessment.createFromBank":
      return "Created assessment"
    case "message.send":
      return "Sent message"
    case "personalFlashcards.createDeck":
    case "flashcard.generateFromBank":
      return "Created flashcard deck"
    case "personalNotes.create":
      return "Saved note"
    case "personalCalendar.createEvents":
    case "calendar.createStudySessions":
      return "Created calendar events"
    case "personalPracticeQuiz.create":
      return "Created practice quiz"
    case "personalStudyPlan.create":
      return "Created study plan"
    case "syllabus.saveSection":
      return "Saved syllabus section"
    case "syllabus.publishSection":
      return "Published syllabus section"
    case "lecture.createShell":
      return "Created lecture"
    case "account.passwordReset.approve":
      return "Approved password reset"
    case "account.passwordReset.reject":
      return "Rejected password reset"
    default:
      return "Cora action"
  }
}
