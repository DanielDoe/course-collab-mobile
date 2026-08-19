import type { Ionicons } from "@expo/vector-icons"
import type { FacultyMembershipTier } from "../types/dashboard"
import { canManageCourseSettings } from "../lib/course-exchange-shared"
import type { InstructorCourse } from "../lib/instructor-api"

export type FacultyNavItem = {
  id: string
  label: string
  route: string
  icon: keyof typeof Ionicons.glyphMap
  badgeKey?: "pendingPoints" | "pendingIssues" | "officeHours" | "notifications" | "courseExchange"
  requiresManageCourseSettings?: boolean
  locked?: boolean
  minTier?: FacultyMembershipTier
}

export type FacultyNavGroup = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  items: FacultyNavItem[]
}

export const FACULTY_DASHBOARD_ROUTE = "/dashboard"

export const FACULTY_CORA_ROUTE = "/module/cora"

export const FACULTY_DASHBOARD_LINK: FacultyNavItem = {
  id: "dashboard",
  label: "Dashboard",
  route: FACULTY_DASHBOARD_ROUTE,
  icon: "grid-outline"}

export const FACULTY_CORA_LINK: FacultyNavItem = {
  id: "cora",
  label: "Cora Copilot",
  route: FACULTY_CORA_ROUTE,
  icon: "sparkles-outline",
}

const TIER_ORDER: Record<FacultyMembershipTier, number> = {
  Free: 0,
  Pro: 1,
  Enterprise: 2,
}

export function hasFacultyNavAccess(tier: FacultyMembershipTier, minTier?: FacultyMembershipTier): boolean {
  if (!minTier) return true
  return TIER_ORDER[tier] >= TIER_ORDER[minTier]
}

export function isFacultyNavItemVisible(item: FacultyNavItem, selectedCourse?: InstructorCourse | null): boolean {
  if (!item.requiresManageCourseSettings) return true
  return canManageCourseSettings(selectedCourse?.staff_role)
}

function sortNavItemsByLabelLength<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byLength = a.label.length - b.label.length
    if (byLength !== 0) return byLength
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  })
}

function withSortedItems(group: FacultyNavGroup): FacultyNavGroup {
  return { ...group, items: sortNavItemsByLabelLength(group.items) }
}

/** Mirrors web faculty-portal-nav-config.ts group structure. */
export const FACULTY_NAV_GROUPS: FacultyNavGroup[] = [
  withSortedItems({
    id: "course",
    label: "Course",
    icon: "book-outline",
    items: [
      { id: "academic-terms", label: "Academic Terms", route: "/module/academic-terms", icon: "calendar-outline" },
      { id: "announcements", label: "Announcements", route: "/module/announcements", icon: "megaphone-outline" },
      { id: "syllabus", label: "Syllabus", route: "/module/syllabus", icon: "document-text-outline" },
      { id: "lectures", label: "Manage Lectures", route: "/module/lectures", icon: "easel-outline" },
      { id: "course-notes", label: "Course Notes", route: "/module/course-notes", icon: "reader-outline" },
      { id: "course-exchange", label: "Course Exchange", route: "/module/course-exchange", icon: "repeat-outline", badgeKey: "courseExchange", requiresManageCourseSettings: true },
      { id: "flashcards", label: "Flashcards", route: "/module/flashcards", icon: "layers-outline" },
      { id: "practice", label: "Manage Practice", route: "/module/practice", icon: "bulb-outline" },
      { id: "playground", label: "Manage Playground", route: "/module/playground", icon: "flash-outline" },
      { id: "groups", label: "Manage Groups", route: "/module/groups", icon: "people-circle-outline" },
      { id: "projects", label: "Manage Projects", route: "/module/projects", icon: "folder-open-outline" },
      { id: "summer-camp", label: "Summer Camp", route: "/module/summer-camp", icon: "sunny-outline" },
    ],
  }),
  withSortedItems({
    id: "assessments",
    label: "Assessments",
    icon: "clipboard-outline",
    items: [
      { id: "quizzes", label: "Manage Quizzes", route: "/module/quizzes", icon: "clipboard-outline" },
      { id: "question-bank", label: "Question Bank", route: "/module/question-bank", icon: "library-outline" },
      { id: "homework", label: "Manage Homework", route: "/module/homework", icon: "pencil-outline" },
      { id: "mid-semester-exams", label: "Mid-Semester Exams", route: "/module/mid-semester-exams", icon: "school-outline" },
      { id: "final-exams", label: "Final Exams", route: "/module/final-exams", icon: "ribbon-outline" },
      { id: "classroom-points", label: "Classroom Points", route: "/module/classroom-points", icon: "star-outline", badgeKey: "pendingPoints" },
      { id: "course-evaluations", label: "Course Evaluations", route: "/module/course-evaluations", icon: "thumbs-up-outline" },
      { id: "attendance", label: "Attendance", route: "/module/attendance", icon: "checkmark-circle-outline" },
    ],
  }),
  withSortedItems({
    id: "students",
    label: "Students",
    icon: "people-outline",
    items: [
      { id: "students", label: "Student Directory", route: "/module/students", icon: "people-outline" },
      { id: "access-requests", label: "Access Requests", route: "/module/access-requests", icon: "shield-checkmark-outline" },
      { id: "campers", label: "Campers", route: "/module/campers", icon: "walk-outline" },
      { id: "office-hours", label: "Office Hours", route: "/module/office-hours", icon: "time-outline", badgeKey: "officeHours" },
      { id: "recommendations", label: "Recommendation Letters", route: "/module/recommendations", icon: "bookmark-outline" },
      { id: "trade-center", label: "Trade Center", route: "/module/trade-center", icon: "storefront-outline" },
    ],
  }),
  withSortedItems({
    id: "analytics",
    label: "Analytics",
    icon: "bar-chart-outline",
    items: [
      { id: "results", label: "Manage Results", route: "/module/results", icon: "bar-chart-outline", locked: true, minTier: "Pro" },
      { id: "student-progress", label: "Student Progress", route: "/module/student-progress", icon: "analytics-outline", locked: true, minTier: "Pro" },
      { id: "reports", label: "Manage Reports", route: "/module/reports", icon: "document-attach-outline", locked: true, minTier: "Pro" },
      { id: "progress-reviews", label: "Progress Reviews", route: "/module/progress-reviews", icon: "trending-up-outline", locked: true, minTier: "Pro" },
      { id: "recent-activity", label: "Recent Activity", route: "/module/recent-activity", icon: "pulse-outline" },
    ],
  }),
  withSortedItems({
    id: "communication",
    label: "Communication",
    icon: "chatbubbles-outline",
    items: [
      { id: "notifications", label: "Notifications", route: "/module/notifications", icon: "notifications-outline", badgeKey: "notifications" },
      { id: "messages", label: "Messages", route: "/module/messages", icon: "mail-outline" },
      { id: "discussions", label: "Course Discussions", route: "/module/discussions", icon: "chatbubbles-outline" },
      { id: "student-support", label: "Student Support", route: "/module/student-support", icon: "help-buoy-outline" },
    ],
  }),
  withSortedItems({
    id: "administration",
    label: "Administration",
    icon: "shield-outline",
    items: [
      { id: "course-settings", label: "Course Settings", route: "/module/course-settings", icon: "options-outline" },
      { id: "schedule-adjustment", label: "Schedule Adjustment", route: "/module/schedule-adjustment", icon: "swap-horizontal-outline" },
      { id: "assessment-governance", label: "Assessment Governance", route: "/module/assessment-governance", icon: "lock-closed-outline" },
      { id: "assessment-defaults", label: "Assessment Defaults", route: "/module/assessment-defaults", icon: "list-outline" },
      { id: "my-courses", label: "My Courses", route: "/module/my-courses", icon: "albums-outline" },
      { id: "grading-policies", label: "Grading Policies", route: "/module/grading-policies", icon: "scale-outline" },
      { id: "attendance-policies", label: "Attendance Policies", route: "/module/attendance-policies", icon: "today-outline" },
      { id: "classroom-points-rules", label: "Classroom Points Rules", route: "/module/classroom-points-rules", icon: "trophy-outline" },
      { id: "playground-rules", label: "Playground Rules", route: "/module/playground-rules", icon: "game-controller-outline" },
      { id: "ai-assistant-settings", label: "Cora Assistant Settings", route: "/module/ai-assistant-settings", icon: "hardware-chip-outline", locked: true, minTier: "Pro" },
      { id: "team-project-policies", label: "Team & Project Policies", route: "/module/team-project-policies", icon: "git-network-outline" },
      { id: "submission-issues", label: "Submission Issues", route: "/module/submission-issues", icon: "warning-outline" },
      { id: "teaching-assistants", label: "Teaching Assistants", route: "/module/teaching-assistants", icon: "person-add-outline", locked: true, minTier: "Enterprise" },
    ],
  }),
]

export const FACULTY_PROFILE_SETTINGS_LINK: FacultyNavItem = {
  id: "profile-settings",
  label: "Profile & Settings",
  route: "/settings",
  icon: "person-circle-outline",
}

export const FACULTY_SUPPORT_GROUP: FacultyNavGroup = {
  id: "support",
  label: "Support",
  icon: "help-buoy-outline",
  items: [
    { id: "membership", label: "View Plans", route: "/membership", icon: "diamond-outline" },
    { id: "report-bug", label: "Report Bug", route: "/module/report-bug", icon: "bug-outline" },
    { id: "help-center", label: "Help Center", route: "/module/help-center", icon: "information-circle-outline" },
    { id: "submit-ticket", label: "Submit Ticket", route: "/module/submit-ticket", icon: "send-outline" },
    { id: "feature-requests", label: "Feature Requests", route: "/module/feature-requests", icon: "rocket-outline" },
  ],
}

/** @deprecated Use FACULTY_PROFILE_SETTINGS_LINK */
export const FACULTY_SETTINGS_LINK = FACULTY_PROFILE_SETTINGS_LINK

export const FACULTY_LABEL_BY_ROUTE: Record<string, string> = {
  [FACULTY_DASHBOARD_ROUTE]: "Dashboard",
  [FACULTY_CORA_ROUTE]: "Cora Copilot",
  "/settings": "Profile & Settings",
  "/module/profile": "Profile & Settings",
  "/membership": "Membership",
  "/membership/checkout": "Checkout",
  "/membership/success": "Membership activated",
  "/membership/manage": "Billing & subscription",
  "/membership/cancel": "Payment cancelled",
}

for (const group of [...FACULTY_NAV_GROUPS, FACULTY_SUPPORT_GROUP]) {
  for (const item of group.items) {
    FACULTY_LABEL_BY_ROUTE[item.route] = item.label
  }
}

export function getFacultyNavLabel(pathname: string): string {
  if (pathname.startsWith("/messages/")) return "Messages"
  if (FACULTY_LABEL_BY_ROUTE[pathname]) return FACULTY_LABEL_BY_ROUTE[pathname]
  const moduleMatch = pathname.match(/^\/module\/(.+)$/)
  if (moduleMatch) {
    const id = moduleMatch[1]
    for (const group of [...FACULTY_NAV_GROUPS, FACULTY_SUPPORT_GROUP]) {
      const item = group.items.find((i) => i.id === id)
      if (item) return item.label
    }
    return id.replace(/-/g, " ")
  }
  return "Faculty"
}

export function getFacultyNavGroupIdForPath(pathname: string): string | null {
  if (pathname === FACULTY_DASHBOARD_ROUTE) return null
  for (const group of [...FACULTY_NAV_GROUPS, FACULTY_SUPPORT_GROUP]) {
    if (group.items.some((item) => pathname === item.route || pathname.startsWith(`${item.route}/`))) {
      return group.id
    }
  }
  return null
}

/** Nav item id for the current route — used to scroll the drawer to the active row. */
export function getFacultyActiveNavItemId(pathname: string): string | null {
  if (pathname === FACULTY_DASHBOARD_LINK.route) return FACULTY_DASHBOARD_LINK.id
  if (pathname === FACULTY_CORA_LINK.route || pathname.startsWith(`${FACULTY_CORA_LINK.route}/`)) {
    return FACULTY_CORA_LINK.id
  }
  if (
    pathname === FACULTY_PROFILE_SETTINGS_LINK.route ||
    pathname === "/module/profile" ||
    pathname === "/module/settings" ||
    pathname.startsWith("/settings/")
  ) {
    return FACULTY_PROFILE_SETTINGS_LINK.id
  }
  if (pathname === "/membership" || pathname.startsWith("/membership/")) {
    return "membership"
  }
  for (const group of [...FACULTY_NAV_GROUPS, FACULTY_SUPPORT_GROUP]) {
    for (const item of group.items) {
      if (pathname === item.route || pathname.startsWith(`${item.route}/`)) {
        return item.id
      }
    }
  }
  return null
}

export function findFacultyNavItem(id: string): FacultyNavItem | undefined {
  if (FACULTY_DASHBOARD_LINK.id === id) return FACULTY_DASHBOARD_LINK
  if (FACULTY_CORA_LINK.id === id) return FACULTY_CORA_LINK
  if (FACULTY_PROFILE_SETTINGS_LINK.id === id) return FACULTY_PROFILE_SETTINGS_LINK
  for (const group of [...FACULTY_NAV_GROUPS, FACULTY_SUPPORT_GROUP]) {
    const item = group.items.find((i) => i.id === id)
    if (item) return item
  }
  return undefined
}

/** Map instructor notification links to native faculty routes. */
export function facultyNativeRouteFromLink(link: string | undefined): string {
  if (!link) return FACULTY_DASHBOARD_ROUTE
  const path = link.toLowerCase()

  if (path.includes("management/sessions") || path.includes("academic-terms")) return "/module/academic-terms"
  if (path.includes("communication/announcements") || path.includes("announcements")) return "/module/announcements"
  if (path.includes("content/syllabus") || path.includes("/syllabus")) return "/module/syllabus"
  if (path.includes("content/lectures") || path.includes("/lectures")) return "/module/lectures"
  if (path.includes("content/notes") || path.includes("course-notes")) return "/module/course-notes"
  if (path.includes("course/exchange") || path.includes("course-exchange")) {
    const tabMatch = link.match(/[?&]tab=([^&#]+)/i)
    const tab = tabMatch?.[1]?.trim().toLowerCase()
    if (tab) return `/module/course-exchange?tab=${encodeURIComponent(tab)}`
    return "/module/course-exchange"
  }
  if (path.includes("content/flashcards") || path.includes("/flashcards")) return "/module/flashcards"
  if (path.includes("content/practice") || path.includes("/practice")) return "/module/practice"
  if (path.includes("playground")) return "/module/playground"
  if (path.includes("management/groups") || path.includes("/groups")) return "/module/groups"
  if (path.includes("management/projects") || path.includes("/projects")) return "/module/projects"
  if (path.includes("summer-camp")) return "/module/summer-camp"

  if (path.includes("question-bank")) return "/module/question-bank"
  if (path.includes("classroom-points")) return "/module/classroom-points"
  if (path.includes("course-evaluations") || path.includes("course-evaluation")) {
    return "/module/course-evaluations"
  }
  if (path.includes("attendance")) return "/module/attendance"
  if (path.includes("homework")) {
    if (path.includes("deleted")) return "/module/homework?segment=deleted"
    if (path.includes("issues")) return "/module/homework?segment=issues"
    return "/module/homework"
  }
  if (path.includes("mid-semester") || path.includes("mid_semester")) {
    if (path.includes("deleted")) return "/module/mid-semester-exams?segment=deleted"
    if (path.includes("issues")) return "/module/mid-semester-exams?segment=issues"
    return "/module/mid-semester-exams"
  }
  if (path.includes("/finals") || path.includes("/final")) {
    if (path.includes("deleted")) return "/module/final-exams?segment=deleted"
    if (path.includes("issues")) return "/module/final-exams?segment=issues"
    return "/module/final-exams"
  }
  if (path.includes("quizzes/issues") || path.includes("quiz-issues")) return "/module/quizzes?segment=issues"
  if (path.includes("quizzes/deleted") || path.includes("deleted-quizzes") || path.includes("deleted-items")) {
    return "/module/quizzes?segment=deleted"
  }
  if (path.includes("deleted")) return "/module/quizzes?segment=deleted"
  if (path.includes("quizzes") || path.includes("assessments/quiz")) return "/module/quizzes"

  if (path.includes("management/students") || path.includes("/students")) return "/module/students"
  if (path.includes("campers")) return "/module/campers"
  if (path.includes("office-hours")) return "/module/office-hours"
  if (path.includes("recommendations")) {
    const recMatch = link.match(/recommendations\/(\d+)/i)
    if (recMatch?.[1]) return `/module/recommendations?open=${recMatch[1]}`
    if (path.includes("guest-account-requests")) return "/module/recommendations?tab=guest-requests"
    return "/module/recommendations"
  }
  if (path.includes("trade-center")) return "/module/trade-center"

  if (path.includes("/results")) return "/module/results"
  if (path.includes("analytics/advanced") || path.includes("student-progress")) return "/module/student-progress"
  if (path.includes("analytics/reports") || path.includes("/reports")) return "/module/reports"
  if (path.includes("progress-reviews")) return "/module/progress-reviews"
  if (path.includes("recent-activity")) return "/module/recent-activity"

  if (path.includes("communication/notifications") || path.includes("notifications")) return "/module/notifications"
  if (path.includes("communication/messages") || path.includes("/messages")) {
    const threadMatch = link.match(/[?&]thread=(\d+)/i)
    if (threadMatch?.[1]) return `/messages/${threadMatch[1]}`
    return "/module/messages"
  }
  if (path.includes("discussions")) return "/module/discussions"
  if (path.includes("learning-center/help") || path.includes("student-support")) return "/module/student-support"

  if (path.includes("administration/course-settings") || path.includes("course-settings")) return "/module/course-settings"
  if (path.includes("schedule-adjustment")) return "/module/schedule-adjustment"
  if (path.includes("assessment-governance")) return "/module/assessment-governance"
  if (path.includes("assessment-defaults")) return "/module/assessment-defaults"
  if (path.includes("my-courses")) return "/module/my-courses"
  if (path.includes("grading-policies")) return "/module/grading-policies"
  if (path.includes("attendance-policies")) return "/module/attendance-policies"
  if (path.includes("classroom-points-rules")) return "/module/classroom-points-rules"
  if (path.includes("playground-rules")) return "/module/playground-rules"
  if (path.includes("ai-assistant")) return "/module/ai-assistant-settings"
  if (path.includes("cora") || path.includes("ai-copilot")) return FACULTY_CORA_ROUTE
  if (path.includes("team-project")) return "/module/team-project-policies"
  if (path.includes("submission-issues")) return "/module/submission-issues"
  if (path.includes("teaching-assistants")) return "/module/teaching-assistants"

  if (path.includes("settings/profile") || path.includes("/profile")) return "/settings"
  if (path.includes("/settings")) return "/settings"

  if (path.includes("issues")) return "/module/quizzes?segment=issues"

  return FACULTY_DASHBOARD_ROUTE
}
