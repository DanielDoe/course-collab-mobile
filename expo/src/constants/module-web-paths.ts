/** Maps native module ids to web dashboard-v2 paths (mirrors Sidebar.tsx). */
export const MODULE_WEB_PATHS: Record<string, string> = {
  lectures: "/student/dashboard-v2/lectures",
  notes: "/student/dashboard-v2/notes",
  flashcards: "/student/dashboard-v2/flashcards",
  "ai-notetaker": "/student/dashboard-v2/ai-notetaker",
  practice: "/student/dashboard-v2/practice",
  "ai-tutor": "/student/dashboard-v2/ai-tutor",
  codebench: "/student/dashboard-v2/codebench",
  "codebench-more": "/student/dashboard-v2/codebench/more",
  quizzes: "/student/dashboard-v2/quizzes",
  "quiz-history": "/student/dashboard-v2/quiz-history",
  homework: "/student/dashboard-v2/homework",
  "mid-semester-exams": "/student/dashboard-v2/mid-semester-exams",
  "final-exams": "/student/dashboard-v2/final-exams",
  grades: "/student/dashboard-v2/grades",
  forum: "/student/dashboard-v2/forum",
  messages: "/student/dashboard-v2/messages",
  groups: "/student/dashboard-v2/groups",
  projects: "/student/dashboard-v2/projects",
  playground: "/student/dashboard-v2/playground",
  "classroom-points": "/student/dashboard-v2/classroom-points",
  attendance: "/student/dashboard-v2/attendance",
  "trade-center": "/student/dashboard-v2/trade-center",
  announcements: "/student/dashboard-v2/announcements",
  "progress-review": "/student/dashboard-v2/progress-review",
  syllabus: "/student/dashboard-v2/syllabus",
  calendar: "/student/dashboard-v2/calendar",
  "office-hours": "/student/dashboard-v2/office-hours",
  "schedule-adjustment": "/student/dashboard-v2/schedule-adjustment",
  "course-policies": "/student/dashboard-v2/course-info/policies",
  "course-evaluation": "/student/dashboard-v2/course-info/course-evaluation",
  recommendations: "/student/dashboard-v2/recommendations",
  settings: "/student/dashboard-v2/settings",
  membership: "/student/dashboard-v2/membership",
  "help-center": "/student/dashboard-v2/help",
  "submit-ticket": "/student/dashboard-v2/submit-ticket",
  "report-bug": "/student/dashboard-v2/report-bug",
  "feature-requests": "/student/dashboard-v2/feature-requests"}

/** Modules with rich native list/summary screens; interactive flows open web detail. */
export const NATIVE_MODULE_IDS = new Set([
  "quizzes",
  "homework",
  "mid-semester-exams",
  "final-exams",
  "quiz-history",
  "grades",
  "lectures",
  "attendance",
  "classroom-points",
  "trade-center",
  "forum",
  "messages",
  "groups",
  "projects",
  "calendar",
  "office-hours",
  "schedule-adjustment",
  "progress-review",
  "syllabus",
  "course-policies",
  "course-evaluation",
  "settings",
  "membership",
  "help-center",
  "submit-ticket",
  "report-bug",
  "feature-requests",
  "practice",
  "recommendations",
  "ai-notetaker",
  "notes",
  "flashcards",
  "codebench-more",
])

/** Always load full web UI (recording, complex editors). */
export const WEB_ONLY_MODULE_IDS = new Set(["playground"])

export function getModuleWebPath(id: string): string {
  return MODULE_WEB_PATHS[id] ?? `/student/dashboard-v2/${id}`
}

export function appendNativeQuery(path: string): string {
  return path.includes("native=1") ? path : `${path}${path.includes("?") ? "&" : "?"}native=1`
}

/** Student dashboard-v2 lecture slide viewer (week route + lectureId query). */
export function buildStudentLectureViewerPath(lectureId: number, week: number): string {
  const w = Number(week)
  const id = Number(lectureId)
  if (!Number.isFinite(w) || !Number.isFinite(id)) {
    return MODULE_WEB_PATHS.lectures
  }
  return `${MODULE_WEB_PATHS.lectures}/${w}?lectureId=${id}`
}

export type StudentLectureToolPanel = "workspace" | "sample-practice"

/** Lecture viewer focused on a specific tool panel (not the default slide deck). */
export function buildStudentLectureToolPath(
  lectureId: number,
  week: number,
  panel: StudentLectureToolPanel,
): string {
  const base = buildStudentLectureViewerPath(lectureId, week)
  return `${base}&nativePanel=${encodeURIComponent(panel)}`
}

/** Instructor lecture preview — full slide viewer with workspace & sample practice. */
export function buildInstructorLectureViewerPath(lectureId: number): string {
  const id = Number(lectureId)
  if (!Number.isFinite(id)) return "/instructor/dashboard-v2/content/lectures"
  return `/instructor/dashboard-v2/content/lectures/${id}`
}

export function openFacultyLectureViewer(
  router: { push: (href: never) => void },
  lectureId: number,
) {
  router.push({
    pathname: "/faculty/lecture/[id]",
    params: { id: String(lectureId) }} as never)
}

export type AssessmentTakeAction = "start" | "continue" | "retake"

/** Direct take/review route for a single assessment (mirrors quiz-list handleStartQuiz). */
export function buildAssessmentTakePath(
  assessmentType: string,
  quizId: number,
  options?: { action?: AssessmentTakeAction },
): string {
  const t = assessmentType.toLowerCase().replace(/-/g, "_")
  let base: string
  if (t === "homework") base = `/student/homework/${quizId}`
  else if (t === "mid_semester" || t === "midsem") base = `/student/mid-semester/${quizId}`
  else if (t === "final") base = `/student/final/${quizId}`
  else base = `/student/quiz/${quizId}`
  const withNative = appendNativeQuery(base)
  const params = new URLSearchParams()
  if (withNative.includes("native=1")) params.set("native", "1")
  if (options?.action) {
    params.set("fromDetail", "1")
    params.set("action", options.action)
  }
  const qs = params.toString()
  if (!qs) return withNative
  const pathOnly = withNative.split("?")[0]
  return `${pathOnly}?${qs}`
}

/** True for live assessment-taking web paths (quiz / homework / mid-semester / final). */
export function isAssessmentTakeWebPath(webPath: string): boolean {
  const pathOnly = decodeURIComponent(webPath).split("?")[0]?.toLowerCase() ?? ""
  return /^\/student\/(quiz|homework|mid-semester|midsem|final)\/\d+/.test(pathOnly)
}

export function buildAssessmentResultsPath(attemptId: number, assessmentType?: string): string {
  const type = assessmentType?.trim()
  const suffix = type ? `?type=${encodeURIComponent(type)}` : ""
  return appendNativeQuery(`/student/results/${attemptId}${suffix}`)
}

export function openWebPath(router: { push: (href: never) => void }, path: string) {
  router.push({ pathname: "/web", params: { path: encodeURIComponent(path) } } as never)
}
