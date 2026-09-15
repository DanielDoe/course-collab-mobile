export type FacultyQuickActionBadgeKey =
  | "pendingPoints"
  | "pendingIssues"
  | "officeHours"
  | "unreadMessages"

export type FacultyQuickActionId =
  | "points"
  | "issues"
  | "office-hours"
  | "messages"
  | "lectures"
  | "quizzes"
  | "attendance"
  | "calendar"
  | "announcements"
  | "playground"

export type FacultyQuickAction = {
  id: FacultyQuickActionId
  label: string
  href: string
  badgeKey?: FacultyQuickActionBadgeKey
}

/** Daily faculty destinations — existing module routes only. */
export const FACULTY_DASHBOARD_QUICK_ACTIONS: FacultyQuickAction[] = [
  { id: "points", label: "Approve Points", href: "/module/classroom-points", badgeKey: "pendingPoints" },
  { id: "issues", label: "Issues", href: "/module/quizzes?segment=issues", badgeKey: "pendingIssues" },
  { id: "office-hours", label: "Office Hours", href: "/module/office-hours", badgeKey: "officeHours" },
  { id: "messages", label: "Messages", href: "/module/messages", badgeKey: "unreadMessages" },
  { id: "lectures", label: "Lectures", href: "/module/lectures" },
  { id: "quizzes", label: "Quizzes", href: "/module/quizzes" },
  { id: "attendance", label: "Attendance", href: "/module/attendance" },
  { id: "calendar", label: "Calendar", href: "/module/calendar" },
  { id: "announcements", label: "Announcements", href: "/module/announcements" },
  { id: "playground", label: "Playground", href: "/module/playground" },
]
