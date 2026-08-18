import type { StudentSession } from "./session"
import { studentApi, type Announcement, type OfficeHoursRequest } from "./student-api"
import { periodBadgeLabel as progressReviewPeriodBadgeLabel } from "./progress-review-utils"
import {
  courseEvaluationApi,
  type CourseEvaluation,
  type CourseEvaluationGetResponse,
  type CourseEvaluationSubmitPayload,
} from "./course-evaluation-api"

export type { CourseEvaluation, CourseEvaluationGetResponse, CourseEvaluationSubmitPayload }

export type { Announcement, OfficeHoursRequest }

export type CalendarEvent = import("./calendar/types").CalendarEvent
export type ClassSchedulePayload = import("./calendar/types").ClassSchedulePayload

export type ProgressReviewSections = {
  overallSummary: string
  strengths: string[]
  areasToImprove: string[]
  assessmentFeedback: string
  practiceFeedback: string
  attendanceFeedback: string
  classroomFeedback: string
  actionPlan: string[]
  encouragement: string
}

export type ProgressReviewGradebook = {
  totalScore: number
  letterGrade?: string | null
  gradeIsProvisional?: boolean
  pendingCategories?: string[]
  quizScore?: number
  homeworkScore?: number
  midtermScore?: number
  attendanceScore?: number
  classroomScore?: number
  categoryStatus?: Record<string, "pending" | "scored" | string>
}

export type ProgressReview = {
  id: number
  reviewPeriod: string
  asOfDate?: string | null
  sections?: ProgressReviewSections | null
  contentMarkdown?: string | null
  progressData?: {
    gradebook?: ProgressReviewGradebook | null
    courseCode?: string | null
    student?: { fullName?: string }
  } | null
  createdAt?: string
}

export type SyllabusSection = import("./syllabus/types").SyllabusSection

export type SyllabusPayload = import("./syllabus/types").SyllabusPayload

export {
  getSyllabusSectionDisplayTitle,
  getSyllabusFieldEntries,
  prepareStudentSyllabusSections,
  prepareSyllabusForDisplay,
  filterSyllabusSections,
  getSyllabusVisibleContent} from "./syllabus"

export type CoursePolicies = {
  course_code?: string | null
  course_title?: string | null
  source_label?: string
  assessment_privilege_source?: string
  show_course_policy_notice?: boolean
}

export type RecommendationRequest = {
  id: number
  status: string
  purpose: string
  deadline?: string | null
  course_code?: string
  course_description?: string | null
  instructor_name?: string
  created_at?: string
  draft_count?: number
  rejection_reason?: string | null
  student_request_description?: string | null
  updated_at?: string
}

export type RecommendationMeta = {
  student?: { id?: number; full_name?: string; session_id?: number; session_code?: string }
  instructors?: Array<{ id: number; name?: string; email?: string; username?: string }>
  sessions?: Array<{ id: number; code?: string; description?: string }>
}

export const RECOMMENDATION_PURPOSES = [
  { id: "scholarship", label: "Scholarship" },
  { id: "internship", label: "Internship" },
  { id: "graduate_school", label: "Graduate school" },
  { id: "job_application", label: "Job application" },
  { id: "research_opportunity", label: "Research opportunity" },
  { id: "other", label: "Other" },
] as const

export function formatEventDate(value?: string | null, allDay?: boolean): string {
  if (!value) return "Date TBD"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  if (allDay) {
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  }
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"})
}

export function formatListDate(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function periodBadgeLabel(period: string, asOfDate?: string | null): string {
  return progressReviewPeriodBadgeLabel(period, asOfDate)
}

export function purposeLabel(purpose: string): string {
  return RECOMMENDATION_PURPOSES.find((p) => p.id === purpose)?.label ?? purpose.replace(/_/g, " ")
}

export const courseInfoApi = {
  getAnnouncements: (session: StudentSession) => studentApi.getAnnouncements(session),

  getAnnouncementById: (session: StudentSession, id: number) =>
    studentApi.getAnnouncementById(session, id),

  markAnnouncementViewed: (session: StudentSession, id: number) =>
    studentApi.markAnnouncementViewed(session, id),

  reactToAnnouncement: (session: StudentSession, id: number, reactionType: string) =>
    studentApi.reactToAnnouncement(session, id, reactionType),

  getAnnouncementComments: (session: StudentSession, id: number) =>
    studentApi.getAnnouncementComments(session, id),

  postAnnouncementComment: (session: StudentSession, id: number, content: string) =>
    studentApi.postAnnouncementComment(session, id, content),

  getProgressReview: async (session: StudentSession) => {
    const data = await studentApi.getProgressReview(session)
    return {
      review: (data.review as ProgressReview | null) ?? null,
      success: Boolean(data.success ?? true)}
  },

  getSyllabus: async (session: StudentSession) => {
    const data = await studentApi.getSyllabus(session)
    return {
      syllabus: (data.syllabus as SyllabusPayload | null) ?? null,
      courseInfo: data.courseInfo as Record<string, unknown> | null}
  },

  getPolicies: (session: StudentSession) =>
    studentApi.getCoursePolicies(session) as Promise<CoursePolicies>,

  getOfficeHours: (session: StudentSession) => studentApi.getOfficeHours(session),

  createOfficeHours: (
    session: StudentSession,
    payload: {
      topic: string
      areaOfConcern?: string
      description?: string
      priority?: string
      preferredDates?: string[]
    },
  ) =>
    studentApi.createOfficeHours(session, {
      topic: payload.topic,
      priority: payload.priority ?? "medium",
      areaOfConcern: payload.areaOfConcern,
      description: payload.description,
      preferredDates: payload.preferredDates}),

  getCalendarEvents: async (session: StudentSession, range?: { startDate: Date; endDate: Date }) => {
    const data = await studentApi.getCalendarEvents(session, range)
    return (data.events ?? []) as CalendarEvent[]
  },

  getClassSchedule: async (session: StudentSession, range: { startDate: Date; endDate: Date }) => {
    const data = await studentApi.getClassSchedule(session, range)
    return data as ClassSchedulePayload
  },

  getRecommendations: async (session: StudentSession) => {
    const data = await studentApi.getRecommendations(session)
    return (data.requests ?? []) as RecommendationRequest[]
  },

  getRecommendationDetail: (session: StudentSession, requestId: number) =>
    studentApi.getRecommendationDetail(session, requestId),

  getRecommendationMeta: (session: StudentSession) =>
    studentApi.getRecommendationMeta(session) as Promise<RecommendationMeta>,

  createRecommendation: (
    session: StudentSession,
    payload: {
      courseId: number
      instructorId: number
      purpose: string
      deadline?: string
      studentRequestDescription?: string
    },
  ) => studentApi.createRecommendation(session, payload),

  getCourseEvaluation: (session: StudentSession) => courseEvaluationApi.get(session),

  submitCourseEvaluation: (session: StudentSession, payload: CourseEvaluationSubmitPayload) =>
    courseEvaluationApi.submit(session, payload),
}
