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
import { enrollmentAcademicTermId } from "./student-content-context"

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

  await primeMembershipTierCache(String(student.id), data.effectiveMembershipTier)

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

  await signIn({
    portal: "student",
    id: student.student_id,
    authIdentifier: loginIdentifier || String(student.student_id ?? ""),
    email: student.email,
    name: student.full_name,
    section: student.section ?? enrollment?.section ?? "",
    databaseId: String(student.id),
    courseId: enrollment?.courseId ?? (student.course_id != null ? Number(student.course_id) : undefined),
    courseCode: enrollment?.courseCode,
    courseTitle: enrollment?.courseTitle,
    academicTermId: enrollmentAcademicTermId(enrollment),
    universityId: university?.id,
    universityName: university?.name,
    universityShortName: university?.short_name,
    requiresPasswordChange,
  })
}
