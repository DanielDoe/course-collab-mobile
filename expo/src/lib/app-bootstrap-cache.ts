import type { Announcement } from "./api"
import type {
  InstructorDashboardCharts,
  InstructorDashboardStats,
  InstructorRecentActivity,
  InstructorCourse,
} from "./instructor-api"
import type {
  GradeTrendPoint,
  FacultyMembershipTier,
  MembershipTier,
  PerformanceComparison,
  PerformanceInsight,
  StudentDashboardStats,
} from "../types/dashboard"

export type StudentDashboardBootstrap = {
  stats: StudentDashboardStats
  trend: GradeTrendPoint[]
  comparison: PerformanceComparison[]
  insights: PerformanceInsight[]
  announcements: Announcement[]
}

export type StudentShellBootstrap = {
  membershipTier: MembershipTier | null
  classroomPoints: number
  notificationCount: number
}

export type FacultyShellBootstrap = {
  courses: InstructorCourse[]
  courseId: number
  pickerKey?: string | null
  notificationCount: number
  membershipTier: FacultyMembershipTier | null
  badges: {
    pendingPoints: number
    pendingIssues: number
    officeHours: number
    courseExchange: number
  }
}

export type FacultyDashboardBootstrap = {
  stats: InstructorDashboardStats
  charts: InstructorDashboardCharts
  activity: InstructorRecentActivity[]
  courseId: number
  academicTermId?: number | null
  sessionCode?: string | null
}

let studentDashboardCache: StudentDashboardBootstrap | null = null
let studentShellCache: StudentShellBootstrap | null = null
let facultyShellCache: FacultyShellBootstrap | null = null
let facultyDashboardCache: FacultyDashboardBootstrap | null = null
let facultyCoursesCache: InstructorCourse[] | null = null

export function setFacultyCoursesBootstrap(courses: InstructorCourse[]) {
  facultyCoursesCache = courses
}

export function consumeFacultyCoursesBootstrap(): InstructorCourse[] | null {
  const courses = facultyCoursesCache
  facultyCoursesCache = null
  return courses
}

export function setStudentDashboardBootstrap(data: StudentDashboardBootstrap) {
  studentDashboardCache = data
}

export function consumeStudentDashboardBootstrap(): StudentDashboardBootstrap | null {
  const data = studentDashboardCache
  studentDashboardCache = null
  return data
}

export function setStudentShellBootstrap(data: StudentShellBootstrap) {
  studentShellCache = data
}

export function consumeStudentShellBootstrap(): StudentShellBootstrap | null {
  const data = studentShellCache
  studentShellCache = null
  return data
}

export function setFacultyShellBootstrap(data: FacultyShellBootstrap) {
  facultyShellCache = data
}

export function consumeFacultyShellBootstrap(): FacultyShellBootstrap | null {
  const data = facultyShellCache
  facultyShellCache = null
  return data
}

export function setFacultyDashboardBootstrap(data: FacultyDashboardBootstrap) {
  facultyDashboardCache = data
}

export function consumeFacultyDashboardBootstrap(): FacultyDashboardBootstrap | null {
  const data = facultyDashboardCache
  facultyDashboardCache = null
  return data
}

export function clearBootstrapCaches() {
  studentDashboardCache = null
  studentShellCache = null
  facultyShellCache = null
  facultyDashboardCache = null
  facultyCoursesCache = null
}
