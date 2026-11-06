import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"
import { getStoredSession } from "./session"
import { studentAuthenticatedHeaders } from "./student-api"

async function summerAuthHeaders(studentId: string): Promise<Record<string, string>> {
  const stored = await getStoredSession()
  const session =
    stored && (stored.portal === "student" || stored.portal === "guest" || stored.portal === "summer")
      ? stored
      : { databaseId: studentId }
  return studentAuthenticatedHeaders(session)
}

export type SummerModuleProgress = {
  id: number
  title: string
  sort_order: number
  schedule_day: string | null
  schedule_day_sort: number
  display_number: number | null
  is_visible: boolean
  is_complete: boolean
}

export type SummerModuleBlock = {
  id: number
  module_id: number
  block_type: string
  content: Record<string, unknown>
  sort_order: number
}

export type SummerModuleDetail = {
  id: number
  title: string
  description?: string
  sort_order: number
  training_id: number
  training_slug: string
  training_title: string
  project_title?: string
}

export type SummerModuleProgressRecord = {
  block_id: number | null
  progress_type: string
  completed_at?: string
  metadata?: Record<string, unknown>
}

export type SummerCheckpointSubmission = {
  id: number
  block_id: number
  status: string
  file_url?: string
  file_name?: string
  feedback?: string | null
  grade?: string | null
  submitted_at?: string
  reviewed_at?: string | null
}

export type SummerSubmitCheckpointPayload = {
  moduleId: number
  blockId: number
  uri: string
  name: string
  mime: string
}

export type SummerSubmitCheckpointResult = {
  submission: SummerCheckpointSubmission
  totalXp?: number
}

export type SummerModuleLessonRef = {
  id: number
  title: string
}

export type SummerModuleDetailResponse = {
  module: SummerModuleDetail
  blocks: SummerModuleBlock[]
  progress: SummerModuleProgressRecord[]
  submissions: SummerCheckpointSubmission[]
  nextLesson: SummerModuleLessonRef | null
  totalXp?: number
  curriculumLocked?: boolean
  curriculumMessage?: string
}

export type SummerSaveProgressPayload = {
  moduleId: number
  blockId?: number
  progressType: string
  metadata?: Record<string, unknown>
}

export type SummerSaveProgressResult = {
  progress: SummerModuleProgressRecord & { id?: number }
  updated?: boolean
  totalXp?: number
  alreadyComplete?: boolean
}

export type SummerTrainingProjectPreview = {
  id: number
  title: string
  description?: string
  sort_order: number
  is_complete?: boolean
  metadata?: Record<string, unknown>
  primary_module_id?: number
  xp_reward?: number
}

export type SummerTrainingDetailResponse = {
  training: {
    id: number
    title: string
    description?: string
    slug: string
    camp_title?: string
    camp_slug?: string
  }
  modules: SummerModuleProgress[]
  projects: SummerTrainingProjectPreview[]
  enrolled: boolean
  preview: boolean
  overview?: string
  faculty: SummerBrowseFaculty[]
  meta: SummerBrowseTrainingMeta
}

export type SummerTrainingEnrollment = {
  enrollment_id: number
  status: string
  enrolled_at: string
  training_id: number
  training_slug: string
  training_title: string
  training_description: string
  camp_id: number
  camp_title: string
  camp_slug: string
  start_date: string
  end_date: string
  total_modules?: number
  completed_modules?: number
  percent?: number
  modules?: SummerModuleProgress[]
}

export type SummerBrowseFaculty = {
  id: number
  name: string
  email?: string
  job_title?: string
  institution?: string
  role?: string
}

export type SummerBrowseTrainingMeta = {
  summary?: string
  overview?: string
  duration?: string
  difficulty?: string
  audience?: string
  format?: string
  outcomes: string[]
  tags: string[]
}

export type SummerBrowseTraining = {
  id: number
  slug: string
  title: string
  description: string
  status: string
  meta: SummerBrowseTrainingMeta
  faculty: SummerBrowseFaculty[]
  available: boolean
  enrolled: boolean
}

export type SummerBrowseCamp = {
  id: number
  slug: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  status: string
  trainings: SummerBrowseTraining[]
}

export type SummerBrowseTrainings = {
  camps: SummerBrowseCamp[]
}

export type SummerDashboard = {
  overall_percent: number
  enrollments: SummerTrainingEnrollment[]
  progress: Array<{
    training_id: number
    total_modules: number
    completed_modules: number
    percent: number
    modules: SummerModuleProgress[]
  }>
  upcoming_checkpoints: SummerCheckpoint[]
  recent_feedback: unknown[]
  recent_discussions: unknown[]
  announcements: SummerAnnouncement[]
  upcoming_events: SummerEvent[]
  total_xp: number
  modules_completed: number
  leaderboard_rank: number | null
  leaderboard_total: number | null
}

export type SummerCheckpoint = {
  block_id: number
  content: {
    title: string
    description?: string
    maxSizeMb?: number
    acceptedTypes?: string[]
    facultyApproval?: boolean
  }
  module_id: number
  module_title: string
  training_id: number
  training_title: string
  status?: string
  submitted_at?: string
}

export type SummerAnnouncement = {
  id: number
  title: string
  body?: string
  content?: string
  created_at?: string
  date?: string
  pinned?: boolean
}

export type SummerDiscussionTab = "my_questions" | "training" | "announcements" | "resolved"

export type SummerDiscussion = {
  id: number
  title: string
  body?: string
  description?: string
  author_name?: string
  training_title?: string
  module_title?: string
  status?: string
  is_resolved?: boolean
  reply_count?: number
  created_at?: string
  updated_at?: string
  kind?: "question" | "announcement" | "thread"
}

export type SummerEvent = {
  id: number
  title: string
  starts_at?: string
  ends_at?: string
  location?: string
}

export type SummerRoadmapMilestone = {
  id: number
  title: string
  sort_order: number
  index: number
  status: string
  is_complete: boolean
}

export type SummerRoadmap = {
  training_id: number
  training_title: string
  training_slug: string
  percent: number
  milestones: SummerRoadmapMilestone[]
}

export type SummerLeaderboardEntry = {
  rank: number
  student_id: string
  full_name: string
  total_xp: number
  modules_completed?: number
  badges_earned?: number
  is_current_user?: boolean
}

function mapSummerLeaderboardEntry(raw: unknown): SummerLeaderboardEntry | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const rank = typeof record.rank === "number" ? record.rank : null
  const name =
    (typeof record.full_name === "string" && record.full_name.trim()) ||
    (typeof record.name === "string" && record.name.trim()) ||
    ""
  if (!rank || !name) return null
  const studentId = record.student_id
  return {
    rank,
    student_id:
      typeof studentId === "string" || typeof studentId === "number" ? String(studentId) : String(rank),
    full_name: name,
    total_xp: typeof record.total_xp === "number" ? record.total_xp : 0,
    modules_completed:
      typeof record.modules_completed === "number" ? record.modules_completed : undefined,
    badges_earned: typeof record.badges_earned === "number" ? record.badges_earned : undefined,
    is_current_user: record.is_current_user === true,
  }
}

export type SummerBadge = {
  id: string
  title: string
  emoji: string
  earned: boolean
  description: string
}

export type SummerGraduationRequirement = {
  id: string
  label: string
  met: boolean
  detail?: string
}

export type SummerGraduationCertificate = {
  id: number
  verification_code: string
  issued_at?: string
  linkedin_share_url?: string
}

export type SummerGraduationTraining = {
  training_id: number
  training_title: string
  camp_title: string
  requirements: SummerGraduationRequirement[]
  ready_to_graduate: boolean
  modules_completed: number
  modules_total: number
  certificate?: SummerGraduationCertificate | null
  total_xp: number
  earned_badge_ids: string[]
}

export type SummerGraduation = {
  total_xp: number
  trainings: SummerGraduationTraining[]
  badges: SummerBadge[]
}

function slugToBadgeTitle(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function mapSummerBadgeRecord(raw: unknown, earnedOverride?: boolean): SummerBadge | null {
  if (typeof raw === "string") {
    return {
      id: raw,
      title: slugToBadgeTitle(raw),
      emoji: "🏅",
      earned: earnedOverride ?? true,
      description: "",
    }
  }
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id : null
  const title = typeof record.title === "string" ? record.title : id ? slugToBadgeTitle(id) : ""
  if (!id || !title) return null
  return {
    id,
    title,
    emoji: typeof record.emoji === "string" ? record.emoji : "🏅",
    earned: earnedOverride ?? record.earned === true,
    description: typeof record.description === "string" ? record.description : "",
  }
}

function mapSummerGraduationRequirement(raw: unknown): SummerGraduationRequirement | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id : null
  const label = typeof record.label === "string" ? record.label : ""
  if (!id || !label) return null
  return {
    id,
    label,
    met: record.met === true,
    detail: typeof record.detail === "string" ? record.detail : undefined,
  }
}

function mapSummerGraduationTraining(raw: Record<string, unknown>): SummerGraduationTraining | null {
  const trainingId = typeof raw.training_id === "number" ? raw.training_id : null
  const trainingTitle = typeof raw.training_title === "string" ? raw.training_title : "Training"
  if (!trainingId) return null

  const earnedBadgeIds = Array.isArray(raw.badges)
    ? raw.badges.filter((item): item is string => typeof item === "string")
    : []

  const certificateRaw = raw.certificate
  const certificate =
    certificateRaw && typeof certificateRaw === "object"
      ? {
          id: typeof (certificateRaw as Record<string, unknown>).id === "number"
            ? ((certificateRaw as Record<string, unknown>).id as number)
            : 0,
          verification_code:
            typeof (certificateRaw as Record<string, unknown>).verification_code === "string"
              ? ((certificateRaw as Record<string, unknown>).verification_code as string)
              : "",
          issued_at:
            typeof (certificateRaw as Record<string, unknown>).issued_at === "string"
              ? ((certificateRaw as Record<string, unknown>).issued_at as string)
              : undefined,
          linkedin_share_url:
            typeof (certificateRaw as Record<string, unknown>).linkedin_share_url === "string"
              ? ((certificateRaw as Record<string, unknown>).linkedin_share_url as string)
              : undefined,
        }
      : null

  return {
    training_id: trainingId,
    training_title: trainingTitle,
    camp_title: typeof raw.camp_title === "string" ? raw.camp_title : "Summer Camp",
    requirements: (Array.isArray(raw.requirements) ? raw.requirements : [])
      .map(mapSummerGraduationRequirement)
      .filter((item): item is SummerGraduationRequirement => item !== null),
    ready_to_graduate: raw.ready_to_graduate === true,
    modules_completed: typeof raw.modules_completed === "number" ? raw.modules_completed : 0,
    modules_total: typeof raw.modules_total === "number" ? raw.modules_total : 0,
    certificate: certificate?.verification_code ? certificate : null,
    total_xp: typeof raw.total_xp === "number" ? raw.total_xp : 0,
    earned_badge_ids: earnedBadgeIds,
  }
}

async function normalizeSummerGraduation(studentId: string): Promise<SummerGraduation> {
  const [graduationPayload, achievementsPayload] = await Promise.all([
    summerRequest<Record<string, unknown>>("/api/summer-camp/graduation", studentId),
    summerRequest<{ badges?: unknown[] }>("/api/summer-camp/achievements", studentId),
  ])

  const earnedSlugs = new Set<string>()
  if (Array.isArray(graduationPayload.badges)) {
    for (const badge of graduationPayload.badges) {
      if (typeof badge === "string") earnedSlugs.add(badge)
    }
  }

  const trainings = (Array.isArray(graduationPayload.trainings) ? graduationPayload.trainings : [])
    .map((item) => mapSummerGraduationTraining(item as Record<string, unknown>))
    .filter((item): item is SummerGraduationTraining => item !== null)

  for (const training of trainings) {
    for (const slug of training.earned_badge_ids) earnedSlugs.add(slug)
  }

  const catalog = (achievementsPayload.badges ?? [])
    .map((item) => mapSummerBadgeRecord(item))
    .filter((item): item is SummerBadge => item !== null)

  const badges =
    catalog.length > 0
      ? catalog.map((badge) => ({
          ...badge,
          earned: badge.earned || earnedSlugs.has(badge.id),
        }))
      : [...earnedSlugs]
          .map((slug) => mapSummerBadgeRecord(slug, true))
          .filter((item): item is SummerBadge => item !== null)
          .sort((a, b) => a.title.localeCompare(b.title))

  const totalXp =
    typeof graduationPayload.total_xp === "number"
      ? graduationPayload.total_xp
      : trainings.reduce((max, training) => Math.max(max, training.total_xp), 0)

  return { total_xp: totalXp, trainings, badges }
}

export type SummerGalleryEntry = {
  id: number
  title: string
  student_name?: string
  thumbnail_url?: string
  description?: string
  project_title?: string
  training_title?: string
  votes?: number
  has_voted?: boolean
}

export type SummerGalleryAward = {
  id: number
  title: string
  student_name?: string
  award_type?: string
  award_label?: string
  description?: string
  project_title?: string
}

export type SummerGalleryLeaderboardEntry = {
  rank: number
  student_name: string
  project_title?: string
  votes?: number
  total_votes?: number
}

export type SummerGallery = {
  training_id: number | null
  entries: SummerGalleryEntry[]
  awards: SummerGalleryAward[]
  peoples_choice_leaderboard: SummerGalleryLeaderboardEntry[]
  award_types: Record<string, string>
}

export type SummerGalleryTab = "projects" | "awards" | "peoples_choice"

function mapSummerGalleryEntry(raw: Record<string, unknown>): SummerGalleryEntry | null {
  const id = typeof raw.id === "number" ? raw.id : null
  const title =
    (typeof raw.title === "string" && raw.title) ||
    (typeof raw.project_title === "string" && raw.project_title) ||
    ""
  if (!id || !title) return null
  return {
    id,
    title,
    student_name:
      (typeof raw.student_name === "string" && raw.student_name) ||
      (typeof raw.full_name === "string" && raw.full_name) ||
      undefined,
    thumbnail_url: typeof raw.thumbnail_url === "string" ? raw.thumbnail_url : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    project_title: typeof raw.project_title === "string" ? raw.project_title : undefined,
    training_title: typeof raw.training_title === "string" ? raw.training_title : undefined,
    votes: typeof raw.votes === "number" ? raw.votes : undefined,
    has_voted: raw.has_voted === true,
  }
}

function mapSummerGalleryAward(
  raw: Record<string, unknown>,
  awardTypes: Record<string, string>,
): SummerGalleryAward | null {
  const id = typeof raw.id === "number" ? raw.id : typeof raw.entry_id === "number" ? raw.entry_id : null
  const title =
    (typeof raw.title === "string" && raw.title) ||
    (typeof raw.project_title === "string" && raw.project_title) ||
    (typeof raw.award_label === "string" && raw.award_label) ||
    ""
  if (!id || !title) return null
  const awardType = typeof raw.award_type === "string" ? raw.award_type : undefined
  return {
    id,
    title,
    student_name:
      (typeof raw.student_name === "string" && raw.student_name) ||
      (typeof raw.full_name === "string" && raw.full_name) ||
      undefined,
    award_type: awardType,
    award_label: awardType ? awardTypes[awardType] ?? awardType.replace(/_/g, " ") : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    project_title: typeof raw.project_title === "string" ? raw.project_title : undefined,
  }
}

function mapSummerGalleryLeaderboardEntry(raw: Record<string, unknown>): SummerGalleryLeaderboardEntry | null {
  const studentName =
    (typeof raw.student_name === "string" && raw.student_name) ||
    (typeof raw.full_name === "string" && raw.full_name) ||
    ""
  if (!studentName) return null
  const rank = typeof raw.rank === "number" ? raw.rank : typeof raw.position === "number" ? raw.position : 0
  return {
    rank,
    student_name: studentName,
    project_title:
      (typeof raw.project_title === "string" && raw.project_title) ||
      (typeof raw.title === "string" && raw.title) ||
      undefined,
    votes: typeof raw.votes === "number" ? raw.votes : typeof raw.vote_count === "number" ? raw.vote_count : undefined,
    total_votes: typeof raw.total_votes === "number" ? raw.total_votes : undefined,
  }
}

function normalizeSummerGalleryPayload(payload: Record<string, unknown>): SummerGallery {
  const awardTypesRaw = payload.award_types
  const awardTypes: Record<string, string> = {}
  if (awardTypesRaw && typeof awardTypesRaw === "object" && !Array.isArray(awardTypesRaw)) {
    for (const [key, value] of Object.entries(awardTypesRaw as Record<string, unknown>)) {
      if (typeof value === "string") awardTypes[key] = value
    }
  }

  const entries = (Array.isArray(payload.entries) ? payload.entries : [])
    .map((item) => mapSummerGalleryEntry(item as Record<string, unknown>))
    .filter((item): item is SummerGalleryEntry => item !== null)

  const awards = (Array.isArray(payload.awards) ? payload.awards : [])
    .map((item) => mapSummerGalleryAward(item as Record<string, unknown>, awardTypes))
    .filter((item): item is SummerGalleryAward => item !== null)

  const peoplesChoice = (Array.isArray(payload.peoples_choice_leaderboard)
    ? payload.peoples_choice_leaderboard
    : []
  )
    .map((item) => mapSummerGalleryLeaderboardEntry(item as Record<string, unknown>))
    .filter((item): item is SummerGalleryLeaderboardEntry => item !== null)
    .sort((a, b) => a.rank - b.rank)

  return {
    training_id: typeof payload.training_id === "number" ? payload.training_id : null,
    entries,
    awards,
    peoples_choice_leaderboard: peoplesChoice,
    award_types: awardTypes,
  }
}

export type SummerResourceType = "text" | "code" | "video" | "image_gallery" | string

export type SummerResource = {
  id: number
  type: SummerResourceType
  title: string
  module_title?: string
  description?: string
}

export type SummerTrainingResources = {
  training_id: number
  training_title: string
  resources: SummerResource[]
}

function mapSummerResourceRecord(raw: Record<string, unknown>): SummerResource | null {
  const id = typeof raw.id === "number" ? raw.id : null
  const title = typeof raw.title === "string" ? raw.title.trim() : ""
  if (!id || !title) return null
  return {
    id,
    type: typeof raw.type === "string" ? raw.type : "text",
    title,
    module_title: typeof raw.module_title === "string" ? raw.module_title : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
  }
}

function dedupeSummerResources(resources: SummerResource[]): SummerResource[] {
  const byTitle = new Map<string, SummerResource>()
  for (const resource of resources) {
    const key = resource.title.toLowerCase()
    const existing = byTitle.get(key)
    if (!existing || (resource.description && !existing.description)) {
      byTitle.set(key, resource)
    }
  }
  return [...byTitle.values()].sort((a, b) => {
    const moduleA = a.module_title ?? a.title
    const moduleB = b.module_title ?? b.title
    const moduleCompare = moduleA.localeCompare(moduleB)
    if (moduleCompare !== 0) return moduleCompare
    return a.title.localeCompare(b.title)
  })
}

function normalizeSummerResourcesPayload(payload: {
  trainings?: Array<Record<string, unknown>>
}): { trainings: SummerTrainingResources[] } {
  return {
    trainings: (payload.trainings ?? [])
      .map((raw) => {
        const trainingId = typeof raw.training_id === "number" ? raw.training_id : 0
        const trainingTitle =
          typeof raw.training_title === "string" ? raw.training_title : "Resources"
        const resources = Array.isArray(raw.resources) ? raw.resources : []
        const mapped = resources
          .map((item) => mapSummerResourceRecord(item as Record<string, unknown>))
          .filter((item): item is SummerResource => item !== null)
        return {
          training_id: trainingId,
          training_title: trainingTitle,
          resources: dedupeSummerResources(mapped),
        }
      })
      .filter((training) => training.resources.length > 0 || training.training_title),
  }
}

export type SummerProjectStatus = "not_started" | "in_progress" | "complete"

export type SummerProject = {
  module_id: number
  title: string
  project_title: string
  project_number?: number
  training_id: number
  training_title: string
  training_slug: string
  camp_title: string
  is_complete: boolean
  status: SummerProjectStatus
  milestone_status?: string
  category?: string
  difficulty?: string
  duration_label?: string
  instructor_name?: string
  badge_title?: string
  xp_reward?: number
  progress_percent?: number
  tasks_completed?: number
  tasks_total?: number
  checkpoints_completed?: number
  checkpoints_total?: number
  summary?: string
}

function isSummerProjectModule(title: string): boolean {
  return /^Project\s+\d+/i.test(title)
}

export { isSummerProjectModule }

function parseSummerProjectTitle(fullTitle: string): { number?: number; name: string } {
  const match = fullTitle.match(/^Project\s+(\d+)\s*[—–-]\s*(.+)$/i)
  if (match) return { number: Number(match[1]), name: match[2].trim() }
  return { name: fullTitle.replace(/^Project\s+\d+\s*[—–-]\s*/i, "").trim() || fullTitle }
}

function normalizeSummerProjectStatus(
  isComplete: boolean,
  milestoneStatus?: string,
  rawStatus?: string,
): SummerProjectStatus {
  if (isComplete) return "complete"
  const normalized = (rawStatus ?? milestoneStatus ?? "").toLowerCase()
  if (normalized.includes("complete")) return "complete"
  if (normalized.includes("progress") || normalized === "active" || normalized === "started") {
    return "in_progress"
  }
  return "not_started"
}

function mapSummerProjectRecord(raw: Record<string, unknown>): SummerProject | null {
  const moduleId =
    typeof raw.primary_module_id === "number"
      ? raw.primary_module_id
      : typeof raw.module_id === "number"
        ? raw.module_id
        : typeof raw.id === "number"
          ? raw.id
          : null
  const title =
    (typeof raw.project_title === "string" && raw.project_title) ||
    (typeof raw.title === "string" && raw.title) ||
    (typeof raw.module_title === "string" && raw.module_title) ||
    ""
  if (!moduleId || !title) return null

  const parsed = parseSummerProjectTitle(title)
  const projectTitle =
    (typeof raw.project_title === "string" && raw.project_title) ||
    (typeof raw.name === "string" && raw.name) ||
    parsed.name

  const trainingId = typeof raw.training_id === "number" ? raw.training_id : 0
  const trainingTitle = typeof raw.training_title === "string" ? raw.training_title : "Training"
  const trainingSlug = typeof raw.training_slug === "string" ? raw.training_slug : ""
  const campTitle = typeof raw.camp_title === "string" ? raw.camp_title : "Summer Camp"
  const isComplete =
    raw.is_complete === true ||
    raw.status === "complete" ||
    (typeof raw.progress_percent === "number" && raw.progress_percent >= 100)
  const milestoneStatus = typeof raw.milestone_status === "string" ? raw.milestone_status : undefined
  const rawStatus = typeof raw.status === "string" ? raw.status : undefined
  const metadata =
    raw.project_metadata && typeof raw.project_metadata === "object"
      ? (raw.project_metadata as Record<string, unknown>)
      : raw.metadata && typeof raw.metadata === "object"
        ? (raw.metadata as Record<string, unknown>)
        : undefined

  return {
    module_id: moduleId,
    title,
    project_title: projectTitle,
    project_number:
      typeof raw.project_number === "number"
        ? raw.project_number
        : typeof raw.number === "number"
          ? raw.number
          : parsed.number,
    training_id: trainingId,
    training_title: trainingTitle,
    training_slug: trainingSlug,
    camp_title: campTitle,
    is_complete: isComplete,
    status: normalizeSummerProjectStatus(isComplete, milestoneStatus, rawStatus),
    milestone_status: milestoneStatus,
    category: typeof raw.category === "string" ? raw.category : undefined,
    difficulty: typeof raw.difficulty === "string" ? raw.difficulty : undefined,
    duration_label:
      typeof raw.duration_label === "string"
        ? raw.duration_label
        : typeof raw.duration === "string"
          ? raw.duration
          : undefined,
    instructor_name:
      typeof raw.instructor_name === "string"
        ? raw.instructor_name
        : typeof raw.instructor === "string"
          ? raw.instructor
          : undefined,
    badge_title:
      typeof raw.badge_title === "string"
        ? raw.badge_title
        : typeof raw.badge === "string"
          ? raw.badge
          : typeof metadata?.badge === "string"
            ? metadata.badge
            : undefined,
    xp_reward:
      typeof raw.xp_reward === "number"
        ? raw.xp_reward
        : typeof metadata?.xp_reward === "number"
          ? metadata.xp_reward
          : undefined,
    progress_percent: typeof raw.progress_percent === "number" ? raw.progress_percent : undefined,
    tasks_completed: typeof raw.tasks_completed === "number" ? raw.tasks_completed : undefined,
    tasks_total: typeof raw.tasks_total === "number" ? raw.tasks_total : undefined,
    checkpoints_completed:
      typeof raw.checkpoints_completed === "number" ? raw.checkpoints_completed : undefined,
    checkpoints_total: typeof raw.checkpoints_total === "number" ? raw.checkpoints_total : undefined,
    summary: typeof raw.summary === "string" ? raw.summary : undefined,
  }
}

async function deriveSummerProjects(studentId: string): Promise<{ projects: SummerProject[] }> {
  const [trainingsRes, roadmapRes] = await Promise.all([
    summerRequest<{ trainings: SummerTrainingEnrollment[] }>("/api/summer-camp/my-trainings", studentId),
    summerRequest<{ roadmaps: SummerRoadmap[] }>("/api/summer-camp/roadmap", studentId),
  ])

  const milestoneByModuleId = new Map<number, SummerRoadmapMilestone>()
  for (const roadmap of roadmapRes.roadmaps) {
    for (const milestone of roadmap.milestones) {
      if (isSummerProjectModule(milestone.title)) milestoneByModuleId.set(milestone.id, milestone)
    }
  }

  const projects: SummerProject[] = []
  for (const training of trainingsRes.trainings) {
    for (const module of training.modules ?? []) {
      if (!module.is_visible || !isSummerProjectModule(module.title)) continue
      const parsed = parseSummerProjectTitle(module.title)
      const milestone = milestoneByModuleId.get(module.id)
      projects.push({
        module_id: module.id,
        title: module.title,
        project_title: parsed.name,
        project_number: parsed.number,
        training_id: training.training_id,
        training_title: training.training_title,
        training_slug: training.training_slug,
        camp_title: training.camp_title,
        is_complete: module.is_complete,
        status: normalizeSummerProjectStatus(module.is_complete, milestone?.status),
        milestone_status: milestone?.status,
        progress_percent: module.is_complete ? 100 : 0,
      })
    }
  }

  projects.sort((a, b) => {
    const trainingOrder = a.training_title.localeCompare(b.training_title)
    if (trainingOrder !== 0) return trainingOrder
    return (a.project_number ?? 999) - (b.project_number ?? 999)
  })

  return { projects }
}

async function summerPostRequest<T>(
  path: string,
  studentId: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${API_BASE_URL}${path}${path.includes("?") ? "&" : "?"}studentId=${encodeURIComponent(studentId)}`
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: await summerAuthHeaders(studentId),
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { error: text }
    }
  }
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, payload)
  }
  return payload as T
}

export function findBrowseTraining(
  camps: SummerBrowseCamp[],
  trainingId: number,
): { camp: SummerBrowseCamp; training: SummerBrowseTraining } | null {
  for (const camp of camps) {
    const training = camp.trainings.find((item) => item.id === trainingId)
    if (training) return { camp, training }
  }
  return null
}

async function summerRequest<T>(path: string, studentId: string): Promise<T> {
  const url = `${API_BASE_URL}${path}${path.includes("?") ? "&" : "?"}studentId=${encodeURIComponent(studentId)}`
  const response = await fetch(url, { headers: { Accept: "application/json" } })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }
  return body as T
}

async function summerAuthRequest<T>(
  path: string,
  studentId: string,
  query?: Record<string, string | undefined>,
): Promise<T> {
  const params = new URLSearchParams({ studentId })
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value)
  }
  const url = `${API_BASE_URL}${path}?${params.toString()}`
  const response = await fetch(url, {
    credentials: "include",
    headers: await summerAuthHeaders(studentId),
  })
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }
  return body as T
}

const DISCUSSION_TAB_QUERY: Record<SummerDiscussionTab, string> = {
  my_questions: "my-questions",
  training: "training",
  announcements: "announcements",
  resolved: "resolved",
}

function mapSummerDiscussionRecord(raw: Record<string, unknown>): SummerDiscussion | null {
  const id = typeof raw.id === "number" ? raw.id : typeof raw.thread_id === "number" ? raw.thread_id : null
  const title =
    (typeof raw.title === "string" && raw.title) ||
    (typeof raw.subject === "string" && raw.subject) ||
    ""
  if (!id || !title) return null

  const status = typeof raw.status === "string" ? raw.status : undefined
  const isResolved =
    raw.is_resolved === true ||
    raw.resolved === true ||
    status?.toLowerCase() === "resolved"

  return {
    id,
    title,
    body:
      (typeof raw.body === "string" && raw.body) ||
      (typeof raw.content === "string" && raw.content) ||
      undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    author_name:
      (typeof raw.author_name === "string" && raw.author_name) ||
      (typeof raw.student_name === "string" && raw.student_name) ||
      (typeof raw.author === "string" && raw.author) ||
      undefined,
    training_title: typeof raw.training_title === "string" ? raw.training_title : undefined,
    module_title: typeof raw.module_title === "string" ? raw.module_title : undefined,
    status,
    is_resolved: isResolved,
    reply_count:
      typeof raw.reply_count === "number"
        ? raw.reply_count
        : typeof raw.replies_count === "number"
          ? raw.replies_count
          : undefined,
    created_at:
      (typeof raw.created_at === "string" && raw.created_at) ||
      (typeof raw.date === "string" && raw.date) ||
      undefined,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
    kind:
      raw.kind === "announcement" || raw.type === "announcement"
        ? "announcement"
        : raw.kind === "question" || raw.type === "question"
          ? "question"
          : "thread",
  }
}

function mapAnnouncementToDiscussion(announcement: SummerAnnouncement): SummerDiscussion {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body ?? announcement.content,
    author_name: "Camp faculty",
    created_at: announcement.created_at ?? announcement.date,
    kind: "announcement",
    is_resolved: false,
  }
}

function mapSummerBrowseFaculty(raw: unknown): SummerBrowseFaculty | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "number" ? record.id : null
  const name = typeof record.name === "string" ? record.name.trim() : ""
  if (!id || !name) return null
  return {
    id,
    name,
    email: typeof record.email === "string" ? record.email : undefined,
    job_title: typeof record.job_title === "string" ? record.job_title : undefined,
    institution: typeof record.institution === "string" ? record.institution : undefined,
    role: typeof record.role === "string" ? record.role : undefined,
  }
}

function mapSummerBrowseTrainingMeta(raw: unknown): SummerBrowseTrainingMeta {
  if (!raw || typeof raw !== "object") {
    return { outcomes: [], tags: [] }
  }
  const record = raw as Record<string, unknown>
  return {
    summary: typeof record.summary === "string" ? record.summary : undefined,
    overview: typeof record.overview === "string" ? record.overview : undefined,
    duration: typeof record.duration === "string" ? record.duration : undefined,
    difficulty: typeof record.difficulty === "string" ? record.difficulty : undefined,
    audience: typeof record.audience === "string" ? record.audience : undefined,
    format: typeof record.format === "string" ? record.format : undefined,
    outcomes: Array.isArray(record.outcomes)
      ? record.outcomes.filter((item): item is string => typeof item === "string")
      : [],
    tags: Array.isArray(record.tags)
      ? record.tags.filter((item): item is string => typeof item === "string")
      : [],
  }
}

function mapSummerBrowseTraining(raw: unknown): SummerBrowseTraining | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "number" ? record.id : null
  const title = typeof record.title === "string" ? record.title.trim() : ""
  if (!id || !title) return null
  const slug = typeof record.slug === "string" ? record.slug : String(id)
  const description = typeof record.description === "string" ? record.description : ""
  const status = typeof record.status === "string" ? record.status : "published"
  return {
    id,
    slug,
    title,
    description,
    status,
    meta: mapSummerBrowseTrainingMeta(record.meta),
    faculty: (Array.isArray(record.faculty) ? record.faculty : [])
      .map((item) => mapSummerBrowseFaculty(item))
      .filter((item): item is SummerBrowseFaculty => item !== null),
    available: record.available !== false,
    enrolled: record.enrolled === true,
  }
}

function mapSummerBrowseCamp(raw: unknown): SummerBrowseCamp | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "number" ? record.id : null
  const title = typeof record.title === "string" ? record.title.trim() : ""
  if (!id || !title) return null
  return {
    id,
    slug: typeof record.slug === "string" ? record.slug : String(id),
    title,
    description: typeof record.description === "string" ? record.description : undefined,
    start_date: typeof record.start_date === "string" ? record.start_date : undefined,
    end_date: typeof record.end_date === "string" ? record.end_date : undefined,
    status: typeof record.status === "string" ? record.status : "published",
    trainings: (Array.isArray(record.trainings) ? record.trainings : [])
      .map((item) => mapSummerBrowseTraining(item))
      .filter((item): item is SummerBrowseTraining => item !== null),
  }
}

function normalizeSummerBrowseTrainingsPayload(payload: Record<string, unknown>): SummerBrowseTrainings {
  return {
    camps: (Array.isArray(payload.camps) ? payload.camps : [])
      .map((item) => mapSummerBrowseCamp(item))
      .filter((item): item is SummerBrowseCamp => item !== null),
  }
}

function mapSummerModuleBlock(raw: unknown): SummerModuleBlock | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "number" ? record.id : null
  const moduleId = typeof record.module_id === "number" ? record.module_id : null
  const blockType = typeof record.block_type === "string" ? record.block_type : null
  if (!id || !moduleId || !blockType) return null
  return {
    id,
    module_id: moduleId,
    block_type: blockType,
    content: record.content && typeof record.content === "object" ? (record.content as Record<string, unknown>) : {},
    sort_order: typeof record.sort_order === "number" ? record.sort_order : 0,
  }
}

function mapSummerCheckpointSubmission(raw: unknown): SummerCheckpointSubmission | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "number" ? record.id : null
  const blockId = typeof record.block_id === "number" ? record.block_id : null
  const status = typeof record.status === "string" ? record.status : null
  if (!id || !blockId || !status) return null
  return {
    id,
    block_id: blockId,
    status,
    file_url: typeof record.file_url === "string" ? record.file_url : undefined,
    file_name: typeof record.file_name === "string" ? record.file_name : undefined,
    feedback: typeof record.feedback === "string" ? record.feedback : record.feedback === null ? null : undefined,
    grade: typeof record.grade === "string" ? record.grade : record.grade === null ? null : undefined,
    submitted_at: typeof record.submitted_at === "string" ? record.submitted_at : undefined,
    reviewed_at: typeof record.reviewed_at === "string" ? record.reviewed_at : record.reviewed_at === null ? null : undefined,
  }
}

function mapSummerModuleProgressRecord(raw: unknown): SummerModuleProgressRecord | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const progressType = typeof record.progress_type === "string" ? record.progress_type : null
  if (!progressType) return null
  return {
    block_id: typeof record.block_id === "number" ? record.block_id : record.block_id === null ? null : null,
    progress_type: progressType,
    completed_at: typeof record.completed_at === "string" ? record.completed_at : undefined,
    metadata:
      record.metadata && typeof record.metadata === "object"
        ? (record.metadata as Record<string, unknown>)
        : undefined,
  }
}

function normalizeSummerModuleDetailPayload(payload: Record<string, unknown>): SummerModuleDetailResponse {
  const moduleRaw = payload.module
  if (!moduleRaw || typeof moduleRaw !== "object") {
    throw new ApiError("Invalid module response", 500, payload)
  }
  const moduleRecord = moduleRaw as Record<string, unknown>
  const moduleId = typeof moduleRecord.id === "number" ? moduleRecord.id : 0
  const module: SummerModuleDetail = {
    id: moduleId,
    title: typeof moduleRecord.title === "string" ? moduleRecord.title : "Module",
    description: typeof moduleRecord.description === "string" ? moduleRecord.description : undefined,
    sort_order: typeof moduleRecord.sort_order === "number" ? moduleRecord.sort_order : 0,
    training_id: typeof moduleRecord.training_id === "number" ? moduleRecord.training_id : 0,
    training_slug: typeof moduleRecord.training_slug === "string" ? moduleRecord.training_slug : String(moduleId),
    training_title: typeof moduleRecord.training_title === "string" ? moduleRecord.training_title : "Training",
    project_title: typeof moduleRecord.project_title === "string" ? moduleRecord.project_title : undefined,
  }

  const nextRaw = payload.nextLesson
  const nextLesson =
    nextRaw && typeof nextRaw === "object" && typeof (nextRaw as Record<string, unknown>).id === "number"
      ? {
          id: (nextRaw as Record<string, unknown>).id as number,
          title:
            typeof (nextRaw as Record<string, unknown>).title === "string"
              ? ((nextRaw as Record<string, unknown>).title as string)
              : "Next module",
        }
      : null

  return {
    module,
    blocks: (Array.isArray(payload.blocks) ? payload.blocks : [])
      .map((item) => mapSummerModuleBlock(item))
      .filter((item): item is SummerModuleBlock => item !== null)
      .sort((a, b) => a.sort_order - b.sort_order),
    progress: (Array.isArray(payload.progress) ? payload.progress : [])
      .map((item) => mapSummerModuleProgressRecord(item))
      .filter((item): item is SummerModuleProgressRecord => item !== null),
    submissions: (Array.isArray(payload.submissions) ? payload.submissions : [])
      .map((item) => mapSummerCheckpointSubmission(item))
      .filter((item): item is SummerCheckpointSubmission => item !== null),
    nextLesson,
    totalXp: typeof payload.totalXp === "number" ? payload.totalXp : undefined,
    curriculumLocked: payload.curriculum_locked === true,
    curriculumMessage: typeof payload.error === "string" ? payload.error : undefined,
  }
}

export function findNextIncompleteModule(
  modules: SummerModuleProgress[] | undefined,
): SummerModuleProgress | null {
  if (!modules?.length) return null
  const sorted = [...modules]
    .filter((module) => module.is_visible && !isSummerProjectModule(module.title))
    .sort((a, b) => a.sort_order - b.sort_order)
  return sorted.find((module) => !module.is_complete) ?? null
}

export function findFirstCurriculumModule(
  modules: SummerModuleProgress[] | undefined,
): SummerModuleProgress | null {
  if (!modules?.length) return null
  const sorted = [...modules]
    .filter((module) => module.is_visible && !isSummerProjectModule(module.title))
    .sort((a, b) => a.sort_order - b.sort_order)
  return sorted[0] ?? null
}

export function isCurriculumComplete(modules: SummerModuleProgress[] | undefined): boolean {
  const curriculum = (modules ?? []).filter(
    (module) => module.is_visible && !isSummerProjectModule(module.title),
  )
  if (!curriculum.length) return false
  return curriculum.every((module) => module.is_complete)
}

function mapSummerTrainingModule(raw: unknown): SummerModuleProgress | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "number" ? record.id : null
  const title = typeof record.title === "string" ? record.title.trim() : ""
  if (!id || !title) return null
  return {
    id,
    title,
    sort_order: typeof record.sort_order === "number" ? record.sort_order : 0,
    schedule_day: typeof record.schedule_day === "string" ? record.schedule_day : null,
    schedule_day_sort: typeof record.schedule_day_sort === "number" ? record.schedule_day_sort : 0,
    display_number: typeof record.display_number === "number" ? record.display_number : null,
    is_visible: record.is_visible !== false,
    is_complete: record.is_complete === true,
  }
}

function mapSummerTrainingProjectPreview(raw: unknown): SummerTrainingProjectPreview | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const id = typeof record.id === "number" ? record.id : null
  const title = typeof record.title === "string" ? record.title.trim() : ""
  if (!id || !title) return null
  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : undefined
  const kind = typeof metadata?.kind === "string" ? metadata.kind : undefined
  if (kind !== "capstone") return null
  return {
    id,
    title,
    description: typeof record.description === "string" ? record.description : undefined,
    sort_order: typeof record.sort_order === "number" ? record.sort_order : 0,
    is_complete: record.is_complete === true,
    metadata,
    primary_module_id:
      typeof record.primary_module_id === "number"
        ? record.primary_module_id
        : typeof metadata?.primary_module_id === "number"
          ? metadata.primary_module_id
          : undefined,
    xp_reward:
      typeof record.xp_reward === "number"
        ? record.xp_reward
        : typeof metadata?.xp_reward === "number"
          ? metadata.xp_reward
          : undefined,
  }
}

function enrichTrainingCapstoneProjects(
  detail: SummerTrainingDetailResponse,
  campProjectsRaw: unknown[],
): SummerTrainingDetailResponse {
  if (!detail.projects.length || !campProjectsRaw.length) return detail
  const byTitle = new Map<string, SummerProject>()
  for (const raw of campProjectsRaw) {
    const mapped = mapSummerProjectRecord(raw as Record<string, unknown>)
    if (mapped) byTitle.set(mapped.project_title.trim().toLowerCase(), mapped)
  }
  const projects = detail.projects.map((project) => {
    const camp = byTitle.get(project.title.trim().toLowerCase())
    if (!camp) return project
    return {
      ...project,
      primary_module_id: project.primary_module_id ?? camp.module_id,
      xp_reward: project.xp_reward ?? camp.xp_reward,
      is_complete: project.is_complete || camp.is_complete,
    }
  })
  return { ...detail, projects }
}

function normalizeSummerTrainingDetailPayload(payload: Record<string, unknown>): SummerTrainingDetailResponse {
  const trainingRaw = payload.training
  if (!trainingRaw || typeof trainingRaw !== "object") {
    throw new ApiError("Invalid training response", 500, payload)
  }
  const trainingRecord = trainingRaw as Record<string, unknown>
  const trainingId = typeof trainingRecord.id === "number" ? trainingRecord.id : 0

  return {
    training: {
      id: trainingId,
      title: typeof trainingRecord.title === "string" ? trainingRecord.title : "Training",
      description: typeof trainingRecord.description === "string" ? trainingRecord.description : undefined,
      slug: typeof trainingRecord.slug === "string" ? trainingRecord.slug : String(trainingId),
      camp_title: typeof trainingRecord.camp_title === "string" ? trainingRecord.camp_title : undefined,
      camp_slug: typeof trainingRecord.camp_slug === "string" ? trainingRecord.camp_slug : undefined,
    },
    modules: (Array.isArray(payload.modules) ? payload.modules : [])
      .map((item) => mapSummerTrainingModule(item))
      .filter((item): item is SummerModuleProgress => item !== null)
      .sort((a, b) => a.sort_order - b.sort_order),
    projects: (Array.isArray(payload.projects) ? payload.projects : [])
      .map((item) => mapSummerTrainingProjectPreview(item))
      .filter((item): item is SummerTrainingProjectPreview => item !== null)
      .sort((a, b) => a.sort_order - b.sort_order),
    enrolled: payload.enrolled === true,
    preview: payload.preview === true,
    overview:
      typeof payload.overview === "string"
        ? payload.overview
        : typeof payload.meta === "object" &&
            payload.meta !== null &&
            typeof (payload.meta as Record<string, unknown>).overview === "string"
          ? ((payload.meta as Record<string, unknown>).overview as string)
          : undefined,
    faculty: (Array.isArray(payload.faculty) ? payload.faculty : [])
      .map((item) => mapSummerBrowseFaculty(item))
      .filter((item): item is SummerBrowseFaculty => item !== null),
    meta: mapSummerBrowseTrainingMeta(payload.meta),
  }
}

export const summerCampApi = {
  getDashboard: (studentId: string) =>
    summerRequest<SummerDashboard>("/api/summer-camp/dashboard", studentId),

  getMyTrainings: (studentId: string) =>
    summerRequest<{ trainings: SummerTrainingEnrollment[] }>("/api/summer-camp/my-trainings", studentId),

  getBrowseTrainings: async (studentId: string) => {
    const payload = await summerRequest<Record<string, unknown>>("/api/summer-camp/browse-trainings", studentId)
    return normalizeSummerBrowseTrainingsPayload(payload)
  },

  enrollInTraining: (studentId: string, trainingId: number) =>
    summerPostRequest<{ enrollment?: { id: number; status: string }; alreadyEnrolled?: boolean }>(
      "/api/summer-camp/enroll",
      studentId,
      { trainingId },
    ),

  getTrainingDetail: async (studentId: string, trainingId: number) => {
    const [payload, campProjectsPayload] = await Promise.all([
      summerAuthRequest<Record<string, unknown>>(`/api/summer-camp/training/${trainingId}`, studentId),
      summerAuthRequest<{ projects?: unknown[] }>("/api/summer-camp/camp-projects", studentId).catch(() => ({
        projects: [] as unknown[],
      })),
    ])
    const detail = normalizeSummerTrainingDetailPayload(payload)
    return enrichTrainingCapstoneProjects(detail, campProjectsPayload.projects ?? [])
  },

  getRoadmap: (studentId: string) =>
    summerRequest<{ roadmaps: SummerRoadmap[] }>("/api/summer-camp/roadmap", studentId),

  getCheckpoints: (studentId: string) =>
    summerRequest<{ pending: SummerCheckpoint[]; approved: SummerCheckpoint[] }>(
      "/api/summer-camp/checkpoints",
      studentId,
    ),

  getResources: async (studentId: string) => {
    const payload = await summerRequest<{ trainings?: Array<Record<string, unknown>> }>(
      "/api/summer-camp/resources",
      studentId,
    )
    return normalizeSummerResourcesPayload(payload)
  },

  getGallery: async (studentId: string) => {
    const payload = await summerRequest<Record<string, unknown>>("/api/summer-camp/gallery", studentId)
    return normalizeSummerGalleryPayload(payload)
  },

  getGraduation: (studentId: string) => normalizeSummerGraduation(studentId),

  getLeaderboard: (studentId: string, trainingId?: number) => {
    const base = `/api/summer-camp/leaderboard?studentId=${encodeURIComponent(studentId)}`
    const url = `${API_BASE_URL}${base}${trainingId != null ? `&trainingId=${trainingId}` : ""}`
    return fetch(url, { headers: { Accept: "application/json" } }).then(async (response) => {
      const text = await response.text()
      const body = text ? JSON.parse(text) : null
      if (!response.ok) throw new ApiError("Could not load leaderboard", response.status, body)
      const payload = (body ?? {}) as Record<string, unknown>
      const leaderboard = (Array.isArray(payload.leaderboard) ? payload.leaderboard : [])
        .map((item) => mapSummerLeaderboardEntry(item))
        .filter((item): item is SummerLeaderboardEntry => item !== null)
      const currentUserRaw = payload.current_user
      const currentUser =
        currentUserRaw != null ? mapSummerLeaderboardEntry(currentUserRaw) : null
      return {
        trainings: Array.isArray(payload.trainings)
          ? (payload.trainings as Array<{ id: number; title: string }>)
          : [],
        selected_training_id:
          typeof payload.selected_training_id === "number" ? payload.selected_training_id : null,
        leaderboard,
        current_user: currentUser,
        total_xp: typeof payload.total_xp === "number" ? payload.total_xp : currentUser?.total_xp ?? 0,
      }
    })
  },

  getAchievements: async (studentId: string) => {
    const payload = await summerRequest<{ badges?: unknown[] }>("/api/summer-camp/achievements", studentId)
    return {
      badges: (payload.badges ?? [])
        .map((item) => mapSummerBadgeRecord(item))
        .filter((item): item is SummerBadge => item !== null),
    }
  },

  getAnnouncements: (studentId: string) =>
    summerRequest<{ announcements: SummerAnnouncement[] }>("/api/summer-camp/announcements", studentId),

  getDiscussions: async (studentId: string, tab: SummerDiscussionTab = "my_questions") => {
    const payload = await summerAuthRequest<{ discussions?: unknown[] }>(
      "/api/summer-camp/discussions",
      studentId,
      {
        tab: DISCUSSION_TAB_QUERY[tab],
        filter: DISCUSSION_TAB_QUERY[tab],
        view: DISCUSSION_TAB_QUERY[tab],
      },
    )

    let discussions = (payload.discussions ?? [])
      .map((item) => mapSummerDiscussionRecord(item as Record<string, unknown>))
      .filter((item): item is SummerDiscussion => item !== null)

    if (tab === "announcements" && !discussions.length) {
      const announcements = await summerRequest<{ announcements: SummerAnnouncement[] }>(
        "/api/summer-camp/announcements",
        studentId,
      )
      discussions = (announcements.announcements ?? []).map(mapAnnouncementToDiscussion)
    }

    if (tab === "resolved") {
      discussions = discussions.filter((item) => item.is_resolved)
    } else if (tab !== "announcements") {
      discussions = discussions.filter((item) => !item.is_resolved)
    }

    return { discussions, tab }
  },

  getProjects: async (studentId: string) => {
    try {
      const payload = await summerAuthRequest<{ projects?: unknown[] }>(
        "/api/summer-camp/camp-projects",
        studentId,
      )
      const mapped = (payload.projects ?? [])
        .map((item) => mapSummerProjectRecord(item as Record<string, unknown>))
        .filter((item): item is SummerProject => item !== null)
      if (mapped.length) return { projects: mapped }
    } catch (err) {
      if (err instanceof ApiError && err.status !== 404 && err.status !== 405) throw err
    }
    try {
      const payload = await summerRequest<{ projects?: unknown[] }>("/api/summer-camp/projects", studentId)
      const mapped = (payload.projects ?? [])
        .map((item) => mapSummerProjectRecord(item as Record<string, unknown>))
        .filter((item): item is SummerProject => item !== null)
      if (mapped.length) return { projects: mapped }
    } catch (err) {
      if (err instanceof ApiError && err.status !== 404 && err.status !== 405) throw err
    }
    return deriveSummerProjects(studentId)
  },

  getModuleDetail: async (studentId: string, moduleId: number) => {
    try {
      const payload = await summerAuthRequest<Record<string, unknown>>(
        `/api/summer-camp/modules/${moduleId}`,
        studentId,
      )
      return normalizeSummerModuleDetailPayload(payload)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        const body = (err.details ?? {}) as Record<string, unknown>
        if (body.curriculum_locked === true) {
          return normalizeSummerModuleDetailPayload({
            module: {
              id: moduleId,
              title: "Locked module",
              training_id: 0,
              training_slug: "",
              training_title: "",
              sort_order: 0,
            },
            blocks: [],
            progress: [],
            submissions: [],
            nextLesson: null,
            curriculum_locked: true,
            error: typeof body.error === "string" ? body.error : "Complete earlier modules first.",
          })
        }
      }
      throw err
    }
  },

  saveModuleProgress: async (studentId: string, body: SummerSaveProgressPayload) => {
    const url = `${API_BASE_URL}/api/summer-camp/progress?studentId=${encodeURIComponent(studentId)}`
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: await summerAuthHeaders(studentId),
      body: JSON.stringify(body),
    })
    const text = await response.text()
    let payload: unknown = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { error: text }
      }
    }
    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : `Request failed (${response.status})`
      throw new ApiError(message, response.status, payload)
    }
    const record = payload as Record<string, unknown>
    const progressRaw = record.progress
    const progress =
      progressRaw && typeof progressRaw === "object"
        ? mapSummerModuleProgressRecord(progressRaw)
        : null
    return {
      progress: progress ?? { block_id: body.blockId ?? null, progress_type: body.progressType, metadata: body.metadata },
      updated: record.updated === true,
      totalXp: typeof record.totalXp === "number" ? record.totalXp : undefined,
      alreadyComplete: record.alreadyComplete === true,
    } satisfies SummerSaveProgressResult
  },

  submitCheckpoint: async (studentId: string, payload: SummerSubmitCheckpointPayload) => {
    const form = new FormData()
    form.append("file", { uri: payload.uri, name: payload.name, type: payload.mime } as unknown as Blob)
    form.append("moduleId", String(payload.moduleId))
    form.append("blockId", String(payload.blockId))

    const url = `${API_BASE_URL}/api/summer-camp/submissions?studentId=${encodeURIComponent(studentId)}`
    const headers = await summerAuthHeaders(studentId)
    delete headers["Content-Type"]
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: form,
    })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = { error: text }
      }
    }
    if (!response.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : `Upload failed (${response.status})`
      throw new ApiError(message, response.status, body)
    }
    const record = (body ?? {}) as Record<string, unknown>
    const submission = mapSummerCheckpointSubmission(record.submission)
    if (!submission) throw new ApiError("Invalid checkpoint submission response", 500, body)
    return {
      submission,
      totalXp: typeof record.totalXp === "number" ? record.totalXp : undefined,
    } satisfies SummerSubmitCheckpointResult
  },

  voteGalleryEntry: async (studentId: string, entryId: number) => {
    const url = `${API_BASE_URL}/api/summer-camp/gallery/vote`
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: await summerAuthHeaders(studentId),
      body: JSON.stringify({ entryId, studentDatabaseId: studentId }),
    })
    const text = await response.text()
    let body: unknown = null
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = { error: text }
      }
    }
    if (!response.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : `Vote failed (${response.status})`
      throw new ApiError(message, response.status, body)
    }
    return body as { success?: boolean; votes?: number }
  },

  getCertificatePreviewUrl: (studentId: string, certificateId: number) =>
    `${API_BASE_URL}/api/summer-camp/certificates/${certificateId}/preview?studentDatabaseId=${encodeURIComponent(studentId)}`,

  getCertificateDownloadUrl: (studentId: string, certificateId: number) =>
    `${API_BASE_URL}/api/summer-camp/certificates/${certificateId}/download?studentDatabaseId=${encodeURIComponent(studentId)}`,
}
