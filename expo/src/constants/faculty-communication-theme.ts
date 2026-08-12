import type { Ionicons } from "@expo/vector-icons"
import { COMM_SYSTEM, IOS, NATIVE, SYSTEM, nativeType } from "./faculty-native-theme"
import { hexToRgba } from "./app-themes"

/**
 * Communication module accents + type maps.
 * Surfaces: faculty-native-theme.ts (iOS + Android).
 * Guide: expo/docs/ios-native-module-design.md
 */

export { COMM_SYSTEM, IOS, NATIVE, SYSTEM, nativeType }

/** Icon tile background that stays readable in light and dark mode. */
export function resolveCommIconSoft(color: string, lightSoft: string, isDark: boolean): string {
  return isDark ? hexToRgba(color, 0.18) : lightSoft
}

export type CommAccent = {
  color: string
  soft: string
  border: string
}

/** One primary accent per module (HIG: don't reuse color for different meanings). */
export const COMM_MODULES = {
  notifications: {
    id: "notifications" as const,
    label: "Notifications",
    accent: COMM_SYSTEM.orange,
  },
  discussions: {
    id: "discussions" as const,
    label: "Course Discussions",
    accent: COMM_SYSTEM.indigo,
  },
  "student-support": {
    id: "student-support" as const,
    label: "Student Support",
    accent: COMM_SYSTEM.blue,
  },
} as const

export type CommModuleId = keyof typeof COMM_MODULES

export type NotificationTypeKey =
  | "announcement"
  | "assessment"
  | "grade"
  | "office_hours"
  | "office_hour_request"
  | "classroom_points"
  | "system"
  | "quiz_submission"
  | "student_question"
  | "low_completion"
  | "deadline_reminder"
  | "analytics"
  | "student_registration"
  | "lecture"
  | "project"
  | "group"
  | "exam"
  | "homework"
  | "recommendation_update"
  | "submission_stalled"
  | "default"

export function notificationTypeStyle(type: string | undefined): {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  soft: string
  label: string
} {
  const key = (type ?? "default") as NotificationTypeKey
  switch (key) {
    case "announcement":
      return {
        icon: "megaphone-outline",
        color: COMM_SYSTEM.orange.color,
        soft: COMM_SYSTEM.orange.soft,
        label: "Announcement",
      }
    case "assessment":
    case "quiz_submission":
    case "submission_stalled":
      return {
        icon: "clipboard-outline",
        color: COMM_SYSTEM.indigo.color,
        soft: COMM_SYSTEM.indigo.soft,
        label: key === "submission_stalled" ? "Submission Issue" : "Assessment",
      }
    case "grade":
    case "analytics":
      return {
        icon: "school-outline",
        color: COMM_SYSTEM.green.color,
        soft: COMM_SYSTEM.green.soft,
        label: key === "analytics" ? "Analytics" : "Grade",
      }
    case "office_hours":
    case "office_hour_request":
      return {
        icon: "time-outline",
        color: COMM_SYSTEM.blue.color,
        soft: COMM_SYSTEM.blue.soft,
        label: "Office Hours",
      }
    case "classroom_points":
      return {
        icon: "sparkles-outline",
        color: COMM_SYSTEM.teal.color,
        soft: COMM_SYSTEM.teal.soft,
        label: "Classroom Points",
      }
    case "student_question":
      return {
        icon: "chatbubble-ellipses-outline",
        color: COMM_SYSTEM.purple.color,
        soft: COMM_SYSTEM.purple.soft,
        label: "Student Question",
      }
    case "low_completion":
    case "deadline_reminder":
      return {
        icon: "alert-circle-outline",
        color: COMM_SYSTEM.orange.color,
        soft: COMM_SYSTEM.orange.soft,
        label: key === "deadline_reminder" ? "Deadline" : "Completion Alert",
      }
    case "student_registration":
    case "group":
      return {
        icon: "people-outline",
        color: COMM_SYSTEM.teal.color,
        soft: COMM_SYSTEM.teal.soft,
        label: key === "group" ? "Group" : "Registration",
      }
    case "lecture":
      return {
        icon: "book-outline",
        color: COMM_SYSTEM.indigo.color,
        soft: COMM_SYSTEM.indigo.soft,
        label: "Lecture",
      }
    case "project":
    case "homework":
      return {
        icon: "document-text-outline",
        color: COMM_SYSTEM.blue.color,
        soft: COMM_SYSTEM.blue.soft,
        label: key === "project" ? "Project" : "Homework",
      }
    case "exam":
      return {
        icon: "school-outline",
        color: COMM_SYSTEM.red.color,
        soft: COMM_SYSTEM.red.soft,
        label: "Exam",
      }
    case "recommendation_update":
      return {
        icon: "create-outline",
        color: COMM_SYSTEM.purple.color,
        soft: COMM_SYSTEM.purple.soft,
        label: "Recommendation Letter",
      }
    case "system":
      return {
        icon: "information-circle-outline",
        color: COMM_SYSTEM.gray.color,
        soft: COMM_SYSTEM.gray.soft,
        label: "System",
      }
    default:
      return {
        icon: "notifications-outline",
        color: COMM_SYSTEM.orange.color,
        soft: COMM_SYSTEM.orange.soft,
        label: "Notification",
      }
  }
}

export function notificationTypeStyleThemed(type: string | undefined, isDark: boolean) {
  const base = notificationTypeStyle(type)
  return {
    ...base,
    soft: resolveCommIconSoft(base.color, base.soft, isDark),
  }
}

export const DISCUSSION_CATEGORIES = [
  {
    id: "general",
    title: "General Discussion",
    subtitle: "Course-wide questions and conversation",
    icon: "chatbubbles-outline" as const,
    color: COMM_SYSTEM.indigo.color,
    soft: COMM_SYSTEM.indigo.soft,
  },
  {
    id: "assignments",
    title: "Assignments",
    subtitle: "Help with homework and projects",
    icon: "document-text-outline" as const,
    color: COMM_SYSTEM.blue.color,
    soft: COMM_SYSTEM.blue.soft,
  },
  {
    id: "exams",
    title: "Exams & Quizzes",
    subtitle: "Review topics and study together",
    icon: "school-outline" as const,
    color: COMM_SYSTEM.orange.color,
    soft: COMM_SYSTEM.orange.soft,
  },
] as const

export const SUPPORT_QUEUES = [
  {
    id: "password",
    title: "Password Resets",
    subtitle: "Pending student reset requests",
    icon: "key-outline" as const,
    color: COMM_SYSTEM.blue.color,
    soft: COMM_SYSTEM.blue.soft,
    route: null,
  },
  {
    id: "issues",
    title: "Assessment Issues",
    subtitle: "Student-reported quiz problems",
    icon: "alert-circle-outline" as const,
    color: COMM_SYSTEM.orange.color,
    soft: COMM_SYSTEM.orange.soft,
    route: "/module/quizzes?segment=issues",
  },
  {
    id: "office-hours",
    title: "Office Hours",
    subtitle: "Requests awaiting response",
    icon: "time-outline" as const,
    color: COMM_SYSTEM.indigo.color,
    soft: COMM_SYSTEM.indigo.soft,
    route: "/module/office-hours",
  },
  {
    id: "faq",
    title: "Instructor Guides",
    subtitle: "Quick help for common tasks",
    icon: "book-outline" as const,
    color: COMM_SYSTEM.green.color,
    soft: COMM_SYSTEM.green.soft,
    route: null,
  },
] as const

export const SUPPORT_STATUS = {
  open: { label: "Open", color: COMM_SYSTEM.orange.color, soft: COMM_SYSTEM.orange.soft },
  pending: { label: "Pending", color: COMM_SYSTEM.blue.color, soft: COMM_SYSTEM.blue.soft },
  resolved: { label: "Resolved", color: COMM_SYSTEM.green.color, soft: COMM_SYSTEM.green.soft },
} as const
