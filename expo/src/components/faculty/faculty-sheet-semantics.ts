import type { FacultySheetTone } from "./faculty-collab-sheet-ui"

/** Shared semantic tones — white surfaces, color on icons/borders only (native grouped style). */
export const SHEET_METRIC = {
  primary: "teal" as FacultySheetTone,
  info: "sky" as FacultySheetTone,
  pending: "amber" as FacultySheetTone,
  secondary: "violet" as FacultySheetTone,
  people: "violet" as FacultySheetTone,
  neutral: "slate" as FacultySheetTone,
  danger: "rose" as FacultySheetTone,
} as const

export const SHEET_SECTION = {
  edit: "teal" as FacultySheetTone,
  roster: "slate" as FacultySheetTone,
  workflow: "amber" as FacultySheetTone,
  review: "violet" as FacultySheetTone,
  tools: "slate" as FacultySheetTone,
  danger: "rose" as FacultySheetTone,
  highlight: "sky" as FacultySheetTone,
} as const

/** Lecture sheet — distinct Color Hunt accents per KPI / tool. */
export const SHEET_LECTURE = {
  week: "blue" as FacultySheetTone,
  views: "sky" as FacultySheetTone,
  deck: "amber" as FacultySheetTone,
  deckEmpty: "slate" as FacultySheetTone,
  preview: "amber" as FacultySheetTone,
  slideDeck: "teal" as FacultySheetTone,
  samplePractice: "violet" as FacultySheetTone,
  workspace: "blue" as FacultySheetTone,
} as const

/** Practice sheets — accuracy, attempts, topics. */
export const SHEET_PRACTICE = {
  accuracy: "blue" as FacultySheetTone,
  attempts: "teal" as FacultySheetTone,
  topics: "violet" as FacultySheetTone,
  questions: "blue" as FacultySheetTone,
  dailyLimit: "amber" as FacultySheetTone,
  manageQuestions: "teal" as FacultySheetTone,
  viewReport: "amber" as FacultySheetTone,
} as const

/** Project sheets — scoring, presentations, configuration. */
export const SHEET_PROJECT = {
  presentation: "teal" as FacultySheetTone,
  config: "amber" as FacultySheetTone,
  score: "violet" as FacultySheetTone,
  studentScore: "teal" as FacultySheetTone,
  instructorScore: "blue" as FacultySheetTone,
  grade: "teal" as FacultySheetTone,
  leaderboard: "violet" as FacultySheetTone,
} as const

/** Assessment sheets — quizzes, homework, exams. */
export const SHEET_ASSESSMENT = {
  create: "teal" as FacultySheetTone,
  edit: "blue" as FacultySheetTone,
  preview: "violet" as FacultySheetTone,
  access: "sky" as FacultySheetTone,
  sections: "amber" as FacultySheetTone,
  questions: "violet" as FacultySheetTone,
  time: "sky" as FacultySheetTone,
  grants: "teal" as FacultySheetTone,
} as const

/** Attendance sheets — roll call, meetings. */
export const SHEET_ATTENDANCE = {
  meeting: "blue" as FacultySheetTone,
  roll: "teal" as FacultySheetTone,
  trend: "amber" as FacultySheetTone,
  roster: "slate" as FacultySheetTone,
} as const

/** Classroom points sheets — awards, assignments, review. */
export const SHEET_CLASSROOM_POINTS = {
  award: "amber" as FacultySheetTone,
  assignment: "teal" as FacultySheetTone,
  review: "violet" as FacultySheetTone,
  leaderboard: "sky" as FacultySheetTone,
  bulk: "amber" as FacultySheetTone,
} as const

/** Course evaluation sheets — proof review, approval. */
export const SHEET_EVALUATIONS = {
  proof: "sky" as FacultySheetTone,
  survey: "violet" as FacultySheetTone,
  grade: "amber" as FacultySheetTone,
  approve: "teal" as FacultySheetTone,
} as const

/** Question bank sheets — create wizard, editor, preview. */
export const SHEET_QUESTION_BANK = {
  create: "teal" as FacultySheetTone,
  ai: "violet" as FacultySheetTone,
  pdf: "amber" as FacultySheetTone,
  draft: "blue" as FacultySheetTone,
  preview: "sky" as FacultySheetTone,
  edit: "teal" as FacultySheetTone,
} as const
