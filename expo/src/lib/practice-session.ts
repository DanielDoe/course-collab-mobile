import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy"

export type PracticeQuestion = {
  id: number
  question_text: string
  question_type: string
  hint: string | null
  difficulty: string
  topic: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e?: string
  correct_answer?: string
  question_media?: unknown
  subquestions?: unknown
  solution_upload_config?: unknown
  locked?: boolean
  alreadyAttempted?: boolean
  priorAnswer?: string | string[]
  priorIsCorrect?: boolean
  answerReview?: {
    isCorrect: boolean
    summary: string
    correctLetters: string[]
    correctTexts: string[]
    explanation?: string | null
  }
}

export type PracticeSessionData = {
  attemptId: number
  questions: PracticeQuestion[]
  topic: string
  difficulty?: string
  reviewOnly?: boolean
}

let activeSession: PracticeSessionData | null = null

const SESSION_FILE = documentDirectory ? `${documentDirectory}coursecollab-practice-session.json` : null

export async function setActivePracticeSession(session: PracticeSessionData): Promise<void> {
  activeSession = session
  if (!SESSION_FILE) return
  try {
    await writeAsStringAsync(SESSION_FILE, JSON.stringify(session))
  } catch {
    // In-memory session still works for the current navigation.
  }
}

export function getActivePracticeSession(): PracticeSessionData | null {
  return activeSession
}

export async function hydrateActivePracticeSession(): Promise<PracticeSessionData | null> {
  if (activeSession) return activeSession
  if (!SESSION_FILE) return null
  try {
    const info = await getInfoAsync(SESSION_FILE)
    if (!info.exists) return null
    const raw = await readAsStringAsync(SESSION_FILE)
    activeSession = JSON.parse(raw) as PracticeSessionData
    return activeSession
  } catch {
    return null
  }
}

export async function clearActivePracticeSession(): Promise<void> {
  activeSession = null
  if (!SESSION_FILE) return
  try {
    await deleteAsync(SESSION_FILE, { idempotent: true })
  } catch {
    // ignore
  }
}

export function isMultiSelectType(type: string): boolean {
  const t = type.toLowerCase()
  return t === "select_all" || t === "multi_output"
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** Clear stored practice session when the WebView leaves quiz/results — not on /practice/quiz URLs. */
export function shouldClearPracticeSessionOnWebNav(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/"
    if (path.includes("/practice/results/")) return true
    if (path.endsWith("/student/dashboard-v2/practice")) return true
    if (path.endsWith("/student/practice")) return true
    return false
  } catch {
    return false
  }
}
