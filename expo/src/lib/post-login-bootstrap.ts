import { type Announcement } from "./api"
import { studentApi } from "./student-api"
import { instructorApi, type InstructorCourse } from "./instructor-api"
import { courseExchangeDrawerBadgeCount } from "./course-exchange-shared"
import {
  fetchNotificationCount,
  fetchStudentDashboardBundle,
} from "./student-dashboard-stats"
import { fetchEffectiveFacultyMembershipTier } from "./faculty-shell-refresh"
import { setCachedFacultyMembershipTier } from "./faculty-membership-tier-cache"
import { fetchEffectiveMembershipTier } from "./student-shell-refresh"
import { setCachedMembershipTier } from "./membership-tier-cache"
import type { AppSession, FacultySession, StudentSession } from "./session"
import {
  fetchFacultyCoursesList,
  type FacultyCourseResolution,
} from "./faculty-post-login"
import { setStoredFacultyCourseId } from "./faculty-course-storage"
import {
  clearBootstrapCaches,
  setFacultyCoursesBootstrap,
  setFacultyDashboardBootstrap,
  setFacultyShellBootstrap,
  setStudentDashboardBootstrap,
  setStudentShellBootstrap,
} from "./app-bootstrap-cache"

let bootstrapInFlight: Promise<void> | null = null
let bootstrapCompletedKey: string | null = null

function bootstrapSessionKey(session: AppSession): string {
  if (session.portal === "student") return `student:${session.databaseId}`
  if (session.portal === "faculty") return `faculty:${session.id}`
  return session.portal
}

/** Idempotent bootstrap — safe on fresh login and cold app restore. */
export function ensureAppBootstrap(session: AppSession): Promise<void> {
  const key = bootstrapSessionKey(session)
  if (bootstrapCompletedKey === key) return Promise.resolve()
  if (bootstrapInFlight) return bootstrapInFlight

  bootstrapInFlight = bootstrapAfterLogin(session)
    .then(() => {
      bootstrapCompletedKey = key
    })
    .finally(() => {
      bootstrapInFlight = null
    })

  return bootstrapInFlight
}

export function resetAppBootstrapState() {
  bootstrapInFlight = null
  bootstrapCompletedKey = null
  clearBootstrapCaches()
}

async function bootstrapStudent(session: StudentSession) {
  const [dashboard, announcementData, tier, notifications] = await Promise.all([
    fetchStudentDashboardBundle(session),
    studentApi.getAnnouncements(session).catch(() => ({ announcements: [] as Announcement[] })),
    fetchEffectiveMembershipTier(session),
    fetchNotificationCount(session),
  ])

  setStudentDashboardBootstrap({
    stats: dashboard.stats,
    trend: dashboard.trend,
    comparison: dashboard.comparison,
    insights: dashboard.insights,
    announcements: [...(announcementData.announcements ?? [])],
  })

  if (tier) {
    await setCachedMembershipTier(session.databaseId, tier)
  }

  setStudentShellBootstrap({
    membershipTier: tier,
    classroomPoints: dashboard.stats.classroomPoints,
    notificationCount: notifications,
  })
}

async function bootstrapFacultyForCourse(
  session: FacultySession,
  course: NonNullable<FacultyCourseResolution["suggestedCourse"]>,
  courses: InstructorCourse[],
) {
  const scope = { instructorId: session.id, courseId: course.id }
  const [stats, charts, activity, notifications, pendingPoints, issues, officeHours, exchangeSummary, tier] =
    await Promise.all([
      instructorApi.getDashboardStats(scope),
      instructorApi.getDashboardCharts(scope),
      instructorApi.getRecentActivity(scope),
      instructorApi.getNotifications(session.id).catch(() => ({ unread_count: 0 })),
      instructorApi.getPendingClassroomPoints(scope).catch(() => []),
      instructorApi.getIssues(scope, "open").catch(() => []),
      instructorApi.getOfficeHours(scope).catch(() => []),
      instructorApi.getCourseExchangeSummary(scope).catch(() => ({})),
      fetchEffectiveFacultyMembershipTier(session),
    ])

  const pendingOfficeHours = officeHours.filter(
    (r) => r.status === "pending" || r.status === "requested",
  ).length

  if (tier) {
    await setCachedFacultyMembershipTier(session.id, tier)
  }

  setFacultyShellBootstrap({
    courses,
    courseId: course.id,
    notificationCount: notifications.unread_count ?? 0,
    membershipTier: tier,
    badges: {
      pendingPoints: pendingPoints.length,
      pendingIssues: issues.length,
      officeHours: pendingOfficeHours,
      courseExchange: courseExchangeDrawerBadgeCount(exchangeSummary),
    },
  })

  setFacultyDashboardBootstrap({
    stats,
    charts,
    activity: activity.slice(0, 8),
    courseId: course.id,
  })
}

async function bootstrapFaculty(session: FacultySession) {
  const courses = await fetchFacultyCoursesList(session)
  setFacultyCoursesBootstrap(courses)
  if (courses.length !== 1) {
    return
  }
  const course = courses[0]!
  await setStoredFacultyCourseId(session.id, course.id)
  await bootstrapFacultyForCourse(session, course, courses)
}

export { bootstrapFacultyForCourse }

export async function bootstrapAfterLogin(session: AppSession) {
  try {
    if (session.portal === "student") {
      await bootstrapStudent(session)
      return
    }
    if (session.portal === "faculty") {
      await bootstrapFaculty(session)
    }
  } catch (err) {
    console.warn("[bootstrapAfterLogin]", err)
  }
}
