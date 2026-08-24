import Constants from "expo-constants"
import { getApiBaseUrl, getProductionApiBaseUrl } from "../constants"
import {
  instructorMfaLoginKey,
  instructorMfaAliasKeys,
  mfaLoginCookieHeaders,
  mfaLoginCookieHeadersForInstructor,
  mfaLoginCookieHeadersForStudent,
  persistMfaDeviceTrustFromLogin,
  clearMfaDeviceTrustKeys,
  studentMfaLoginKey,
  studentMfaAliasKeys,
} from "./mfa-device-trust"
import { isMfaGatedResponse } from "./mfa-types"
import { mergeCookieHeaders, persistHttpCookiesFromResponse, studentHttpCookieHeader } from "./student-http-cookies"
import { assertProductionHttpsUrl, createApiAbortSignal, noteApiFailure } from "./http"
import { normalizeLoginIdentifier, normalizeLoginPassword } from "./login-credentials"

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export type CourseOption = {
  id: number
  course_code: string
  course_title: string
  university: string | null
  semester: string | null
}

export type SessionOption = {
  id: number
  code: string
}

export type RosterStudent = {
  id: number
  student_id: string
  full_name: string
}

export type StudentLoginRequest = {
  fullName: string
  studentId: string
  section: string
  password: string
  courseId: number
}

export type UniversityAuthType = "local" | "microsoft" | "google" | "saml" | "cas"

export type UniversityRecord = {
  id: number
  name: string
  short_name: string
  logo: string | null
  primary_color: string
  secondary_color: string
  domain: string | null
  authentication_type: UniversityAuthType
  is_active: boolean
}

export type EnrollmentOption = {
  courseId: number
  courseCode: string
  courseTitle: string
  section?: string
  academicTermId?: number | null
  academic_term_id?: number | null
}

export type UniversityStudentLoginRequest = {
  universityId: number
  identifier: string
  password: string
  rememberMe?: boolean
  courseId?: number
}

export type ActivateStudentAccountRequest = {
  universityId: number
  identifier: string
  newPassword: string
  confirmPassword: string
}

export type StudentRecord = {
  id: number
  student_id: string
  full_name: string
  section: string
  course_id?: number
  has_changed_password?: boolean
  email?: string
}

export type StudentLoginResponse = {
  student: StudentRecord
  effectiveMembershipTier?: string
  hasApprovedResetRequest?: boolean
  resetRequestId?: number | null
  trialActivated?: boolean
}

export type UniversityStudentLoginResponse =
  | {
      requiresCourseSelection: true
      enrollments: EnrollmentOption[]
      studentPreview?: { maskedName?: string }
    }
  | {
      requiresCourseSelection?: false
      student: StudentRecord
      effectiveMembershipTier?: string
      hasApprovedResetRequest?: boolean
      resetRequestId?: number | null
      trialActivated?: boolean
      university?: UniversityRecord
      enrollment?: EnrollmentOption
      enrollments?: EnrollmentOption[]
      rememberMe?: boolean
      sessionExpiresIn?: number
    }

export type ActivateStudentAccountResponse = {
  activated?: boolean
  maskedName?: string
  hint?: string
  message?: string
  error?: string
}

export type InstructorRecord = {
  id: number
  username: string
  email?: string
  name?: string
  role?: string
  hasChangedPassword?: boolean
  requiresPasswordChange?: boolean
}

export type InstructorLoginResponse = {
  message: string
  instructor?: InstructorRecord
  faculty?: InstructorRecord
}

export type AdminLoginResponse = {
  admin: {
    id: number
    username: string
    full_name?: string
    platformRole?: string
  }
}

export type GuestLoginResponse = {
  student: StudentRecord & {
    is_platform_guest?: boolean
    guest_access_purpose?: string
  }
  guestAccessPurpose?: "recommendation_letter" | "other"
}

export type SummerLoginResponse = {
  student: StudentRecord & {
    email?: string
    student_program_role?: string
  }
}

export type Announcement = {
  id: number
  title: string
  content?: string
  created_at: string
  pinned?: boolean
  author_name?: string
  ai_summary?: string | null
}

async function requestOnce<T>(
  baseUrl: string,
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<T> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`

  try {
    assertProductionHttpsUrl(url)
    const response = await fetch(url, {
      ...init,
      signal: createApiAbortSignal(timeoutMs, init?.signal ?? undefined),
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init?.headers,
      },
    })

    let body: unknown = null
    const text = await response.text()
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
      noteApiFailure(path, response.status, message)
      throw new ApiError(message, response.status, body)
    }

    try {
      await persistHttpCookiesFromResponse(url, response.headers)
    } catch {
      /* Native cookie jar optional — MFA trust lives in SecureStore. */
    }

    return body as T
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Production requests must use HTTPS")) {
      throw new ApiError(err.message, 0)
    }
    throw err
  }
}

function shouldFallbackToProduction(path: string, init?: RequestInit): boolean {
  if (init?.method && init.method !== "GET") return false
  return !path.startsWith("/api/messages")
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 30000): Promise<T> {
  const primary = getApiBaseUrl()

  try {
    return await requestOnce<T>(primary, path, init, timeoutMs)
  } catch (err) {
    if (err instanceof ApiError) throw err

    const production = getProductionApiBaseUrl()
    if (
      __DEV__ &&
      Constants.isDevice &&
      primary !== production &&
      shouldFallbackToProduction(path, init)
    ) {
      try {
        return await requestOnce<T>(production, path, init, timeoutMs)
      } catch (fallbackErr) {
        if (fallbackErr instanceof ApiError) throw fallbackErr
      }
    }

    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(`Request timed out (${primary}). Is your API server running?`, 408)
    }

    throw new ApiError(
      `Could not reach the CourseCollab API at ${primary}. Check your internet connection.`,
      0,
    )
  }
}

export const api = {
  /** Low-level JSON request — used by MFA and other auth helpers. */
  rawRequest: <T>(path: string, init?: RequestInit, timeoutMs?: number) =>
    request<T>(path, init, timeoutMs),

  getUniversities: () =>
    request<{ universities: UniversityRecord[] }>("/api/auth/universities"),

  /** Search featured schools + the open university-domains catalog (2+ chars). */
  searchUniversities: (query: string) =>
    request<{ universities: UniversityRecord[] }>(
      `/api/auth/universities/search?q=${encodeURIComponent(query)}`,
    ),

  /** Persist a catalog pick (id 0) into universities so accounts can FK to it. */
  ensureUniversity: (payload: { name: string; domain?: string | null; shortName?: string }) =>
    request<{ university: UniversityRecord }>("/api/auth/universities/ensure", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        domain: payload.domain ?? "",
        shortName: payload.shortName ?? "",
      }),
    }),

  universityStudentLogin: async (payload: UniversityStudentLoginRequest) => {
    const authId = normalizeLoginIdentifier(payload.identifier)
    const password = normalizeLoginPassword(payload.password)
    const loginKey = studentMfaLoginKey(payload.universityId, authId)
    const aliasKeys = studentMfaAliasKeys(payload.universityId, authId)
    const trustHeaders = await mfaLoginCookieHeadersForStudent(payload.universityId, authId)
    const data = await request<UniversityStudentLoginResponse>("/api/auth/student/login", {
      method: "POST",
      headers: trustHeaders,
      body: JSON.stringify({
        universityId: payload.universityId,
        identifier: authId,
        password,
        rememberMe: Boolean(payload.rememberMe),
        ...(payload.courseId != null ? { courseId: payload.courseId } : {}),
      }),
    })
    const record = data as Record<string, unknown>
    if (isMfaGatedResponse(record)) {
      // Server rejected device trust — clear local tokens so the next verify can mint a fresh one.
      if (Object.keys(trustHeaders).length > 0) {
        await clearMfaDeviceTrustKeys([loginKey, ...aliasKeys])
      }
      return data
    }
    const student =
      "student" in data && data.student
        ? data.student
        : undefined
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey,
      payload: record,
      aliasKeys: studentMfaAliasKeys(payload.universityId, authId, student),
    })
    return data
  },

  activateStudentAccount: (payload: ActivateStudentAccountRequest) =>
    request<ActivateStudentAccountResponse>("/api/auth/student/login", {
      method: "PUT",
      body: JSON.stringify({
        universityId: payload.universityId,
        identifier: normalizeLoginIdentifier(payload.identifier),
        newPassword: normalizeLoginPassword(payload.newPassword),
        confirmPassword: normalizeLoginPassword(payload.confirmPassword),
      }),
    }),

  getCourses: () =>
    request<{ courses: CourseOption[]; activeTerm: { id: number; label: string } | null }>(
      "/api/student/courses",
    ),

  getSessions: (courseId: number) =>
    request<{ sessions: SessionOption[] }>(
      `/api/student/sessions?courseId=${encodeURIComponent(String(courseId))}`,
    ),

  getRosterStudents: (sessionId: number, courseId: number) =>
    request<{ students: RosterStudent[] }>(
      `/api/student/sessions/${encodeURIComponent(String(sessionId))}/students?courseId=${encodeURIComponent(String(courseId))}`,
    ),

  /** @deprecated Legacy roster login — prefer universityStudentLogin. */
  studentLogin: (payload: StudentLoginRequest) =>
    request<StudentLoginResponse>("/api/student/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  instructorLogin: async (username: string, password: string) => {
    const authId = normalizeLoginIdentifier(username)
    const normalizedPassword = normalizeLoginPassword(password)
    const loginKey = instructorMfaLoginKey(authId)
    const aliasKeys = instructorMfaAliasKeys(authId)
    const trustHeaders = await mfaLoginCookieHeadersForInstructor(authId)
    const data = await request<InstructorLoginResponse>("/api/instructor/login", {
      method: "POST",
      headers: trustHeaders,
      body: JSON.stringify({ username: authId, password: normalizedPassword }),
    })
    const record = data as Record<string, unknown>
    if (isMfaGatedResponse(record)) {
      if (Object.keys(trustHeaders).length > 0) {
        await clearMfaDeviceTrustKeys([loginKey, ...aliasKeys])
      }
      return data
    }
    const instructor = (data as InstructorLoginResponse).faculty ?? (data as InstructorLoginResponse).instructor
    await persistMfaDeviceTrustFromLogin({
      userType: "instructor",
      loginKey,
      payload: record,
      aliasKeys: instructorMfaAliasKeys(authId, instructor),
    })
    return data
  },

  adminLogin: async (username: string, password: string) => {
    const authId = normalizeLoginIdentifier(username)
    const normalizedPassword = normalizeLoginPassword(password)
    const loginKey = `admin:${authId.toLowerCase()}`
    const trustHeaders = await mfaLoginCookieHeaders(loginKey)
    const data = await request<AdminLoginResponse>("/api/admin/login", {
      method: "POST",
      headers: trustHeaders,
      body: JSON.stringify({ username: authId, password: normalizedPassword }),
    })
    const record = data as Record<string, unknown>
    if (isMfaGatedResponse(record)) {
      if (Object.keys(trustHeaders).length > 0) {
        await clearMfaDeviceTrustKeys([loginKey])
      }
      return data
    }
    await persistMfaDeviceTrustFromLogin({
      userType: "admin",
      loginKey,
      payload: record,
    })
    return data
  },

  guestLogin: async (email: string, password: string) => {
    const authId = normalizeLoginIdentifier(email)
    const normalizedPassword = normalizeLoginPassword(password)
    const loginKey = studentMfaLoginKey(0, authId)
    const trustHeaders = await mfaLoginCookieHeadersForStudent(0, authId)
    const data = await request<GuestLoginResponse>("/api/guest/login", {
      method: "POST",
      headers: trustHeaders,
      body: JSON.stringify({ email: authId, password: normalizedPassword }),
    })
    const record = data as Record<string, unknown>
    if (isMfaGatedResponse(record)) {
      if (Object.keys(trustHeaders).length > 0) {
        await clearMfaDeviceTrustKeys([loginKey])
      }
      return data
    }
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey,
      payload: record,
    })
    return data
  },

  requestSummerAccount: (payload: {
    fullName: string
    email: string
    school: string
    password: string
    confirmPassword: string
    programRole?: "summer_camper" | "summer_student"
    campId?: number
    invitationToken?: string
  }) =>
    request<{
      success: boolean
      autoApproved?: boolean
      message?: string
      requiresEmailVerification?: boolean
    }>("/api/summer-camp/request-account", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  summerLogin: async (email: string, password: string) => {
    const authId = normalizeLoginIdentifier(email)
    const normalizedPassword = normalizeLoginPassword(password)
    const loginKey = studentMfaLoginKey(0, authId)
    const trustHeaders = await mfaLoginCookieHeadersForStudent(0, authId)
    const data = await request<SummerLoginResponse>("/api/summer-camp/login", {
      method: "POST",
      headers: trustHeaders,
      body: JSON.stringify({ email: authId, password: normalizedPassword }),
    })
    const record = data as Record<string, unknown>
    if (isMfaGatedResponse(record)) {
      if (Object.keys(trustHeaders).length > 0) {
        await clearMfaDeviceTrustKeys([loginKey])
      }
      return data
    }
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey,
      payload: record,
    })
    return data
  },

  /** Revoke server refresh/MFA-trust cookies (no-op if none were set). */
  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  getAnnouncements: (studentId: string) =>
    request<{ announcements: Announcement[] }>(
      `/api/announcements?studentId=${encodeURIComponent(studentId)}`,
    ),
}
