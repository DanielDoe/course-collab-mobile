import type { NotificationModule } from "../notification-link"

/** Native module slug → push refresh bus keys (one slug may map to several). */
export const MODULE_NOTIFICATION_KEYS: Record<string, NotificationModule[]> = {
  // Student core
  dashboard: ["dashboard"],
  lectures: ["lectures"],
  notes: ["notes"],
  flashcards: ["flashcards"],
  "ai-notetaker": ["notes", "ai-notetaker"],
  practice: ["practice"],
  "ai-tutor": ["ai-tutor"],
  codebench: ["codebench"],
  "codebench-more": ["codebench"],
  quizzes: ["assessments", "issues"],
  "quiz-history": ["assessments", "grades"],
  homework: ["assessments", "issues"],
  "mid-semester-exams": ["assessments", "issues"],
  "final-exams": ["assessments", "issues"],
  grades: ["grades", "assessments"],
  forum: ["forum"],
  messages: ["messages"],
  groups: ["groups"],
  projects: ["projects"],
  playground: ["playground"],
  "classroom-points": ["classroom-points"],
  attendance: ["attendance"],
  "trade-center": ["trade-center"],
  announcements: ["announcements"],
  calendar: ["calendar"],
  "schedule-adjustment": ["schedule-adjustment", "calendar"],
  "office-hours": ["office-hours"],
  "progress-review": ["progress-review"],
  syllabus: ["syllabus"],
  "course-evaluation": ["course-evaluation"],
  "course-policies": ["syllabus"],
  recommendations: ["recommendations"],
  membership: ["membership"],
  settings: ["dashboard"],
  "help-center": ["dashboard"],
  // Faculty
  "academic-terms": ["dashboard"],
  "question-bank": ["assessments"],
  students: ["students"],
  campers: ["summer-camp"],
  "summer-camp": ["summer-camp"],
  "progress-reviews": ["progress-review"],
  issues: ["issues"],
  notifications: ["dashboard"],
  results: ["assessments", "grades"],
  reports: ["assessments"],
  "student-support": ["issues"],
  // Summer camp modules
  "my-trainings": ["summer-camp"],
  "browse-trainings": ["summer-camp"],
  roadmap: ["summer-camp"],
  checkpoints: ["summer-camp"],
  discussions: ["forum", "summer-camp"],
  resources: ["summer-camp"],
  gallery: ["summer-camp"],
  graduation: ["summer-camp"],
  leaderboard: ["summer-camp"],
  achievements: ["summer-camp"],
}
export function notificationModulesFromWebPath(webPath: string): NotificationModule[] {
  const normalized = webPath.split("?")[0]?.replace(/\/$/, "") ?? ""
  const segments = normalized.split("/").filter(Boolean)
  const slug = segments[segments.length - 1] ?? ""
  const parent = segments[segments.length - 2] ?? ""

  if (normalized.includes("summer-camp")) {
    const summerSlug = segments.find((s) => s !== "summer-camp" && s !== "student" && s !== "dashboard-v2") ?? slug
    return MODULE_NOTIFICATION_KEYS[summerSlug] ?? ["summer-camp"]
  }

  if (slug && MODULE_NOTIFICATION_KEYS[slug]) {
    return MODULE_NOTIFICATION_KEYS[slug]
  }
  if (parent && MODULE_NOTIFICATION_KEYS[parent]) {
    return MODULE_NOTIFICATION_KEYS[parent]
  }

  return ["dashboard"]
}

export function notificationModulesForSlug(slug: string): NotificationModule[] {
  return MODULE_NOTIFICATION_KEYS[slug] ?? ["dashboard"]
}
