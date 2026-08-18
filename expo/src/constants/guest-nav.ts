import type { Ionicons } from "@expo/vector-icons"

export type GuestNavItem = {
  id: string
  label: string
  route: string
  icon: keyof typeof Ionicons.glyphMap
  native?: boolean
  /** Hide when user already has Cora Career lifetime. */
  hideWhenCareerUnlocked?: boolean
  /** Hide when entitlements.nav.career is false (unless user already has Cora Career). */
  requiresCareerNav?: boolean
  /** Hide when guest credit / career purchases are disabled via flags. */
  requiresCoraCommerce?: boolean
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

export const GUEST_COMMUNICATION_GROUP: GuestNavGroup = {
  id: "communication",
  label: "Communication",
  icon: "mail-outline",
  items: [GUEST_MESSAGES_LINK],
}

export const GUEST_RECOMMENDATIONS_GROUP: GuestNavGroup = {
  id: "recommendations",
  label: "Recommendations",
  icon: "document-text-outline",
  items: [
    {
      id: "recommendations",
      label: "All requests",
      route: "/module/recommendations",
      icon: "create-outline",
      native: true,
    },
    {
      id: "recommendations-new",
      label: "New request",
      route: "/module/recommendations?tab=new",
      icon: "add-circle-outline",
      native: true,
    },
  ],
}

export const GUEST_CORA_GROUP: GuestNavGroup = {
  id: "cora-career",
  label: "Cora Career",
  icon: "sparkles-outline",
  items: [
    {
      id: "cora-assistant",
      label: "Cora Career Assistant",
      route: "/module/cora-assistant",
      icon: "chatbubbles-outline",
      native: true,
    },
    {
      id: "cora-credits",
      label: "Cora Credits",
      route: "/module/cora-credits",
      icon: "wallet-outline",
      native: true,
      requiresCoraCommerce: true,
    },
    {
      id: "cora-career",
      label: "Get Cora Career",
      route: "/module/cora-career",
      icon: "ribbon-outline",
      native: true,
      hideWhenCareerUnlocked: true,
      requiresCoraCommerce: true,
    },
  ],
}

export const GUEST_CAREER_TOOLS_GROUP: GuestNavGroup = {
  id: "career-tools",
  label: "Career Tools",
  icon: "briefcase-outline",
  items: [
    {
      id: "resume-match",
      label: "Résumé Match",
      route: "/module/resume-match",
      icon: "analytics-outline",
      native: true,
    },
    {
      id: "quick-scan",
      label: "Quick Scan",
      route: "/module/quick-scan",
      icon: "flash-outline",
      native: true,
    },
    {
      id: "cover-letter",
      label: "Cover Letter",
      route: "/module/cover-letter",
      icon: "document-text-outline",
      native: true,
    },
    {
      id: "resume-optimize",
      label: "Résumé Optimize",
      route: "/module/resume-optimize",
      icon: "color-wand-outline",
      native: true,
    },
    {
      id: "applications",
      label: "Applications",
      route: "/module/applications",
      icon: "file-tray-stacked-outline",
      native: true,
    },
  ],
}

export const GUEST_SUPPORT_GROUP: GuestNavGroup = {
  id: "support",
  label: "Support",
  icon: "help-buoy-outline",
  items: [
    { id: "help-center", label: "Help Center", route: "/module/help-center", icon: "help-circle-outline", native: true },
    { id: "submit-ticket", label: "Submit Ticket", route: "/module/submit-ticket", icon: "send-outline", native: true },
    { id: "report-bug", label: "Report Bug", route: "/module/report-bug", icon: "bug-outline", native: true },
    { id: "feature-requests", label: "Feature Requests", route: "/module/feature-requests", icon: "bulb-outline", native: true },
  ],
}

/** @deprecated use GUEST_RECOMMENDATIONS_GROUP */
export const GUEST_NAV_GROUP = GUEST_RECOMMENDATIONS_GROUP

export const GUEST_SETTINGS_LINK: GuestNavItem = {
  id: "settings",
  label: "Settings",
  route: "/settings",
  icon: "settings-outline",
}

const ALL_GUEST_NAV: GuestNavItem[] = [
  GUEST_DASHBOARD_LINK,
  ...GUEST_RECOMMENDATIONS_GROUP.items,
  ...GUEST_CAREER_TOOLS_GROUP.items,
  ...GUEST_CORA_GROUP.items,
  ...GUEST_COMMUNICATION_GROUP.items,
  ...GUEST_SUPPORT_GROUP.items,
  GUEST_SETTINGS_LINK,
]

export const GUEST_NAV_LABEL_BY_ROUTE: Record<string, string> = Object.fromEntries(
  ALL_GUEST_NAV.map((item) => [item.route.split("?")[0] ?? item.route, item.label]),
)

export function getGuestNavLabel(pathname: string): string {
  if (pathname.startsWith("/messages/")) return "Conversation"
  if (pathname.startsWith("/recommendation/")) return "Letter workspace"
  if (pathname.startsWith("/module/cora-assistant")) return "Cora Career Assistant"
  if (pathname.startsWith("/module/cora-credits")) return "Cora Credits"
  if (pathname.startsWith("/module/cora-career")) return "Get Cora Career"
  if (pathname.startsWith("/guest/cora-credits/checkout")) return "Buy Cora Credits"
  if (pathname.startsWith("/guest/cora-credits/success")) return "Credits added"
  if (pathname.startsWith("/guest/cora-career/checkout")) return "Upgrade to Cora Career"
  if (pathname.startsWith("/guest/cora-career/success")) return "Cora Career unlocked"
  if (pathname.startsWith("/settings")) return "Settings"
  return GUEST_NAV_LABEL_BY_ROUTE[pathname] ?? "Career workspace"
}

export function getGuestNavGroupIdForPath(pathname: string): string | null {
  if (pathname === GUEST_DASHBOARD_ROUTE) return null
  if (pathname.startsWith("/module/messages") || pathname.startsWith("/messages/")) return null
  if (pathname.startsWith("/module/recommendations") || pathname.startsWith("/recommendation/")) {
    return GUEST_RECOMMENDATIONS_GROUP.id
  }
  if (
    pathname.startsWith("/module/cora-assistant") ||
    pathname.startsWith("/module/cora-credits") ||
    pathname.startsWith("/module/cora-career")
  ) {
    return GUEST_CORA_GROUP.id
  }
  for (const item of GUEST_CAREER_TOOLS_GROUP.items) {
    if (pathname.startsWith(item.route)) return GUEST_CAREER_TOOLS_GROUP.id
  }
  for (const item of GUEST_SUPPORT_GROUP.items) {
    if (pathname.startsWith(item.route)) return GUEST_SUPPORT_GROUP.id
  }
  if (pathname === GUEST_SETTINGS_LINK.route) return null
  if (pathname.startsWith("/settings")) return null
  return null
}

export function getGuestActiveNavItemId(pathname: string): string | null {
  if (pathname === GUEST_DASHBOARD_LINK.route) return GUEST_DASHBOARD_LINK.id
  if (pathname === GUEST_MESSAGES_LINK.route || pathname.startsWith("/messages/")) {
    return GUEST_MESSAGES_LINK.id
  }
  if (pathname === GUEST_SETTINGS_LINK.route || pathname.startsWith("/settings/")) {
    return GUEST_SETTINGS_LINK.id
  }
  for (const item of GUEST_RECOMMENDATIONS_GROUP.items) {
    if (pathname === item.route || pathname.startsWith(`${item.route.split("?")[0]}/`) || pathname.startsWith("/recommendation/")) {
      if (item.id === "recommendations-new" && pathname.includes("tab=new")) return item.id
      if (item.id === "recommendations" && !pathname.includes("tab=new")) return item.id
    }
  }
  for (const item of GUEST_CORA_GROUP.items) {
    if (pathname.startsWith(item.route.split("?")[0] ?? item.route)) return item.id
  }
  for (const item of [...GUEST_CAREER_TOOLS_GROUP.items, ...GUEST_SUPPORT_GROUP.items]) {
    if (pathname.startsWith(item.route)) return item.id
  }
  return null
}

/** Map embedded student web paths to native guest routes. */
export function resolveGuestNativeRouteFromWebPath(webPath: string): string {
  const decoded = decodeURIComponent(webPath)
  const [pathname, search = ""] = decoded.split("?")
  const normalized = pathname.toLowerCase()
  const params = search ? new URLSearchParams(search) : null

  if (normalized.includes("/cora-career/match")) return "/module/resume-match"
  if (normalized.includes("/cora-career/quick-scan")) return "/module/quick-scan"
  if (normalized.includes("/cora-career/cover-letter")) return "/module/cover-letter"
  if (normalized.includes("/cora-career/optimize")) return "/module/resume-optimize"
  if (normalized.includes("/cora-career/applications")) return "/module/applications"
  if (normalized.includes("/guest/help")) return "/module/help-center"
  if (normalized.includes("/guest/submit-ticket")) return "/module/submit-ticket"
  if (normalized.includes("/guest/report-bug")) return "/module/report-bug"
  if (normalized.includes("/guest/feature-requests")) return "/module/feature-requests"
  if (normalized.includes("/guest/cora") || normalized.includes("/cora-career")) {
    if (normalized.includes("credit") && normalized.includes("checkout")) return "/guest/cora-credits/checkout"
    if (normalized.includes("credit")) return "/module/cora-credits"
    if (normalized.includes("checkout") || normalized.includes("upgrade")) return "/guest/cora-career/checkout"
    return "/module/cora-assistant"
  }

  const detailMatch = normalized.match(/recommendations?\/(\d+)/)
  if (detailMatch?.[1]) return `/recommendation/${detailMatch[1]}`
  const requestId = params?.get("request")
  if (requestId && /^\d+$/.test(requestId)) return `/recommendation/${requestId}`
  if (normalized.includes("recommendation")) return "/module/recommendations"
  if (normalized.includes("messages")) return "/module/messages"
  if (normalized.includes("settings")) return "/settings"
  return GUEST_DASHBOARD_ROUTE
}

export function filterGuestNavItems(
  items: GuestNavItem[],
  opts: {
    careerNavEnabled?: boolean
    hasCoraCareer?: boolean
    coraCommerceEnabled?: boolean
  },
): GuestNavItem[] {
  return items.filter((item) => {
    if (item.requiresCareerNav && !opts.hasCoraCareer && opts.careerNavEnabled === false) return false
    if (item.requiresCoraCommerce && opts.coraCommerceEnabled === false) return false
    if (item.hideWhenCareerUnlocked && opts.hasCoraCareer) return false
    return true
  })
}

export function guestCoraCommerceEnabled(entitlements: {
  flags?: { guestMembershipEnabled?: boolean; coraCareerEnabled?: boolean }
}): boolean {
  return (
    entitlements.flags?.guestMembershipEnabled !== false &&
    entitlements.flags?.coraCareerEnabled !== false
  )
}
