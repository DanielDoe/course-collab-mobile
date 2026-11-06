export type FacultyDashboardKpiId =
  | "active-quizzes"
  | "students"
  | "attempts"
  | "issues"
  | "upcoming"
  | "submissions-24h"

/** Course-scoped destinations for faculty dashboard metric cards. */
export function facultyDashboardKpiHref(id: FacultyDashboardKpiId): string | undefined {
  switch (id) {
    case "active-quizzes":
      return "/module/quizzes"
    case "students":
      return "/module/students"
    case "attempts":
    case "submissions-24h":
      return "/module/results"
    case "issues":
      return "/module/quizzes?segment=issues"
    case "upcoming":
      return "/module/calendar"
    default:
      return undefined
  }
}

export function facultyDashboardSnapshotHref(label: string): string | undefined {
  switch (label) {
    case "Students":
      return "/module/students"
    case "Active Quizzes":
    case "Total Quizzes":
      return "/module/quizzes"
    case "Upcoming":
      return "/module/calendar"
    default:
      return undefined
  }
}
