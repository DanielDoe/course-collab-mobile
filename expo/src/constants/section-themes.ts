import { NATIVE, SYSTEM } from "./faculty-native-theme"
import { STUDENT_BRAND, getStudentModuleTheme, STUDENT_THEME } from "./student-theme"
import { STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP } from "./student-nav"

/** Shared palette shape for drawer sections and module screens. */
export type SectionTheme = {
  id: string
  label: string
  primary: string
  primaryDark: string
  primaryLight: string
  soft: string
  softBorder: string
  gradient: [string, string, string]
  navActiveBg: string
  navActiveBorder: string
  ink?: string
}

function theme(
  id: string,
  label: string,
  primary: string,
  primaryDark: string,
  primaryLight: string,
  soft: string,
  softBorder: string,
  navActiveBg: string,
): SectionTheme {
  return {
    id,
    label,
    primary,
    primaryDark,
    primaryLight,
    soft,
    softBorder,
    gradient: [primaryDark, primary, primaryLight],
    navActiveBg,
    navActiveBorder: softBorder,
  }
}

function systemTheme(
  id: string,
  label: string,
  sys: { color: string; soft: string; border: string },
  primaryDark?: string,
  primaryLight?: string,
): SectionTheme {
  return theme(
    id,
    label,
    sys.color,
    primaryDark ?? sys.color,
    primaryLight ?? sys.color,
    sys.soft,
    sys.border,
    sys.soft,
  )
}

/** Grades module — red accent for score-focused UI. */
export const GRADES_MODULE_THEME = systemTheme("grades", "Grades", SYSTEM.red, "#991b1b", "#f87171")

/** Semantic section palettes — system purple UI + PVAMU brand gradients. */
const pvamuSection = (id: string, label: string): SectionTheme => ({
  ...STUDENT_THEME,
  id,
  label,
})

export const SECTION_THEMES: Record<string, SectionTheme> = {
  dashboard: pvamuSection("dashboard", "Dashboard"),
  "learning-center": pvamuSection("learning-center", "Learning Center"),
  assessments: pvamuSection("assessments", "Assessments"),
  collaboration: pvamuSection("collaboration", "Collaboration"),
  "performance-rewards": pvamuSection("performance-rewards", "Performance & Rewards"),
  "course-info": pvamuSection("course-info", "Course Info"),
  settings: pvamuSection("settings", "Settings"),
  support: pvamuSection("support", "Support"),
}

/** Fallback — unified student module theme (PVAMU purple). */
export const APP_THEME = STUDENT_THEME

/** Module body theme — drawer + modules use STUDENT_THEME. */
export const STUDENT_MODULE_THEME = STUDENT_THEME

/** Maps every drawer module id → parent section id. */
export const MODULE_SECTION_MAP: Record<string, string> = {
  announcements: "course-info",
}

for (const group of [...STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP]) {
  for (const item of group.items) {
    MODULE_SECTION_MAP[item.id] = group.id
  }
}

export function getSectionTheme(sectionId: string): SectionTheme {
  return SECTION_THEMES[sectionId] ?? APP_THEME
}

export function getModuleTheme(moduleId: string): SectionTheme {
  if (moduleId === "grades") return GRADES_MODULE_THEME
  return getStudentModuleTheme(moduleId)
}

export function getThemeForNavItem(item: { id: string; route: string }): SectionTheme {
  if (item.id === "dashboard") return SECTION_THEMES.dashboard
  if (item.id === "settings") return SECTION_THEMES.settings
  if (item.id === "membership") return SECTION_THEMES.support

  const moduleId =
    item.route === "/announcements" || item.route.startsWith("/announcements/")
      ? "announcements"
      : (item.route.replace(/^\/module\//, "").split("/")[0] ?? item.id)

  return getModuleTheme(moduleId)
}

export function getThemeForPathname(pathname: string): SectionTheme {
  if (pathname === "/dashboard") return SECTION_THEMES.dashboard
  if (pathname === "/settings") return SECTION_THEMES.settings
  if (pathname === "/membership") return SECTION_THEMES.support
  if (/^\/announcements(\/|$)/.test(pathname)) return getModuleTheme("announcements")

  const moduleMatch = pathname.match(/^\/module\/([^/]+)/)
  if (moduleMatch?.[1]) return getModuleTheme(moduleMatch[1])

  return SECTION_THEMES.dashboard
}

export const LEARNING_CENTER_THEME = SECTION_THEMES["learning-center"]
export const ASSESSMENTS_THEME = SECTION_THEMES.assessments
export const COLLABORATION_THEME = SECTION_THEMES.collaboration
export const PERFORMANCE_REWARDS_THEME = SECTION_THEMES["performance-rewards"]
export const COURSE_INFO_SECTION_THEME = SECTION_THEMES["course-info"]
export const SUPPORT_SECTION_THEME = SECTION_THEMES.support
export const SETTINGS_SECTION_THEME = SECTION_THEMES.settings
