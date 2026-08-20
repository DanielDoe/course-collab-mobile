import * as SecureStore from "./secure-store-client"
import {
  DEFAULT_APPEARANCE_MODE,
  DEFAULT_THEME_ID,
  THEME_DEFINITIONS,
  type AppearanceMode,
  type ThemeId,
} from "../constants/app-themes"

export type AppearancePrefs = {
  appearanceMode: AppearanceMode
  themeId: ThemeId
}

const PREFS_KEY = "course-collab.appearance-prefs"

export const DEFAULT_APPEARANCE_PREFS: AppearancePrefs = {
  appearanceMode: DEFAULT_APPEARANCE_MODE,
  themeId: DEFAULT_THEME_ID,
}

const VALID_MODES: AppearanceMode[] = ["light", "dark", "system"]
const VALID_THEMES: ThemeId[] = THEME_DEFINITIONS.map((def) => def.id)

export async function getAppearancePrefs(): Promise<AppearancePrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY)
    if (!raw) return DEFAULT_APPEARANCE_PREFS
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>
    return {
      appearanceMode: VALID_MODES.includes(parsed.appearanceMode as AppearanceMode)
        ? (parsed.appearanceMode as AppearanceMode)
        : DEFAULT_APPEARANCE_MODE,
      themeId: VALID_THEMES.includes(parsed.themeId as ThemeId)
        ? (parsed.themeId as ThemeId)
        : DEFAULT_THEME_ID,
    }
  } catch {
    return DEFAULT_APPEARANCE_PREFS
  }
}

export async function saveAppearancePrefs(prefs: AppearancePrefs): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs))
}
