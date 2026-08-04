import { ApiError, api } from "./api"
import type {
  MfaEnrollStartResponse,
  MfaStatusResponse,
  MfaUserType,
} from "./mfa-types"

type VerifyPayload = {
  challengeToken: string
  code?: string
  recoveryCode?: string
}

async function mfaPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return api.rawRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

async function mfaStatusRequest<T>(
  userType: MfaUserType,
  userId: number | string,
  init?: RequestInit,
): Promise<T> {
  const params = new URLSearchParams({
    userType,
    userId: String(userId),
  })
  return api.rawRequest<T>(`/api/auth/mfa/status?${params}`, init)
}

export const mfaApi = {
  enrollStart: (challengeToken: string) =>
    mfaPost<MfaEnrollStartResponse>("/api/auth/mfa/enroll/start", { challengeToken }),

  enrollConfirm: (challengeToken: string, code: string) =>
    mfaPost<Record<string, unknown>>("/api/auth/mfa/enroll/confirm", {
      challengeToken,
      code,
    }),

  verify: (payload: VerifyPayload) =>
    mfaPost<Record<string, unknown>>("/api/auth/mfa/verify", {
      challengeToken: payload.challengeToken,
      ...(payload.recoveryCode
        ? { recoveryCode: payload.recoveryCode.trim() }
        : payload.code
          ? { code: payload.code.trim() }
          : {}),
    }),

  getStatus: (userType: MfaUserType, userId: number | string) =>
    mfaStatusRequest<MfaStatusResponse>(userType, userId),

  updateTrustDuration: async (
    userType: MfaUserType,
    userId: number | string,
    trustDurationDays: number,
  ) => {
    const data = await mfaStatusRequest<{ trustDurationDays: number }>(userType, userId, {
      method: "PATCH",
      body: JSON.stringify({ trustDurationDays }),
    })
    return data.trustDurationDays
  },
}

export function mfaErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      return err.message
    }
    if (err.status === 500) {
      return "The sign-in server hit an error verifying your code. If the web app works but mobile does not, deploy the latest API or contact support."
    }
    return err.message
  }
  return fallback
}
