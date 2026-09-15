export type StudentNavBadgeKey =
  | "unreadMessages"
  | "notifications"
  | "openQuizzes"
  | "openHomework"
  | "openMidSemester"
  | "openFinalExams"
  | "classroomPointTasks"
  | "attendanceOpen"

export type StudentBadges = Record<StudentNavBadgeKey, number>

export const EMPTY_STUDENT_BADGES: StudentBadges = {
  unreadMessages: 0,
  notifications: 0,
  openQuizzes: 0,
  openHomework: 0,
  openMidSemester: 0,
  openFinalExams: 0,
  classroomPointTasks: 0,
  attendanceOpen: 0,
}

export type FacultyNavBadgeKey =
  | "pendingPoints"
  | "pendingIssues"
  | "officeHours"
  | "notifications"
  | "courseExchange"
  | "unreadMessages"
  | "pendingAccessRequests"

export function countClassroomPointTasks(payload: {
  missingSubmissions?: unknown[]
  pendingSubmissions?: unknown[]
} | null | undefined): number {
  if (!payload) return 0
  const missing = payload.missingSubmissions?.length ?? 0
  const pending = payload.pendingSubmissions?.length ?? 0
  return missing + pending
}

export function resolveStudentNavBadgeCount(
  badges: StudentBadges,
  notificationCount: number,
  unreadMessagesCount: number,
  badgeKey?: StudentNavBadgeKey,
): number | null {
  if (!badgeKey) return null
  if (badgeKey === "notifications") {
    const count = badges.notifications || notificationCount
    return count > 0 ? count : null
  }
  if (badgeKey === "unreadMessages") {
    const count = badges.unreadMessages || unreadMessagesCount
    return count > 0 ? count : null
  }
  const count = badges[badgeKey] ?? 0
  return count > 0 ? count : null
}

export function resolveFacultyNavBadgeCount(
  badges: {
    pendingPoints: number
    pendingIssues: number
    officeHours: number
    courseExchange: number
    unreadMessages: number
    pendingAccessRequests?: number
  },
  notificationCount: number,
  badgeKey?: FacultyNavBadgeKey,
): number | null {
  if (!badgeKey) return null
  if (badgeKey === "notifications") return notificationCount > 0 ? notificationCount : null
  const count = badges[badgeKey] ?? 0
  return count > 0 ? count : null
}

export function studentNavBadgeTotal(badges: StudentBadges, notificationCount: number): number {
  return (
    badges.openQuizzes +
    badges.openHomework +
    badges.openMidSemester +
    badges.openFinalExams +
    badges.classroomPointTasks +
    badges.attendanceOpen +
    badges.unreadMessages +
    Math.max(badges.notifications, notificationCount)
  )
}
