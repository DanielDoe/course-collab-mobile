import { useMemo } from "react"
import { hexToRgba, resolveThemeTokens, type AppThemeTokens } from "../../constants/app-themes"
import type { SectionTheme } from "../../constants/section-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { DEFAULT_APPEARANCE_PREFS } from "../appearance-preferences"
import { sectionThemeFromTokens } from "../themed-module-theme"

export type CalendarTheme = SectionTheme & { heroBg: string }

export function calendarThemeFromTokens(tokens: AppThemeTokens): CalendarTheme {
  return {
    ...sectionThemeFromTokens(tokens, "course-info", "Course Info"),
    heroBg: hexToRgba(tokens.accent, tokens.isDark ? 0.12 : 0.06),
  }
}

export function useCalendarTheme(): CalendarTheme {
  const tokens = useAppThemeTokens()
  return useMemo(() => calendarThemeFromTokens(tokens), [tokens])
}

/** Static default for non-React callers — prefer useCalendarTheme(). */
export const CALENDAR_THEME = calendarThemeFromTokens(
  resolveThemeTokens(DEFAULT_APPEARANCE_PREFS.themeId, DEFAULT_APPEARANCE_PREFS.appearanceMode, null),
)
