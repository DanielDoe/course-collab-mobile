import type { Ionicons } from "@expo/vector-icons"

export type AnalyticsTabId = "overview" | "insights" | "activity"

/** Legacy tab ids from older builds map into the 3 native segments. */
export type LegacyAnalyticsTabId =
  | AnalyticsTabId
  | "profile"
  | "analytics"
  | "badges"
  | "challenge"
  | "leaderboard"
  | "streak"

export function normalizeAnalyticsTab(tab?: LegacyAnalyticsTabId): AnalyticsTabId {
  switch (tab) {
    case "insights":
    case "analytics":
      return "insights"
    case "activity":
    case "badges":
    case "challenge":
    case "leaderboard":
    case "streak":
      return "activity"
    case "overview":
    case "profile":
    default:
      return "overview"
  }
}

export const ANALYTICS_TABS: {
  id: AnalyticsTabId
  label: string
  shortLabel: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: "sparkles-outline" },
  { id: "insights", label: "Insights", shortLabel: "Insights", icon: "bar-chart-outline" },
  { id: "activity", label: "Activity", shortLabel: "Activity", icon: "flame-outline" },
]

export type BadgeDefinition = {
  id: string
  name: string
  description: string
  icon: string
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  { id: "loops_master", name: "Mastered Loops", description: "Demonstrated proficiency with loops", icon: "🔄" },
  { id: "bug_hunter", name: "Bug Hunter", description: "Successfully debugged 10+ code issues", icon: "🐛" },
  { id: "clean_code", name: "Clean Code", description: "Improved code quality 5+ times", icon: "✨" },
  { id: "oop_apprentice", name: "OOP Apprentice", description: "Used OOP concepts in your code", icon: "🏛️" },
  { id: "pointer_pathfinder", name: "Pointer Pathfinder", description: "Mastered pointer concepts", icon: "📍" },
  { id: "recursion_king", name: "Recursion King", description: "Solved problems using recursion", icon: "♻️" },
  { id: "stl_expert", name: "STL Expert", description: "Used STL containers effectively", icon: "📚" },
  { id: "streak_3", name: "3-Day Streak", description: "Maintained a 3-day coding streak", icon: "🔥" },
  { id: "streak_7", name: "7-Day Streak", description: "Maintained a 7-day coding streak", icon: "🔥" },
  { id: "streak_30", name: "30-Day Streak", description: "Maintained a 30-day coding streak", icon: "🔥" },
]

export const CONCEPT_LABELS: Record<string, string> = {
  loops: "Loops",
  pointers: "Pointers",
  oop: "OOP",
  recursion: "Recursion",
  arrays: "Arrays",
  stl: "STL"}

export function xpLevel(xp: number): { level: number; progress: number; inLevel: number; toNext: number } {
  const level = Math.floor(xp / 100) + 1
  const inLevel = xp % 100
  return { level, progress: inLevel, inLevel, toNext: 100 }
}

export function levelColor(level: string | undefined, accent = "#7a4eba", accentHover = accent, warning = "#EAAA00"): string {
  if (level === "Advanced") return warning
  if (level === "Intermediate") return accentHover
  return accent
}
