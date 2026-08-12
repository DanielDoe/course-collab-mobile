import { COLOR_HUNT_COOL } from "./codebench-badge-theme"
import { COLOR_HUNT } from "./flashcard-difficulty-theme"
import { GRADES_WARM } from "./grades-theme"
import { REPORT_SOLID } from "./assessment-report-theme"
import { FACULTY_COLLAB_COLOR } from "./faculty-collab-theme"
import type { SolidListThumb } from "./solid-list-thumb"
import { solidListThumbFixed, solidListThumbFromHash } from "./solid-list-thumb"

/** Faculty communication modules — Color Hunt on neutral grouped lists. */
export const FACULTY_COMMUNICATION_COLOR = {
  ...FACULTY_COLLAB_COLOR,
  tabActive: COLOR_HUNT_COOL.indigo,
  notifications: COLOR_HUNT.orange,
  discussions: COLOR_HUNT_COOL.indigo,
  support: COLOR_HUNT_COOL.cyan,
  messages: COLOR_HUNT_COOL.cyan,
  ai: COLOR_HUNT_COOL.indigo,
  success: REPORT_SOLID.correct,
} as const

/** Less pill-like control radius for comm module inline buttons. */
export const FACULTY_COMM_BUTTON_RADIUS = 10

const NOTIFICATION_THUMBS: Record<string, SolidListThumb> = {
  announcement: solidListThumbFixed(COLOR_HUNT.orange),
  assessment: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  quiz_submission: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  submission_stalled: solidListThumbFixed(COLOR_HUNT.orange),
  grade: solidListThumbFixed(REPORT_SOLID.correct, "#FFFFFF"),
  analytics: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  office_hours: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  office_hour_request: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  classroom_points: solidListThumbFixed(COLOR_HUNT_COOL.gold, COLOR_HUNT.ink),
  student_question: solidListThumbFixed(COLOR_HUNT.pink),
  low_completion: solidListThumbFixed(COLOR_HUNT.orange),
  deadline_reminder: solidListThumbFixed(COLOR_HUNT.orange),
  student_registration: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  group: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  lecture: solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  project: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  homework: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  exam: solidListThumbFixed(COLOR_HUNT.pinkDeep),
  recommendation_update: solidListThumbFixed(COLOR_HUNT.pink),
  system: solidListThumbFixed(COLOR_HUNT.ink, "#FFFFFF"),
  default: solidListThumbFixed(COLOR_HUNT.orange),
}

export function facultyNotificationThumb(type?: string): SolidListThumb {
  const key = (type ?? "default").toLowerCase()
  return NOTIFICATION_THUMBS[key] ?? NOTIFICATION_THUMBS.default!
}

export function facultyDiscussionThreadThumb(threadId: number | string): SolidListThumb {
  return solidListThumbFromHash(`thread-${threadId}`)
}

const QUEUE_THUMBS: Record<string, SolidListThumb> = {
  password: solidListThumbFixed(COLOR_HUNT_COOL.cyan),
  issues: solidListThumbFixed(COLOR_HUNT.orange),
  "office-hours": solidListThumbFixed(COLOR_HUNT_COOL.indigo),
  faq: solidListThumbFixed(REPORT_SOLID.correct, "#FFFFFF"),
}

export function facultySupportQueueThumb(queueId: string): SolidListThumb {
  return QUEUE_THUMBS[queueId] ?? solidListThumbFromHash(queueId)
}

export function facultySupportResetThumb(id: number | string): SolidListThumb {
  return solidListThumbFixed(COLOR_HUNT.orange)
}

export function facultySupportGuideThumb(id: string): SolidListThumb {
  return solidListThumbFixed(COLOR_HUNT_COOL.indigo)
}
