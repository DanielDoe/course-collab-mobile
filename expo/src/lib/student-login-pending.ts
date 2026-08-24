import type { EnrollmentOption, UniversityRecord } from "./api"

export type PendingStudentCourseLogin = {
  university: UniversityRecord
  identifier: string
  password: string
  rememberMe: boolean
  enrollments: EnrollmentOption[]
}

let pendingStudentCourseLogin: PendingStudentCourseLogin | null = null

export function stashPendingStudentCourseLogin(data: PendingStudentCourseLogin): void {
  pendingStudentCourseLogin = data
}

export function consumePendingStudentCourseLogin(): PendingStudentCourseLogin | null {
  const value = pendingStudentCourseLogin
  pendingStudentCourseLogin = null
  return value
}

export function peekPendingStudentCourseLogin(): PendingStudentCourseLogin | null {
  return pendingStudentCourseLogin
}

export function clearPendingStudentCourseLogin(): void {
  pendingStudentCourseLogin = null
}
