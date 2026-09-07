import { isAllowedDeepLinkHost } from "./trusted-origins"

/** Map web notification links to native Expo Router paths. */
export function resolveNotificationLink(link: string | null | undefined): string | null {
  if (!link) return null
  if (/^(javascript|data|file|blob|vbsscript):/i.test(link)) return null

  let normalized = link
  if (/^https?:\/\//i.test(link)) {
    try {
      const url = new URL(link)
      if (!isAllowedDeepLinkHost(url.hostname)) return null
      normalized = `${url.pathname}${url.search}`
    } catch {
      return null
    }
  }

  const [pathname, search = ""] = normalized.split("?")
  const path = pathname.replace(/\/$/, "") || "/"
  const params = search ? new URLSearchParams(search) : null

  if (path === "/dashboard" || path === "/student/dashboard" || path === "/student/dashboard-v2") {
    return "/dashboard"
  }
  if (path === "/settings" || path === "/student/profile" || path === "/student/dashboard-v2/settings") {
    return "/settings"
  }
  if (path.startsWith("/membership") || path.includes("/membership")) {
    return "/membership"
  }
  const openAnnouncementId = params?.get("open")
  if (openAnnouncementId && /^\d+$/.test(openAnnouncementId)) {
    return `/announcements/${openAnnouncementId}`
  }

  if (path.startsWith("/announcements")) {
    return path
  }

  if (path.startsWith("/schedule-adjustment/")) {
    const requestId = path.slice("/schedule-adjustment/".length).split("/")[0]
    if (requestId && /^\d+$/.test(requestId)) return `/schedule-adjustment/${requestId}`
    return "/module/schedule-adjustment"
  }

  const v2Prefix = "/student/dashboard-v2/"
  if (path.startsWith(v2Prefix)) {
    const rest = path.slice(v2Prefix.length)
    const [segment, ...tail] = rest.split("/")
    const mapped = mapStudentDashboardSegment(segment, tail, search)
    if (mapped) return mapped
  }

  const classicPrefix = "/student/"
  if (path.startsWith(classicPrefix)) {
    const rest = path.slice(classicPrefix.length)
    const [segment, ...tail] = rest.split("/")
    if (segment === "announcements") {
      return tail.length ? `/announcements/${tail[0]}` : "/announcements"
    }
    if (segment === "results" && tail[0]) {
      return `/assessment/report/${tail[0]}`
    }
    if ((segment === "quiz" || segment === "homework" || segment === "mid-semester" || segment === "final") && tail[0]) {
      return `/assessment/${tail[0]}`
    }
    if (segment === "messages") {
      const threadId = params?.get("thread")
      return threadId ? `/messages/${threadId}` : "/module/messages"
    }
    if (segment === "recommendations") {
      if (tail[0] && /^\d+$/.test(tail[0])) return `/recommendations/${tail[0]}`
      const requestId = params?.get("request")
      if (requestId && /^\d+$/.test(requestId)) return `/recommendations/${requestId}`
      return "/module/recommendations"
    }
    if (segment === "schedule-adjustment") {
      return tail.length && /^\d+$/.test(tail[0]) ? `/schedule-adjustment/${tail[0]}` : "/module/schedule-adjustment"
    }
    const nativeModule = CLASSIC_MODULE_MAP[segment]
    if (nativeModule) return `/module/${nativeModule}`
  }

  if (path === "/module/recommendations" || path.startsWith("/module/recommendations/")) {
    const rest = path.slice("/module/recommendations".length).replace(/^\//, "")
    const detailId = rest.split("/")[0]
    if (detailId && /^\d+$/.test(detailId)) return `/recommendations/${detailId}`
    const requestId = params?.get("request")
    if (requestId && /^\d+$/.test(requestId)) return `/recommendations/${requestId}`
    return "/module/recommendations"
  }

  if (path.startsWith("/module/")) return path

  if (path.startsWith("/flashcards/")) {
    const deckId = path.slice("/flashcards/".length).split("/")[0]
    if (deckId && /^\d+$/.test(deckId)) {
      const rest = path.slice(`/flashcards/${deckId}`.length)
      if (rest.startsWith("/edit")) return `/flashcards/${deckId}/edit`
      return `/flashcards/${deckId}`
    }
    return "/module/flashcards"
  }

  if (path.startsWith("/guest/messages")) {
    const threadId = params?.get("thread")
    return threadId ? `/messages/${threadId}` : "/module/messages"
  }
  if (path.startsWith("/guest/recommendations")) {
    const rest = path.slice("/guest/recommendations".length).replace(/^\//, "")
    const detailId = rest.split("/")[0]
    if (detailId && /^\d+$/.test(detailId)) {
      return `/recommendation/${detailId}`
    }
    const requestId = params?.get("request")
    if (requestId && /^\d+$/.test(requestId)) {
      return `/recommendation/${requestId}`
    }
    return "/module/recommendations"
  }
  if (path.startsWith("/guest/cora") || path.includes("/guest/cora-career")) {
    if (path.includes("credit") && path.includes("checkout")) return "/guest/cora-credits/checkout"
    if (path.includes("credit")) return "/module/cora-credits"
    if (path.includes("checkout") || path.includes("upgrade")) return "/guest/cora-career/checkout"
    return "/module/cora-assistant"
  }
  if (path.startsWith("/guest/home") || path === "/guest") {
    return "/dashboard"
  }

  if (path.includes("/summer-camp/messages")) {
    const threadId = params?.get("thread")
    return threadId ? `/messages/${threadId}` : "/module/messages"
  }
  if (path.includes("/summer-camp")) {
    return mapSummerCampPath(path)
  }

  if (path.includes("/communication/messages") || (path.includes("/faculty/dashboard") && path.includes("/messages"))) {
    const threadId = params?.get("thread")
    return threadId ? `/messages/${threadId}` : "/module/messages"
  }

  const facultyRoute = mapFacultyPath(path, search)
  if (facultyRoute) return facultyRoute

  return null
}

/** Numeric announcement id from a resolved native route like `/announcements/123`. */
export function announcementIdFromNotificationRoute(route: string | null | undefined): number | null {
  if (!route) return null
  const match = route.match(/^\/announcements\/(\d+)(?:\?|$)/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

function mapStudentDashboardSegment(segment: string, tail: string[], search: string): string | null {
  if (segment === "announcements") {
    if (tail.length && /^\d+$/.test(tail[0])) return `/announcements/${tail[0]}`
    const openId = new URLSearchParams(search).get("open")
    if (openId && /^\d+$/.test(openId)) return `/announcements/${openId}`
    return "/announcements"
  }
  if (segment === "forum" && tail[0] === "thread" && tail[1]) {
    return `/collaboration/forum/thread/${tail[1]}${search ? `?${search}` : ""}`
  }
  if (segment === "messages") {
    const threadId = new URLSearchParams(search).get("thread")
    return threadId ? `/messages/${threadId}` : "/module/messages"
  }
  if (segment === "summer-camp" && tail[0] === "messages") {
    const threadId = new URLSearchParams(search).get("thread")
    return threadId ? `/messages/${threadId}` : "/module/messages"
  }
  if (segment === "groups") {
    if (tail[0] === "discover") return "/collaboration/groups/discover"
    if (tail[0] === "create") return "/collaboration/groups/create"
    if (tail[0]) return `/collaboration/groups/${tail[0]}`
    return "/module/groups"
  }
  if (segment === "projects") {
    if (tail[0] === "submit") return "/collaboration/projects/submit"
    if (tail[0] === "leaderboard") return "/module/projects"
    if (tail[0]) return `/collaboration/projects/${tail[0]}`
    return "/module/projects"
  }
  if (segment === "lectures" && tail[0]) {
    return `/lecture/${tail[0]}`
  }
  if (segment === "flashcards") {
    if (tail[0] && /^\d+$/.test(tail[0])) {
      if (tail[1] === "edit") return `/flashcards/${tail[0]}/edit`
      return `/flashcards/${tail[0]}`
    }
    return "/module/flashcards"
  }
  if (segment === "assessment" || segment === "quiz" || segment === "homework" || segment === "mid-semester" || segment === "final") {
    const id = tail[0]
    return id ? `/assessment/${id}` : null
  }
  if (segment === "results" && tail[0]) {
    return `/assessment/report/${tail[0]}`
  }
  if (segment === "grades") {
    return "/module/grades"
  }
  if (segment === "issues" || segment.includes("issues")) {
    return mapIssuesPath(segment, tail)
  }
  if (segment === "recommendations") {
    const requestId = tail[0] && /^\d+$/.test(tail[0]) ? tail[0] : new URLSearchParams(search).get("request")
    return requestId && /^\d+$/.test(requestId) ? `/recommendations/${requestId}` : "/module/recommendations"
  }
  if (segment === "progress-review" || segment === "progress-reviews") {
    return "/module/progress-review"
  }
  if (segment === "course-info" && (tail[0] === "course-evaluation" || tail[0] === "evaluation")) {
    return "/module/course-evaluation"
  }
  if (segment === "course-evaluation") {
    return "/module/course-evaluation"
  }
  if (segment === "office-hours") {
    return "/module/office-hours"
  }
  if (segment === "schedule-adjustment") {
    return tail.length ? `/schedule-adjustment/${tail[0]}` : "/module/schedule-adjustment"
  }
  if (segment === "calendar") {
    return "/module/calendar"
  }
  if (segment === "classroom-points") {
    return "/module/classroom-points"
  }
  if (segment === "codebench" && tail[0] === "more") {
    return "/module/codebench-more"
  }
  if (segment === "codebench") {
    return "/module/codebench"
  }

  const nativeModule = V2_MODULE_MAP[segment]
  if (nativeModule) return `/module/${nativeModule}`
  return null
}

function mapIssuesPath(segment: string, tail: string[]): string | null {
  const combined = [segment, ...tail].join("/").toLowerCase()
  if (combined.includes("homework")) return "/module/homework?segment=issues"
  if (combined.includes("mid-semester") || combined.includes("mid_semester")) {
    return "/module/mid-semester-exams?segment=issues"
  }
  if (combined.includes("final")) return "/module/final-exams?segment=issues"
  return "/module/quizzes?segment=issues"
}

function mapFacultyPath(path: string, search: string): string | null {
  const lower = path.toLowerCase()
  if (lower.includes("management/sessions") || lower.includes("academic-terms")) return "/module/academic-terms"
  if (lower.includes("communication/announcements") || lower.includes("/announcements")) return "/module/announcements"
  if (lower.includes("content/syllabus") || lower.includes("/syllabus")) return "/module/syllabus"
  if (lower.includes("content/lectures") || lower.includes("/lectures")) return "/module/lectures"
  if (lower.includes("content/practice") || lower.includes("/practice")) return "/module/practice"
  if (lower.includes("playground")) return "/module/playground"
  if (lower.includes("management/groups") || lower.includes("/groups")) return "/module/groups"
  if (lower.includes("management/projects") || lower.includes("/projects")) return "/module/projects"
  if (lower.includes("summer-camp")) return "/module/summer-camp"
  if (lower.includes("question-bank")) return "/module/question-bank"
  if (lower.includes("classroom-points")) return "/module/classroom-points"
  if (lower.includes("attendance")) return "/module/attendance"
  if (lower.includes("homework")) {
    if (lower.includes("deleted")) return "/module/homework?segment=deleted"
    if (lower.includes("issues")) return "/module/homework?segment=issues"
    return "/module/homework"
  }
  if (lower.includes("mid-semester") || lower.includes("mid_semester")) {
    if (lower.includes("deleted")) return "/module/mid-semester-exams?segment=deleted"
    if (lower.includes("issues")) return "/module/mid-semester-exams?segment=issues"
    return "/module/mid-semester-exams"
  }
  if (lower.includes("/finals") || lower.includes("/final")) {
    if (lower.includes("deleted")) return "/module/final-exams?segment=deleted"
    if (lower.includes("issues")) return "/module/final-exams?segment=issues"
    return "/module/final-exams"
  }
  if (lower.includes("quizzes/issues") || lower.includes("quiz-issues")) return "/module/quizzes?segment=issues"
  if (lower.includes("quizzes/deleted") || lower.includes("deleted-quizzes") || lower.includes("deleted-items")) {
    return "/module/quizzes?segment=deleted"
  }
  if (lower.includes("deleted")) return "/module/quizzes?segment=deleted"
  if (lower.includes("quizzes") || lower.includes("assessments/quiz")) return "/module/quizzes"
  if (lower.includes("management/students") || lower.includes("/students")) return "/module/students"
  if (lower.includes("campers")) return "/module/campers"
  if (lower.includes("recommendations")) return "/module/recommendations"
  if (lower.includes("progress-review")) return "/module/progress-reviews"
  if (lower.includes("office-hours")) return "/module/office-hours"
  if (lower.includes("schedule-adjustment")) return "/module/schedule-adjustment"
  if (lower.includes("results/")) {
    const attemptId = path.split("/").pop()
    return attemptId ? `/module/quizzes?segment=results&attempt=${attemptId}${search ? `&${search.replace(/^\?/, "")}` : ""}` : "/module/quizzes"
  }
  if (lower.includes("/instructor/")) return "/dashboard"
  return null
}

function mapSummerCampPath(path: string): string | null {
  const lower = path.toLowerCase()
  const moduleMatch = lower.match(/\/summer-camp\/training\/(\d+)\/module\/(\d+)/)
  if (moduleMatch) {
    return `/summer/training/${moduleMatch[1]}/module/${moduleMatch[2]}`
  }
  const trainingMatch = lower.match(/\/summer-camp\/training\/(\d+)/)
  if (trainingMatch) {
    return `/summer/training/${trainingMatch[1]}`
  }
  if (lower.includes("/messages")) return "/module/messages"
  if (lower.includes("/projects")) return "/module/projects"
  if (lower.includes("/checkpoints")) return "/module/checkpoints"
  if (lower.includes("/discussions")) return "/module/discussions"
  if (lower.includes("/roadmap")) return "/module/roadmap"
  if (lower.includes("/browse")) return "/module/browse-trainings"
  if (lower.includes("/gallery")) return "/module/gallery"
  if (lower.includes("/graduation")) return "/module/graduation"
  if (lower.includes("/leaderboard")) return "/module/leaderboard"
  if (lower.includes("/achievements")) return "/module/achievements"
  if (lower.includes("/resources")) return "/module/resources"
  if (lower.includes("/trainings")) return "/module/my-trainings"
  return "/module/my-trainings"
}

function tailFromPath(path: string, prefix: string, fallback: string): string {
  const rest = path.slice(prefix.length).replace(/^\//, "")
  return rest ? `${fallback}/${rest}` : fallback
}

const V2_MODULE_MAP: Record<string, string> = {
  quizzes: "quizzes",
  "quiz-history": "quiz-history",
  homework: "homework",
  "mid-semester-exams": "mid-semester-exams",
  "final-exams": "final-exams",
  grades: "grades",
  lectures: "lectures",
  notes: "notes",
  flashcards: "flashcards",
  practice: "practice",
  "ai-tutor": "ai-tutor",
  "ai-notetaker": "ai-notetaker",
  codebench: "codebench",
  forum: "forum",
  messages: "messages",
  groups: "groups",
  projects: "projects",
  playground: "playground",
  "classroom-points": "classroom-points",
  attendance: "attendance",
  "trade-center": "trade-center",
  announcements: "announcements",
  calendar: "calendar",
  "office-hours": "office-hours",
  "schedule-adjustment": "schedule-adjustment",
  recommendations: "recommendations",
  help: "help-center",
  notifications: "announcements",
  settings: "settings",
  membership: "membership",
  syllabus: "syllabus",
  "progress-review": "progress-review",
  "course-evaluation": "course-evaluation",
}

const CLASSIC_MODULE_MAP: Record<string, string> = {
  ...V2_MODULE_MAP,
  finals: "final-exams",
  homeworks: "homework",
  help: "help-center",
}

export type NotificationModule =
  | "dashboard"
  | "messages"
  | "announcements"
  | "assessments"
  | "grades"
  | "groups"
  | "projects"
  | "lectures"
  | "forum"
  | "classroom-points"
  | "calendar"
  | "office-hours"
  | "schedule-adjustment"
  | "recommendations"
  | "progress-review"
  | "course-evaluation"
  | "issues"
  | "membership"
  | "practice"
  | "summer-camp"
  | "notes"
  | "flashcards"
  | "attendance"
  | "ai-tutor"
  | "codebench"
  | "ai-notetaker"
  | "trade-center"
  | "syllabus"
  | "playground"
  | "students"
  | "question-bank"

/** Map backend notification type (+ optional link) to modules that should refresh. */
export function notificationTypeToModules(type: unknown, link?: string | null): NotificationModule[] {
  const normalized = typeof type === "string" ? type.toLowerCase() : ""
  const linkLower = (link ?? "").toLowerCase()
  const modules = new Set<NotificationModule>()

  if (isMessageNotificationType(type)) {
    modules.add("messages")
    return [...modules]
  }

  if (normalized.includes("announce")) {
    modules.add("announcements")
    modules.add("dashboard")
    return [...modules]
  }

  if (
    normalized === "quiz" ||
    normalized === "homework" ||
    normalized === "exam" ||
    normalized === "deadline" ||
    normalized.includes("assessment")
  ) {
    modules.add("assessments")
    modules.add("dashboard")
  }

  if (normalized === "grade" || linkLower.includes("/results/") || linkLower.includes("/grades")) {
    modules.add("grades")
    modules.add("assessments")
    modules.add("dashboard")
  }

  if (normalized === "group") modules.add("groups")
  if (normalized === "project") modules.add("projects")
  if (normalized === "lecture") modules.add("lectures")
  if (normalized === "forum") modules.add("forum")
  if (normalized === "code_submission" || linkLower.includes("classroom-points")) modules.add("classroom-points")
  if (normalized === "office_hours" || linkLower.includes("office-hours")) modules.add("office-hours")
  if (linkLower.includes("schedule-adjustment")) modules.add("schedule-adjustment")
  if (normalized.includes("recommendation")) modules.add("recommendations")
  if (normalized.includes("progress_review") || linkLower.includes("progress-review")) modules.add("progress-review")
  if (
    normalized.includes("course_evaluation") ||
    normalized.includes("course-evaluation") ||
    linkLower.includes("course-evaluation")
  ) {
    modules.add("course-evaluation")
  }
  if (normalized === "issue" || linkLower.includes("issues")) modules.add("issues")
  if (normalized === "membership" || normalized === "donation" || normalized === "upgrade_reminder") {
    modules.add("membership")
  }
  if (normalized === "practice") modules.add("practice")
  if (normalized === "note" || normalized.includes("notes")) modules.add("notes")
  if (normalized === "flashcard") modules.add("flashcards")
  if (normalized === "attendance") modules.add("attendance")
  if (normalized === "ai_tutor" || normalized.includes("cora")) modules.add("ai-tutor")
  if (normalized === "codebench" || normalized.includes("code_submission")) {
    modules.add("codebench")
    modules.add("classroom-points")
  }
  if (normalized === "trade" || linkLower.includes("trade-center")) modules.add("trade-center")
  if (normalized === "syllabus" || linkLower.includes("syllabus")) modules.add("syllabus")
  if (normalized === "calendar" || linkLower.includes("/calendar")) modules.add("calendar")
  if (normalized === "playground") modules.add("playground")
  if (normalized === "student" || linkLower.includes("/students")) modules.add("students")
  if (linkLower.includes("question-bank")) modules.add("question-bank")
  if (linkLower.includes("summer-camp")) modules.add("summer-camp")

  if (modules.size === 0) modules.add("dashboard")
  return [...modules]
}

export function isMessageNotificationType(type: unknown): boolean {
  return type === "message" || type === "forum" || type === "direct_message"
}
