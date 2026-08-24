/** Cache freshness by data volatility. Override per query — never one global duration. */
export const STALE_MS = {
  veryDynamic: 15_000,
  dynamic: 60_000,
  normal: 8 * 60_000,
  slow: 30 * 60_000,
  stable: 60 * 60_000,
} as const

export type StaleClass = keyof typeof STALE_MS

export const GC_MS = {
  session: 30 * 60_000,
  persistable: 24 * 60 * 60_000,
  privileged: 5 * 60_000,
} as const

export const STALE_BY_RESOURCE = {
  studentNotes: STALE_MS.normal,
  studentCourseNotes: STALE_MS.normal,
  studentFlashcards: STALE_MS.normal,
  studentFlashcardGamification: STALE_MS.dynamic,
  studentAnnouncements: STALE_MS.dynamic,
  studentAnnouncementDetail: STALE_MS.dynamic,
  studentNotifications: STALE_MS.dynamic,
  studentRoster: STALE_MS.slow,
  facultyAnnouncements: STALE_MS.dynamic,
  facultyCourseNotes: STALE_MS.normal,
  facultyQuestionBank: STALE_MS.normal,
  facultyAssessments: STALE_MS.dynamic,
  studentDashboard: STALE_MS.dynamic,
  facultyDashboard: STALE_MS.dynamic,
  lectures: STALE_MS.normal,
  practice: STALE_MS.normal,
  groups: STALE_MS.dynamic,
  projects: STALE_MS.dynamic,
  officeHours: STALE_MS.dynamic,
  calendar: STALE_MS.dynamic,
  facultyFlashcards: STALE_MS.normal,
  facultyStudents: STALE_MS.dynamic,
  studentGrades: STALE_MS.dynamic,
  syllabus: STALE_MS.slow,
  coursePolicies: STALE_MS.slow,
  liveAssessment: STALE_MS.veryDynamic,
  messages: STALE_MS.veryDynamic,
  playground: STALE_MS.veryDynamic,
  catalog: STALE_MS.stable,
} as const
