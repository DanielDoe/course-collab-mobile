import { API_BASE_URL } from "../constants"
import { extractApiErrorMessage } from "./api-error-message"
import { ApiError } from "./api"
import { lectureCreateRequestBody } from "./faculty-lecture-create"
import {
  nextPlaygroundSessionsFetchPage,
  PLAYGROUND_SESSIONS_FETCH_PAGE_SIZE,
} from "./faculty-playground-utils"
import {
  isPlaygroundQuestionsPayloadRejected,
  PLAYGROUND_SNAPSHOT_FALLBACK_MESSAGE,
} from "./faculty-playground-session-questions"
import { syllabusRemoteBody } from "./faculty-syllabus-save"
import { instructorInstitutionHeaders } from "./instructor-institution-headers"
import { reportMobileApiError } from "./system-log-client"
import type { AssessmentAttemptResults } from "./assessment-results-api"
import type { ForumReply, ForumThread } from "./collaboration-api"
import type { ProgressReview } from "./course-info-api"
import type { SectionConfig } from "./faculty-assessment-sections"
import type { ProgressReviewBatchPayload, ProgressReviewBatchResult } from "./progress-review-utils"
import type {
  ReportDateRange,
  SavedInstructorReport,
  StudentIndividualReportPayload,
  StudentReportSearchHit} from "./instructor-reports-utils"
import { normalizeSavedReport } from "./instructor-reports-utils"
import { assertProductionHttpsUrl, createApiAbortSignal, noteApiFailure } from "./http"
import { observeHttpResponse } from "./perf/http"
import { mfaTrustRequestHeadersForInstructor } from "./mfa-device-trust"
import { getStoredSession } from "./session"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { assessmentResultSectionHints, evaluationRowBelongsToCourse } from "./course-sections"
import { headersHaveStudentSessionProof, STUDENT_REFRESH_HEADER } from "./student-session-proof"
import { getStoredRefreshToken } from "./refresh-token-store"
import type { InstructorCalendarPayload, InstructorCalendarView } from "./instructor-calendar"

export type InstructorCourse = {
  id: number
  course_code: string
  course_title: string
  university?: string | null
  semester?: string | null
  staff_role?: string
  is_active_term?: boolean
  term_label?: string | null
  academic_term_id?: number | null
  description?: string | null
  exchange_provenance?: Record<string, unknown> | null
  /** Picker-only metadata when the active term lists sections separately. */
  picker_key?: string
  picker_display_title?: string
  picker_display_subtitle?: string
  picker_is_section_row?: boolean
  session_id?: number | null
  session_code?: string | null
}

export type InstructorProfile = {
  id: number
  username: string
  email: string
  name: string
  created_at?: string
  last_login?: string | null
}

export type InstructorDashboardStats = {
  totalQuizzes: number
  activeQuizzes: number
  totalStudents: number
  totalAttempts: number
  pendingIssues: number
  upcomingAssessments: number
  recentSubmissions24h: number
}

export const EMPTY_INSTRUCTOR_DASHBOARD_STATS: InstructorDashboardStats = {
  totalQuizzes: 0,
  activeQuizzes: 0,
  totalStudents: 0,
  totalAttempts: 0,
  pendingIssues: 0,
  upcomingAssessments: 0,
  recentSubmissions24h: 0,
}

export type InstructorRecentActivity = {
  id: string
  attempt_id?: number
  type?: string
  title: string
  message: string
  student_name?: string
  status?: string
  percentage?: number
  score?: number
  assessment_type?: string
  created_at?: string
  timestamp?: string
}

export type InstructorReportMeta = {
  type: string
  totalReports?: number
  generatedAt?: string
}

export type InstructorReportsResponse = {
  reports: InstructorReportMeta[]
  filters?: { type?: string; startDate?: string | null; endDate?: string | null }
  generatedAt?: string
}

export type InstructorProgressReviewRow = {
  id: number
  studentId: number
  reviewPeriod: string
  asOfDate?: string | null
  fullName: string
  email?: string
  section?: string
  modelUsed?: string
  emailSentAt?: string | null
  createdAt?: string
}

export type InstructorProgressReviewsResponse = {
  success?: boolean
  reviewPeriod?: string
  savedReviewCount?: number
  enrolledStudentCount?: number
  missingReviewCount?: number
  reviews: InstructorProgressReviewRow[]
  studentCount?: number
}

export type InstructorAnnouncementAttachment = {
  name: string
  url: string
  type: string
}

export type InstructorAnnouncement = {
  id: number
  title: string
  content: string
  type?: string
  priority?: string
  target_session?: string
  created_at: string
  updated_at?: string
  expires_at?: string | null
  is_active?: boolean
  read_count?: number
  ai_summary?: string | null
  pinned?: boolean
  views_count?: number
  comments_count?: number
  author_name?: string
  attachments?: InstructorAnnouncementAttachment[]
  event_date?: string | null
  event_time?: string | null
  event_end?: string | null
  event_location?: string | null
}

function normalizeInstructorAnnouncement(raw: Record<string, unknown>): InstructorAnnouncement {
  const viewsRaw = raw.views_count ?? raw.read_count
  const views =
    typeof viewsRaw === "string" ? Number(viewsRaw) : typeof viewsRaw === "number" ? viewsRaw : undefined

  return {
    id: Number(raw.id),
    title: String(raw.title ?? ""),
    content: String(raw.content ?? ""),
    type: typeof raw.type === "string" ? raw.type : undefined,
    priority:
      typeof raw.priority === "string"
        ? raw.priority
        : raw.pinned === true
          ? "high"
          : undefined,
    target_session: typeof raw.target_session === "string" ? raw.target_session : "all",
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
    expires_at:
      raw.expires_at === null || typeof raw.expires_at === "string" ? (raw.expires_at as string | null) : undefined,
    is_active: raw.is_active !== false,
    read_count: Number.isFinite(views) ? views : undefined,
    ai_summary: typeof raw.ai_summary === "string" ? raw.ai_summary : null,
    pinned: raw.pinned === true,
    views_count: Number.isFinite(views) ? views : undefined,
    comments_count:
      typeof raw.comments_count === "string"
        ? Number(raw.comments_count)
        : typeof raw.comments_count === "number"
          ? raw.comments_count
          : undefined,
    author_name: typeof raw.author_name === "string" ? raw.author_name : undefined,
    attachments: Array.isArray(raw.attachments)
      ? (raw.attachments as InstructorAnnouncementAttachment[])
      : undefined,
    event_date:
      typeof raw.event_date === "string"
        ? raw.event_date
        : typeof raw.eventDate === "string"
          ? raw.eventDate
          : null,
    event_time: typeof raw.event_time === "string" ? raw.event_time : typeof raw.eventTime === "string" ? raw.eventTime : null,
    event_end: typeof raw.event_end === "string" ? raw.event_end : typeof raw.eventEnd === "string" ? raw.eventEnd : null,
    event_location:
      typeof raw.event_location === "string"
        ? raw.event_location
        : typeof raw.eventLocation === "string"
          ? raw.eventLocation
          : null,
  }
}

export type InstructorNotification = {
  id: number
  type: string
  title: string
  message: string
  link?: string | null
  is_read: boolean
  created_at: string
  read_at?: string | null
  source_type?: string | null
  source_id?: string | null
  source_name?: string | null
  ai_summary?: string | null
}

export type ClassroomPointRow = {
  id: number
  student_id: number
  student_name?: string
  student_number?: string
  points: number | string
  reason: string
  category?: string
  status?: string
  session?: string
  created_at: string
  awarded_at?: string | null
  submission_id?: number | null
  submission_title?: string | null
  instructor_name?: string
  isDuplicate?: boolean
  duplicateOf?: number | null
  highestInGroup?: boolean
  highestScoreInGroup?: number
  ai_suspicion?: boolean | null
  authenticity_score?: number | null
  ai_likelihood?: number | null
  authorship_reasoning?: string | null
  flagged_features?: string[] | null
  code?: string | null
  plot_image?: string | null
  solution_answer_json?: unknown
  assignment_question_config?: unknown
  point_booster?: number | null
}

export type ClassroomPointsSummaryRow = {
  student_id: number
  student_number: string
  full_name: string
  session: string
  total_points: number | string
  award_count: number
  last_awarded: string | null
}

export type ClassroomPointAssignment = {
  id: number
  title: string
  description?: string | null
  created_at: string
  session?: string
  duration_hours?: number | null
  due_at?: string | null
  expires_at?: string | null
  submission_kind?: "code" | "solution" | string
  is_active?: boolean
  question_config?: unknown
  assignment_question_config?: unknown
  created_by?: number | null
}

export type CreateClassroomPointAssignmentPayload = {
  title: string
  description?: string | null
  session?: string | null
  submissionKind: "code" | "solution"
  dueAt?: string | null
  durationHours?: number | null
  questionConfig?: Record<string, unknown> | null
}

export type CreateQuizFromBankPayload = {
  title: string
  description?: string | null
  question_ids: number[]
  assessment_type?: string
  time_limit?: number
  custom_time_limits?: Record<number, number>
  available_from?: string | null
  available_until?: string | null
}

export type PracticePointRow = {
  id: number
  student_id: number
  student_name?: string
  student_number?: string
  points: number | string
  reason: string
  session?: string
  created_at: string
  practice_problem?: string | null
  status?: string
}

export type AttendanceRosterStudent = {
  studentId: number
  fullName: string
  studentNumber: string
  section: string
}

export type AttendanceSession = {
  id: number
  section: string
  class_title?: string | null
  start_time?: string | null
  end_time?: string | null
  is_active?: boolean
  is_cancelled?: boolean
  total_attended?: number | string | null
  fallback_code?: string | null
  qr_expires_at?: string | null
}

export type AttendanceRecord = {
  id: number
  studentId: number
  studentName: string
  studentNumber: string
  section: string
  status: string
  geoVerified?: boolean | null
  pointsEarned?: number
  timestamp: string
  sessionId?: number
  classTitle?: string
  startTime?: string
}

export type AttendanceStudentSummary = {
  id: number
  full_name: string
  student_id: string
  attendance_percentage?: number | null
  total_classes?: number
  credits_earned?: number
  absent_count?: number
  excused_count?: number
  current_streak?: number
}

export type AttendanceAnalytics = {
  overall?: {
    total_sessions?: number
    unique_students?: number
    total_check_ins?: number
    average_attendance_rate?: number
    geo_verification_rate?: number
  }
  flaggedStudents?: AttendanceStudentSummary[]
  topPerformers?: AttendanceStudentSummary[]
  chronicAbsentees?: AttendanceStudentSummary[]
  excusedStudents?: AttendanceStudentSummary[]
  studentSummaries?: AttendanceStudentSummary[]
  weeklyTrend?: { week: string; attendance_rate: number; check_ins: number }[]
  sessionBreakdown?: {
    start_time: string
    class_title?: string
    attendance_percentage?: number
  }[]
  statusBreakdown?: { status: string; count: number }[]
}

export type InstructorQuiz = {
  id: number
  title: string
  description?: string
  is_active: boolean
  is_public?: boolean
  available_from?: string | null
  available_until?: string | null
  question_count?: number
  total_attempts?: number
  session_access?: Record<string, boolean>
  time_per_question?: number
  created_at?: string
}

export type InstructorQuizQuestion = {
  id: number
  question_text: string
  question_type: string
  question_order?: number
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  option_e?: string | null
  correct_answer?: string | null
  max_points?: number
  points?: number
  hint?: string | null
  hint_penalty?: number
  question_media?: unknown
  solution_upload_config?: unknown
  circuit_spec?: unknown
  subquestions?: unknown
  time_limit?: number | null
  ai_code_language?: string | null
  anti_cheat_exempt?: boolean
  bank_question_id?: number | null
}

export type InstructorQuizDetail = InstructorQuiz & {
  coverage?: string | null
  retake_enabled?: boolean
  retake_limit?: number
  retake_policy?: string
  review_before_retake?: boolean
  forfeit_retake_on_report_view?: boolean
  lock_student_results_review?: boolean
  strict_mode_enabled?: boolean
  block_copy_paste?: boolean
  track_tab_switches?: boolean
  track_mouse_movement?: boolean
  warn_on_tab_switch?: boolean
  max_tab_switches?: number
  auto_submit_on_violations?: boolean
  track_gemini_window?: boolean
  max_gemini_strikes?: number
  keystroke_playback_enforced?: boolean
  require_fullscreen?: boolean
  geo_required?: boolean
  geo_lat?: number | null
  geo_lng?: number | null
  geo_radius_meters?: number
  rollover_enabled?: boolean
  rollover_hours?: number
  ai_evaluation_mode?: string
  ai_model?: string
  ai_enable_opus_fallback?: boolean
  ai_opus_confidence_threshold?: number
  allowed_ai_code_languages?: string[]
  enable_superpowers?: boolean
  allowed_superpowers?: string[]
  restrict_access_to_students?: boolean
  allowed_student_ids?: number[] | string | null
  access_restriction_session_id?: number | null
  max_concurrent_students?: number | null
  section_config?: SectionConfig[] | unknown
  counts_toward_course_grade?: boolean
  assessment_type?: string
  questions?: InstructorQuizQuestion[]
}

export type QuizUpdatePayload = Record<string, unknown>

export type InstructorBankQuestion = {
  id: number
  question_text: string
  question_type: string
  difficulty: string
  topic: string | null
  hint?: string | null
  explanation?: string | null
  sample_answer?: string | null
  expected_answer?: string | null
  evaluation_mode?: string | null
  options?: unknown
  correct_answer?: unknown
  answer_guidelines?: unknown
  subquestions?: unknown
  solution_upload_config?: unknown
  option_count?: number
  quiz_usage_count?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  deleted_by?: string | null
  question_media?: unknown
}

export type QuestionBankSavePayload = {
  question_text: string
  question_type: string
  difficulty?: string
  topic?: string | null
  hint?: string | null
  explanation?: string | null
  sample_answer?: string | null
  expected_answer?: string | null
  evaluation_mode?: string
  options?: unknown[]
  correct_answer?: unknown
  answer_guidelines?: string[]
  question_media?: unknown
  subquestions?: unknown
  solution_upload_config?: unknown
}

export type InstructorBankTopic = {
  id: number
  name: string
  description?: string | null
  question_count: number
  created_at?: string
}

export type InstructorAttemptOverride = {
  id: number
  student_id: number
  student_name: string
  student_code: string
  additional_attempts: number
  reason: string | null
  expires_at: string | null
  granted_at: string
  is_active: boolean
}

export type InstructorRolloverGrant = {
  studentId: number
  fullName: string
  studentNumber: string
  section: string | null
  appliedAt: string
  expiresAt: string
  isActive: boolean
  source: "points" | "instructor"
  hasRetakeOverride: boolean
  retakeAttempts: number
}

export type InstructorQuestionTimeSetting = {
  id: number
  question_type: string
  assessment_type: string
  time_limit: number
  description: string
  updated_at?: string
}

export type InstructorDeletedAssessment = {
  id: number
  title: string
  description?: string | null
  total_questions?: number
  question_count?: number
  time_limit_minutes?: number
  assessment_type?: string
  deleted_at: string
  deleted_by?: string | null
}

export type InstructorSession = {
  id: number
  code: string
  description?: string | null
  student_count?: number
  academic_term_id?: number | null
  created_at?: string
}

export type InstructorAcademicTerm = {
  id: number
  year: number
  term: string
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  created_at?: string
  session_count?: number
  total_students?: number
  course_count?: number
  courses?: Array<{ id: number; course_code: string; course_title: string }>
}

export type AcademicTermPayload = {
  year: number
  term: string
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

export type SessionPayload = {
  code: string
  description?: string | null
  academic_term_id: number
}

export type SyllabusSection = {
  sectionId: string
  title: string
  order: number
  type: string
  content: {
    markdown?: string
    fields?: Record<string, string>
    items?: string[]
    columns?: string[]
    rows?: string[][]
    tables?: Array<{ title?: string; columns: string[]; rows: string[][] }>
    imageUrl?: string
    imageCaption?: string
    imageFileName?: string
  }
  isRequired: boolean
  isVisible: boolean
  isEditable: boolean
}

export type InstructorSyllabus = {
  id: number
  courseId?: number
  title: string
  term: string
  status: "draft" | "published"
  contentMode: "structured" | "pdf"
  pdfUrl?: string | null
  sections: SyllabusSection[]
  publishedAt?: string | null
  updatedAt?: string
}

export type InstructorLecture = {
  id: number
  title: string
  week: number
  description?: string | null
  objectives?: unknown
  slides?: unknown
  is_published?: boolean
  is_active?: boolean
  session_access?: Record<string, boolean> | string[] | null
  created_at?: string
  updated_at?: string
  students_viewed?: number
  document_url?: string | null
  pdf_url?: string | null
  original_file_url?: string | null
  original_file_type?: string | null
  content_mode?: string | null
  allow_download?: boolean
  materials_url?: string | null
}

export type PracticeTopic = {
  name: string
  question_count: number
  availability: Record<
    string,
    { is_available: boolean; daily_limit: number; updated_at?: string }
  >
}

export type PracticeTopicQuestion = {
  id: number
  questionText: string
  questionType?: string
  difficulty?: string
  topic?: string
  options?: string[]
  optionCount?: number
  hint?: string | null
  isAvailable: boolean
}

export type PracticeStudentProgress = {
  student_id: number
  full_name?: string
  student_name?: string
  student_number?: string
  session?: string
  student_section?: string
  total_questions?: number
  total_attempts?: number
  correct_answers?: number
  total_correct?: number
  accuracy?: number
  avg_score?: number
  streak?: number
  last_practiced?: string | null
  topics_practiced?: string[]
}

export type PracticeActivityItem = {
  student_name: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timestamp: string
  topics: string[]
}

export type PracticeAnalytics = {
  overview?: {
    totalStudents?: number
    totalAttempts?: number
    avgScore?: number
    availableTopics?: number
    activeStudents?: number
    totalQuestions?: number
    avgAccuracy?: number
  }
  topicPerformance?: Array<{
    topic: string
    attempts: number
    avgScore?: number
    accuracy?: number
    uniqueStudents?: number
  }>
  recentActivity?: PracticeActivityItem[]
  dailyTrends?: Array<{ date: string; attempts: number; avgScore: number }>
  practiceBankAvailable?: boolean
  courseCode?: string
}

export type PracticeStudentReport = {
  student: { id: number; name: string; email?: string; section?: string }
  overallStats: {
    totalAttempts: number
    totalQuestions: number
    totalCorrect: number
    avgScore: number
    accuracy: number
  }
  leaderboard?: {
    rank: number
    xp: number
    level: number
    totalQuestionsAttempted: number
    totalCorrect: number
    accuracy: number
  } | null
  attempts: Array<{
    id: number
    topics: string[]
    difficulty?: string
    total_questions: number
    correct_answers: number
    score_percentage: number
    started_at: string
    completed_at?: string
    time_spent_seconds?: number
  }>
  topicPerformance: Array<{
    topic: string
    total_questions: number
    correct_answers: number
    accuracy: number
  }>
  answers?: Array<{
    id: number
    attempt_id: number
    question_id: number
    student_answer?: string | null
    is_correct: boolean
    response_time_seconds?: number
    answered_at?: string
    question?: {
      text?: string
      type?: string
      topic?: string
      difficulty?: string
      correct_answer?: string
      options?: { a?: string; b?: string; c?: string; d?: string; e?: string }
      hint?: string | null
    }
  }>
}

export type InstructorProject = {
  id: number
  title: string
  summary?: string | null
  deliverables?: string | null
  timeline?: string | null
  status: string
  rejection_reason?: string | null
  project_link?: string | null
  target_platform?: string | null
  created_at?: string
  updated_at?: string
  group?: { id: number; name: string; session?: string; status?: string }
  leader?: { id: number; full_name: string; student_id?: string }
  members?: Array<{ id: number; full_name: string; student_id?: string }>
}

export type ProjectLeaderboardEntry = {
  rank: number
  id: number
  title: string
  summary?: string
  platform?: string
  projectLink?: string | null
  timeline?: string
  session: string
  createdAt?: string
  engagementScore?: number
  totalScore?: number
  studentPoints?: number
  instructorPoints?: number
  voteCount?: number
  likeCount?: number
  commentCount?: number
  groupName: string
  leaderName: string
  leaderStudentId?: string
}

export type ProjectLeaderboardStats = {
  totalProjects: number
  totalVotes: number
  totalLikes: number
  totalComments: number
  avgEngagement?: number
  maxEngagement?: number
}

export type ProjectLeaderboardResponse = {
  leaderboard: ProjectLeaderboardEntry[]
  stats?: ProjectLeaderboardStats
}

export type ProjectRatingDistributionItem = {
  rating: number
  voterType: "student" | "instructor" | string
  count: number
}

export type ProjectVoteScoreBreakdown = {
  projectId: number
  score: {
    studentVotes: number
    instructorVotes: number
    studentAvgRating: number
    instructorAvgRating: number
    studentPoints: number
    instructorPoints: number
    totalScore: number
    lastUpdated?: string
  }
  ratingDistribution: ProjectRatingDistributionItem[]
}

export type ProjectPresentation = {
  id: number
  project_id: number
  group_id: number
  scheduled_date: string
  start_time: string
  end_time: string
  location: string
  notes?: string | null
  status: string
  attendance_taken?: boolean
  instructor_notes?: string | null
  project_title: string
  group_name: string
  session: string
  created_by_name?: string | null
}

export type PresentationConfig = {
  id: number
  session: string
  presentation_start_date: string
  presentation_end_date: string
  lecture_days: string[]
  start_time: string
  end_time: string
  slot_duration: number
  location: string
  is_active: boolean
  schedule_by_day?: Record<string, unknown> | null
}

export type ProjectVoteTotalsRow = {
  studentVotes: number
  instructorVotes: number
  studentAvgRating: number
  instructorAvgRating: number
  studentPoints: number
  instructorPoints: number
  totalScore: number
}

export type ProjectMemberScoreOverride = {
  project_id: number
  student_id: number
  score_0_50: number
  notes?: string | null
  updated_at?: string
}

export type InstructorGroup = {
  id: number
  name: string
  session: string
  created_by?: number
  leader_name: string
  member_count: number
  status: "pending" | "approved" | "rejected" | "pending_update" | string
  deleted_at?: string | null
  pending_changes?: {
    name?: string
    addMembers?: number[]
    removeMembers?: number[]
  }
  members?: Array<{
    id: number
    student_id: string
    full_name: string
    joined_at?: string
  }>
}

export type PlaygroundBankQuestion = {
  id: number
  questionText: string
  questionType?: string
  difficulty?: string
  topic?: string
  options?: string[]
  optionCount?: number
}

export type PlaygroundTopic = {
  topic: string
  question_count: number
}

export type PlaygroundSessionCreateResult = {
  sessionId?: number
  sessionCode?: string
  joinPasscode?: string
  durationSec?: number
  questionCount?: number
  gameStarted?: boolean
}

function normalizePlaygroundTopic(raw: Record<string, unknown>): PlaygroundTopic {
  return {
    topic: String(raw.name ?? raw.topic ?? ""),
    question_count: Number(raw.questionCount ?? raw.question_count ?? 0)}
}

function normalizePlaygroundBankQuestion(raw: Record<string, unknown>): PlaygroundBankQuestion {
  return {
    id: Number(raw.id ?? 0),
    questionText: String(raw.questionText ?? raw.question_text ?? ""),
    questionType: String(raw.questionType ?? raw.question_type ?? "") || undefined,
    difficulty: String(raw.difficulty ?? "") || undefined,
    topic: String(raw.topic ?? "") || undefined,
    options: Array.isArray(raw.options) ? raw.options.map(String) : undefined,
    optionCount: Number(raw.optionCount ?? raw.option_count ?? 0) || undefined}
}

function normalizePracticeTopicQuestion(raw: Record<string, unknown>): PracticeTopicQuestion {
  return {
    id: Number(raw.id ?? 0),
    questionText: String(raw.questionText ?? raw.question_text ?? ""),
    questionType: String(raw.questionType ?? raw.question_type ?? "") || undefined,
    difficulty: String(raw.difficulty ?? "") || undefined,
    topic: String(raw.topic ?? "") || undefined,
    options: Array.isArray(raw.options) ? raw.options.map(String) : undefined,
    optionCount: Number(raw.optionCount ?? raw.option_count ?? 0) || undefined,
    hint: raw.hint != null ? String(raw.hint) : null,
    isAvailable: !(raw.isAvailable === false || raw.is_available === false)}
}

export type SummerCampTrainingDetail = SummerCampTraining & {
  module_count?: number
  submission_count?: number
  pending_submission_count?: number
  project_count?: number
  open_discussion_count?: number
}

export type SummerCampProgram = {
  id: number
  title: string
  slug?: string
  description?: string | null
  status: string
  start_date?: string | null
  end_date?: string | null
  training_count?: number
  enrollment_count?: number
  is_owner?: boolean
}

export type SummerCampTraining = {
  id: number
  camp_id: number
  title: string
  slug?: string
  description?: string | null
  status: string
  camp_title?: string
  enrollment_count?: number
  sort_order?: number
}

export type PlaygroundSession = {
  id: number
  session_code: string
  is_active: boolean
  game_started: boolean
  join_passcode?: string | null
  participant_count?: number
  waiting_count?: number
  question_count?: number
  question_count_actual?: number
  current_question_index?: number
  duration_sec?: number
  selected_topics?: string[] | null
  allowed_sessions?: string[] | null
  created_at?: string
  ended_at?: string | null
  lobby_opened_at?: string | null
  game_started_at?: string | null
}

export type PlaygroundLeaderboardEntry = {
  rank: number | null
  resultId: number
  studentId: string
  studentName: string
  displayName: string
  nickname: string | null
  score: number
  questionsAnswered: number
  correctAnswers: number
  accuracyPercentage: number
  completedAt: string | null
  sessionCode: string | null
  sessionsPlayed: number
  status: "waiting" | "playing" | "completed"
  joinedAtQuestion: number
}

export type PlaygroundLeaderboardStats = {
  totalSessions: number
  uniqueStudents: number
  totalAttempts: number
  activeParticipants: number
  waitingParticipants: number
  avgScore: number
  maxScore: number
  avgAccuracy: number
}

export type PlaygroundSessionQuestion = {
  id: number
  bankQuestionId: number
  questionOrder: number
  questionText: string
  questionType: string
  difficulty: string
  topic: string
  options: string[]
  correctAnswer: string
  explanation: string | null
}

export type OfficeHourRequest = {
  id: number
  full_name: string
  student_code?: string
  email?: string
  topic: string
  description?: string
  status: string
  priority?: string
  scheduled_date?: string | null
  created_at: string
  preferredDates?: string[]
}

export type RegularOfficeHourSlot = {
  id: number
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
  semesterLabel?: string
  courseId?: number | null
}

export type RegularOfficeHourDraft = {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type InstructorIssue = {
  id: number
  quiz_title?: string
  question_number?: number
  description: string
  status: string
  student_name?: string
  created_at: string
  comment_count?: number
}

export type InstructorIssueComment = {
  id: number
  issue_id: number
  commenter_name: string
  commenter_id: string
  commenter_role: string
  comment_text: string
  created_at: string
}

export type InstructorStudent = {
  id: number
  student_id: string
  full_name: string
  email?: string
  section?: string
  session_code?: string
  session_description?: string
  created_at?: string
  quiz_attempts?: number
}

export type InstructorPasswordResetRequest = {
  id: number
  student_id: number
  status: string
  requested_at: string
  reviewed_at?: string | null
  admin_notes?: string | null
  student_number?: string
  full_name: string
  section?: string
  email?: string
  is_platform_guest?: boolean
}

export type InstructorAccountRequest = {
  id: number
  full_name: string
  student_id: string
  section?: string
  email?: string
  status: string
  created_at: string
  request_kind?: string
  account_type?: string | null
  guest_purpose?: string | null
  guest_purpose_detail?: string | null
  organization?: string | null
  school_affiliation?: string | null
  university_id?: number | null
  course_id?: number | null
  session_id?: number | null
  camp_id?: number | null
  camp_name?: string | null
  sponsoring_faculty_id?: number | null
  invitation_id?: number | null
  email_verified_at?: string | null
  approval_source?: string | null
  metadata?: Record<string, unknown> | null
  approved_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
}

export type RecommendationGuestAccountRequest = {
  id: number
  full_name: string
  student_id: string
  section: string
  email: string
  status: string
  created_at?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  request_kind?: string | null
  guest_purpose?: string | null
  guest_purpose_detail?: string | null
  organization?: string | null
  matching_student_found?: boolean
  rec_letter_total?: number
  rec_letter_completed?: number
  rec_pipeline?: number
  rec_pending_your_review?: number
  rec_awaiting_student?: number
  last_request_submitted_at?: string | null
  last_request_updated_at?: string | null
  newest_deadline?: string | null
}

export type InstructorAssessmentResult = {
  attempt_id: number
  assessment_id: number
  student_name: string
  student_id: string
  section?: string
  assessment_title?: string
  quiz_title?: string
  score?: number
  percentage?: number
  total_questions?: number
  total_possible_points?: number
  correct_answers?: string
  attempt_number?: number
  is_final_grade?: boolean
  is_flagged?: boolean
  is_in_progress?: boolean
  assessment_type?: string
  completed_at?: string
  started_at?: string
  results_finalized?: boolean
}

export type InstructorAssessmentResultSummary = {
  attempt_id: number
  quiz_id?: number
  student_id: number
  student_number?: string
  student_name?: string
  section?: string
  quiz_title?: string
  assessment_title?: string
  assessment_type?: string
  score?: number | string
  percentage?: number
  total_questions?: number
  completed_at?: string
  time_taken_seconds?: number
}

export type InstructorRecommendationRequest = {
  id: number
  student_id: number
  instructor_id?: number
  course_id?: number
  purpose: string
  purpose_other_detail?: string | null
  recipient_name?: string | null
  recipient_organization?: string | null
  recipient_address?: string | null
  letter_is_specific?: boolean
  deadline?: string | null
  status: string
  rejection_reason?: string | null
  info_request_note?: string | null
  final_letter_text?: string | null
  instructor_locked?: boolean
  semester_key?: string | null
  student_request_description?: string | null
  student_name?: string
  student_full_name?: string
  student_email?: string
  student_external_id?: string
  course_code?: string
  course_description?: string
  latest_pdf_url?: string | null
  latest_download_at?: string | null
  created_at?: string
  updated_at?: string
}

export type RecommendationProfile = {
  student_strengths?: string | null
  achievements?: string | null
  projects?: string | null
  skills?: string | null
  leadership_examples?: string | null
  goals?: string | null
  class_experience?: string | null
  personal_qualities?: string | null
  letter_for?: string | null
  special_instructions?: string | null
  content_mode?: string | null
  tone?: string | null
}

export type RecommendationDraft = {
  id: number
  version_label?: string | null
  letter_text?: string | null
  selected?: boolean
  ai_model?: string | null
  created_at?: string
}

export type RecommendationAuditEntry = {
  id: number
  action: string
  created_at: string
  actor_type?: string
  details?: unknown
}

export type RecommendationAttachment = {
  id: number
  file_type?: string
  file_name?: string
  file_url?: string
}

export type InstructorRecommendationDetail = {
  request: InstructorRecommendationRequest
  settings?: Record<string, unknown> | null
  profile: RecommendationProfile | null
  drafts: RecommendationDraft[]
  files?: Array<{ id?: number; file_url?: string; created_at?: string }>
  attachments?: RecommendationAttachment[]
  audit?: RecommendationAuditEntry[]
}

export type RecommendationPatchAction =
  | "approve"
  | "reject"
  | "request_info"
  | "request_student_revision"
  | "update_final_text"
  | "finalize"
  | "notify_student_letter_ready"
  | "lock"
  | "unlock"

export type SummerCampCamper = {
  id: number
  student_id: string
  full_name: string
  email?: string
  enrollments?: number
}

export type SummerCampRequest = {
  id: number
  full_name: string
  student_id: string
  email?: string
  school_affiliation?: string | null
  organization?: string | null
  request_kind?: string
  status: string
  created_at: string
}

export type TradeCenterTrader = {
  id: number
  full_name: string
  student_number?: string
  section?: string
  engagement_credits?: number
  total_points?: number
  total_trades_count?: number
  total_donations_count?: number
}

export type TradeCenterAnalytics = {
  stats: {
    total_students?: number
    total_ec_earned?: number
    avg_ec_per_student?: number
    total_points_earned?: number
    avg_points_per_student?: number
    students_at_cap?: number
  }
  topTraders?: TradeCenterTrader[]
  transactions?: Array<Record<string, unknown>>
  sessionBreakdown?: Array<Record<string, unknown>>
  lowEngagement?: TradeCenterTrader[]
  tradesOverTime?: Array<Record<string, unknown>>
  weekStartDate?: string
  calendarWeekStart?: string
  usedFallbackWeek?: boolean
}

export type TradeCenterConfig = import("./faculty-trade-center-utils").TradeCenterConfig

export type TradeCenterRequestRow = Record<string, unknown>

export type TradeCenterTradeLog = {
  transactions?: TradeCenterRequestRow[]
  rollovers?: TradeCenterRequestRow[]
  donationRequests?: TradeCenterRequestRow[]
  pointRequests?: TradeCenterRequestRow[]
}

export type TradeCenterRolloverTrade = {
  id: number
  studentId?: number
  student_id?: number
  studentName?: string
  student_name?: string
  full_name?: string
  studentNumber?: string
  student_number?: string
  section?: string
  membershipTier?: string
  membership_tier?: string
  quizId?: number
  quiz_id?: number
  quizTitle?: string
  quiz_title?: string
  assessmentType?: string
  assessment_type?: string
  sourceCategory?: string | null
  source_category?: string | null
  sourceLabel?: string
  source_label?: string
  pointsTraded?: number
  points_traded?: number
  points?: number
  hours?: number
  appliedAt?: string | null
  applied_at?: string | null
  expiresAt?: string | null
  expires_at?: string | null
  isActive?: boolean
  is_active?: boolean
}

export type TradeCenterRolloverResponse = {
  trades: TradeCenterRolloverTrade[]
  total: number
  page: number
  limit: number
  totalPages: number
  sessions: string[]
}

export type FacultyCourseEvaluationProof = {
  id: number
  url: string
  file_name?: string
  mime?: string
  uploaded_at?: string
}

export type FacultyCourseEvaluationRow = {
  id: number
  student_id: number
  full_name: string
  student_code: string
  section: string
  session?: string
  course_rating: number
  improvement_suggestions: string
  platform_helpfulness?: number | null
  favorite_features?: string[] | null
  favorite_features_other?: string | null
  feature_to_improve?: string | null
  feature_to_improve_other?: string | null
  instructor_clarity?: number | null
  workload?: string | null
  ai_tutor_usage?: string | null
  nps_score?: number | null
  missing_features?: string | null
  self_assessed_letter_grade?: string | null
  actual_letter_grade?: string | null
  actual_total_score?: number | null
  status: string
  submitted_at?: string
  proof_count?: number
  instructor_note?: string | null
  reviewed_by?: number | null
  reviewed_at?: string | null
  proofs?: FacultyCourseEvaluationProof[]
}

export type FacultyCourseEvaluationAnalytics = {
  totals: { all: number; pending: number; approved: number; rejected: number }
  averages: {
    overallExperience: number | null
    platformHelpfulness: number | null
    instructorClarity: number | null
    nps: number | null
  }
  nps: {
    responses: number
    score: number | null
    promoters: number
    passives: number
    detractors: number
  }
  favoriteFeatureCounts: Array<{ feature: string; count: number }>
  improveFeatureCounts: Array<{ feature: string; count: number }>
  workloadCounts: Array<{ label: string; count: number }>
  aiTutorUsageCounts: Array<{ label: string; count: number }>
  passGoalCounts: Array<{ grade: string; count: number }>
  passGoalMismatchCount: number
  approvalRate: number | null
}

function normalizeFacultyEvaluationRow(raw: Record<string, unknown>): FacultyCourseEvaluationRow {
  let favoriteFeatures: string[] = []
  const ff = raw.favorite_features
  if (Array.isArray(ff)) favoriteFeatures = ff.map(String)
  else if (typeof ff === "string" && ff.trim()) {
    try {
      const parsed = JSON.parse(ff) as unknown
      if (Array.isArray(parsed)) favoriteFeatures = parsed.map(String)
    } catch {
      favoriteFeatures = []
    }
  }

  return {
    ...(raw as FacultyCourseEvaluationRow),
    favorite_features: favoriteFeatures,
  }
}

export type InstructorScope = {
  instructorId: number
  courseId?: number
  sessionId?: number | null
  sessionCode?: string | null
  academicTermId?: number | null
  /** Faculty session `universityId`. Not a second course-context system. */
  institutionId?: number | null
}

type Scope = InstructorScope

function refreshTokenFromCookieHeader(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined
  const match = cookie.match(/(?:^|;\s*)cc_refresh=([^;]+)/i)
  const token = match?.[1]?.trim()
  return token || undefined
}

/** Same session-proof headers as instructorRequest, without fetching. */
export async function instructorAuthenticatedHeaders(
  scope: { instructorId: number; courseId?: number },
  init?: { requireAuthHeader?: boolean; omitCourseId?: boolean; headers?: Record<string, string> },
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-instructor-id": String(scope.instructorId),
    ...(init?.headers)}
  if (scope.courseId != null && !init?.omitCourseId) {
    headers["x-course-id"] = String(scope.courseId)
  }
  const scoped = scope as InstructorScope
  if (scoped.sessionId != null && scoped.sessionId > 0) {
    headers["x-session-id"] = String(scoped.sessionId)
  }
  if (scoped.academicTermId != null && scoped.academicTermId > 0) {
    headers["x-academic-term-id"] = String(scoped.academicTermId)
  }
  if (init?.requireAuthHeader) {
    headers.Authorization = "instructor"
  }

  const stored = await getStoredSession()
  const faculty = stored?.portal === "faculty" ? stored : undefined
  const institutionId =
    scoped.institutionId != null && scoped.institutionId > 0
      ? scoped.institutionId
      : faculty?.universityId
  Object.assign(headers, instructorInstitutionHeaders(institutionId))
  const jarCookie = await studentHttpCookieHeader()
  const trust = await mfaTrustRequestHeadersForInstructor(faculty)
  Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
  const refresh =
    refreshTokenFromCookieHeader(jarCookie) ??
    refreshTokenFromCookieHeader(trust.Cookie) ??
    (await getStoredRefreshToken()) ??
    undefined
  if (refresh) headers[STUDENT_REFRESH_HEADER] = refresh
  if (!headersHaveStudentSessionProof(headers)) {
    throw new ApiError("Instructor authentication required", 401)
  }
  return headers
}

async function instructorRequest<T>(
  path: string,
  scope: Scope,
  init?: RequestInit & { requireAuthHeader?: boolean; omitCourseId?: boolean },
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
  assertProductionHttpsUrl(url)
  const headers = await instructorAuthenticatedHeaders(scope, {
    requireAuthHeader: init?.requireAuthHeader,
    omitCourseId: init?.omitCourseId,
    headers: init?.headers as Record<string, string> | undefined,
  })

  const { requireAuthHeader: _, omitCourseId: __, ...fetchInit } = init ?? {}
  const startedAt = Date.now()
  const response = await fetch(url, {
    ...fetchInit,
    credentials: "include",
    headers,
    signal: createApiAbortSignal(undefined, fetchInit.signal ?? undefined),
  })
  let body: unknown = null
  const text = await response.text()
  observeHttpResponse({
    method: fetchInit.method ?? "GET",
    path,
    status: response.status,
    startedAt,
    payloadBytes: text.length,
  })
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }

  if (!response.ok) {
    const message = extractApiErrorMessage(body, response.status, path)
    noteApiFailure(path, response.status, message)
    const isExpectedMobilePaymentGap =
      (response.status === 404 || response.status === 503) &&
      path.includes("mobile-payment")
    if (!isExpectedMobilePaymentGap) {
      reportMobileApiError({
        path,
        method: init?.method,
        status: response.status,
        message,
        body,
      })
    }
    throw new ApiError(message, response.status, body)
  }

  await persistHttpCookiesFromResponse(url, response.headers)

  return body as T
}

/** Session-proof faculty fetch — cookies, MFA trust, refresh, HTTPS assert. */
export function instructorAuthenticatedRequest<T>(
  path: string,
  scope: Scope,
  init?: RequestInit & { requireAuthHeader?: boolean },
): Promise<T> {
  return instructorRequest<T>(path, scope, init)
}

export type InstructorDashboardCharts = {
  submissionsOverTime: { date: string; label: string; count: number }[]
  submissionsOverTimeExtended?: { date: string; label: string; count: number }[]
  assessmentBreakdown: { name: string; value: number; type?: string }[]
  scoreTrend: { week: string; avgScore: number; attempts: number }[]
}

async function playgroundSessionAction(
  scope: Scope,
  action: string,
  payload: Record<string, unknown>,
) {
  return instructorRequest<{ success?: boolean; joinPasscode?: string; message?: string }>(
    "/api/instructor/playground/sessions",
    scope,
    { method: "POST", body: JSON.stringify({ action, ...payload }) },
  )
}

const RESULTS_TYPE_ROUTES = [
  { api: "quiz", display: "quiz" },
  { api: "homework", display: "homework" },
  { api: "midsem", display: "mid_semester" },
  { api: "final", display: "final" },
] as const

function mapTypedResults(
  rows: InstructorAssessmentResult[] | undefined,
  displayType: string,
): InstructorAssessmentResult[] {
  return (rows ?? []).map((row) => ({
    ...row,
    quiz_title: row.quiz_title ?? row.assessment_title,
    assessment_type: row.assessment_type || displayType,
  }))
}

/** Production still ANDs quiz.course_id when x-course-id is set; section-only fetch recovers ECE 2202. */
async function fetchResultsBySectionHint(
  scope: Scope,
  section: string,
): Promise<InstructorAssessmentResult[]> {
  const q = new URLSearchParams({ showRetakes: "true", section })
  const batches = await Promise.all(
    RESULTS_TYPE_ROUTES.map(({ api, display }) =>
      instructorRequest<{ results?: InstructorAssessmentResult[] }>(
        `/api/${api}/results?${q}`,
        scope,
        { omitCourseId: true },
      )
        .then((body) => mapTypedResults(body.results, display))
        .catch(() => [] as InstructorAssessmentResult[]),
    ),
  )
  return batches.flat()
}

async function fetchAssessmentResultsForCourse(
  scope: Scope,
  params?: {
    sessionCode?: string
    assessmentType?: string
    courseCode?: string | null
    sessionCodes?: string[]
    limit?: number
  },
): Promise<InstructorAssessmentResult[]> {
  const q = new URLSearchParams({ showRetakes: "true" })
  if (params?.sessionCode) q.set("section", params.sessionCode)
  if (params?.assessmentType) q.set("assessment_type", params.assessmentType)
  if (params?.limit != null) q.set("limit", String(params.limit))

  const scoped = await instructorRequest<{ results?: InstructorAssessmentResult[] }>(
    `/api/instructor/results?${q}`,
    scope,
  ).then((body) => body.results ?? [])
  if (scoped.length > 0) return scoped

  let courseCode = params?.courseCode ?? null
  let sessionCodes = params?.sessionCodes ?? []
  if (!courseCode || sessionCodes.length === 0) {
    try {
      const sessionRes = await instructorRequest<{
        sessions?: InstructorSession[]
        course?: InstructorCourse
      }>("/api/instructor/sessions", scope)
      courseCode = courseCode || sessionRes.course?.course_code || null
      if (sessionCodes.length === 0) {
        sessionCodes = (sessionRes.sessions ?? []).map((row) => row.code).filter(Boolean)
      }
    } catch {
      // Keep whatever hints the caller already provided.
    }
  }

  const hints = assessmentResultSectionHints({
    sessionCode: params?.sessionCode,
    courseCode,
    sessionCodes,
  })
  if (hints.length === 0) return []

  const seen = new Set<number>()
  const recovered: InstructorAssessmentResult[] = []
  for (const hint of hints) {
    const rows = await fetchResultsBySectionHint(scope, hint)
    for (const row of rows) {
      if (!evaluationRowBelongsToCourse(row, courseCode, sessionCodes)) continue
      if (seen.has(row.attempt_id)) continue
      seen.add(row.attempt_id)
      recovered.push(row)
    }
    if (recovered.length > 0) break
  }
  return recovered
}

export const instructorApi = {
  getCourses: (instructorId: number) =>
    instructorRequest<{
      courses: Array<InstructorCourse & { course_id?: number }>
      offerings?: Array<InstructorCourse & { course_id?: number; academic_term_id?: number | null }>
      activeTerm?: { id: number; label: string } | null
      actorRole?: string
    }>("/api/instructor/courses", { instructorId }).then((r) => ({
      ...r,
      courses: (r.courses ?? [])
        .map((c) => ({
          ...c,
          id: Number(c.id ?? c.course_id ?? 0),
        }))
        .filter((c) => Number.isFinite(c.id) && c.id > 0),
      offerings: (r.offerings ?? r.courses ?? [])
        .map((c) => ({
          ...c,
          id: Number(c.id ?? c.course_id ?? 0),
          course_id: Number(c.course_id ?? c.id ?? 0),
          session_id:
            c.session_id != null && Number.isFinite(Number(c.session_id))
              ? Number(c.session_id)
              : null,
          session_code: c.session_code != null ? String(c.session_code) : null,
          catalog_course_code:
            c.catalog_course_code != null ? String(c.catalog_course_code) : null,
        }))
        .filter((c) => Number.isFinite(c.id) && c.id > 0),
    })),

  removeCourseFromTerm: (instructorId: number, termId: number, courseId: number) =>
    instructorRequest<{ success?: boolean }>(
      `/api/instructor/academic-terms/${termId}/courses/${courseId}`,
      { instructorId },
      { method: "DELETE" },
    ),

  getDashboardStats: (scope: Scope) =>
    instructorRequest<{ stats: Record<string, unknown> }>(
      "/api/instructor/dashboard/stats",
      scope,
    ).then((r) => ({
      totalQuizzes: Number(r.stats.totalQuizzes ?? 0),
      activeQuizzes: Number(r.stats.activeQuizzes ?? 0),
      totalStudents: Number(r.stats.totalStudents ?? 0),
      totalAttempts: Number(r.stats.totalAttempts ?? 0),
      pendingIssues: Number(r.stats.pendingIssues ?? 0),
      upcomingAssessments: Number(r.stats.upcomingAssessments ?? 0),
      recentSubmissions24h: Number(r.stats.recentSubmissions24h ?? 0)})),

  getDashboardCharts: (scope: Scope) =>
    instructorRequest<InstructorDashboardCharts>("/api/instructor/dashboard/charts", scope),

  getRecentActivity: (scope: Scope) =>
    instructorRequest<{ recentActivity: InstructorRecentActivity[] }>(
      "/api/instructor/recent-activity",
      scope,
    ).then((r) => r.recentActivity ?? []),

  getInstructorReports: (scope: Scope, params?: { type?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams()
    if (params?.type) q.set("type", params.type)
    if (params?.startDate) q.set("startDate", params.startDate)
    if (params?.endDate) q.set("endDate", params.endDate)
    const suffix = q.toString() ? `?${q.toString()}` : ""
    return instructorRequest<InstructorReportsResponse>(`/api/instructor/reports${suffix}`, scope)
  },

  generateInstructorReport: (
    scope: Scope,
    payload: { reportType: string; filters?: ReportDateRange },
  ) =>
    instructorRequest<{
      success?: boolean
      reportType: string
      data: Record<string, unknown>[]
      metadata?: Record<string, unknown>
      generatedAt?: string
      error?: string
    }>("/api/instructor/reports", scope, {
      method: "POST",
      body: JSON.stringify({ reportType: payload.reportType, format: "json", filters: payload.filters ?? {} }),
    }),

  getSavedInstructorReports: (scope: Scope) =>
    instructorRequest<{ success?: boolean; reports: Record<string, unknown>[] }>(
      "/api/instructor/reports/save",
      scope,
    ).then((r) => (r.reports ?? []).map(normalizeSavedReport)),

  saveInstructorReport: (
    scope: Scope,
    payload: {
      reportType: string
      title: string
      data: Record<string, unknown>[]
      metadata?: Record<string, unknown>
      filters?: Record<string, unknown>
    },
  ) =>
    instructorRequest<{ success?: boolean; reportId?: number; createdAt?: string; error?: string }>(
      "/api/instructor/reports/save",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  deleteSavedInstructorReport: (scope: Scope, reportId: number) =>
    instructorRequest<{ success?: boolean; error?: string }>(
      `/api/instructor/reports/save?id=${reportId}`,
      scope,
      { method: "DELETE" },
    ),

  searchInstructorReportStudents: (scope: Scope, query: string) => {
    const q = new URLSearchParams({ q: query })
    return instructorRequest<{ success?: boolean; students: StudentReportSearchHit[] }>(
      `/api/instructor/reports/student?${q.toString()}`,
      scope,
    ).then((r) => r.students ?? [])
  },

  getInstructorStudentReport: (scope: Scope, studentId: number) =>
    instructorRequest<{ success?: boolean; report: StudentIndividualReportPayload; error?: string }>(
      `/api/instructor/reports/student?studentId=${studentId}`,
      scope,
    ).then((r) => r.report),

  getAntiCheatReports: (scope: Scope, params?: ReportDateRange) => {
    const q = new URLSearchParams()
    if (params?.startDate) q.set("startDate", params.startDate)
    if (params?.endDate) q.set("endDate", params.endDate)
    const suffix = q.toString() ? `?${q.toString()}` : ""
    return instructorRequest<{
      success?: boolean
      data: Record<string, unknown>[]
      metadata?: Record<string, unknown>
    }>(`/api/instructor/anti-cheat-reports${suffix}`, scope)
  },

  getObservabilityLogs: (scope: Scope, params?: ReportDateRange & { limit?: number; userId?: number }) => {
    const q = new URLSearchParams()
    if (params?.startDate) q.set("startDate", params.startDate)
    if (params?.endDate) q.set("endDate", params.endDate)
    if (params?.userId != null) q.set("userId", String(params.userId))
    q.set("limit", String(params?.limit ?? 200))
    return instructorRequest<{
      logs: Record<string, unknown>[]
      stats?: Record<string, unknown>
      pagination?: Record<string, unknown>
    }>(`/api/observability/logs?${q.toString()}`, scope)
  },

  getProgressReviews: (scope: Scope, params?: { reviewPeriod?: string; asOfDate?: string }) => {
    const q = new URLSearchParams()
    if (params?.reviewPeriod) q.set("reviewPeriod", params.reviewPeriod)
    if (params?.asOfDate?.trim()) q.set("asOfDate", params.asOfDate.trim().slice(0, 10))
    const suffix = q.toString() ? `?${q.toString()}` : ""
    return instructorRequest<InstructorProgressReviewsResponse>(
      `/api/instructor/progress-reviews${suffix}`,
      scope,
    ).then((r) => ({
      ...r,
      reviews: r.reviews ?? []}))
  },

  getProgressReviewById: (scope: Scope, reviewId: number) =>
    instructorRequest<{
      success?: boolean
      review?: {
        id: number
        reviewPeriod: string
        asOfDate?: string | null
        sections?: ProgressReview["sections"]
        progressData?: ProgressReview["progressData"]
        contentMarkdown?: string | null
        createdAt?: string
      }
    }>(`/api/instructor/progress-reviews?reviewId=${reviewId}`, scope).then((r) => {
      const rev = r.review
      if (!rev) return null
      return {
        id: rev.id,
        reviewPeriod: rev.reviewPeriod,
        asOfDate: rev.asOfDate ?? null,
        sections: rev.sections ?? null,
        contentMarkdown: rev.contentMarkdown ?? null,
        progressData: rev.progressData ?? null,
        createdAt: rev.createdAt,
      } satisfies ProgressReview
    }),

  runProgressReviewBatch: (scope: Scope, payload: ProgressReviewBatchPayload) =>
    instructorRequest<{ success?: boolean; result: ProgressReviewBatchResult; error?: string }>(
      "/api/instructor/progress-reviews",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  getAnnouncements: (scope: Scope) => {
    const courseId = scope.courseId
    if (!courseId) {
      return Promise.resolve([] as InstructorAnnouncement[])
    }
    return instructorRequest<{ announcements: Record<string, unknown>[] }>(
      `/api/announcements?instructorId=${scope.instructorId}&courseId=${courseId}`,
      scope,
    ).then((r) => (r.announcements ?? []).map(normalizeInstructorAnnouncement))
  },

  createAnnouncement: (
    scope: Scope,
    payload: {
      title: string
      content: string
      pinned?: boolean
      type?: string
      priority?: string
      target_session?: string
      expires_at?: string | null
      attachments?: InstructorAnnouncementAttachment[]
      event_date?: string | null
      event_time?: string | null
      event_end?: string | null
      event_location?: string | null
    },
  ) =>
    instructorRequest<{ announcement: Record<string, unknown> }>("/api/announcements", scope, {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        pinned: payload.pinned ?? false,
        type: payload.type ?? "info",
        priority: payload.priority ?? (payload.pinned ? "high" : "medium"),
        target_session: payload.target_session ?? "all",
        expires_at: payload.expires_at ?? null,
        attachments: payload.attachments ?? [],
        event_date: payload.event_date ?? null,
        event_time: payload.event_time ?? null,
        event_end: payload.event_end ?? null,
        event_location: payload.event_location ?? null,
        course_id: scope.courseId})}).then((r) => normalizeInstructorAnnouncement(r.announcement)),

  getAnnouncementById: (scope: Scope, id: number) =>
    instructorRequest<{ announcement: Record<string, unknown> }>(
      `/api/announcements/${id}?instructorId=${scope.instructorId}`,
      scope,
    ).then((r) => normalizeInstructorAnnouncement(r.announcement)),

  updateAnnouncement: (
    scope: Scope,
    id: number,
    payload: Partial<{
      title: string
      content: string
      pinned: boolean
      type: string
      priority: string
      target_session: string
      expires_at: string | null
      attachments: InstructorAnnouncementAttachment[]
      event_date: string | null
      event_time: string | null
      event_end: string | null
      event_location: string | null
    }>,
  ) =>
    instructorRequest<{ announcement: Record<string, unknown> }>(`/api/announcements/${id}`, scope, {
      method: "PUT",
      body: JSON.stringify(payload)}).then((r) => normalizeInstructorAnnouncement(r.announcement)),

  deleteAnnouncement: (scope: Scope, id: number) =>
    instructorRequest<{ message: string }>(`/api/announcements/${id}`, scope, {
      method: "DELETE"}),

  uploadAnnouncementAttachment: async (
    scope: Scope,
    file: { uri: string; name: string; type: string },
  ): Promise<InstructorAnnouncementAttachment> => {
    const url = `${API_BASE_URL}/api/announcements/upload`
    assertProductionHttpsUrl(url)
    const form = new FormData()
    form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
    const headers = await instructorAuthenticatedHeaders(scope)
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
    return body as InstructorAnnouncementAttachment
  },

  getNotifications: (instructorId: number, limit = 50) =>
    instructorRequest<{ notifications: InstructorNotification[]; unread_count: number }>(
      `/api/instructor/notifications?limit=${limit}`,
      { instructorId },
    ),

  markNotificationRead: (instructorId: number, notificationId: number) =>
    instructorRequest<{ success: boolean }>("/api/instructor/notifications", { instructorId }, {
      method: "PATCH",
      body: JSON.stringify({ notification_id: notificationId })}),

  markAllNotificationsRead: (instructorId: number) =>
    instructorRequest<{ success: boolean }>("/api/instructor/notifications/mark-all-read", {
      instructorId}, { method: "POST" }),

  getPendingClassroomPoints: (scope: Scope) => {
    const q = new URLSearchParams({ status: "pending", limit: "150" })
    return instructorRequest<{ points: ClassroomPointRow[] }>(
      `/api/classroom-points?${q}`,
      scope,
    ).then((r) => r.points ?? [])
  },

  getClassroomPoints: (
    scope: Scope,
    params?: { status?: string; session?: string; limit?: number; studentId?: number | string },
  ) => {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.session) q.set("session", params.session)
    if (params?.studentId != null) q.set("studentId", String(params.studentId))
    q.set("limit", String(params?.limit ?? 100))
    const qs = q.toString()
    return instructorRequest<{ points: ClassroomPointRow[]; count?: number }>(
      `/api/classroom-points?${qs}`,
      scope,
    ).then((r) => r.points ?? [])
  },

  approveClassroomPoint: (scope: Scope, pointId: number, points?: number) =>
    instructorRequest<{ success: boolean; message?: string; duplicateWarning?: string }>(
      "/api/classroom-points/approve",
      scope,
      { method: "POST", body: JSON.stringify({ id: pointId, ...(points != null ? { points } : {}) }) },
    ),

  approveAllClassroomPoints: (scope: Scope) =>
    instructorRequest<{ success: boolean; message?: string; count?: number; duplicatesRejected?: number }>(
      "/api/classroom-points/approve",
      scope,
      { method: "POST", body: JSON.stringify({ approveAll: true }) },
    ),

  verifyAndApproveAllClassroomPoints: (scope: Scope) =>
    instructorRequest<{ success: boolean; message?: string; count?: number; duplicatesRejected?: number }>(
      "/api/classroom-points/approve",
      scope,
      { method: "POST", body: JSON.stringify({ verifyAndApproveAll: true }) },
    ),

  rejectClassroomPoint: (scope: Scope, pointId: number) =>
    instructorRequest<{ success: boolean }>(
      `/api/classroom-points/approve?id=${pointId}`,
      scope,
      { method: "DELETE" },
    ),

  getClassroomPointsSummary: (scope: Scope, session?: string) => {
    const q = session ? `?session=${encodeURIComponent(session)}` : ""
    return instructorRequest<{ summary: ClassroomPointsSummaryRow[]; count?: number }>(
      `/api/classroom-points/summary${q}`,
      scope,
    ).then((r) => r.summary ?? [])
  },

  getClassroomPointAssignments: (scope: Scope, session?: string) => {
    const params = new URLSearchParams({ manage: "1" })
    if (session) params.set("session", session)
    return instructorRequest<{ submissions: ClassroomPointAssignment[] }>(
      `/api/classroom-points/submissions?${params}`,
      scope,
    ).then((r) => r.submissions ?? [])
  },

  getClassroomPointAssignment: async (scope: Scope, assignmentId: number) => {
    const byId = await instructorRequest<{ submission?: ClassroomPointAssignment }>(
      `/api/classroom-points/submissions/${assignmentId}`,
      scope,
    ).catch(() => null)
    if (byId?.submission) return byId.submission
    const rows = await instructorApi.getClassroomPointAssignments(scope)
    return rows.find((row) => row.id === assignmentId) ?? null
  },

  awardClassroomPointsManual: (
    scope: Scope,
    payload: {
      studentId: number
      points: number
      reason: string
      category: string
      session: string
    },
  ) =>
    instructorRequest<{ success: boolean }>("/api/classroom-points", scope, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createClassroomPointAssignment: (scope: Scope, payload: CreateClassroomPointAssignmentPayload) =>
    instructorRequest<{ success: boolean; submission?: ClassroomPointAssignment }>(
      "/api/classroom-points/submissions",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          session: payload.session ?? null,
          instructorId: scope.instructorId,
          submissionKind: payload.submissionKind,
          dueAt: payload.dueAt ?? null,
          durationHours: payload.durationHours ?? null,
          questionConfig: payload.questionConfig ?? null})},
    ),

  updateClassroomPointAssignment: (
    scope: Scope,
    assignmentId: number,
    payload: {
      title?: string
      description?: string | null
      session?: string | null
      dueAt?: string | null
      durationHours?: number | null
      restartAvailability?: boolean
      submissionKind?: "code" | "solution"
      questionConfig?: Record<string, unknown> | null
    },
  ) =>
    instructorRequest<{ success: boolean; submission?: ClassroomPointAssignment }>(
      `/api/classroom-points/submissions/${assignmentId}`,
      scope,
      {
        method: "PUT",
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          session: payload.session,
          dueAt: payload.dueAt,
          durationHours: payload.durationHours,
          restartAvailability: payload.restartAvailability,
          submissionKind: payload.submissionKind,
          questionConfig: payload.questionConfig,
        }),
      },
    ),

  deleteClassroomPointAssignment: (scope: Scope, assignmentId: number) =>
    instructorRequest<{ success: boolean; message?: string; revokedPoints?: number }>(
      `/api/classroom-points/submissions/${assignmentId}`,
      scope,
      { method: "DELETE" },
    ),

  deleteClassroomPoint: (scope: Scope, pointId: number) =>
    instructorRequest<{ success: boolean }>(`/api/classroom-points?id=${pointId}`, scope, {
      method: "DELETE"}),

  getPendingPracticePoints: (scope: Scope) =>
    instructorRequest<{ points: PracticePointRow[] }>(
      "/api/practice-points?status=pending&limit=100",
      scope,
    ).then((r) => r.points ?? []),

  approvePracticePoint: (scope: Scope, pointId: number) =>
    instructorRequest<{ success: boolean; message?: string }>(
      "/api/practice-points/approve",
      scope,
      { method: "POST", body: JSON.stringify({ id: pointId }) },
    ),

  approveAllPracticePoints: (scope: Scope) =>
    instructorRequest<{ success: boolean; message?: string; count?: number }>(
      "/api/practice-points/approve",
      scope,
      { method: "POST", body: JSON.stringify({ approveAll: true }) },
    ),

  rejectPracticePoint: (scope: Scope, pointId: number) =>
    instructorRequest<{ success: boolean }>(
      `/api/practice-points/approve?id=${pointId}`,
      scope,
      { method: "DELETE" },
    ),

  getQuizzes: (scope: Scope, assessmentType?: string) => {
    const params = assessmentType ? `?assessment_type=${encodeURIComponent(assessmentType)}` : ""
    return instructorRequest<{ quizzes: InstructorQuiz[] }>(
      `/api/instructor/quizzes${params}`,
      scope,
    ).then((r) => r.quizzes ?? [])
  },

  toggleQuizSession: (scope: Scope, quizId: number, sessionCode: string, isActive: boolean) =>
    instructorRequest<{ success: boolean }>(
      `/api/instructor/quizzes/${quizId}/toggle-session`,
      scope,
      {
        method: "PATCH",
        body: JSON.stringify({ session_code: sessionCode, is_active: isActive })},
    ),

  getQuiz: (scope: Scope, quizId: number) =>
    instructorRequest<{ quiz: InstructorQuizDetail }>(`/api/instructor/quizzes/${quizId}`, scope).then(
      (r) => r.quiz,
    ),

  deleteQuiz: (scope: Scope, quizId: number) =>
    instructorRequest<{ success: boolean; message?: string }>(`/api/instructor/quizzes/${quizId}`, scope, {
      method: "DELETE"}),

  cloneQuiz: (scope: Scope, quizId: number) =>
    instructorRequest<{ quizId: number; message?: string }>(
      `/api/instructor/quizzes/${quizId}/clone`,
      scope,
      { method: "POST" },
    ),

  createQuizFromBank: (scope: Scope, payload: CreateQuizFromBankPayload) =>
    instructorRequest<{
      success: boolean
      quiz_id: number
      questions_added?: number
      total_time_minutes?: number
    }>("/api/instructor/quizzes/create-from-bank", scope, {
      method: "POST",
      body: JSON.stringify({
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        question_ids: payload.question_ids,
        assessment_type: payload.assessment_type,
        time_limit: payload.time_limit,
        custom_time_limits: payload.custom_time_limits,
        available_from: payload.available_from ?? null,
        available_until: payload.available_until ?? null})}),

  updateQuiz: (scope: Scope, quizId: number, payload: QuizUpdatePayload) =>
    instructorRequest<{ success: boolean; questionsNotReplaced?: boolean; message?: string }>(
      `/api/instructor/quizzes/${quizId}/update`,
      scope,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  uploadQuestionMedia: async (
    scope: Scope,
    file: { uri: string; name: string; type: string },
  ): Promise<{ url: string; media_type?: string }> => {
    const url = `${API_BASE_URL}/api/instructor/question-media/upload`
    const form = new FormData()
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type} as unknown as Blob)

    assertProductionHttpsUrl(url)
    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-instructor-id": String(scope.instructorId)}
    if (scope.courseId != null) {
      headers["x-course-id"] = String(scope.courseId)
    }
    const stored = await getStoredSession()
    const faculty = stored?.portal === "faculty" ? stored : undefined
    const jarCookie = await studentHttpCookieHeader()
    const trust = await mfaTrustRequestHeadersForInstructor(faculty)
    Object.assign(headers, mergeCookieHeaders(trust.Cookie, jarCookie))
    const refresh =
      refreshTokenFromCookieHeader(jarCookie) ??
      refreshTokenFromCookieHeader(trust.Cookie) ??
      (await getStoredRefreshToken()) ??
      undefined
    if (refresh) headers[STUDENT_REFRESH_HEADER] = refresh
    if (!headersHaveStudentSessionProof(headers)) {
      throw new ApiError("Instructor authentication required", 401)
    }

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: form,
      signal: createApiAbortSignal(),
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
    await persistHttpCookiesFromResponse(url, response.headers)
    return body as { url: string; media_type?: string }
  },

  getSessions: (scope: Scope, academicTermId?: number) => {
    const q = academicTermId != null ? `?academic_term_id=${academicTermId}` : ""
    return instructorRequest<{ sessions: InstructorSession[]; course: InstructorCourse }>(
      `/api/instructor/sessions${q}`,
      scope,
    )
  },

  createSession: (scope: Scope, payload: SessionPayload) =>
    instructorRequest<{ session: InstructorSession }>("/api/instructor/sessions", scope, {
      method: "POST",
      body: JSON.stringify(payload)}),

  updateSession: (
    scope: Scope,
    sessionId: number,
    payload: Partial<SessionPayload> & { code: string; description?: string | null },
  ) =>
    instructorRequest<{ session: InstructorSession }>(`/api/instructor/sessions/${sessionId}`, scope, {
      method: "PUT",
      body: JSON.stringify(payload)}),

  deleteSession: (scope: Scope, sessionId: number) =>
    instructorRequest<{ message?: string; deletedStudents?: number }>(
      `/api/instructor/sessions/${sessionId}`,
      scope,
      { method: "DELETE" },
    ),

  getAcademicTerms: (scope: Scope) =>
    instructorRequest<{ terms: InstructorAcademicTerm[] }>("/api/instructor/academic-terms", scope),

  createAcademicTerm: (scope: Scope, payload: AcademicTermPayload) =>
    instructorRequest<{ term: InstructorAcademicTerm }>("/api/instructor/academic-terms", scope, {
      method: "POST",
      body: JSON.stringify(payload)}),

  updateAcademicTerm: (scope: Scope, termId: number, payload: AcademicTermPayload) =>
    instructorRequest<{ term: InstructorAcademicTerm }>(
      `/api/instructor/academic-terms/${termId}`,
      scope,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  deleteAcademicTerm: (scope: Scope, termId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/instructor/academic-terms/${termId}`, scope, {
      method: "DELETE"}),

  activateAcademicTerm: (scope: Scope, termId: number) =>
    instructorRequest<{ term: InstructorAcademicTerm; label?: string }>(
      `/api/instructor/academic-terms/${termId}/activate`,
      scope,
      { method: "POST" },
    ),

  getStudents: (scope: Scope, sessionCode?: string) => {
    const q = sessionCode ? `?sessionCode=${encodeURIComponent(sessionCode)}` : ""
    return instructorRequest<{ students: InstructorStudent[] }>(
      `/api/instructor/students${q}`,
      scope,
    ).then((r) => r.students ?? [])
  },

  getStudentsBySessionId: (scope: Scope, sessionId: number) =>
    instructorRequest<{ students: InstructorStudent[] }>(
      `/api/instructor/students?session_id=${sessionId}`,
      scope,
    ).then((r) => r.students ?? []),

  importStudents: (
    scope: Scope,
    payload: {
      session_id?: number
      session_code?: string
      rows: Array<{ student_id: string; full_name: string; email?: string | null }>
    },
  ) =>
    instructorRequest<{ success: boolean; summary: { added: number; updated: number; skipped: number; total: number } }>(
      "/api/instructor/students/import",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  createOfficeHourOnBehalf: (
    scope: Scope,
    payload: {
      studentId: number
      topic: string
      areaOfConcern?: string
      description?: string
      priority?: string
      preferredDates?: string[]
    },
  ) =>
    instructorRequest<{ success: boolean; request?: OfficeHourRequest }>(
      "/api/instructor/office-hours",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          studentId: payload.studentId,
          topic: payload.topic,
          areaOfConcern: payload.areaOfConcern,
          description: payload.description,
          priority: payload.priority ?? "medium",
          preferredDates: payload.preferredDates})},
    ),

  createRecommendationOnBehalf: (
    scope: Scope,
    payload: {
      studentId: number
      courseId: number
      instructorId: number
      purpose: string
      deadline?: string
      studentRequestDescription?: string
    },
  ) =>
    instructorRequest<{ id: number }>("/api/instructor/recommendations", scope, {
      method: "POST",
      body: JSON.stringify({
        studentId: payload.studentId,
        courseId: payload.courseId,
        instructorId: payload.instructorId,
        purpose: payload.purpose,
        deadline: payload.deadline,
        studentRequestDescription: payload.studentRequestDescription})}),

  createSummerCamperAccount: (
    scope: Scope,
    payload: {
      fullName: string
      email: string
      school: string
      password: string
      programRole?: "summer_camper" | "summer_student"
      campId?: number
    },
  ) =>
    instructorRequest<{ success: boolean; autoApproved?: boolean; message?: string }>(
      "/api/instructor/summer-camp/campers",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          action: "create_account",
          fullName: payload.fullName,
          email: payload.email,
          school: payload.school,
          password: payload.password,
          programRole: payload.programRole ?? "summer_camper",
          campId: payload.campId,
        }),
      },
    ),

  getAttemptOverrides: (scope: Scope, quizId: number) =>
    instructorRequest<{ overrides: InstructorAttemptOverride[] }>(
      `/api/instructor/attempt-overrides?quizId=${quizId}`,
      scope,
    ).then((r) => r.overrides ?? []),

  grantAttemptOverride: (
    scope: Scope,
    payload: {
      quizId: number
      studentId: number
      additionalAttempts?: number
      reason?: string
      expiresAt?: string
    },
  ) =>
    instructorRequest<{ success: boolean; override?: InstructorAttemptOverride }>(
      "/api/instructor/attempt-overrides",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  revokeAttemptOverride: (scope: Scope, overrideId: number) =>
    instructorRequest<{ success: boolean }>(
      `/api/instructor/attempt-overrides?overrideId=${overrideId}`,
      scope,
      { method: "DELETE" },
    ),

  getRolloverGrants: (scope: Scope, quizId: number) =>
    instructorRequest<{ students: InstructorRolloverGrant[] }>(
      `/api/instructor/rollover/list?quizId=${quizId}`,
      scope,
    ).then((r) => r.students ?? []),

  grantRollover: (
    scope: Scope,
    payload: { quizId: number; studentId: number; hours?: number },
  ) =>
    instructorRequest<{ success: boolean; message?: string; expiresAt?: string; hours?: number }>(
      "/api/instructor/rollover/grant",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  getQuestionTimeSettings: (scope: Scope) =>
    instructorRequest<{ settings: InstructorQuestionTimeSetting[] }>(
      "/api/instructor/question-time-settings",
      scope,
    ).then((r) => r.settings ?? []),

  updateQuestionTimeSetting: (
    scope: Scope,
    payload: { id: number; time_limit: number; description?: string },
  ) =>
    instructorRequest<{ success: boolean; setting?: InstructorQuestionTimeSetting }>(
      "/api/instructor/question-time-settings",
      scope,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  getAttendanceRoster: (scope: Scope, section: string) =>
    instructorRequest<{
      students: AttendanceRosterStudent[]
    }>(
      `/api/instructor/attendance-roster?section=${encodeURIComponent(section)}`,
      scope,
    ).then((r) => r.students ?? []),

  getAttendanceAnalytics: (scope: Scope, section?: string) => {
    const params = new URLSearchParams({ instructorId: String(scope.instructorId) })
    if (section && section !== "ALL") params.set("section", section)
    if (scope.courseId != null) params.set("courseId", String(scope.courseId))
    if (scope.academicTermId != null && scope.academicTermId > 0) {
      params.set("academic_term_id", String(scope.academicTermId))
    }
    return instructorRequest<{ analytics: AttendanceAnalytics }>(
      `/api/attendance/analytics?${params}`,
      scope,
    ).then((r) => r.analytics ?? null)
  },

  getAttendanceSessions: (
    scope: Scope,
    params?: { section?: string; isActive?: boolean },
  ) => {
    const q = new URLSearchParams({ instructorId: String(scope.instructorId) })
    if (params?.section && params.section !== "ALL") q.set("section", params.section)
    if (params?.isActive != null) q.set("isActive", params.isActive ? "true" : "false")
    if (scope.courseId != null) q.set("courseId", String(scope.courseId))
    if (scope.academicTermId != null && scope.academicTermId > 0) {
      q.set("academic_term_id", String(scope.academicTermId))
    }
    return instructorRequest<{ sessions: AttendanceSession[] }>(
      `/api/attendance/sessions?${q}`,
      scope,
    ).then((r) => r.sessions ?? [])
  },

  getAttendanceRecords: (
    scope: Scope,
    params: { section?: string; sessionId?: number },
  ) => {
    const q = new URLSearchParams()
    if (params.sessionId != null) q.set("sessionId", String(params.sessionId))
    else if (params.section) q.set("section", params.section)
    if (scope.courseId != null) q.set("courseId", String(scope.courseId))
    if (scope.academicTermId != null && scope.academicTermId > 0) {
      q.set("academic_term_id", String(scope.academicTermId))
    }
    return instructorRequest<{ records: AttendanceRecord[] }>(
      `/api/attendance/records?${q}`,
      scope,
    ).then((r) => r.records ?? [])
  },

  markAttendanceManual: (
    scope: Scope,
    payload: {
      sessionId: number
      studentId: number
      studentName: string
      studentNumber: string
      status: string
    },
  ) =>
    instructorRequest<{ success: boolean; points?: number; status?: string }>(
      "/api/attendance/manual-override",
      scope,
      {
        method: "POST",
        requireAuthHeader: true,
        body: JSON.stringify({
          ...payload,
          instructorId: scope.instructorId})},
    ),

  updateAttendanceRecord: (scope: Scope, recordId: number, status: string) =>
    instructorRequest<{ success: boolean }>("/api/attendance/records", scope, {
      method: "PUT",
      requireAuthHeader: true,
      body: JSON.stringify({ recordId, status })}),

  toggleAttendanceSessionCancelled: (scope: Scope, sessionId: number, isCancelled: boolean) =>
    instructorRequest<{ success: boolean }>("/api/attendance/sessions", scope, {
      method: "PUT",
      requireAuthHeader: true,
      body: JSON.stringify({ sessionId, isCancelled })}),

  deleteAttendanceRecord: (scope: Scope, recordId: number) =>
    instructorRequest<{ success: boolean }>(
      `/api/attendance/records?recordId=${recordId}`,
      scope,
      { method: "DELETE", requireAuthHeader: true },
    ),

  getCalendar: (
    scope: Scope,
    range: { startDate: Date; endDate: Date },
    view: InstructorCalendarView = "all",
  ) => {
    const params = new URLSearchParams({
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
      scope: view === "selected" ? "selected" : "all",
    })
    return instructorRequest<InstructorCalendarPayload & { success?: boolean }>(
      `/api/instructor/calendar?${params.toString()}`,
      scope,
    ).then((payload) => ({
      events: Array.isArray(payload.events) ? payload.events : [],
      scheduleText: typeof payload.scheduleText === "string" ? payload.scheduleText : null,
      location: typeof payload.location === "string" ? payload.location : null,
      openAdjustments: Array.isArray(payload.openAdjustments) ? payload.openAdjustments : [],
      calendarScope: payload.calendarScope === "selected" ? "selected" as const : "all" as const,
      scheduleSummaries: Array.isArray(payload.scheduleSummaries) ? payload.scheduleSummaries : [],
    }))
  },

  getCalendarFeed: (scope: Scope) =>
    instructorRequest<{
      success?: boolean
      token: string
      httpsUrl: string
      webcalUrl: string
      beforeMinutes: number
      atStart: boolean
    }>("/api/instructor/calendar/feed", scope).then((payload) => ({
      token: payload.token,
      httpsUrl: payload.httpsUrl,
      webcalUrl: payload.webcalUrl,
      beforeMinutes: payload.beforeMinutes === 0 ? 0 : 15,
      atStart: payload.atStart !== false,
    })),

  updateCalendarFeed: (scope: Scope, prefs: { beforeMinutes?: number; atStart?: boolean }) =>
    instructorRequest<{
      success?: boolean
      token: string
      httpsUrl: string
      webcalUrl: string
      beforeMinutes: number
      atStart: boolean
    }>("/api/instructor/calendar/feed", scope, {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),

  getOfficeHours: (scope: Scope) =>
    instructorRequest<{ requests: OfficeHourRequest[] }>(
      "/api/instructor/office-hours",
      scope,
    ).then((r) => r.requests ?? []),

  updateOfficeHourRequest: (
    scope: Scope,
    requestId: number,
    payload: {
      status?: string
      scheduledDate?: string | null
      meetingLink?: string
      meetingVenue?: string
      instructorNotes?: string
    },
  ) =>
    instructorRequest<{ request: OfficeHourRequest }>(
      `/api/instructor/office-hours/${requestId}`,
      scope,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),

  getRegularOfficeHours: (scope: Scope) =>
    instructorRequest<{ regularHours: RegularOfficeHourSlot[] }>(
      "/api/instructor/office-hours/regular",
      scope,
    ).then((r) => r.regularHours ?? []),

  saveRegularOfficeHours: (
    scope: Scope,
    payload: { slots: RegularOfficeHourDraft[]; semesterLabel?: string },
  ) =>
    instructorRequest<{ success: boolean; regularHours: RegularOfficeHourSlot[] }>(
      "/api/instructor/office-hours/regular",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          slots: payload.slots,
          semesterLabel: payload.semesterLabel ?? "current",
        }),
      },
    ).then((r) => r.regularHours ?? []),

  getIssues: (scope: Scope, status = "open", assessmentType?: string) => {
    const params = new URLSearchParams({ status })
    if (assessmentType) params.set("assessment_type", assessmentType)
    return instructorRequest<{ issues: InstructorIssue[] }>(
      `/api/instructor/issues?${params.toString()}`,
      scope,
    ).then((r) => r.issues ?? [])
  },

  getIssueComments: (scope: Scope, issueId: number) =>
    instructorRequest<{ comments: InstructorIssueComment[] }>(
      `/api/student/issues/${issueId}/comments`,
      scope,
      { requireAuthHeader: true },
    ).then((r) => r.comments ?? []),

  postIssueComment: (
    scope: Scope,
    issueId: number,
    payload: { commenterName: string; commenterId: string; commentText: string },
  ) =>
    instructorRequest<{ comment: InstructorIssueComment; success?: boolean }>(
      `/api/student/issues/${issueId}/comments`,
      scope,
      {
        method: "POST",
        requireAuthHeader: true,
        body: JSON.stringify({
          commenterName: payload.commenterName,
          commenterId: String(payload.commenterId),
          commenterRole: "instructor",
          commentText: payload.commentText})},
    ),

  closeIssue: (scope: Scope, issueId: number, resolutionComment?: string) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/instructor/issues/${issueId}/close`,
      scope,
      {
        method: "POST",
        requireAuthHeader: true,
        body: JSON.stringify({
          status: "closed",
          resolution_comment: resolutionComment?.trim() || undefined})},
    ),

  updateIssueStatus: (
    scope: Scope,
    issueId: number,
    status: "open" | "closed",
    resolutionComment?: string,
  ) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/instructor/issues/${issueId}/close`,
      scope,
      {
        method: "POST",
        requireAuthHeader: true,
        body: JSON.stringify({
          status,
          resolution_comment: resolutionComment?.trim() || undefined})},
    ),

  getPlaygroundSessions: async (scope: Scope) => {
    const pageSize = PLAYGROUND_SESSIONS_FETCH_PAGE_SIZE
    const first = await instructorRequest<{
      sessions?: PlaygroundSession[]
      total?: number
    }>(`/api/instructor/playground/sessions?page=1&limit=${pageSize}`, scope)
    const sessions = [...(first.sessions ?? [])]
    const total = Number.isFinite(first.total) ? Number(first.total) : sessions.length
    let page = 1
    while (true) {
      const nextPage = nextPlaygroundSessionsFetchPage({
        collected: sessions.length,
        total,
        currentPage: page,
      })
      if (nextPage == null) break
      const more = await instructorRequest<{ sessions?: PlaygroundSession[] }>(
        `/api/instructor/playground/sessions?page=${nextPage}&limit=${pageSize}`,
        scope,
      )
      const chunk = more.sessions ?? []
      if (chunk.length === 0) break
      sessions.push(...chunk)
      page = nextPage
    }
    return sessions
  },

  playgroundSessionAction: (
    scope: Scope,
    action: string,
    payload: Record<string, unknown>,
  ) => playgroundSessionAction(scope, action, payload),

  stopPlaygroundSession: (scope: Scope, sessionId: number) =>
    playgroundSessionAction(scope, "stop", { sessionId }),

  startPlaygroundGame: (scope: Scope, sessionId: number) =>
    playgroundSessionAction(scope, "start-game", { sessionId }),

  openPlaygroundLobby: (scope: Scope, sessionId: number) =>
    playgroundSessionAction(scope, "open-lobby", { sessionId }),

  deletePlaygroundSession: (scope: Scope, sessionId: number) =>
    playgroundSessionAction(scope, "delete", { sessionId }),

  setPlaygroundAllSessions: (scope: Scope, sessionId: number) =>
    playgroundSessionAction(scope, "set-all-sessions", { sessionId }),

  /** Clears student attempts for a session so they can rejoin (all or one result). */
  resetPlaygroundAttempts: (
    scope: Scope,
    sessionId: number,
    payload?: { resultId?: number },
  ) =>
    instructorRequest<{ success?: boolean; message?: string }>(
      "/api/instructor/playground/reset-attempts",
      scope,
      {
        method: "POST",
        body: JSON.stringify({ sessionId, ...payload }),
      },
    ),

  updatePlaygroundSession: (
    scope: Scope,
    sessionId: number,
    payload: { durationSec?: number; topics?: string[] },
  ) => playgroundSessionAction(scope, "update", { sessionId, ...payload }),

  getPlaygroundLeaderboard: (scope: Scope, sessionId: number) =>
    instructorRequest<{
      session: Record<string, unknown> | null
      leaderboard: PlaygroundLeaderboardEntry[]
      stats: PlaygroundLeaderboardStats
    }>(`/api/instructor/playground/leaderboard?sessionId=${sessionId}`, scope),

  getPlaygroundSessionQuestions: (scope: Scope, sessionId: number) =>
    instructorRequest<{
      session: {
        id: number
        sessionCode: string
        isActive: boolean
        durationSec: number
        questionCount: number
        selectedTopics: string[] | null
      }
      questions: PlaygroundSessionQuestion[]
    }>(`/api/instructor/playground/sessions/${sessionId}/questions`, scope),

  updatePlaygroundSessionQuestions: async (
    scope: Scope,
    sessionId: number,
    payload: {
      questionIds: number[]
      durationSec?: number
      questions?: PlaygroundSessionQuestion[]
    },
  ) => {
    const path = `/api/instructor/playground/sessions/${sessionId}/questions`
    const base = {
      questionIds: payload.questionIds,
      ...(payload.durationSec != null ? { durationSec: payload.durationSec } : {}),
    }
    const hasSnapshots = (payload.questions?.length ?? 0) > 0
    const body = hasSnapshots ? { ...base, questions: payload.questions } : base
    try {
      return await instructorRequest<{ success: boolean; questionCount: number; durationSec: number }>(
        path,
        scope,
        { method: "PUT", body: JSON.stringify(body) },
      )
    } catch (err) {
      if (!hasSnapshots || !(err instanceof ApiError) || !isPlaygroundQuestionsPayloadRejected(err.status)) {
        throw err
      }
      await instructorRequest<{ success: boolean; questionCount: number; durationSec: number }>(
        path,
        scope,
        { method: "PUT", body: JSON.stringify(base) },
      )
      throw new ApiError(PLAYGROUND_SNAPSHOT_FALLBACK_MESSAGE, err.status, err.details)
    }
  },

  getPlaygroundTopics: (scope: Scope) =>
    instructorRequest<{ topics: Array<Record<string, unknown>> }>("/api/instructor/playground/topics", scope).then(
      (r) => (r.topics ?? []).map(normalizePlaygroundTopic).filter((t) => t.topic),
    ),

  createPlaygroundSession: (
    scope: Scope,
    payload: {
      topics?: string[]
      questionCount?: number
      durationSec?: number
      allowedSessions?: number[] | null
      questionIds?: number[]
    },
  ) =>
    playgroundSessionAction(scope, "start", {
      topics: payload.topics ?? [],
      questionCount: payload.questionCount ?? payload.questionIds?.length ?? 10,
      durationSec: payload.durationSec ?? 10,
      allowedSessions: payload.allowedSessions ?? null,
      questionIds: payload.questionIds}) as Promise<PlaygroundSessionCreateResult>,

  getSyllabus: (scope: Scope) =>
    instructorRequest<{
      syllabus: InstructorSyllabus
      courseInfo?: Record<string, unknown>
      canEdit?: boolean
    }>("/api/instructor/syllabus", scope),

  saveSyllabus: (
    scope: Scope,
    payload: {
      id?: number
      courseId?: number
      title?: string
      term?: string
      contentMode?: string
      sections: SyllabusSection[]
      action?: "publish"
    },
  ) =>
    instructorRequest<{ syllabus: InstructorSyllabus; success?: boolean }>(
      "/api/instructor/syllabus",
      scope,
      {
        method: "PUT",
        body: JSON.stringify(
          syllabusRemoteBody({
            ...payload,
            courseId: payload.courseId ?? scope.courseId ?? 0,
          }),
        ),
      },
    ),

  getLectures: (scope: Scope, week?: number) => {
    const q = week != null ? `?week=${week}` : ""
    return instructorRequest<{ lectures: InstructorLecture[] }>(
      `/api/instructor/lectures${q}`,
      scope,
    ).then((r) => r.lectures ?? [])
  },

  createLecture: (
    scope: Scope,
    payload: {
      title: string
      week: number
      description?: string
      objectives?: string[]
      slides?: unknown[]
      is_published?: boolean
      session_access?: Record<string, boolean>
    },
  ) =>
    instructorRequest<{ lecture: InstructorLecture }>("/api/instructor/lectures", scope, {
      method: "POST",
      body: JSON.stringify({
        ...lectureCreateRequestBody({
          title: payload.title,
          week: payload.week,
          description: payload.description,
          objectives: payload.objectives ?? [],
          is_published: payload.is_published ?? false,
        }),
        ...(payload.session_access ? { session_access: payload.session_access } : {}),
        ...(payload.slides?.length ? { slides: payload.slides } : {}),
      }),
    }),

  updateLecture: (
    scope: Scope,
    lectureId: number,
    payload: Partial<{
      title: string
      week: number
      description: string
      objectives: string[]
      is_published: boolean
      allow_download: boolean
      session_access: Record<string, boolean>
    }>,
  ) =>
    instructorRequest<{ lecture: InstructorLecture }>(`/api/instructor/lectures/${lectureId}`, scope, {
      method: "PATCH",
      body: JSON.stringify(payload)}),

  getLectureContent: (scope: Scope, lectureId: number) =>
    instructorRequest<{ lecture?: InstructorLecture } & Record<string, unknown>>(
      `/api/instructor/lectures/${lectureId}/content`,
      scope,
    ),

  uploadLectureDocument: async (
    scope: Scope,
    lectureId: number,
    file: { uri: string; name: string; type: string },
  ): Promise<{ lecture: InstructorLecture; message?: string }> => {
    const url = `${API_BASE_URL}/api/instructor/lectures/${lectureId}/document`
    const form = new FormData()
    form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)

    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-instructor-id": String(scope.instructorId)}
    if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

    const response = await fetch(url, { method: "POST", headers, body: form })
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
    return body as { lecture: InstructorLecture; message?: string }
  },

  deleteLectureDocument: (scope: Scope, lectureId: number) =>
    instructorRequest<{ lecture: InstructorLecture; message?: string }>(
      `/api/instructor/lectures/${lectureId}/document`,
      scope,
      { method: "DELETE" },
    ),

  getLectureSamplePractice: (scope: Scope, lectureId: number) =>
    instructorRequest<{ config: import("./lecture-types").LectureSamplePracticeConfig }>(
      `/api/instructor/lectures/${lectureId}/sample-practice`,
      scope,
    ),

  saveLectureSamplePractice: (
    scope: Scope,
    lectureId: number,
    config: import("./lecture-types").LectureSamplePracticeConfig,
  ) =>
    instructorRequest<{ config: import("./lecture-types").LectureSamplePracticeConfig; message?: string }>(
      `/api/instructor/lectures/${lectureId}/sample-practice`,
      scope,
      { method: "PATCH", body: JSON.stringify({ config }) },
    ),

  getLectureWorkspace: (scope: Scope, lectureId: number) =>
    instructorRequest<{ config: import("./lecture-types").LectureWorkspaceConfig }>(
      `/api/instructor/lectures/${lectureId}/workspace`,
      scope,
    ),

  saveLectureWorkspace: (
    scope: Scope,
    lectureId: number,
    config: import("./lecture-types").LectureWorkspaceConfig,
  ) =>
    instructorRequest<{ config: import("./lecture-types").LectureWorkspaceConfig; message?: string }>(
      `/api/instructor/lectures/${lectureId}/workspace`,
      scope,
      { method: "PATCH", body: JSON.stringify({ config }) },
    ),

  deleteLecture: (scope: Scope, lectureId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/instructor/lectures/${lectureId}`, scope, {
      method: "DELETE",
    }),

  getPracticeTopics: (scope: Scope, session = "ALL") =>
    instructorRequest<{
      topics: PracticeTopic[]
      practiceBankAvailable?: boolean
      message?: string
    }>(`/api/instructor/practice/topics?session=${encodeURIComponent(session)}`, scope),

  togglePracticeTopic: (
    scope: Scope,
    payload: { topicName: string; session: string; isAvailable: boolean; dailyLimit?: number },
  ) =>
    instructorRequest<{ success?: boolean }>("/api/instructor/practice/topics/toggle", scope, {
      method: "POST",
      body: JSON.stringify(payload)}),

  configurePracticeTopic: (
    scope: Scope,
    payload: { topic: string; session: string; daily_limit: number; is_available?: boolean },
  ) =>
    instructorRequest<{ success?: boolean }>("/api/instructor/practice/topics/configure", scope, {
      method: "POST",
      body: JSON.stringify(payload)}),

  getPracticeStudentProgress: (scope: Scope) =>
    instructorRequest<{ students: PracticeStudentProgress[] }>(
      "/api/instructor/practice/student-progress",
      scope,
    ).then((r) => r.students ?? []),

  getPracticeStudentReport: (scope: Scope, studentId: number) =>
    instructorRequest<PracticeStudentReport>(
      `/api/instructor/practice/student-report?studentId=${studentId}`,
      scope,
    ),

  resetPracticeStudent: (scope: Scope, studentId: number) =>
    instructorRequest<{ success?: boolean }>("/api/instructor/practice/reset-student", scope, {
      method: "POST",
      body: JSON.stringify({ studentId })}),

  getPracticeAnalytics: (scope: Scope) =>
    instructorRequest<PracticeAnalytics & { analytics?: PracticeAnalytics }>(
      "/api/instructor/practice/analytics",
      scope,
    ).then((r) => {
      if (r && typeof r === "object" && "overview" in r && r.overview) {
        return r as PracticeAnalytics
      }
      return r.analytics ?? {}
    }),

  savePracticeConfig: (
    scope: Scope,
    payload: {
      session: string
      dailyLimit: number
      difficultyDistribution?: { easy: number; medium: number; hard: number }
      topicWeights?: Record<string, number>
    },
  ) =>
    instructorRequest<{ success?: boolean }>("/api/instructor/practice/config", scope, {
      method: "POST",
      body: JSON.stringify(payload)}),

  getPracticeTopicQuestions: async (scope: Scope, topic: string, session = "ALL") => {
    try {
      const r = await instructorRequest<{
        topic: string
        session: string
        questions: PracticeTopicQuestion[]
        totalCount: number
        availableCount: number
        hiddenCount: number
      }>(
        `/api/instructor/practice/questions?topic=${encodeURIComponent(topic)}&session=${encodeURIComponent(session)}`,
        scope,
      )
      return {
        ...r,
        fromQuestionBank: false,
        questions: (r.questions ?? []).map((q) =>
          normalizePracticeTopicQuestion(q as unknown as Record<string, unknown>),
        )}
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      const htmlError = err instanceof ApiError && err.message.includes("<!DOCTYPE")
      if (status !== 404 && status < 500 && !htmlError) throw err

      const rows = await instructorRequest<{ questions: InstructorBankQuestion[] }>(
        `/api/instructor/question-bank?topic=${encodeURIComponent(topic)}`,
        scope,
      )
      const questions = (rows.questions ?? []).map((q) =>
        normalizePracticeTopicQuestion({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          difficulty: q.difficulty,
          topic: q.topic,
          options: q.options,
          hint: q.hint,
          isAvailable: true}),
      )
      return {
        topic,
        session,
        fromQuestionBank: true,
        questions,
        totalCount: questions.length,
        availableCount: questions.length,
        hiddenCount: 0}
    }
  },

  togglePracticeQuestion: (
    scope: Scope,
    payload: { questionId: number; session: string; isAvailable: boolean },
  ) =>
    instructorRequest<{ success?: boolean }>("/api/instructor/practice/questions/toggle", scope, {
      method: "POST",
      body: JSON.stringify(payload)}),

  bulkTogglePracticeQuestions: (
    scope: Scope,
    payload: { topic: string; session: string; questionIds: number[]; isAvailable: boolean },
  ) =>
    instructorRequest<{ success?: boolean; updated?: number }>(
      "/api/instructor/practice/questions/bulk",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  getProjects: (scope: Scope, params?: { session?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.session && params.session !== "ALL") q.set("session", params.session)
    if (params?.status && params.status !== "all") q.set("status", params.status)
    const suffix = q.toString() ? `?${q}` : ""
    return instructorRequest<{ projects: InstructorProject[] }>(`/api/projects/list${suffix}`, scope).then(
      (r) => r.projects ?? [],
    )
  },

  approveProject: (scope: Scope, projectId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/projects/${projectId}/approve`, scope, {
      method: "POST",
      body: JSON.stringify({})}),

  rejectProject: (scope: Scope, projectId: number, reason: string) =>
    instructorRequest<{ success?: boolean }>(`/api/projects/${projectId}/reject`, scope, {
      method: "POST",
      body: JSON.stringify({ reason })}),

  deleteProject: (scope: Scope, projectId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/projects/${projectId}`, scope, { method: "DELETE" }),

  getProjectLeaderboard: (scope: Scope, params?: { session?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.session && params.session !== "all") q.set("session", params.session)
    if (params?.limit != null) q.set("limit", String(params.limit))
    const suffix = q.toString() ? `?${q}` : ""
    return instructorRequest<ProjectLeaderboardResponse>(`/api/projects/leaderboard${suffix}`, scope).then(
      (r) => ({
        leaderboard: r.leaderboard ?? [],
        stats: r.stats}),
    )
  },

  getProjectVoteBreakdown: (scope: Scope, projectId: number) =>
    instructorRequest<ProjectVoteScoreBreakdown>(
      `/api/projects/vote-stars?projectId=${projectId}`,
      scope,
    ),

  getProjectInstructorStarVote: (scope: Scope, projectId: number) =>
    instructorRequest<{
      score?: ProjectVoteScoreBreakdown["score"]
      userVote?: { rating: number; comment: string | null } | null
    }>(
      `/api/projects/vote-stars?projectId=${projectId}&voterId=${scope.instructorId}&voterType=instructor`,
      scope,
    ),

  submitProjectStarVote: (
    scope: Scope,
    payload: { projectId: number; rating: number; comment?: string | null },
  ) =>
    instructorRequest<{ success: boolean; message?: string }>("/api/projects/vote-stars", scope, {
      method: "POST",
      body: JSON.stringify({
        projectId: payload.projectId,
        voterId: scope.instructorId,
        voterType: "instructor",
        rating: payload.rating,
        comment: payload.comment ?? null,
      }),
    }),

  getProjectVoteTotals: (scope: Scope) =>
    instructorRequest<{ byProjectId?: Record<string, ProjectVoteTotalsRow> }>(
      "/api/projects/vote-totals",
      scope,
    ).then((r) => r.byProjectId ?? {}),

  getProjectPresentations: (scope: Scope, status = "all") =>
    instructorRequest<{ presentations: ProjectPresentation[] }>(
      `/api/projects/presentations?status=${encodeURIComponent(status)}`,
      scope,
    ).then((r) => r.presentations ?? []),

  updateProjectPresentation: (
    scope: Scope,
    payload: {
      presentationId: number
      scheduledDate?: string
      startTime?: string
      endTime?: string
      location?: string
      notes?: string
      status?: string
      instructorNotes?: string
      attendanceTaken?: boolean
    },
  ) =>
    instructorRequest<{ success?: boolean; presentation?: ProjectPresentation }>(
      "/api/projects/presentations",
      scope,
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  deleteProjectPresentation: (scope: Scope, presentationId: number) =>
    instructorRequest<{ success?: boolean }>("/api/projects/presentations", scope, {
      method: "DELETE",
      body: JSON.stringify({ presentationId }),
    }),

  getPresentationConfigs: (scope: Scope) =>
    instructorRequest<{ configs: PresentationConfig[] }>("/api/projects/presentation-config", scope).then(
      (r) => r.configs ?? [],
    ),

  savePresentationConfig: (
    scope: Scope,
    payload: {
      session: string
      presentationStartDate: string
      presentationEndDate: string
      lectureDays: string[]
      startTime: string
      endTime: string
      slotDuration: number
      location: string
    },
  ) =>
    instructorRequest<{ success?: boolean; config?: PresentationConfig }>(
      "/api/projects/presentation-config",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          createdBy: scope.instructorId,
        }),
      },
    ),

  getProjectMemberScoreOverrides: (scope: Scope, session?: string) => {
    const suffix =
      session && session !== "all" ? `?session=${encodeURIComponent(session)}` : ""
    return instructorRequest<{ overrides: ProjectMemberScoreOverride[] }>(
      `/api/instructor/projects/member-scores${suffix}`,
      scope,
    ).then((r) => r.overrides ?? [])
  },

  saveProjectMemberScore: (
    scope: Scope,
    payload: {
      projectId: number
      studentId: number
      session: string
      score0To50: number | null
      notes?: string
    },
  ) =>
    instructorRequest<{ ok?: boolean }>("/api/instructor/projects/member-scores", scope, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getSummerCamps: (scope: Scope) =>
    instructorRequest<{ camps: SummerCampProgram[] }>("/api/instructor/summer-camp/camps", scope).then(
      (r) => r.camps ?? [],
    ),

  createSummerCamp: (
    scope: Scope,
    payload: { title: string; description?: string; start_date?: string; end_date?: string; status?: string },
  ) =>
    instructorRequest<{ camp: SummerCampProgram }>("/api/instructor/summer-camp/camps", scope, {
      method: "POST",
      body: JSON.stringify(payload)}),

  updateSummerCamp: (
    scope: Scope,
    payload: {
      camp_id: number
      title?: string
      description?: string
      status?: string
      start_date?: string
      end_date?: string
    },
  ) =>
    instructorRequest<{ camp: SummerCampProgram }>("/api/instructor/summer-camp/camps", scope, {
      method: "PATCH",
      body: JSON.stringify(payload)}),

  deleteSummerCamp: (scope: Scope, campId: number) =>
    instructorRequest<{ success?: boolean; deletedCamp?: number }>("/api/instructor/summer-camp/camps", scope, {
      method: "DELETE",
      body: JSON.stringify({ camp_id: campId }),
    }),

  getSummerCampTrainings: (scope: Scope) =>
    instructorRequest<{ trainings: SummerCampTraining[] }>(
      "/api/instructor/summer-camp/trainings",
      scope,
    ).then((r) => r.trainings ?? []),

  createSummerCampTraining: (
    scope: Scope,
    payload: { camp_id: number; title: string; description?: string; status?: string },
  ) =>
    instructorRequest<{ training: SummerCampTraining }>(
      "/api/instructor/summer-camp/trainings",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  updateSummerCampTraining: (
    scope: Scope,
    payload: { training_id: number; title?: string; description?: string; status?: string },
  ) =>
    instructorRequest<{ training: SummerCampTraining }>(
      "/api/instructor/summer-camp/trainings",
      scope,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),

  deleteSummerCampTraining: (scope: Scope, trainingId: number) =>
    instructorRequest<{ success?: boolean; deletedTraining?: number }>(
      "/api/instructor/summer-camp/trainings",
      scope,
      { method: "DELETE", body: JSON.stringify({ training_id: trainingId }) },
    ),

  getAssessmentResults: (
    scope: Scope,
    params?: {
      sessionCode?: string
      assessmentType?: string
      courseCode?: string | null
      sessionCodes?: string[]
      limit?: number
    },
  ) => fetchAssessmentResultsForCourse(scope, params),

  getAssessmentResultSummary: (scope: Scope, attemptId: number) =>
    instructorRequest<{ result: InstructorAssessmentResultSummary }>(
      `/api/instructor/results/${attemptId}`,
      scope,
    ).then((r) => r.result),

  /** Full attempt report for instructors — merges saved answers with question bank (web parity). */
  getAssessmentAttemptReportView: (scope: Scope, attemptId: number) =>
    instructorRequest<AssessmentAttemptResults>(`/api/instructor/results/${attemptId}/view`, scope, {
      requireAuthHeader: true,
    }),

  /** Full attempt report (questions, AI feedback, section breakdown) via instructor proxy. */
  getAssessmentAttemptReport: (scope: Scope, attemptId: number, studentDatabaseId: number) =>
    instructorRequest<AssessmentAttemptResults>(`/api/student/results/${attemptId}`, scope, {
      requireAuthHeader: true,
      headers: { "x-student-id": String(studentDatabaseId) }}),

  setAssessmentResultFinalized: (scope: Scope, attemptId: number, finalized: boolean) =>
    instructorRequest<{
      success: boolean
      message?: string
      results_finalized?: boolean
      results_finalized_at?: string | null
      results_finalized_by?: string | null
    }>(`/api/instructor/results/${attemptId}/finalize`, scope, {
      requireAuthHeader: true,
      method: "POST",
      body: JSON.stringify({ finalized }),
    }),

  emailAssessmentGradesUpdated: (scope: Scope, attemptId: number) =>
    instructorRequest<{
      success: boolean
      message?: string
      results_finalized?: boolean
      results_finalized_at?: string | null
      results_finalized_by?: string | null
    }>(`/api/instructor/results/${attemptId}/email-grades-updated`, scope, {
      requireAuthHeader: true,
      method: "POST",
      body: JSON.stringify({}),
    }),

  recalculateAssessmentScore: (scope: Scope, attemptId: number, quizId: number) =>
    instructorRequest<{ success?: boolean; score?: number; percentage?: number }>(
      `/api/instructor/results/${attemptId}/recalculate`,
      scope,
      {
        requireAuthHeader: true,
        method: "POST",
        body: JSON.stringify({ quizId }),
      },
    ),

  bulkReevaluateAssessmentAttempt: (
    scope: Scope,
    attemptId: number,
    mode: "failed" | "all" | "stuck" = "failed",
  ) =>
    instructorRequest<Record<string, unknown>>("/api/instructor/re-evaluate-attempt-batch", scope, {
      requireAuthHeader: true,
      method: "POST",
      headers: { "x-bulk-reevaluate": "1" },
      body: JSON.stringify({ attemptId, mode }),
    }),

  getForumThreads: (scope: Scope, params?: { search?: string; sortBy?: "recent" | "popular" }) => {
    const q = new URLSearchParams()
    if (params?.search?.trim()) q.set("search", params.search.trim())
    if (params?.sortBy) q.set("sortBy", params.sortBy)
    const suffix = q.toString() ? `?${q.toString()}` : ""
    return instructorRequest<{ threads?: ForumThread[] }>(`/api/forum/threads${suffix}`, scope, {
      requireAuthHeader: true,
    }).then((r) => r.threads ?? [])
  },

  getForumThread: (scope: Scope, threadId: number) =>
    instructorRequest<{ thread?: ForumThread }>(`/api/forum/threads/${threadId}`, scope, {
      requireAuthHeader: true,
    }).then((r) => r.thread ?? null),

  getForumReplies: (scope: Scope, threadId: number) =>
    instructorRequest<{ replies?: ForumReply[] }>(`/api/forum/replies?threadId=${threadId}`, scope, {
      requireAuthHeader: true,
    }).then((r) => r.replies ?? []),

  createForumThread: (
    scope: Scope,
    payload: { title: string; description: string; codeSnippet?: string; tags?: string[] },
  ) =>
    instructorRequest<{ thread?: ForumThread }>("/api/forum/threads", scope, {
      requireAuthHeader: true,
      method: "POST",
      body: JSON.stringify({
        instructorId: scope.instructorId,
        title: payload.title.trim(),
        description: payload.description.trim(),
        codeSnippet: payload.codeSnippet?.trim() || undefined,
        tags: payload.tags ?? [],
      }),
    }).then((r) => r.thread ?? null),

  getPasswordResets: (scope: Scope, status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : ""
    return instructorRequest<{ requests: InstructorPasswordResetRequest[] }>(
      `/api/instructor/password-resets${q}`,
      scope,
    ).then((r) => r.requests ?? [])
  },

  approvePasswordReset: (scope: Scope, requestId: number) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/instructor/password-resets/${requestId}/approve`,
      scope,
      { method: "POST", body: JSON.stringify({}) },
    ),

  rejectPasswordReset: (scope: Scope, requestId: number, reason?: string) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/instructor/password-resets/${requestId}/reject`,
      scope,
      { method: "POST", body: JSON.stringify({ notes: reason?.trim() || undefined }) },
    ),

  getAccountRequests: (scope: Scope, status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : ""
    return instructorRequest<{ requests: InstructorAccountRequest[] }>(
      `/api/instructor/account-requests${q}`,
      scope,
    ).then((r) => r.requests ?? [])
  },

  approveAccountRequest: (scope: Scope, requestId: number) =>
    instructorRequest<{ success: boolean; message?: string; studentId?: number }>(
      `/api/instructor/account-requests/${requestId}/approve`,
      scope,
      { method: "POST", body: JSON.stringify({}) },
    ),

  rejectAccountRequest: (scope: Scope, requestId: number, reason?: string) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/instructor/account-requests/${requestId}/reject`,
      scope,
      {
        method: "POST",
        body: JSON.stringify({ reason: reason?.trim() || "No reason provided" }),
      },
    ),

  getRecommendationGuestAccountRequests: (scope: Scope) =>
    instructorRequest<{ requests: RecommendationGuestAccountRequest[] }>(
      "/api/instructor/recommendation-guest-account-requests",
      scope,
    ).then((r) => r.requests ?? []),

  createAccessInvitation: (
    scope: Scope,
    payload: {
      allowedAccountType?: "student" | "career_member"
      scopeType?: "course" | "section" | "program"
      sessionId?: number
      campId?: number
      approvalBehavior?: "auto_approve_verified_invite" | "require_faculty_approval"
      expiresInHours?: number
      maxUses?: number
    },
  ) =>
    instructorRequest<{ success: boolean; invitationId: number; token: string }>(
      "/api/instructor/access-invitations",
      scope,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  revokeAccessInvitation: (scope: Scope, invitationId: number) =>
    instructorRequest<{ success: boolean }>(
      `/api/instructor/access-invitations?id=${invitationId}`,
      scope,
      { method: "DELETE" },
    ),

  validateAccessInvitation: (token: string) =>
    fetch(`${API_BASE_URL}/api/access/invitations/validate?token=${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Invalid invitation")
      return body as { ok: true; invitation: Record<string, unknown> }
    }),

  getRecommendations: (scope: Scope, status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : ""
    return instructorRequest<{ requests: InstructorRecommendationRequest[] }>(
      `/api/instructor/recommendations${q}`,
      scope,
    ).then((r) => r.requests ?? [])
  },

  getRecommendationDetail: (scope: Scope, requestId: number) =>
    instructorRequest<InstructorRecommendationDetail>(`/api/instructor/recommendations/${requestId}`, scope),

  getRecommendation: (scope: Scope, requestId: number) =>
    instructorRequest<InstructorRecommendationDetail>(`/api/instructor/recommendations/${requestId}`, scope).then(
      (r) => r.request,
    ),

  patchRecommendation: (
    scope: Scope,
    requestId: number,
    action: RecommendationPatchAction,
    body: Record<string, unknown> = {},
  ) =>
    instructorRequest<{ request: InstructorRecommendationRequest }>(
      `/api/instructor/recommendations/${requestId}`,
      scope,
      { method: "PATCH", body: JSON.stringify({ action, ...body }) },
    ),

  patchRecommendationRequestDetails: (
    scope: Scope,
    requestId: number,
    body: {
      purpose?: string
      purposeOtherDetail?: string | null
      recipientName?: string | null
      recipientOrganization?: string | null
      recipientAddress?: string | null
      letterIsSpecific?: boolean
      studentRequestDescription?: string | null
      deadline?: string | null
    },
  ) =>
    instructorRequest<{ request: InstructorRecommendationRequest }>(
      `/api/instructor/recommendations/${requestId}/request-details`,
      scope,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  suggestRecommendationLetter: (scope: Scope, requestId: number) =>
    instructorRequest<{ text: string; modelUsed?: string }>(
      `/api/instructor/recommendations/${requestId}/ai-suggest`,
      scope,
      { method: "POST" },
    ),

  deleteRecommendationRequest: (scope: Scope, requestId: number) =>
    instructorRequest<{ ok: boolean }>(`/api/instructor/recommendations/${requestId}`, scope, {
      method: "DELETE"}),

  getSummerCampers: (scope: Scope, tab: "campers" | "requests" = "campers") =>
    instructorRequest<{ campers?: SummerCampCamper[]; requests?: SummerCampRequest[] }>(
      `/api/instructor/summer-camp/campers?tab=${tab}`,
      scope,
    ),

  approveSummerCampRequest: (scope: Scope, requestId: number) =>
    instructorRequest<{ success?: boolean; studentId?: number }>(
      "/api/instructor/summer-camp/campers",
      scope,
      { method: "POST", body: JSON.stringify({ action: "approve", request_id: requestId }) },
    ),

  rejectSummerCampRequest: (scope: Scope, requestId: number, reason?: string) =>
    instructorRequest<{ success?: boolean; message?: string }>(
      "/api/instructor/summer-camp/campers",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          action: "reject",
          request_id: requestId,
          reason: reason?.trim() || undefined,
        }),
      },
    ),

  approveAllSummerCampRequests: (scope: Scope) =>
    instructorRequest<{ success?: boolean; approvedCount?: number; failedCount?: number }>(
      "/api/instructor/summer-camp/campers",
      scope,
      { method: "POST", body: JSON.stringify({ action: "approve_all" }) },
    ),

  getTradeCenterAnalytics: (scope: Scope) =>
    instructorRequest<TradeCenterAnalytics>("/api/trade-center/analytics", scope),

  getTradeCenterPointRequests: (scope: Scope) =>
    instructorRequest<{ requests: Array<Record<string, unknown>> }>(
      "/api/trade-center/point-requests?role=instructor&includeReviewed=true",
      scope,
    ).then((r) => r.requests ?? []),

  getTradeCenterDonationRequests: (scope: Scope) =>
    instructorRequest<{ requests: Array<Record<string, unknown>> }>(
      "/api/trade-center/donation-requests?role=instructor&includeReviewed=true",
      scope,
    ).then((r) => r.requests ?? []),

  getTradeCenterConfig: (scope: Scope, session = "ALL") =>
    instructorRequest<{ config: Record<string, unknown> }>(
      `/api/trade-center/config?session=${encodeURIComponent(session)}`,
      scope,
    ).then((r) => r.config ?? {}),

  saveTradeCenterConfig: (scope: Scope, config: Record<string, unknown>) =>
    instructorRequest<{ success?: boolean; config?: Record<string, unknown> }>(
      "/api/trade-center/config",
      scope,
      { method: "POST", body: JSON.stringify(config) },
    ),

  getTradeCenterTradeLog: (scope: Scope, session?: string) => {
    const params = new URLSearchParams()
    if (session) params.set("session", session)
    const suffix = params.toString() ? `?${params}` : ""
    return instructorRequest<TradeCenterTradeLog>(`/api/trade-center/instructor-trade-log${suffix}`, scope)
  },

  getTradeCenterRolloverTrades: (
    scope: Scope,
    params?: { session?: string; search?: string; page?: number; limit?: number },
  ) => {
    const q = new URLSearchParams()
    if (params?.session) q.set("session", params.session)
    if (params?.search) q.set("search", params.search)
    if (params?.page) q.set("page", String(params.page))
    if (params?.limit) q.set("limit", String(params.limit))
    const suffix = q.toString() ? `?${q}` : ""
    return instructorRequest<TradeCenterRolloverResponse>(
      `/api/instructor/trade-center/rollover-trades${suffix}`,
      scope,
    )
  },

  approveTradeCenterDonation: (scope: Scope, requestId: number) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/trade-center/donation-requests/${requestId}/approve`,
      scope,
      { method: "POST", body: JSON.stringify({}) },
    ),

  rejectTradeCenterDonation: (scope: Scope, requestId: number, reason?: string) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/trade-center/donation-requests/${requestId}/reject`,
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          reason: reason ?? "Rejected by instructor",
        }),
      },
    ),

  approveTradeCenterPointRequest: (scope: Scope, requestId: number) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/trade-center/point-requests/${requestId}/approve-instructor`,
      scope,
      { method: "POST", body: JSON.stringify({}) },
    ),

  rejectTradeCenterPointRequest: (scope: Scope, requestId: number, reason?: string) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/trade-center/point-requests/${requestId}/reject-instructor`,
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          reason: reason ?? "Rejected by instructor",
        }),
      },
    ),

  getQuestionBank: (
    scope: Scope,
    params?: { type?: string; difficulty?: string; topic?: string; search?: string },
  ) => {
    const q = new URLSearchParams()
    if (params?.type) q.set("type", params.type)
    if (params?.difficulty) q.set("difficulty", params.difficulty)
    if (params?.topic) q.set("topic", params.topic)
    if (params?.search) q.set("search", params.search)
    const suffix = q.toString() ? `?${q}` : ""
    return instructorRequest<{ questions: InstructorBankQuestion[] }>(
      `/api/instructor/question-bank${suffix}`,
      scope,
    ).then((r) => r.questions ?? [])
  },

  getQuestionBankTopics: (scope: Scope) =>
    instructorRequest<{ topics: InstructorBankTopic[] }>("/api/instructor/question-bank/topics", scope).then(
      (r) => r.topics ?? [],
    ),

  getQuestionBankDeleted: (scope: Scope) =>
    instructorRequest<{ questions: InstructorBankQuestion[] }>(
      "/api/instructor/question-bank/deleted",
      scope,
    ).then((r) => r.questions ?? []),

  getQuestionBankQuestion: (scope: Scope, questionId: number) =>
    instructorRequest<{ question: InstructorBankQuestion }>(
      `/api/instructor/question-bank/${questionId}`,
      scope,
    ).then((r) => r.question),

  createQuestionBankQuestion: (scope: Scope, payload: QuestionBankSavePayload) =>
    instructorRequest<{ success: boolean; question?: InstructorBankQuestion; id?: number }>(
      "/api/instructor/question-bank",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  updateQuestionBankQuestion: (scope: Scope, questionId: number, payload: QuestionBankSavePayload) =>
    instructorRequest<{ success: boolean }>(`/api/instructor/question-bank/${questionId}`, scope, {
      method: "PUT",
      body: JSON.stringify(payload)}),

  deleteQuestionBankQuestion: (scope: Scope, questionId: number) =>
    instructorRequest<{ success: boolean; message?: string }>(
      `/api/instructor/question-bank/${questionId}`,
      scope,
      { method: "DELETE" },
    ),

  restoreQuestionBankQuestions: (scope: Scope, ids: number[]) =>
    instructorRequest<{ success: boolean; restored?: number; message?: string }>(
      "/api/instructor/question-bank/deleted",
      scope,
      { method: "PATCH", body: JSON.stringify({ ids }) },
    ),

  permanentlyDeleteQuestionBankQuestions: (scope: Scope, ids: number[]) =>
    instructorRequest<{ success: boolean; deleted?: number; message?: string }>(
      "/api/instructor/question-bank/deleted",
      scope,
      { method: "DELETE", body: JSON.stringify({ ids }) },
    ),

  getQuestionBankCustomTypes: (scope: Scope) =>
    instructorRequest<{ types: import("./custom-question-types").CustomQuestionTypeRecord[] }>(
      "/api/instructor/question-bank/custom-types",
      scope,
    ).then((r) => r.types ?? []),

  generateCustomQuestionTypeSchema: (
    scope: Scope,
    payload: { description: string; suggestedName?: string },
  ) =>
    instructorRequest<{ draft: import("./custom-question-types").CustomQuestionTypeDraft }>(
      "/api/instructor/question-bank/custom-types/generate",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  createCustomQuestionType: (
    scope: Scope,
    payload: import("./custom-question-types").CustomQuestionTypeDraft,
  ) =>
    instructorRequest<{ type: import("./custom-question-types").CustomQuestionTypeRecord }>(
      "/api/instructor/question-bank/custom-types",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  generateQuestionBankDraft: (
    scope: Scope,
    payload: import("./question-bank-ai-types").QuestionBankDescribeRequest,
  ) =>
    instructorRequest<{ draft: import("./question-bank-ai-types").DraftQuestionBankItem }>(
      "/api/instructor/question-bank/generate-draft",
      scope,
      { method: "POST", body: JSON.stringify(payload) },
    ),

  generateQuestionBankFromPdf: async (
    scope: Scope,
    file: { uri: string; name: string; type: string },
    spec: import("./question-bank-ai-types").QuestionBankPdfGenerationRequest,
  ) => {
    const url = `${API_BASE_URL}/api/instructor/question-bank/generate-from-pdf`
    const form = new FormData()
    form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
    form.append("spec", JSON.stringify(spec))

    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-instructor-id": String(scope.instructorId),
    }
    if (scope.courseId != null) headers["x-course-id"] = String(scope.courseId)

    const response = await fetch(url, { method: "POST", headers, body: form })
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
    return body as {
      questions: import("./question-bank-ai-types").DraftQuestionBankItem[]
      meta?: { modelUsed?: string; pageCount?: number; questionType?: string; topic?: string }
    }
  },

  bulkCreateQuestionBankQuestions: (
    scope: Scope,
    questions: import("./question-bank-ai-types").DraftQuestionBankItem[],
  ) =>
    instructorRequest<{ success: boolean; createdCount: number; questionIds: number[] }>(
      "/api/instructor/question-bank/bulk-create",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          questions: questions.map(({ draftId: _draftId, ...item }) => item),
        }),
      },
    ),

  getDeletedAssessments: (scope: Scope, assessmentType?: string) => {
    const q = assessmentType ? `?type=${encodeURIComponent(assessmentType)}` : ""
    return instructorRequest<{ deleted_items: InstructorDeletedAssessment[]; count?: number }>(
      `/api/instructor/deleted-items${q}`,
      scope,
    ).then((r) => r.deleted_items ?? [])
  },

  restoreDeletedAssessment: (scope: Scope, quizId: number) =>
    instructorRequest<{ success: boolean; message?: string }>("/api/instructor/deleted-items", scope, {
      method: "POST",
      body: JSON.stringify({ quiz_id: quizId })}),

  permanentlyDeleteAssessment: (scope: Scope, quizId: number) =>
    instructorRequest<{ success: boolean; message?: string }>("/api/instructor/deleted-items", scope, {
      method: "DELETE",
      body: JSON.stringify({ quiz_id: quizId })}),

  getGroups: (scope: Scope, params?: { session?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.session) q.set("session", params.session)
    if (params?.status) q.set("status", params.status)
    const suffix = q.toString() ? `?${q}` : ""
    return instructorRequest<{ groups: InstructorGroup[] }>(`/api/groups${suffix}`, scope).then(
      (r) => r.groups ?? [],
    )
  },

  getGroupDetail: (scope: Scope, groupId: number) =>
    instructorRequest<{ group: InstructorGroup }>(`/api/groups/${groupId}`, scope).then((r) => r.group),

  createGroupOnBehalf: (
    scope: Scope,
    payload: {
      studentId: number
      session: string
      name: string
      initialMembers?: number[]
    },
  ) =>
    instructorRequest<{ success?: boolean; groupId?: number; group?: InstructorGroup }>(
      "/api/groups",
      scope,
      {
        method: "POST",
        body: JSON.stringify({
          name: payload.name,
          session: payload.session,
          createdBy: payload.studentId,
          initialMembers: payload.initialMembers ?? []})},
    ),

  createProjectOnBehalf: (
    scope: Scope,
    payload: {
      studentId: number
      groupId: number
      title: string
      summary?: string
      deliverables?: string
      targetPlatform?: string
      projectLink?: string
    },
  ) =>
    instructorRequest<{ project?: InstructorProject }>("/api/projects/create", scope, {
      method: "POST",
      body: JSON.stringify({
        groupId: payload.groupId,
        title: payload.title,
        summary: payload.summary,
        deliverables: payload.deliverables,
        targetPlatform: payload.targetPlatform,
        projectLink: payload.projectLink,
        studentId: payload.studentId})}),

  approveGroup: (scope: Scope, groupId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/groups/${groupId}/approve`, scope, {
      method: "POST",
      body: JSON.stringify({})}),

  rejectGroup: (scope: Scope, groupId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/groups/${groupId}/reject`, scope, {
      method: "POST",
      body: JSON.stringify({})}),

  deleteGroup: (scope: Scope, groupId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/groups/${groupId}`, scope, { method: "DELETE" }),

  restoreGroup: (scope: Scope, groupId: number) =>
    instructorRequest<{ success?: boolean }>(`/api/groups/${groupId}/restore`, scope, {
      method: "POST",
      body: JSON.stringify({})}),

  removeGroupMember: (scope: Scope, groupId: number, memberId: number) =>
    instructorRequest<{ success?: boolean }>("/api/groups/remove-member", scope, {
      method: "POST",
      body: JSON.stringify({ groupId, memberId })}),

  removePracticeTopic: (scope: Scope, topic: string, session = "ALL") =>
    instructorRequest<{ success?: boolean }>(
      `/api/instructor/practice/topics/remove?topic=${encodeURIComponent(topic)}&session=${encodeURIComponent(session)}`,
      scope,
      { method: "DELETE" },
    ),

  updateProject: (
    scope: Scope,
    projectId: number,
    payload: {
      title: string
      summary?: string
      deliverables?: string
      targetPlatform?: string
      projectLink?: string
    },
  ) =>
    instructorRequest<{ project: InstructorProject }>(`/api/projects/${projectId}`, scope, {
      method: "PATCH",
      body: JSON.stringify(payload)}),

  getProjectDetail: (scope: Scope, projectId: number) =>
    instructorRequest<{ project: InstructorProject }>(`/api/projects/${projectId}`, scope),

  getPlaygroundQuestions: (scope: Scope, params?: { topic?: string; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.topic) q.set("topic", params.topic)
    if (params?.search) q.set("search", params.search)
    const suffix = q.toString() ? `?${q}` : ""
    return instructorRequest<{ questions: Array<Record<string, unknown>> }>(
      `/api/instructor/playground/questions${suffix}`,
      scope,
    ).then((r) => (r.questions ?? []).map(normalizePlaygroundBankQuestion).filter((item) => item.id > 0))
  },

  getSummerCampTrainingDetail: (scope: Scope, trainingId: number) =>
    instructorRequest<{ training: SummerCampTrainingDetail }>(
      `/api/instructor/summer-camp/trainings/${trainingId}`,
      scope,
    ).then((r) => r.training),

  getProfile: (instructorId: number) =>
    instructorRequest<{ instructor: InstructorProfile }>(
      `/api/instructor/profile?instructorId=${encodeURIComponent(String(instructorId))}`,
      { instructorId },
    ),

  updateProfile: (
    instructorId: number,
    payload: { name: string; email: string; username: string },
  ) =>
    instructorRequest<{ instructor: InstructorProfile }>(
      `/api/instructor/profile?instructorId=${encodeURIComponent(String(instructorId))}`,
      { instructorId },
      { method: "PUT", body: JSON.stringify(payload) },
    ),

  changePassword: (instructorId: number, currentPassword: string, newPassword: string) =>
    instructorRequest<{ success?: boolean; hasChangedPassword?: boolean }>(
      "/api/instructor/change-password",
      { instructorId },
      {
        method: "POST",
        body: JSON.stringify({ instructorId, currentPassword, newPassword }),
      },
    ),

  getCourseEvaluations: (
    scope: Scope,
    params?: { status?: string; session?: string },
  ) => {
    const q = new URLSearchParams({
      status: params?.status ?? "pending",
      session: params?.session ?? "all",
    })
    return instructorRequest<{ success?: boolean; evaluations?: FacultyCourseEvaluationRow[] }>(
      `/api/instructor/course-evaluations?${q}`,
      scope,
    ).then((r) =>
      (r.evaluations ?? []).map((row) =>
        normalizeFacultyEvaluationRow(row as unknown as Record<string, unknown>),
      ),
    )
  },

  getCourseEvaluationAnalytics: (scope: Scope, session = "all") =>
    instructorRequest<{ success?: boolean; analytics: FacultyCourseEvaluationAnalytics }>(
      `/api/instructor/course-evaluations?view=analytics&session=${encodeURIComponent(session)}`,
      scope,
    ).then((r) => r.analytics),

  getCourseEvaluation: (scope: Scope, id: number) =>
    instructorRequest<{ success?: boolean; evaluation: FacultyCourseEvaluationRow }>(
      `/api/instructor/course-evaluations?id=${encodeURIComponent(String(id))}`,
      scope,
    ).then((r) => normalizeFacultyEvaluationRow(r.evaluation as unknown as Record<string, unknown>)),

  reviewCourseEvaluation: (
    scope: Scope,
    payload: { id: number; action: "approve" | "reject"; note?: string },
  ) =>
    instructorRequest<{
      success?: boolean
      status?: string
      message?: string
      proofs?: FacultyCourseEvaluationProof[]
    }>("/api/instructor/course-evaluations", scope, {
      method: "POST",
      body: JSON.stringify({
        id: payload.id,
        action: payload.action,
        note: payload.note,
        instructorId: scope.instructorId,
      }),
    }),

  getMembership: (instructorId: number) =>
    instructorRequest<{
      membership?: {
        tier?: string
        displayName?: string
        expiresAt?: string | null
        status?: string
      }
      billing?: {
        availableCadences?: Array<"semester" | "annual">
        defaultCadence?: "semester" | "annual"
      }
    }>(`/api/instructor/membership?instructorId=${encodeURIComponent(String(instructorId))}`, {
      instructorId,
    }),

  getMembershipDetails: (instructorId: number) =>
    instructorRequest<import("./faculty-membership-details-api").FacultyMembershipDetailsResponse>(
      `/api/instructor/membership/details?instructorId=${encodeURIComponent(String(instructorId))}`,
      { instructorId },
    ),

  cancelMembership: (instructorId: number) =>
    instructorRequest<{ message?: string }>("/api/membership/cancel", { instructorId }, {
      method: "POST",
      body: JSON.stringify({ instructorId }),
    }),

  reactivateMembership: (instructorId: number) =>
    instructorRequest<{ message?: string; plan?: string }>("/api/membership/reactivate", { instructorId }, {
      method: "POST",
      body: JSON.stringify({ instructorId }),
    }),

  getMembershipPurchases: (instructorId: number) =>
    instructorRequest<import("./faculty-membership-billing-api").FacultyMembershipPurchasesResponse>(
      `/api/instructor/purchases?instructorId=${encodeURIComponent(String(instructorId))}`,
      { instructorId },
    ),

  upgradeMembership: (
    instructorId: number,
    options: {
      tier: import("../types/dashboard").FacultyMembershipTier
      billingCadence?: "semester" | "annual"
      mobileReturn?: boolean
    },
  ) =>
    instructorRequest<import("./membership-checkout-api").MembershipUpgradeResponse>(
      "/api/instructor/membership/upgrade",
      { instructorId },
      {
        method: "POST",
        body: JSON.stringify({
          instructorId,
          tier: options.tier,
          billingCadence: options.billingCadence ?? "semester",
          redirectCheckout: true,
          mobileReturn: options.mobileReturn ?? true,
        }),
      },
    ),

  syncMembershipStripe: (instructorId: number, sessionId?: string) =>
    instructorRequest<import("./membership-checkout-api").MembershipSyncResponse>(
      "/api/instructor/membership/sync-stripe",
      { instructorId },
      {
        method: "POST",
        body: JSON.stringify({
          instructorId,
          ...(sessionId ? { sessionId } : {}),
        }),
      },
    ),

  prepareMembershipPaymentSheet: (
    instructorId: number,
    options: {
      tier: import("../types/dashboard").FacultyMembershipTier
      billingCadence?: "semester" | "annual"
    },
  ) =>
    instructorRequest<import("./membership-payment-api").MobilePaymentSheetResponse>(
      "/api/instructor/membership/mobile-payment-sheet",
      { instructorId },
      {
        method: "POST",
        body: JSON.stringify({
          instructorId,
          tier: options.tier,
          billingCadence: options.billingCadence ?? "semester",
        }),
      },
    ),

  createMembershipPaymentIntent: (
    instructorId: number,
    options: {
      tier: import("../types/dashboard").FacultyMembershipTier
      billingCadence?: "semester" | "annual"
      paymentMethodId: string
      shouldSavePaymentMethod: boolean
    },
  ) =>
    instructorRequest<import("./membership-payment-api").MobilePaymentIntentResponse>(
      "/api/instructor/membership/mobile-payment-intent",
      { instructorId },
      {
        method: "POST",
        body: JSON.stringify({
          instructorId,
          tier: options.tier,
          billingCadence: options.billingCadence ?? "semester",
          paymentMethodId: options.paymentMethodId,
          shouldSavePaymentMethod: options.shouldSavePaymentMethod,
        }),
      },
    ),

  getCourseExchangeSummary: (scope: Scope) =>
    instructorRequest<{
      receivedPending?: number
      pending?: number
      sentActive?: number
      sentActionable?: number
    }>("/api/instructor/course-exchange/summary", scope, { omitCourseId: true }),

  getCourseExchangeDiscover: (scope: Scope) =>
    instructorRequest<{ courses: import("./course-exchange-shared").DiscoverableCourse[] }>(
      "/api/instructor/course-exchange/discover",
      scope,
      { omitCourseId: true },
    ).then((r) => r.courses ?? []),

  getCourseExchangeRequests: (scope: Scope, direction: "received" | "sent") =>
    instructorRequest<{ requests: import("./course-exchange-shared").ExchangeRequestDetail[] }>(
      `/api/instructor/course-exchange/requests?direction=${direction}`,
      scope,
      { omitCourseId: true },
    ).then((r) => r.requests ?? []),

  createCourseExchangeRequest: (
    scope: Scope,
    payload: {
      sourceCourseId: number
      purpose: string
      requestedModules: import("./course-exchange-shared").CourseExchangeModule[]
      destinationCourseId: number
      destinationSessionId?: number | null
    },
  ) =>
    instructorRequest<{
      request?: import("./course-exchange-shared").ExchangeRequestDetail & {
        imported?: boolean
        autoApproved?: boolean
      }
      error?: string
    }>("/api/instructor/course-exchange/requests", scope, {
      method: "POST",
      omitCourseId: true,
      body: JSON.stringify({
        sourceCourseId: payload.sourceCourseId,
        purpose: payload.purpose,
        requestedModules: payload.requestedModules,
        destinationCourseId: payload.destinationCourseId,
        destinationSessionId: payload.destinationSessionId ?? null,
      }),
    }),

  approveCourseExchangeRequest: (
    scope: Scope,
    requestId: number,
    approvedModules: import("./course-exchange-shared").CourseExchangeModule[],
  ) =>
    instructorRequest<{ imported?: boolean; error?: string }>(
      `/api/instructor/course-exchange/requests/${requestId}/approve`,
      scope,
      {
        method: "POST",
        omitCourseId: true,
        body: JSON.stringify({ approvedModules }),
      },
    ),

  rejectCourseExchangeRequest: (scope: Scope, requestId: number, reason?: string) =>
    instructorRequest<{ error?: string }>(
      `/api/instructor/course-exchange/requests/${requestId}/reject`,
      scope,
      {
        method: "POST",
        omitCourseId: true,
        body: JSON.stringify(reason ? { reason } : {}),
      },
    ),

  executeCourseExchangeCopy: (
    scope: Scope,
    requestId: number,
    payload: { destinationCourseId: number; destinationSessionId?: number | null },
  ) =>
    instructorRequest<{
      postCopyChecklist?: string[]
      attribution?: unknown
      cloneSummary?: Record<string, unknown> | null
      error?: string
    }>(`/api/instructor/course-exchange/requests/${requestId}/execute-copy`, scope, {
      method: "POST",
      omitCourseId: true,
      body: JSON.stringify(payload),
    }),

  supplementCourseExchangeRequest: (
    scope: Scope,
    requestId: number,
    modules: import("./course-exchange-shared").CourseExchangeModule[],
  ) =>
    instructorRequest<{
      needsApproval?: boolean
      request?: import("./course-exchange-shared").ExchangeRequestDetail
      error?: string
    }>(`/api/instructor/course-exchange/requests/${requestId}/supplement`, scope, {
      method: "POST",
      omitCourseId: true,
      body: JSON.stringify({ modules }),
    }),

  getCourseExchangeSupplementOptions: (scope: Scope, requestId: number) =>
    instructorRequest<import("./course-exchange-shared").ExchangeSupplementOptions>(
      `/api/instructor/course-exchange/requests/${requestId}/supplement-options`,
      scope,
      { omitCourseId: true },
    ),

  getCourseExchangeTimeline: (scope: Scope, requestId: number) =>
    instructorRequest<{ timeline: import("./course-exchange-shared").ExchangeTimelineEntry[] }>(
      `/api/instructor/course-exchange/requests/${requestId}/timeline`,
      scope,
      { omitCourseId: true },
    ).then((r) => r.timeline ?? []),

  getCourseExchangeSharedWithMe: (scope: Scope) =>
    instructorRequest<{ copies: import("./course-exchange-shared").ExchangeCopyRow[] }>(
      "/api/instructor/course-exchange/shared-with-me",
      scope,
      { omitCourseId: true },
    ).then((r) => r.copies ?? []),

  getCourseExchangeMyShared: (scope: Scope) =>
    instructorRequest<{ copies: import("./course-exchange-shared").ExchangeCopyRow[] }>(
      "/api/instructor/course-exchange/my-shared",
      scope,
      { omitCourseId: true },
    ).then((r) => r.copies ?? []),

  getCourseExchangeSharingSettings: (scope: Scope) =>
    instructorRequest<{ courses: import("./course-exchange-shared").MyCourseSharing[] }>(
      "/api/instructor/course-exchange/sharing-settings",
      scope,
      { omitCourseId: true },
    ).then((r) => r.courses ?? []),

  saveCourseExchangeSharingSettings: (
    scope: Scope,
    payload: {
      courseId: number
      sharingMode: import("./course-exchange-shared").CourseExchangeSharingMode
      discoverableTitle?: string | null
      shareableModules: import("./course-exchange-shared").CourseExchangeModule[]
      autoApprove: boolean
    },
  ) =>
    instructorRequest<{ error?: string }>("/api/instructor/course-exchange/sharing-settings", scope, {
      method: "PUT",
      omitCourseId: true,
      body: JSON.stringify(payload),
    }),

  getCourseExchangeAccessLog: (scope: Scope) =>
    instructorRequest<{ events: import("./course-exchange-shared").AccessLogRow[] }>(
      "/api/instructor/course-exchange/access-log",
      scope,
      { omitCourseId: true },
    ).then((r) => r.events ?? []),

  getCourseExchangeUpdateCounts: (scope: Scope) =>
    instructorRequest<{
      counts: Record<number, { changeCount: number; hasUpdates: boolean }>
    }>("/api/instructor/course-exchange/copies/update-counts", scope, { omitCourseId: true }),

  getCourseExchangeCopySync: (scope: Scope, copyId: number, force = false) =>
    instructorRequest<{ diff?: import("./course-exchange-shared").ExchangeSyncDiff }>(
      `/api/instructor/course-exchange/copies/${copyId}/sync${force ? "?force=1" : ""}`,
      scope,
      { omitCourseId: true },
    ),

  applyCourseExchangeCopySync: (scope: Scope, copyId: number, changeIds: string[]) =>
    instructorRequest<{ result?: { applied?: number }; error?: string }>(
      `/api/instructor/course-exchange/copies/${copyId}/sync`,
      scope,
      {
        method: "POST",
        omitCourseId: true,
        body: JSON.stringify({ changeIds }),
      },
    ),

  getAllInstructorSessions: (scope: Scope) =>
    instructorRequest<{ sessions: Array<InstructorSession & { course_id?: number }> }>(
      "/api/instructor/sessions",
      scope,
    ).then((r) =>
      (r.sessions ?? []).map((s) => ({
        ...s,
        course_id: Number(s.course_id ?? scope.courseId ?? 0),
      })),
    ),
}

export function formatFacultyRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
