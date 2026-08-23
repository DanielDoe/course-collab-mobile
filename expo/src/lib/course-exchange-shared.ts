/** Client-safe Course Exchange types, labels, and helpers (mirrors web lib/course-exchange/*). */

export const COURSE_EXCHANGE_MODULES = [
  "syllabus",
  "lectures",
  "course_notes",
  "question_bank",
  "practice_hub",
  "flashcards",
  "quizzes",
  "homework",
  "classroom_points",
  "playground",
  "mid_semester_exams",
  "final_exams",
  "projects",
  "groups",
] as const

export type CourseExchangeModule = (typeof COURSE_EXCHANGE_MODULES)[number]

export type CourseExchangeSharingMode = "off" | "request_only"

export type CourseExchangeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COPYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "COPIED"

export type DiscoverCourseRelationshipKind =
  | "none"
  | "pending"
  | "approved"
  | "copying"
  | "imported"
  | "failed"
  | "rejected"
  | "cancelled"

export type DiscoverCourseRelationship = {
  kind: DiscoverCourseRelationshipKind
  requestId: number
  copyId: number | null
  status: CourseExchangeRequestStatus
  approvedModules: CourseExchangeModule[]
  missingModules: CourseExchangeModule[]
}

export type DiscoverableCourse = {
  courseId: number
  courseCode: string
  courseTitle: string
  discoverableTitle: string | null
  discoverableDescription: string | null
  description: string | null
  semester: string | null
  university: string | null
  instructorName: string
  instructorInstitution: string | null
  instructorDepartment: string | null
  isOwner?: boolean
  shareableModules: CourseExchangeModule[]
  autoApprove: boolean
  relationship?: DiscoverCourseRelationship | null
}

export type ExchangeRequestDetail = {
  id: number
  status: string
  purpose: string | null
  requested_modules: CourseExchangeModule[]
  approved_modules: CourseExchangeModule[] | null
  courseCode?: string
  courseTitle?: string
  requesterName?: string
  creatorName?: string
  destination_course_id?: number | null
  destination_session_id?: number | null
  clone_summary?: Record<string, unknown> | null
  clone_error?: string | null
  created_at?: string
  reviewed_at?: string | null
  completed_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  copyId?: number | null
  shareableModules?: CourseExchangeModule[]
  missingModules?: CourseExchangeModule[]
  copyApprovedModules?: CourseExchangeModule[] | null
  pendingSupplementModules?: CourseExchangeModule[]
  needsReview?: boolean
}

export type ExchangeTimelineEntry = {
  id: string
  at: string
  actor: "requester" | "creator" | "system"
  actorName: string | null
  eventType: string
  label: string
  modules: CourseExchangeModule[]
  note: string | null
}

export type ExchangeSupplementOptions = {
  addableModules: CourseExchangeModule[]
  requiresApproval: CourseExchangeModule[]
}

export type ExchangeSyncChangeKind = "added" | "modified" | "removed"

export type ExchangeSyncChange = {
  changeId: string
  kind: ExchangeSyncChangeKind
  module: CourseExchangeModule | "syllabus"
  entityType: string
  sourceId: number
  destinationId: number | null
  label: string
  summary: string
  yoursLabel?: string | null
  incomingLabel?: string | null
}

export type ExchangeSyncDiff = {
  copyId: number
  sourceCourseCode: string
  destinationCourseCode: string
  sourceVersion: number
  hasUpdates: boolean
  changeCount: number
  changes: ExchangeSyncChange[]
  checkedAt: string
}

export type MyCourseSharing = {
  courseId: number
  courseCode: string
  courseTitle: string
  sharingMode: CourseExchangeSharingMode
  discoverableTitle: string | null
  shareableModules: CourseExchangeModule[]
  autoApprove: boolean
}

export type AccessLogRow = {
  id: number
  courseCode: string
  courseTitle: string
  requesterName: string
  eventType: string
  modules: CourseExchangeModule[]
  autoApproved: boolean
  note: string | null
  createdAt: string
}

export type ExchangeCopyRow = Record<string, unknown> & {
  id?: number
  destination_course_code?: string
  source_course_code?: string
  source_instructor_name?: string
  requester_name?: string
  pending_update_count?: number
}

export type ExchangeProvenance = {
  sourceInstructorName: string
  sourceCourseCode: string
  sourceCourseTitle: string
  sourceTermLabel?: string | null
  destinationInstructorName?: string | null
  copiedAt: string
  requestId: number
}

export type DestinationCourseRow = {
  course_id: number
  course_code: string
  course_title: string
  exchange_provenance?: { sourceCourseCode?: string } | null
}

export type ExchangeSessionRow = {
  id: number
  code: string
  course_id: number
}

export const COURSE_EXCHANGE_MODULE_LABELS: Record<CourseExchangeModule, string> = {
  syllabus: "Syllabus",
  lectures: "Lectures",
  course_notes: "Course Notes",
  question_bank: "Question Bank",
  practice_hub: "Practice Hub",
  flashcards: "Flashcards",
  quizzes: "Quizzes",
  homework: "Homework",
  classroom_points: "Classroom Points",
  playground: "Playground",
  mid_semester_exams: "Mid-Semester Exams",
  final_exams: "Final Exams",
  projects: "Projects",
  groups: "Groups",
}

export const COURSE_EXCHANGE_DEFAULT_APPROVAL_MODULES: CourseExchangeModule[] = [
  "syllabus",
  "lectures",
  "course_notes",
  "question_bank",
  "practice_hub",
  "flashcards",
  "quizzes",
  "homework",
  "classroom_points",
  "playground",
  "mid_semester_exams",
]

export const EXCHANGE_INDEPENDENT_COPY_NOTE =
  "This is an independent copy. Edits here never change the creator's original course, and updates to the source are not synced automatically."

export const EXCHANGE_PARTIAL_MODULES_NOTE =
  "Request only the modules you need for your term. Fewer modules means a leaner copy and less to review before launch."

export const EXCHANGE_DESTINATION_SHELL_NOTE =
  "Import into a dedicated course shell for your institution and term (for example ECE2202UH · Summer 2026). Avoid reusing a live roster course."

export const EXCHANGE_OWNER_SHARING_NOTE =
  "Approved requesters receive a one-time fork into their own course. Their edits never flow back to your original, and you are not notified when they change their copy."

export const EXCHANGE_POST_IMPORT_CHECKLIST = [
  "Syllabus dates",
  "Assessment availability",
  "Due dates",
  "Lecture schedule",
  "Grading policies",
  "Classroom Points",
  "Practice settings",
  "Publish status",
] as const

export type CourseExchangeTabId =
  | "discover"
  | "received"
  | "sent"
  | "shared-with-me"
  | "my-shared"
  | "share-settings"

export type DiscoverFilter = "all" | "instant"
export type SentFilter = "all" | "active" | "done"
export type ReceivedFilter = "all" | "pending"
export type SharedWithMeFilter = "all" | "updates"
export type ShareSettingsFilter = "all" | "sharing" | "off"
export type CourseExchangeLayout = "list" | "grid"

export const COURSE_EXCHANGE_TABS: Array<{
  id: CourseExchangeTabId
  label: string
  icon: import("@/components/icons/AppIcon").IoniconName
}> = [
  { id: "discover", label: "Discover", icon: "search-outline" },
  { id: "received", label: "Received", icon: "mail-open-outline" },
  { id: "sent", label: "Sent", icon: "send-outline" },
  { id: "shared-with-me", label: "Shared With Me", icon: "book-outline" },
  { id: "my-shared", label: "My Shared", icon: "share-social-outline" },
  { id: "share-settings", label: "Share Course", icon: "settings-outline" },
]

const CLONE_SUMMARY_LABELS: Record<string, string> = {
  question_bank: "questions",
  syllabus: "syllabus",
  lectures: "lectures",
  course_notes: "notes",
  flashcards: "flashcard decks",
  practice_availability: "practice links",
  assessments: "assessments",
  course_policies: "policy sets",
  playground_sessions: "playground templates",
  groups: "groups",
  projects: "projects",
}

export function isCourseExchangeModule(value: unknown): value is CourseExchangeModule {
  return typeof value === "string" && (COURSE_EXCHANGE_MODULES as readonly string[]).includes(value)
}

export function normalizeModuleList(raw: unknown): CourseExchangeModule[] {
  if (!Array.isArray(raw)) return []
  const out: CourseExchangeModule[] = []
  for (const item of raw) {
    if (isCourseExchangeModule(item) && !out.includes(item)) out.push(item)
  }
  return out
}

export function deriveDestinationShellSuffix(institution: string | null | undefined): string {
  const inst = (institution ?? "").trim().toUpperCase()
  if (!inst) return "LOC"
  if (inst.includes("HOUSTON") || inst.includes(" COUGAR") || /\bUH\b/.test(inst)) return "UH"
  if (inst.includes("PRAIRIE VIEW") || inst.includes("PVAMU")) return "PV"
  const slug = inst.replace(/[^A-Z0-9]/g, "").slice(0, 4)
  return slug || "LOC"
}

export function normalizeShellCourseCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32)
}

export function deriveDestinationShellCode(baseCode: string, institution?: string | null): string {
  const base = normalizeShellCourseCode(baseCode)
  const suffix = deriveDestinationShellSuffix(institution)
  if (base.endsWith(suffix)) return base
  return `${base}${suffix}`.slice(0, 32)
}

export function dedupeOwnedDestinationCourses<T extends DestinationCourseRow>(
  courses: T[],
  institution?: string | null,
): T[] {
  const shellCodes = new Set(
    courses.map((c) => normalizeShellCourseCode(deriveDestinationShellCode(c.course_code, institution))),
  )
  return courses.filter((course) => {
    const norm = normalizeShellCourseCode(course.course_code)
    if (shellCodes.has(norm)) return true
    const expectedShell = normalizeShellCourseCode(
      deriveDestinationShellCode(course.course_code, institution),
    )
    const hasShellSibling = courses.some(
      (other) => normalizeShellCourseCode(other.course_code) === expectedShell,
    )
    return !(hasShellSibling && !course.exchange_provenance)
  })
}

export function pickPreferredDestinationCourseId(
  courses: DestinationCourseRow[],
  sourceCourseCode: string,
  institution?: string | null,
): number | null {
  const deduped = dedupeOwnedDestinationCourses(courses, institution)
  const shellCode = normalizeShellCourseCode(deriveDestinationShellCode(sourceCourseCode, institution))
  const shellMatch = deduped.find((c) => normalizeShellCourseCode(c.course_code) === shellCode)
  if (shellMatch) return shellMatch.course_id
  const sourceNorm = normalizeShellCourseCode(sourceCourseCode)
  const provenanceMatch = deduped.find(
    (c) => normalizeShellCourseCode(c.exchange_provenance?.sourceCourseCode ?? "") === sourceNorm,
  )
  if (provenanceMatch) return provenanceMatch.course_id
  return deduped[0]?.course_id ?? null
}

export function formatExchangeSourceLine(provenance: ExchangeProvenance): string {
  const term = provenance.sourceTermLabel ? ` · ${provenance.sourceTermLabel}` : ""
  return `${provenance.sourceInstructorName} · ${provenance.sourceCourseCode}${provenance.sourceCourseTitle ? ` — ${provenance.sourceCourseTitle}` : ""}${term}`
}

export function formatExchangeCopiedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function summarizeCloneCounts(summary: Record<string, unknown> | null | undefined): string {
  if (!summary) return ""
  const parts: string[] = []
  for (const [key, raw] of Object.entries(summary)) {
    const count = Number(raw)
    if (!Number.isFinite(count) || count <= 0) continue
    const label = CLONE_SUMMARY_LABELS[key] ?? key.replace(/_/g, " ")
    parts.push(`${count} ${label}`)
  }
  return parts.join(" · ")
}

export function exchangePendingSupplementModules(
  requestedModules: CourseExchangeModule[],
  copyApprovedModules: CourseExchangeModule[] | null | undefined,
): CourseExchangeModule[] {
  if (!copyApprovedModules?.length) return []
  const imported = new Set(copyApprovedModules)
  return requestedModules.filter((mod) => !imported.has(mod))
}

export function requestNeedsCreatorReview(
  status: string,
  requestedModules: CourseExchangeModule[],
  copyApprovedModules: CourseExchangeModule[] | null | undefined,
): boolean {
  if (status.toUpperCase() === "PENDING") return true
  return exchangePendingSupplementModules(requestedModules, copyApprovedModules).length > 0
}

export function parseExchangeProvenance(raw: unknown): ExchangeProvenance | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const sourceInstructorName = String(o.sourceInstructorName ?? "").trim()
  const sourceCourseCode = String(o.sourceCourseCode ?? "").trim()
  const sourceCourseTitle = String(o.sourceCourseTitle ?? "").trim()
  const copiedAt = String(o.copiedAt ?? "").trim()
  const requestId = Number(o.requestId)
  if (!sourceInstructorName || !sourceCourseCode || !copiedAt || !Number.isFinite(requestId)) return null
  return {
    sourceInstructorName,
    sourceCourseCode,
    sourceCourseTitle,
    sourceTermLabel: o.sourceTermLabel != null ? String(o.sourceTermLabel) : null,
    destinationInstructorName:
      o.destinationInstructorName != null ? String(o.destinationInstructorName) : null,
    copiedAt,
    requestId,
  }
}

export function exchangeRequestStatusLabel(status: string): string {
  return status.replace(/_/g, " ")
}

export function exchangeRequestStatusColor(status: string): "success" | "warning" | "danger" | "muted" {
  const s = status.toUpperCase()
  if (s === "APPROVED" || s === "COPIED" || s === "COMPLETED") return "success"
  if (s === "REJECTED" || s === "FAILED") return "danger"
  if (s === "PENDING" || s === "COPYING") return "warning"
  return "muted"
}

export function discoverRowMatchesSearch(row: DiscoverableCourse, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    row.courseCode,
    row.courseTitle,
    row.discoverableTitle,
    row.instructorName,
    row.university,
    row.semester,
    row.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q)
}

export function discoverRelationshipLabel(kind: DiscoverCourseRelationshipKind): string {
  switch (kind) {
    case "pending":
      return "Request pending"
    case "approved":
      return "Approved — import ready"
    case "copying":
      return "Importing…"
    case "imported":
      return "Imported"
    case "failed":
      return "Import failed"
    case "rejected":
      return "Rejected"
    case "cancelled":
      return "Cancelled"
    default:
      return ""
  }
}

export function countActiveSentRequests(rows: ExchangeRequestDetail[]): number {
  return rows.filter((r) => ["PENDING", "APPROVED", "FAILED"].includes(r.status.toUpperCase())).length
}

export function countPendingReceivedRequests(rows: ExchangeRequestDetail[]): number {
  return rows.filter((r) => r.needsReview ?? r.status.toUpperCase() === "PENDING").length
}

export function copyRowId(copy: ExchangeCopyRow): number | null {
  const id = Number(copy.id)
  return Number.isFinite(id) ? id : null
}

export function copyRowUpdateCount(copy: ExchangeCopyRow): number {
  const pending = Number(copy.pending_update_count ?? 0)
  return Number.isFinite(pending) ? pending : 0
}

const TA_STAFF_ROLES = new Set(["ta", "teaching_assistant", "assistant"])

/** Mirrors web `manage_course_settings` gate for Course Exchange nav access. */
export function canManageCourseSettings(staffRole?: string | null): boolean {
  if (!staffRole?.trim()) return true
  return !TA_STAFF_ROLES.has(staffRole.trim().toLowerCase())
}

export function isCourseExchangeImportableStatus(status: string): boolean {
  const s = status.toUpperCase()
  return s === "APPROVED" || s === "FAILED"
}

export function parseCourseExchangeTabParam(tab?: string | string[] | null): CourseExchangeTabId {
  const raw = Array.isArray(tab) ? tab[0] : tab
  const normalized = raw?.trim().toLowerCase()
  const valid: CourseExchangeTabId[] = [
    "discover",
    "received",
    "sent",
    "shared-with-me",
    "my-shared",
    "share-settings",
  ]
  if (normalized && valid.includes(normalized as CourseExchangeTabId)) {
    return normalized as CourseExchangeTabId
  }
  return "discover"
}

export function courseExchangeDrawerBadgeCount(summary: {
  receivedPending?: number
  pending?: number
  sentActive?: number
  sentActionable?: number
}): number {
  const received = Number(summary.receivedPending ?? summary.pending ?? 0)
  const sent = Number(summary.sentActive ?? summary.sentActionable ?? 0)
  return received + sent
}

export function mergeSupplementModules(options: ExchangeSupplementOptions | null): CourseExchangeModule[] {
  if (!options) return []
  return [...options.addableModules, ...options.requiresApproval]
}

/** Fall 2026 ELEG sections use their own groups/projects — never exchange targets for those modules. */
export const OWN_GROUPS_PROJECTS_SESSION_CODES = [
  "ELEG1301P01",
  "ELEG1301P02",
  "ELEG1304P03",
] as const

export function isOwnGroupsProjectsSession(sessionCode: string | null | undefined): boolean {
  const normalized = String(sessionCode ?? "").trim().toUpperCase()
  if (!normalized) return false
  return OWN_GROUPS_PROJECTS_SESSION_CODES.some((code) => code.toUpperCase() === normalized)
}

export function filterGroupsProjectsForOwnSession<T extends string>(
  modules: readonly T[],
  destinationSessionCode: string | null | undefined,
): { modules: T[]; skippedGroupsProjects: boolean } {
  if (!isOwnGroupsProjectsSession(destinationSessionCode)) {
    return { modules: [...modules], skippedGroupsProjects: false }
  }
  const filtered = modules.filter((m) => m !== "groups" && m !== "projects") as T[]
  return {
    modules: filtered,
    skippedGroupsProjects: filtered.length !== modules.length,
  }
}

export function ownGroupsProjectsSessionMessage(): string {
  return `Groups and projects are not copied into ${OWN_GROUPS_PROJECTS_SESSION_CODES.join(", ")}. Those sections use their own group and project sets.`
}

export function resolveExchangeSessionCode(
  sessions: ExchangeSessionRow[],
  destinationSessionId?: number | null,
): string | null {
  if (destinationSessionId == null) return null
  const row = sessions.find((s) => s.id === destinationSessionId)
  return row?.code?.trim() || null
}
