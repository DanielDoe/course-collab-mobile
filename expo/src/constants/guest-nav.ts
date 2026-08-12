import type { Ionicons } from "@expo/vector-icons"

export type GuestNavItem = {
  id: string
  label: string
  route: string
  icon: keyof typeof Ionicons.glyphMap
  native?: boolean
}

export type GuestNavGroup = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  items: GuestNavItem[]
}

export const GUEST_DASHBOARD_ROUTE = "/dashboard"

export const GUEST_DASHBOARD_LINK: GuestNavItem = {
  id: "dashboard",
  label: "Dashboard",
  route: GUEST_DASHBOARD_ROUTE,
  icon: "grid-outline",
  native: true,
}

export const GUEST_MESSAGES_LINK: GuestNavItem = {
  id: "messages",
  label: "Messages",
  route: "/module/messages",
  icon: "mail-outline",
  native: true,
}

export const GUEST_NAV_GROUP: GuestNavGroup = {
  id: "recommendations",
  label: "Recommendation Letters",
  icon: "document-text-outline",
  items: [
    {
      id: "recommendations",
      label: "My Letters",
      route: "/module/recommendations",
      icon: "folder-open-outline",
      native: true,
    },
  ],
}

export const GUEST_SETTINGS_LINK: GuestNavItem = {
  id: "settings",
  label: "Settings",
  route: "/settings",
  icon: "settings-outline",
}

const ALL_GUEST_NAV: GuestNavItem[] = [
  GUEST_DASHBOARD_LINK,
  GUEST_MESSAGES_LINK,
  ...GUEST_NAV_GROUP.items,
  GUEST_SETTINGS_LINK,
]

export const GUEST_NAV_LABEL_BY_ROUTE: Record<string, string> = Object.fromEntries(
  ALL_GUEST_NAV.map((item) => [item.route, item.label]),
)

export function getGuestNavLabel(pathname: string): string {
  if (pathname.startsWith("/messages/")) return "Conversation"
  if (pathname.startsWith("/recommendation/")) return "Letter workspace"
  return GUEST_NAV_LABEL_BY_ROUTE[pathname] ?? "Guest portal"
}

export function getGuestNavGroupIdForPath(pathname: string): string | null {
  if (pathname === GUEST_DASHBOARD_ROUTE) return null
  if (pathname.startsWith("/module/messages") || pathname.startsWith("/messages/")) return null
  if (pathname.startsWith("/module/recommendations") || pathname.startsWith("/recommendation/")) {
    return GUEST_NAV_GROUP.id
  }
  if (pathname === GUEST_SETTINGS_LINK.route) return null
  return null
}

/** Nav item id for the current route — used to scroll the drawer to the active row. */
export function getGuestActiveNavItemId(pathname: string): string | null {
  if (pathname === GUEST_DASHBOARD_LINK.route) return GUEST_DASHBOARD_LINK.id
  if (pathname === GUEST_MESSAGES_LINK.route || pathname.startsWith("/messages/")) {
    return GUEST_MESSAGES_LINK.id
  }
  if (
    pathname === GUEST_SETTINGS_LINK.route ||
    pathname.startsWith("/settings/")
  ) {
    return GUEST_SETTINGS_LINK.id
  }
  for (const item of GUEST_NAV_GROUP.items) {
    if (pathname === item.route || pathname.startsWith(`${item.route}/`) || pathname.startsWith("/recommendation/")) {
      return item.id
    }
  }
  return null
}

/** Map embedded student web paths to native guest routes. */
export function resolveGuestNativeRouteFromWebPath(webPath: string): string {
  const normalized = decodeURIComponent(webPath).split("?")[0]?.toLowerCase() ?? ""
  if (normalized.includes("recommendation")) return "/module/recommendations"
  if (normalized.includes("messages")) return "/module/messages"
  if (normalized.includes("settings")) return "/settings"
  return GUEST_DASHBOARD_ROUTE
}
