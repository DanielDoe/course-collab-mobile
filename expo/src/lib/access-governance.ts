/** Mirrors server enums in v0-coursecollabv3/lib/access-governance/types.ts */

import { API_BASE_URL } from "../constants"
import { ApiError } from "./api"

export type AccessAccountType = "student" | "faculty" | "career_member" | "summer_student" | "admin"

export type AccountLifecycleStatus =
  | "pending_email_verification"
  | "pending_approval"
  | "active"
  | "suspended"
  | "rejected"
  | "expired"
  | "deactivated"
  | "not_found"

export type AccessRequestSnapshot = {
  id?: number
  fullName?: string
  email?: string | null
  section?: string | null
  organization?: string | null
  program?: string | null
  submittedAt?: string
  emailVerified?: boolean
}

export type AccessLifecyclePayload = {
  lifecycle: AccountLifecycleStatus
  accountType?: AccessAccountType
  request?: AccessRequestSnapshot
  rejectionReason?: string | null
  error?: string
}

export function parseAccessLifecyclePayload(details: unknown): AccessLifecyclePayload | null {
  if (!details || typeof details !== "object") return null
  const body = details as Record<string, unknown>
  const lifecycle = body.lifecycle
  if (typeof lifecycle !== "string") return null
  return {
    lifecycle: lifecycle as AccountLifecycleStatus,
    accountType: typeof body.accountType === "string" ? (body.accountType as AccessAccountType) : undefined,
    request:
      body.request && typeof body.request === "object"
        ? {
            id: typeof (body.request as Record<string, unknown>).id === "number" ? ((body.request as Record<string, unknown>).id as number) : undefined,
            fullName:
              typeof (body.request as Record<string, unknown>).fullName === "string"
                ? ((body.request as Record<string, unknown>).fullName as string)
                : undefined,
            email:
              typeof (body.request as Record<string, unknown>).email === "string"
                ? ((body.request as Record<string, unknown>).email as string)
                : null,
            section:
              typeof (body.request as Record<string, unknown>).section === "string"
                ? ((body.request as Record<string, unknown>).section as string)
                : null,
            organization:
              typeof (body.request as Record<string, unknown>).organization === "string"
                ? ((body.request as Record<string, unknown>).organization as string)
                : null,
            program:
              typeof (body.request as Record<string, unknown>).program === "string"
                ? ((body.request as Record<string, unknown>).program as string)
                : null,
            submittedAt:
              typeof (body.request as Record<string, unknown>).submittedAt === "string"
                ? ((body.request as Record<string, unknown>).submittedAt as string)
                : undefined,
            emailVerified: Boolean((body.request as Record<string, unknown>).emailVerified),
          }
        : undefined,
    rejectionReason:
      typeof body.rejectionReason === "string"
        ? body.rejectionReason
        : typeof body.rejection_reason === "string"
          ? body.rejection_reason
          : null,
  }
}

export function accountTypeLabel(type?: AccessAccountType): string {
  switch (type) {
    case "faculty":
      return "Faculty"
    case "career_member":
      return "Career Member"
    case "summer_student":
      return "Summer Student"
    case "student":
      return "Student"
    default:
      return "Account"
  }
}

export function accessRequestKindLabel(kind?: string | null, accountType?: string | null): string {
  const resolved =
    accountType ??
    (kind === "guest"
      ? "career_member"
      : kind === "faculty"
        ? "faculty"
        : kind === "summer_student" || kind === "summer_camper"
          ? "summer_student"
          : "student")
  return accountTypeLabel(resolved as AccessAccountType)
}

export async function resendAccessVerificationEmail(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/access/resend-verification`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  const body = (await response.json()) as { error?: string; message?: string }
  if (!response.ok) {
    throw new ApiError(body.error ?? "Could not resend verification email", response.status, body)
  }
  return { message: body.message ?? "Verification email sent." }
}

export function formatAccessSubmittedDate(value?: string | null): string {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return value
  }
}

export type ValidatedAccessInvitation = {
  allowedAccountType: AccessAccountType
  approvalBehavior: "auto_approve_verified_invite" | "require_faculty_approval"
  scopeType: "course" | "section" | "program"
  courseId: number | null
  sessionId: number | null
  campId: number | null
}

export async function validateAccessInvitation(token: string): Promise<ValidatedAccessInvitation> {
  const response = await fetch(`${API_BASE_URL}/api/access/invitations/validate`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ token: token.trim() }),
  })
  const body = (await response.json()) as {
    valid?: boolean
    error?: string
    allowedAccountType?: AccessAccountType
    approvalBehavior?: ValidatedAccessInvitation["approvalBehavior"]
    scopeType?: ValidatedAccessInvitation["scopeType"]
    courseId?: number | null
    sessionId?: number | null
    campId?: number | null
  }
  if (!response.ok || !body.valid) {
    throw new ApiError(body.error ?? "This invitation link is invalid or expired.", response.status, body)
  }
  return {
    allowedAccountType: body.allowedAccountType ?? "student",
    approvalBehavior: body.approvalBehavior ?? "require_faculty_approval",
    scopeType: body.scopeType ?? "section",
    courseId: body.courseId ?? null,
    sessionId: body.sessionId ?? null,
    campId: body.campId ?? null,
  }
}

export async function submitStudentAccessRequest(payload: {
  fullName: string
  studentId: string
  section: string
  email: string
  universityId?: number
  courseId?: number
  invitationToken?: string
}): Promise<{ message: string; requestId?: number; requiresEmailVerification?: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/student/request-account`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = (await response.json()) as {
    error?: string
    message?: string
    requestId?: number
    requiresEmailVerification?: boolean
  }
  if (!response.ok) {
    throw new ApiError(body.error ?? "Could not submit access request.", response.status, body)
  }
  return {
    message: body.message ?? "Your access request was submitted.",
    requestId: body.requestId,
    requiresEmailVerification: body.requiresEmailVerification,
  }
}
