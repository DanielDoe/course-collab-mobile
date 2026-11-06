/**
 * Cora → native Expo Router only.
 *
 * Backend confirmations often still emit web dashboard-v2 / faculty dashboard URLs.
 * Every "Open module" / navigate from Cora must resolve through this helper so we
 * never push unmatched web paths. Source of truth for destinations: student +
 * faculty module registries.
 */

import { FACULTY_CORA_MODULE_REGISTRY } from "./faculty-module-registry"
import { STUDENT_CORA_MODULE_REGISTRY } from "./student-module-registry"

/** Confirm-result entity.type → student/faculty module id */
const ENTITY_TYPE_TO_MODULE: Record<string, string> = {
  announcement: "announcements",
  question: "question-bank",
  assessment: "quizzes",
  message: "messages",
  syllabus: "syllabus",
  lecture: "lectures",
  flashcard_deck: "flashcards",
  note: "notes",
  calendar_events: "calendar",
  practice_quiz: "practice",
  study_plan: "calendar",
  account: "dashboard",
}

function buildRegistryRouteIndex(): Map<string, string> {
  const map = new Map<string, string>()
  for (const cap of Object.values(STUDENT_CORA_MODULE_REGISTRY)) {
    if (cap.route) {
      map.set(cap.module, cap.route)
      map.set(cap.module.replace(/_/g, "-"), cap.route)
    }
  }
  for (const cap of Object.values(FACULTY_CORA_MODULE_REGISTRY)) {
    if (cap.route) {
      map.set(cap.module, cap.route)
      map.set(cap.module.replace(/_/g, "-"), cap.route)
    }
  }
  // Aliases web segments → registry modules
  map.set("help", map.get("help-center") ?? "/module/help-center")
  map.set("progress-reviews", map.get("progress-reviews") ?? "/module/progress-reviews")
  map.set("cora-insights", map.get("cora-insights") ?? "/module/cora-insights")
  map.set("ai-monitoring", map.get("cora-insights") ?? "/module/cora-insights")
  map.set("ai-insights", map.get("cora-insights") ?? "/module/cora-insights")
  map.set("course-evaluations", map.get("course-evaluations") ?? "/module/course-evaluations")
  map.set("finals", map.get("final-exams") ?? "/module/final-exams")
  map.set("homeworks", map.get("homework") ?? "/module/homework")
  map.set("quiz-history", map.get("quiz-history") ?? "/module/quiz-history")
  map.set("codebench-more", map.get("codebench-more") ?? "/module/codebench-more")
  map.set("course-evaluation", map.get("course-evaluation") ?? "/module/course-evaluation")
  map.set("course-policies", map.get("course-policies") ?? "/module/course-policies")
  return map
}

const MODULE_ROUTE_BY_ID = buildRegistryRouteIndex()

function pathnameOnly(route: string): string {
  return route.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0] || "/"
}

function isAlreadyNative(path: string): boolean {
  return (
    path.startsWith("/module/") ||
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path.startsWith("/announcements") ||
    path.startsWith("/lecture/") ||
    path.startsWith("/assessment/") ||
    path.startsWith("/messages/") ||
    path.startsWith("/recommendations/") ||
    path.startsWith("/recommendation/") ||
    path.startsWith("/collaboration/") ||
    path.startsWith("/notes/") ||
    path.startsWith("/settings") ||
    path.startsWith("/membership") ||
    path.startsWith("/guest/") ||
    path.startsWith("/summer/") ||
    path.startsWith("/faculty/") ||
    path.startsWith("/schedule-adjustment/")
  )
}

function looksLikeWebDashboardPath(path: string): boolean {
  const lower = path.toLowerCase()
  return (
    lower.includes("/dashboard-v2/") ||
    lower.includes("/student/dashboard") ||
    lower.includes("/instructor/dashboard") ||
    lower.includes("/faculty/dashboard") ||
    lower.includes("/admin/dashboard")
  )
}

function moduleIdFromWebPath(path: string): string | null {
  const lower = path.toLowerCase().replace(/\/$/, "")

  const studentV2 = lower.match(/\/student\/dashboard-v2\/([^/?#]+)/)
  if (studentV2?.[1]) {
    const seg = studentV2[1]
    if (seg === "course-info") {
      const rest = lower.split("/course-info/")[1]?.split("/")[0]
      if (rest === "policies") return "course-policies"
      if (rest === "course-evaluation" || rest === "evaluation") return "course-evaluation"
    }
    return seg
  }

  const classic = lower.match(/\/student\/([^/?#]+)/)
  if (classic?.[1] && classic[1] !== "dashboard-v2" && classic[1] !== "dashboard") {
    return classic[1]
  }

  if (lower.includes("question-bank")) return "question-bank"
  if (lower.includes("announcements")) return "announcements"
  if (lower.includes("syllabus")) return "syllabus"
  if (lower.includes("lectures")) return "lectures"
  if (lower.includes("messages")) return "messages"
  if (lower.includes("homework")) return "homework"
  if (lower.includes("mid-semester")) return "mid-semester-exams"
  if (lower.includes("/finals") || /\/final(\/|$)/.test(lower)) return "final-exams"
  if (lower.includes("quizzes") || lower.includes("assessments/quiz")) return "quizzes"
  if (lower.includes("office-hours")) return "office-hours"
  if (lower.includes("schedule-adjustment")) return "schedule-adjustment"
  if (lower.includes("flashcards")) return "flashcards"
  if (lower.includes("/notes")) return "notes"
  if (lower.includes("calendar")) return "calendar"
  if (lower.includes("practice")) return "practice"
  if (lower.includes("playground")) return "playground"
  if (lower.includes("classroom-points")) return "classroom-points"
  if (lower.includes("attendance")) return "attendance"
  if (lower.includes("students") || lower.includes("campers")) {
    return lower.includes("campers") ? "campers" : "students"
  }
  if (lower.includes("progress-review")) return "progress-reviews"
  if (lower.includes("course-evaluation")) return "course-evaluations"
  if (lower.includes("trade-center")) return "trade-center"
  if (lower.includes("results")) return "results"
  if (lower.includes("student-progress")) return "student-progress"
  if (lower.includes("cora-insights") || lower.includes("ai-monitoring") || lower.includes("ai-insights")) {
    return "cora-insights"
  }
  if (lower.includes("groups")) return "groups"
  if (lower.includes("projects")) return "projects"
  if (lower.includes("summer-camp")) return "summer-camp"
  if (lower.includes("course-exchange")) return "course-exchange"
  if (lower.includes("academic-terms") || lower.includes("sessions")) return "academic-terms"

  return null
}

export function nativeRouteForModuleId(moduleId: string | null | undefined): string | null {
  if (!moduleId) return null
  const id = moduleId.trim().toLowerCase().replace(/_/g, "-")
  return MODULE_ROUTE_BY_ID.get(id) ?? null
}

/**
 * Resolve any Cora entity / deep link to a navigable native Expo path.
 * Never returns a web dashboard-v2 path.
 */
export function resolveCoraOpenRoute(
  route: string | null | undefined,
  entityType?: string | null,
): string | null {
  const raw = String(route ?? "").trim()
  if (raw) {
    const path = pathnameOnly(raw).replace(/\/$/, "") || "/"

    if (isAlreadyNative(path) && !looksLikeWebDashboardPath(path)) {
      return path
    }

    const moduleId = moduleIdFromWebPath(path)
    const fromModule = nativeRouteForModuleId(moduleId)
    if (fromModule) return fromModule

    // Last segment guess against registry
    const segment = path.split("/").filter(Boolean).pop()?.toLowerCase()
    const fromSegment = nativeRouteForModuleId(segment)
    if (fromSegment) return fromSegment
  }

  const type = String(entityType ?? "").trim()
  if (type) {
    const mappedModule = ENTITY_TYPE_TO_MODULE[type]
    const fromEntity = nativeRouteForModuleId(mappedModule) ?? nativeRouteForModuleId(type)
    if (fromEntity) return fromEntity
  }

  return null
}

type RouterLike = { push: (href: never) => void }

/**
 * Always navigate via native module routes. No-ops if nothing resolves.
 */
export function openCoraNativeRoute(
  router: RouterLike,
  route: string | null | undefined,
  entityType?: string | null,
): boolean {
  const native = resolveCoraOpenRoute(route, entityType)
  if (!native) return false
  if (looksLikeWebDashboardPath(native)) return false
  router.push(native as never)
  return true
}
