import type { UniversityRecord, UniversityStudentLoginResponse } from "./api"
import { primeMembershipTierCache } from "./membership-tier-cache"
import {
  clearRememberedStudentCredentials,
  persistRememberedStudentAuth,
  persistRememberedUniversity,
} from "./remembered-student-auth"
import { persistMfaDeviceTrustFromLogin, studentMfaAliasKeys, studentMfaLoginKey } from "./mfa-device-trust"
import { stashPendingLoginPassword } from "./pending-login-password"
import type { SignInPayload } from "./session"
import {
  enrollmentAcademicTermId,
  studentDatabaseIdFromLoginRecord,
} from "./student-content-context"
import { resolveStudentDatabaseIdForSignIn } from "./student-session-repair"
import { persistStudentCourse } from "./student-course-storage"
import { enrollmentsFromLoginOptions } from "./student-enrollments-api"
import { stashStudentEnrollments } from "./student-enrollments-cache"

export type CompleteStudentUniversityLoginInput = {
  data: Extract<UniversityStudentLoginResponse, { student: unknown }>
  selectedUniversity: UniversityRecord | null
  identifier: string
  password: string
  rememberMe: boolean
  signIn: (data: SignInPayload) => Promise<void>
}

export async function completeStudentUniversityLogin({
  data,
  selectedUniversity,
  identifier,
  password,
  rememberMe,
  signIn,
}: CompleteStudentUniversityLoginInput): Promise<void> {
  const student = data.student
  const enrollment = data.enrollment
  const university = data.university ?? selectedUniversity
  const loginIdentifier = identifier.trim()
  const databaseId =
    studentDatabaseIdFromLoginRecord(student) ??
    studentDatabaseIdFromLoginRecord({ id: enrollment?.studentRowId })

  const courseId = enrollment?.courseId ?? (student.course_id != null ? Number(student.course_id) : undefined)
  const section = student.section ?? enrollment?.section ?? ""
  const resolvedDatabaseId =
    databaseId ??
    ((await resolveStudentDatabaseIdForSignIn({
      portal: "student",
      id: student.student_id,
      authIdentifier: loginIdentifier || String(student.student_id ?? ""),
      email: student.email,
      name: student.full_name,
      section,
      databaseId: "",
      courseId,
      courseCode: enrollment?.courseCode,
      courseTitle: enrollment?.courseTitle,
      academicTermId: enrollmentAcademicTermId(enrollment),
      universityId: university?.id ?? selectedUniversity?.id,
      universityName: university?.name,
      universityShortName: university?.short_name,
    })) || undefined)

  const universityId = university?.id ?? selectedUniversity?.id
  if (universityId && loginIdentifier) {
    const loginKey = studentMfaLoginKey(universityId, loginIdentifier)
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey,
      payload: data as Record<string, unknown>,
      aliasKeys: studentMfaAliasKeys(universityId, loginIdentifier, {
        student_id: student.student_id,
        email: student.email,
      }),
    })
  }

  if (resolvedDatabaseId) {
    await primeMembershipTierCache(resolvedDatabaseId, data.effectiveMembershipTier)
  }

  if (university) {
    await persistRememberedUniversity(university)
  }
  if (rememberMe) {
    await persistRememberedStudentAuth({
      university: university ?? selectedUniversity!,
      identifier: loginIdentifier || String(student.student_id ?? ""),
      rememberMe: true,
    })
  } else {
    await clearRememberedStudentCredentials()
  }

  const requiresPasswordChange = student.has_changed_password === false
  if (requiresPasswordChange && password) {
    stashPendingLoginPassword(password)
  }

  const loginEnrollments = enrollmentsFromLoginOptions(data.enrollments ?? (enrollment ? [enrollment] : undefined), {
    courseId: enrollment?.courseId ?? courseId,
    courseCode: enrollment?.courseCode,
    courseTitle: enrollment?.courseTitle,
    section,
    sessionId: enrollment?.sessionId,
    studentRowId: enrollment?.studentRowId,
  })
  if (loginEnrollments.length > 0) {
    stashStudentEnrollments(loginEnrollments)
  }

  await signIn({
    portal: "student",
    id: student.student_id,
    authIdentifier: loginIdentifier || String(student.student_id ?? ""),
    email: student.email,
    name: student.full_name,
    section,
    databaseId: resolvedDatabaseId ?? databaseId ?? "",
    courseId,
    courseCode: enrollment?.courseCode,
    courseTitle: enrollment?.courseTitle,
    academicTermId: enrollmentAcademicTermId(enrollment),
    universityId: university?.id,
    universityName: university?.name,
    universityShortName: university?.short_name,
    requiresPasswordChange,
    rememberMe,
    sessionExpiresIn: data.sessionExpiresIn,
  })

  const boundDatabaseId = resolvedDatabaseId ?? databaseId
  if (courseId != null && Number.isFinite(courseId) && courseId > 0 && boundDatabaseId) {
    await persistStudentCourse(boundDatabaseId, courseId, section)
  }
}
