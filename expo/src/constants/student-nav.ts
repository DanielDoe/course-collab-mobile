import type { Ionicons } from "@expo/vector-icons"
import type { MembershipTier } from "../types/dashboard"

export type StudentNavItem = {
  id: string
  label: string
  route: string
  icon: keyof typeof Ionicons.glyphMap
  locked?: boolean
  minTier?: MembershipTier
}

export type StudentNavGroup = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  items: StudentNavItem[]
}

const TIER_ORDER: Record<MembershipTier, number> = {
  Scholar: 0,
  Explorer: 1,
  Trailblazer: 2}

export function hasNavAccess(tier: MembershipTier, minTier?: MembershipTier): boolean {
  if (!minTier) return true
  return TIER_ORDER[tier] >= TIER_ORDER[minTier]
}

function sortNavItemsByLabelLength<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byLength = a.label.length - b.label.length
    if (byLength !== 0) return byLength
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  })
}

function withSortedItems(group: StudentNavGroup): StudentNavGroup {
  return { ...group, items: sortNavItemsByLabelLength(group.items) }
}

export const STUDENT_DASHBOARD_ROUTE = "/dashboard"

export const STUDENT_DASHBOARD_LINK: StudentNavItem = {
  id: "dashboard",
  label: "Dashboard",
  route: STUDENT_DASHBOARD_ROUTE,
  icon: "grid-outline"}

export const STUDENT_NAV_GROUPS: StudentNavGroup[] = [
  withSortedItems({
    id: "learning-center",
    label: "Learning Center",
    icon: "bulb-outline",
    items: [
      { id: "lectures", label: "Lectures", route: "/module/lectures", icon: "easel-outline" },
      { id: "notes", label: "My Notes", route: "/module/notes", icon: "journal-outline" },
      { id: "flashcards", label: "Flashcards", route: "/module/flashcards", icon: "layers-outline" },
      { id: "ai-notetaker", label: "AI Notetaker", route: "/module/ai-notetaker", icon: "mic-outline", locked: true, minTier: "Explorer" },
      { id: "practice", label: "Practice Hub", route: "/module/practice", icon: "fitness-outline", locked: true, minTier: "Explorer" },
      { id: "ai-tutor", label: "Cora Assistant", route: "/module/ai-tutor", icon: "chatbubble-ellipses-outline", locked: true, minTier: "Explorer" },
      { id: "codebench", label: "CodeBench IDE", route: "/module/codebench", icon: "code-slash-outline", locked: true, minTier: "Trailblazer" },
      { id: "codebench-more", label: "Analytics & More", route: "/module/codebench-more", icon: "bar-chart-outline", locked: true, minTier: "Trailblazer" },
    ],
  }),
  withSortedItems({
    id: "assessments",
    label: "Assessments",
    icon: "clipboard-outline",
    items: [
      { id: "quizzes", label: "Quizzes", route: "/module/quizzes", icon: "clipboard-outline" },
      { id: "quiz-history", label: "History", route: "/module/quiz-history", icon: "time-outline" },
      { id: "homework", label: "Homework", route: "/module/homework", icon: "book-outline" },
      { id: "mid-semester-exams", label: "Mid-Semester", route: "/module/mid-semester-exams", icon: "newspaper-outline" },
      { id: "final-exams", label: "Finals", route: "/module/final-exams", icon: "school-outline" },
      { id: "grades", label: "Grades", route: "/module/grades", icon: "ribbon-outline" },
    ],
  }),
  withSortedItems({
    id: "collaboration",
    label: "Collaboration",
    icon: "people-outline",
    items: [
      { id: "forum", label: "Forum Hub", route: "/module/forum", icon: "globe-outline" },
      { id: "messages", label: "Messages", route: "/module/messages", icon: "mail-outline" },
      { id: "groups", label: "Groups", route: "/module/groups", icon: "people-outline" },
      { id: "projects", label: "Projects", route: "/module/projects", icon: "folder-open-outline" },
      { id: "playground", label: "Playground", route: "/module/playground", icon: "flash-outline" },
    ],
  }),
  withSortedItems({
    id: "performance-rewards",
    label: "Performance & Rewards",
    icon: "trophy-outline",
    items: [
      { id: "classroom-points", label: "Classroom Points", route: "/module/classroom-points", icon: "trophy-outline" },
      { id: "attendance", label: "Attendance", route: "/module/attendance", icon: "checkbox-outline" },
      { id: "trade-center", label: "Trade Center", route: "/module/trade-center", icon: "storefront-outline" },
    ],
  }),
  withSortedItems({
    id: "course-info",
    label: "Course Info",
    icon: "megaphone-outline",
    items: [
      { id: "announcements", label: "Announcements", route: "/announcements", icon: "megaphone-outline" },
      { id: "progress-review", label: "Progress Review", route: "/module/progress-review", icon: "trending-up-outline" },
      { id: "syllabus", label: "Syllabus", route: "/module/syllabus", icon: "document-outline" },
      { id: "calendar", label: "Calendar", route: "/module/calendar", icon: "calendar-number-outline" },
      { id: "office-hours", label: "Office Hours", route: "/module/office-hours", icon: "cafe-outline" },
      { id: "schedule-adjustment", label: "Schedule Adjustment", route: "/module/schedule-adjustment", icon: "swap-horizontal-outline" },
      { id: "course-policies", label: "Policies", route: "/module/course-policies", icon: "shield-outline" },
      { id: "course-evaluation", label: "Course Evaluation", route: "/module/course-evaluation", icon: "star-outline" },
      { id: "recommendations", label: "Recommendation Letters", route: "/module/recommendations", icon: "bookmark-outline" },
    ],
  }),
]

export const STUDENT_SETTINGS_LINK: StudentNavItem = {
  id: "settings",
  label: "Settings",
  route: "/settings",
  icon: "settings-outline"}

export const STUDENT_SUPPORT_GROUP: StudentNavGroup = {
  id: "support",
  label: "Support",
  icon: "help-buoy-outline",
  items: [
    { id: "membership", label: "View Plans", route: "/membership", icon: "diamond-outline" },
    { id: "report-bug", label: "Report Bug", route: "/module/report-bug", icon: "bug-outline" },
    { id: "help-center", label: "Help Center", route: "/module/help-center", icon: "help-circle-outline" },
    { id: "submit-ticket", label: "Submit Ticket", route: "/module/submit-ticket", icon: "send-outline" },
    { id: "feature-requests", label: "Feature Requests", route: "/module/feature-requests", icon: "sparkles-outline" },
  ],
}

export const NAV_LABEL_BY_ROUTE: Record<string, string> = {
  [STUDENT_DASHBOARD_ROUTE]: "Dashboard",
  "/announcements": "Announcements",
  "/settings": "Settings",
  "/settings/appearance": "Appearance & Themes",
  "/membership": "Membership",
  "/membership/checkout": "Checkout",
  "/membership/success": "Membership activated",
  "/membership/manage": "Billing & subscription",
  "/membership/cancel": "Payment cancelled",
}

for (const group of [...STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP]) {
  for (const item of group.items) {
    NAV_LABEL_BY_ROUTE[item.route] = item.label
  }
}

NAV_LABEL_BY_ROUTE["/announcements/[id]"] = "Announcement"

export function getWebNavLabel(webPath: string): string {
  const [pathPart, queryPart] = webPath.split("?")
  const path = pathPart ?? webPath
  const params = queryPart ? new URLSearchParams(queryPart) : null

  if (/\/ai-notetaker\/new/i.test(path)) {
    return params?.get("mode") === "upload" ? "Upload audio" : "Record lecture"
  }
  if (/\/ai-notetaker/i.test(path)) return "AI Notetaker"

  const normalized = path.replace("/student/dashboard-v2", "") || "/dashboard"
  if (NAV_LABEL_BY_ROUTE[normalized]) return NAV_LABEL_BY_ROUTE[normalized]

  for (const [moduleId, modulePath] of Object.entries({
    lectures: "/student/dashboard-v2/lectures",
    practice: "/student/dashboard-v2/practice",
    membership: "/student/dashboard-v2/membership",
  })) {
    if (path.startsWith(modulePath)) {
      return NAV_LABEL_BY_ROUTE[`/module/${moduleId}`] ?? moduleId.replace(/-/g, " ")
    }
  }

  return getNavLabel(normalized.startsWith("/") ? `/module${normalized}` : `/module/${normalized}`)
}

export function getNavLabel(pathname: string): string {
  if (pathname.startsWith("/messages/")) return "Messages"
  if (NAV_LABEL_BY_ROUTE[pathname]) return NAV_LABEL_BY_ROUTE[pathname]
  if (/^\/announcements\/\d+$/.test(pathname)) return "Announcement"
  if (/^\/lecture\//.test(pathname)) return "Slide preview"
  if (/^\/settings\/appearance$/.test(pathname)) return "Appearance & Themes"
  if (pathname === "/notetaker/capture") return "Record"
  if (/^\/notetaker\//.test(pathname)) return "Note"
  if (/^\/notes\/course\//.test(pathname)) return "Course note"
  if (/^\/notes\//.test(pathname)) return "Edit note"
  if (/^\/flashcards\/\d+\/edit$/.test(pathname)) return "Edit deck"
  if (/^\/flashcards\//.test(pathname)) return "Study deck"
  const moduleMatch = pathname.match(/^\/module\/(.+)$/)
  if (moduleMatch) {
    const id = moduleMatch[1]
    for (const group of [...STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP]) {
      const item = group.items.find((i) => i.id === id)
      if (item) return item.label
    }
    return id.replace(/-/g, " ")
  }
  return "CourseCollab"
}

/** Nav drawer group for the current route, if any. */
export function getNavGroupIdForPath(pathname: string): string | null {
  if (/^\/announcements(\/|$)/.test(pathname)) {
    return "course-info"
  }
  for (const group of [...STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP]) {
    if (
      group.items.some(
        (item) => pathname === item.route || pathname.startsWith(`${item.route}/`),
      )
    ) {
      return group.id
    }
  }
  return null
}

/** Nav item id for the current route — used to scroll the drawer to the active row. */
export function getStudentActiveNavItemId(pathname: string): string | null {
  if (pathname === STUDENT_DASHBOARD_LINK.route) return STUDENT_DASHBOARD_LINK.id
  if (pathname === STUDENT_SETTINGS_LINK.route || pathname.startsWith("/settings/")) {
    return STUDENT_SETTINGS_LINK.id
  }
  if (pathname === "/codebench/ide" || pathname.startsWith("/codebench/ide/")) return "codebench"
  if (pathname.startsWith("/messages/")) return "messages"
  if (pathname.startsWith("/schedule-adjustment/")) return "schedule-adjustment"
  for (const group of [...STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP]) {
    for (const item of group.items) {
      if (pathname === item.route || pathname.startsWith(`${item.route}/`)) {
        return item.id
      }
    }
  }
  return null
}

/** Web paths that must stay in the embedded WebView (quiz take, results, membership checkout, etc.). */
export function isImmersiveStudentWebPath(webPath: string): boolean {
  const path = decodeURIComponent(webPath).split("?")[0]?.toLowerCase() ?? ""
  return (
    /\/student\/(quiz|homework|mid-semester|final)\/\d+/i.test(path) ||
    /\/student\/results\/\d+/i.test(path) ||
    /\/student\/membership\/(checkout|success|manage|cancel)/i.test(path)
  )
}

/** Map embedded student dashboard web paths to native `/dashboard`; null keeps the WebView. */
export function resolveStudentNativeRouteFromWebPath(webPath: string): string | null {
  if (isImmersiveStudentWebPath(webPath)) return null

  const decoded = decodeURIComponent(webPath)
  const pathOnly = decoded.split("?")[0]?.replace(/\/$/, "") ?? ""
  if (pathOnly === "/student/login") {
    try {
      const invite = new URLSearchParams(decoded.split("?")[1] ?? "").get("invite")?.trim()
      if (invite) {
        return `/login?invite=${encodeURIComponent(invite)}`
      }
    } catch {
      /* ignore malformed query */
    }
    return "/login"
  }

  if (
    !pathOnly ||
    pathOnly === "/student/dashboard-v2" ||
    pathOnly === "/student/dashboard" ||
    pathOnly === "/dashboard"
  ) {
    return STUDENT_DASHBOARD_ROUTE
  }

  return null
}
