export type MfaUserType = "student" | "instructor" | "admin"

export type MfaLoginState = {
  challengeToken: string
  requiresSetup: boolean
}

/** Legacy login-challenge enroll (should not be used when MFA is optional). */
export type MfaEnrollStartResponse = {
  qrDataUrl: string
  manualKey: string
  accountName: string
  issuer: string
}

/** Settings → Security enrollment start. */
export type MfaSettingsEnrollStartResponse = {
  enrollmentToken: string
  qrDataUrl: string
  manualKey: string
  accountName?: string
  issuer?: string
}

export type MfaStatusResponse = {
  enabled: boolean
  /** Always false — MFA is optional product-wide. */
  required: boolean
  unusedRecoveryCodes: number
  trustDurationDays: number
  defaultTrustDurationDays: number
}

export const MFA_TRUST_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "1 week (default)" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const

export function parseMfaLoginResponse(data: Record<string, unknown>): MfaLoginState | null {
  if (!data.mfaRequired || !data.challengeToken) return null
  return {
    challengeToken: String(data.challengeToken),
    requiresSetup: Boolean(data.requiresSetup),
  }
}

export function isMfaGatedResponse(data: Record<string, unknown>): boolean {
  return Boolean(data.mfaRequired && data.challengeToken)
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

/** Normalize /api/auth/mfa/verify (or enroll/confirm) success payloads for login handlers. */
export function parseMfaCompletePayload(data: Record<string, unknown>): Record<string, unknown> | null {
  if (isMfaGatedResponse(data)) return null

  const direct = parseRecord(data)
  if (!direct) return null

  if (direct.student || direct.instructor || direct.faculty || direct.admin) {
    return direct
  }

  const nested = parseRecord(direct.login_payload ?? direct.loginPayload)
  if (nested && (nested.student || nested.instructor || nested.faculty || nested.admin)) {
    return { ...direct, ...nested }
  }

  return null
}
