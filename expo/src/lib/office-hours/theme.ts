import { useMemo } from "react"
import { hexToRgba, resolveThemeTokens, type AppThemeTokens } from "../../constants/app-themes"
import type { SectionTheme } from "../../constants/section-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { DEFAULT_APPEARANCE_PREFS } from "../appearance-preferences"
import { COURSE_INFO_COLOR, courseInfoThemeFromTokens } from "../course-info-color-theme"

export type OfficeHoursTheme = SectionTheme & { heroBg: string; ink: string }

export function officeHoursThemeFromTokens(tokens: AppThemeTokens): OfficeHoursTheme {
  const base = courseInfoThemeFromTokens(tokens)
  return {
    ...base,
    ink: tokens.text,
    heroBg: hexToRgba(COURSE_INFO_COLOR.primary, tokens.isDark ? 0.12 : 0.06),
  }
}

export function useOfficeHoursTheme(): OfficeHoursTheme {
  const tokens = useAppThemeTokens()
  return useMemo(() => officeHoursThemeFromTokens(tokens), [tokens])
}

/** Static default for non-React callers — prefer useOfficeHoursTheme(). */
export const OFFICE_HOURS_THEME = officeHoursThemeFromTokens(
  resolveThemeTokens(DEFAULT_APPEARANCE_PREFS.themeId, DEFAULT_APPEARANCE_PREFS.appearanceMode, null),
)
