import * as SecureStore from "expo-secure-store"
import {
  CODEBENCH_LANGUAGES,
  DEFAULT_CODEBENCH_LANGUAGE_ID,
  type CodebenchLanguageId,
  type CodebenchLearningMode,
} from "../constants/codebench-languages"

const LANG_KEY = "codebench.languageId"
const MODE_KEY = "codebench.learningMode"
const XP_KEY = "codebench.xp"
const LATEST_CODE_KEY = "codebench.latestCode"

export async function loadCodebenchLanguageId(): Promise<CodebenchLanguageId> {
  try {
    const raw = await SecureStore.getItemAsync(LANG_KEY)
    if (raw && CODEBENCH_LANGUAGES.some((l) => l.id === raw)) {
      return raw as CodebenchLanguageId
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CODEBENCH_LANGUAGE_ID
}

export async function saveCodebenchLanguageId(id: CodebenchLanguageId): Promise<void> {
  try {
    await SecureStore.setItemAsync(LANG_KEY, id)
  } catch {
    /* ignore */
  }
}

export async function loadCodebenchLearningMode(): Promise<CodebenchLearningMode> {
  try {
    const raw = await SecureStore.getItemAsync(MODE_KEY)
    if (raw === "beginner" || raw === "intermediate" || raw === "expert") return raw
  } catch {
    /* ignore */
  }
  return "intermediate"
}

export async function saveCodebenchLearningMode(mode: CodebenchLearningMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export async function loadCodebenchXp(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(XP_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export async function saveCodebenchXp(xp: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(XP_KEY, String(Math.max(0, Math.floor(xp))))
  } catch {
    /* ignore */
  }
}

/** Latest submitted / evaluated code — used by Analytics when API list lags. */
export async function loadCodebenchLatestCode(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(LATEST_CODE_KEY)) ?? ""
  } catch {
    return ""
  }
}

export async function saveCodebenchLatestCode(code: string): Promise<void> {
  const trimmed = code.trim()
  if (!trimmed) return
  try {
    await SecureStore.setItemAsync(LATEST_CODE_KEY, trimmed.slice(0, 120_000))
  } catch {
    /* ignore */
  }
}

export const CODEBENCH_XP_REWARDS = {
  explain: 5,
  debug: 5,
  improve: 5,
  pseudocode: 5,
  tutor: 3,
  practice: 5,
  evaluate: 10,
  submit: 10,
} as const

export type CodebenchXpAction = keyof typeof CODEBENCH_XP_REWARDS

export async function awardCodebenchXp(action: CodebenchXpAction, amount?: number): Promise<number> {
  const earned = amount ?? CODEBENCH_XP_REWARDS[action]
  const current = await loadCodebenchXp()
  const next = current + earned
  await saveCodebenchXp(next)
  return next
}

export function codebenchLevel(xp: number): number {
  return Math.floor(xp / 100) + 1
}
