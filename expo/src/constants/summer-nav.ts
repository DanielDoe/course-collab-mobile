import type { Ionicons } from "@expo/vector-icons"

export type SummerNavItem = {
  id: string
  label: string
  route: string
  icon: keyof typeof Ionicons.glyphMap
  /** Opens native screen when true; otherwise web module. */
  native?: boolean
}

export type SummerNavGroup = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  items: SummerNavItem[]
}

export const SUMMER_DASHBOARD_ROUTE = "/dashboard"

export const SUMMER_DASHBOARD_LINK: SummerNavItem = {
  id: "dashboard",
  label: "Dashboard",
  route: SUMMER_DASHBOARD_ROUTE,
  icon: "grid-outline",
  native: true,
}

export const SUMMER_NAV_GROUP: SummerNavGroup = {
  id: "summer-camp",
  label: "Summer Camp",
  icon: "sunny-outline",
  items: [
    { id: "my-trainings", label: "My Trainings", route: "/module/my-trainings", icon: "school-outline", native: true },
    { id: "browse-trainings", label: "Browse Trainings", route: "/module/browse-trainings", icon: "search-outline", native: true },
    { id: "roadmap", label: "Learning Roadmap", route: "/module/roadmap", icon: "map-outline", native: true },
    { id: "projects", label: "Projects", route: "/module/projects", icon: "folder-open-outline" },
    { id: "checkpoints", label: "Checkpoints & Submissions", route: "/module/checkpoints", icon: "cloud-upload-outline", native: true },
    { id: "discussions", label: "Discussions & Help", route: "/module/discussions", icon: "chatbubbles-outline" },
    { id: "messages", label: "Messages", route: "/module/messages", icon: "mail-outline", native: true },
    { id: "resources", label: "Resources", route: "/module/resources", icon: "library-outline", native: true },
    { id: "gallery", label: "Project Gallery", route: "/module/gallery", icon: "images-outline", native: true },
    { id: "graduation", label: "Camp Graduation", route: "/module/graduation", icon: "ribbon-outline", native: true },
    { id: "leaderboard", label: "Leaderboard", route: "/module/leaderboard", icon: "podium-outline", native: true },
    { id: "achievements", label: "Certificates & Achievements", route: "/module/achievements", icon: "medal-outline", native: true },
  ],
}

export const SUMMER_CAMP_INFO_ITEMS: SummerNavItem[] = [
  { id: "calendar", label: "Calendar", route: "/module/calendar", icon: "calendar-outline" },
]

/** @deprecated Camp info links live under Settings; kept for route labels only. */
export const SUMMER_CAMP_INFO_GROUP: SummerNavGroup = {
  id: "camp-info",
  label: "Camp Info",
  icon: "information-circle-outline",
  items: SUMMER_CAMP_INFO_ITEMS,
}

export const SUMMER_SETTINGS_LINK: SummerNavItem = {
  id: "settings",
  label: "Settings",
  route: "/settings",
  icon: "settings-outline",
}

const ALL_SUMMER_NAV: SummerNavItem[] = [
  SUMMER_DASHBOARD_LINK,
  ...SUMMER_NAV_GROUP.items,
  ...SUMMER_CAMP_INFO_ITEMS,
  SUMMER_SETTINGS_LINK,
]

export const SUMMER_NAV_LABEL_BY_ROUTE: Record<string, string> = Object.fromEntries(
  ALL_SUMMER_NAV.map((item) => [item.route, item.label]),
)

export function getSummerWebNavLabel(webPath: string): string {
  const normalized = webPath
    .replace(/^\/student\/dashboard-v2\/summer-camp\/?/, "")
    .replace(/^\/student\/dashboard-v2\/?/, "")
    .replace(/^\//, "")

  if (!normalized || normalized === "summer-camp") return "Summer Camp"

  const segment = normalized.split("/")[0]?.split("?")[0] ?? ""
  const item = ALL_SUMMER_NAV.find((entry) => entry.id === segment)
  if (item) return item.label

  if (SUMMER_NAV_LABEL_BY_ROUTE[`/module/${segment}`]) {
    return SUMMER_NAV_LABEL_BY_ROUTE[`/module/${segment}`]
  }

  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function isSummerImmersiveRoute(pathname: string): boolean {
  if (/^\/messages\//.test(pathname)) return true
  if (/^\/membership/.test(pathname)) return true
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true
  return pathname.includes("/summer/training/") && pathname.includes("/module/")
}

export function getSummerNavLabel(pathname: string): string {
  if (pathname.startsWith("/messages/")) return "Messages"
  if (SUMMER_NAV_LABEL_BY_ROUTE[pathname]) return SUMMER_NAV_LABEL_BY_ROUTE[pathname]
  if (pathname.includes("/settings")) return "Settings"
  if (pathname.includes("/dashboard")) return "Dashboard"
  if (pathname.includes("/summer/training/") && pathname.includes("/module/")) return "Module"
  if (pathname.includes("/summer/training/")) return "Training"

  const moduleMatch = pathname.match(/^\/module\/([^/?]+)/)
  if (moduleMatch) {
    const id = moduleMatch[1]
    const item = ALL_SUMMER_NAV.find((entry) => entry.id === id)
    if (item) return item.label
    return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return "Summer Camp"
}

export function getSummerNavGroupIdForPath(pathname: string): string | null {
  if (pathname.includes("/module/calendar")) return null
  if (pathname.includes("/module/")) return SUMMER_NAV_GROUP.id
  return null
}

/** Nav item id for the current route — used to scroll the drawer to the active row. */
export function getSummerActiveNavItemId(pathname: string): string | null {
  if (pathname.includes("/dashboard")) return SUMMER_DASHBOARD_LINK.id
  if (pathname.includes("/settings")) return SUMMER_SETTINGS_LINK.id
  if (pathname.startsWith("/messages/") || pathname.includes("/module/messages")) return "messages"
  if (pathname.includes("/summer/training/")) return "my-trainings"
  for (const item of [...SUMMER_NAV_GROUP.items, ...SUMMER_CAMP_INFO_ITEMS]) {
    if (pathname === item.route || pathname.startsWith(`${item.route}/`) || pathname.includes(`/module/${item.id}`)) {
      return item.id
    }
  }
  return null
}
