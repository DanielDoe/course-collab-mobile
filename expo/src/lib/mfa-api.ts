import { ApiError, api } from "./api"
import type {
  MfaEnrollStartResponse,
  MfaStatusResponse,
  MfaUserType,
} from "./mfa-types"
import {
  instructorMfaLoginKey,
  mfaTrustRequestHeaders,
  persistMfaDeviceTrustFromLogin,
  studentMfaLoginKey,
} from "./mfa-device-trust"

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
  loginKey?: string | null,
): Promise<T> {
  const params = new URLSearchParams({
    userType,
    userId: String(userId),
  })
  const trustHeaders = loginKey ? await mfaTrustRequestHeaders(loginKey) : {}
  return api.rawRequest<T>(`/api/auth/mfa/status?${params}`, {
    ...init,
    headers: {
      ...trustHeaders,
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
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

  getStatus: (userType: MfaUserType, userId: number | string, loginKey?: string | null) =>
    mfaStatusRequest<MfaStatusResponse>(userType, userId, undefined, loginKey),

  updateTrustDuration: async (
    userType: MfaUserType,
    userId: number | string,
    trustDurationDays: number,
    loginKey?: string | null,
  ) => {
    const data = await mfaStatusRequest<{
      trustDurationDays: number
      mfaDeviceTrustToken?: string
      mfaDeviceTrustExpiresAt?: string
    }>(
      userType,
      userId,
      {
        method: "PATCH",
        body: JSON.stringify({ trustDurationDays }),
      },
      loginKey,
    )
    if (loginKey && data.mfaDeviceTrustToken && data.mfaDeviceTrustExpiresAt) {
      await persistMfaDeviceTrustFromLogin({
        userType,
        loginKey,
        payload: data as Record<string, unknown>,
      })
    }
    return data.trustDurationDays
  },
}

export function mfaStatusLoginKey(params: {
  userType: MfaUserType
  universityId?: number | null
  authIdentifier?: string | null
  username?: string | null
}): string | null {
  if (params.userType === "student") {
    if (params.universityId == null || !params.authIdentifier?.trim()) return null
    return studentMfaLoginKey(params.universityId, params.authIdentifier)
  }
  const id = (params.authIdentifier ?? params.username)?.trim()
  return id ? instructorMfaLoginKey(id) : null
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
